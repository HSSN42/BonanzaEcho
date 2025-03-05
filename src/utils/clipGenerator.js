// src/utils/clipGenerator.js
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    // Use timestamp URL (simpler but requires player support for time ranges)
    const audioClipUrl = `${episode.audio_file_url}#t=${start_time},${end_time}`;
    
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
  createClipRecord,
  generateClip
};
