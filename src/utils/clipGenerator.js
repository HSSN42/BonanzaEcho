// src/utils/clipGenerator.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const storagePath = process.env.STORAGE_PATH || 'uploads';

// Promisify exec
const execAsync = promisify(exec);

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Ensures the directory exists
 * 
 * @param {string} dirPath - Path to the directory
 */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Downloads a file from a URL
 * 
 * @param {string} url - URL of the file to download
 * @param {string} outputPath - Path to save the file
 * @returns {Promise<string>} - Path to the downloaded file
 */
const downloadFile = async (url, outputPath) => {
  // If the URL is already a local file path, just return it
  if (url.startsWith('/')) {
    return url;
  }
  
  // If the URL is a Supabase storage URL, use the Supabase SDK to download
  if (url.includes(supabaseUrl)) {
    // Extract the bucket and path from the URL
    const urlParts = url.split('/');
    const bucketName = urlParts[urlParts.indexOf('storage') + 1];
    const objectPath = urlParts.slice(urlParts.indexOf(bucketName) + 1).join('/');
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(objectPath);
      
    if (error) {
      throw new Error(`Error downloading file from Supabase: ${error.message}`);
    }
    
    // Write the file to disk
    fs.writeFileSync(outputPath, Buffer.from(await data.arrayBuffer()));
    return outputPath;
  }
  
  // For other URLs, use axios to download
  const axios = require('axios');
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(outputPath);
  
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
};

/**
 * Creates an audio clip from a full episode
 * 
 * @param {string} audioFileUrl - URL of the original audio file
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Promise<string>} - URL of the generated clip
 */
const createAudioClip = async (audioFileUrl, startTime, endTime) => {
  try {
    // Create unique names for the files
    const uniqueId = uuidv4();
    const tempDir = path.join(storagePath, 'temp');
    ensureDirectoryExists(tempDir);
    
    const inputFilePath = path.join(tempDir, `${uniqueId}-input${path.extname(audioFileUrl) || '.mp3'}`);
    const outputFilePath = path.join(tempDir, `${uniqueId}-clip.mp3`);
    
    // Download the audio file if it's a URL
    await downloadFile(audioFileUrl, inputFilePath);
    
    // Use ffmpeg to create the clip
    await execAsync(`ffmpeg -i "${inputFilePath}" -ss ${startTime} -to ${endTime} -c:a libmp3lame -q:a 4 "${outputFilePath}"`);
    
    // Upload to Supabase Storage
    const clipFileName = `${uniqueId}-clip.mp3`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('podcast-clips')
      .upload(clipFileName, fs.createReadStream(outputFilePath), {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });
      
    if (storageError) {
      throw new Error(`Error uploading clip to storage: ${storageError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('podcast-clips')
      .getPublicUrl(clipFileName);
    
    // Clean up temp files
    fs.unlinkSync(inputFilePath);
    fs.unlinkSync(outputFilePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error creating audio clip:', error);
    throw error;
  }
};

/**
 * Creates a clip record in the database
 * 
 * @param {Object} clipData - Data for the clip
 * @returns {Promise<Object>} - The created clip record
 */
const createClipRecord = async (clipData) => {
  try {
    const { data, error } = await supabase
      .from('clips')
      .insert([clipData])
      .select();
      
    if (error) {
      throw new Error(`Error creating clip record: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    console.error('Error creating clip record:', error);
    throw error;
  }
};

/**
 * Creates an audio clip from an episode and saves the record
 * 
 * @param {Object} options - Options for clip creation
 * @returns {Promise<Object>} - The created clip record
 */
const generateClip = async ({ episode_id, start_time, end_time, transcript_text, search_query }) => {
  try {
    // Get episode details
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('audio_file_url')
      .eq('id', episode_id)
      .single();
      
    if (episodeError) {
      throw new Error(`Error fetching episode: ${episodeError.message}`);
    }
    
    // Generate clip URL (either by creating a physical clip or by using a timestamp URL)
    let audioClipUrl;
    
    // Option 1: Generate physical clip (uncomment to use this approach)
    // audioClipUrl = await createAudioClip(episode.audio_file_url, start_time, end_time);
    
    // Option 2: Use timestamp URL (simpler but requires player support for time ranges)
    audioClipUrl = `${episode.audio_file_url}#t=${start_time},${end_time}`;
    
    // Create clip record
    const clipRecord = await createClipRecord({
      episode_id,
      start_time,
      end_time,
      transcript_text,
      search_query,
      audio_clip_url: audioClipUrl
    });
    
    return clipRecord;
  } catch (error) {
    console.error('Error generating clip:', error);
    throw error;
  }
};

module.exports = {
  createAudioClip,
  createClipRecord,
  generateClip
};
