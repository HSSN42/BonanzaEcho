// src/utils/assemblyAI.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const assemblyApiKey = process.env.ASSEMBLY_API_KEY || '7c2f6e1ac9e647a196cf5e249942c95c';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Assembly AI headers
const assemblyHeaders = {
  'Authorization': assemblyApiKey,
  'Content-Type': 'application/json'
};

/**
 * Requests transcription from Assembly AI
 * 
 * @param {string} audioUrl - URL of the audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<string>} - The transcription ID
 */
const requestTranscription = async (audioUrl, options = {}) => {
  try {
    const response = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: audioUrl,
        speaker_labels: options.speakerLabels || false,
        punctuate: options.punctuate || true,
        format_text: options.formatText || true,
        // Add more options as needed
      },
      { headers: assemblyHeaders }
    );
    
    return response.data.id;
  } catch (error) {
    console.error('Error requesting transcription from Assembly AI:', error);
    throw error;
  }
};

/**
 * Gets the transcription result from Assembly AI
 * 
 * @param {string} transcriptId - The ID of the transcription
 * @returns {Promise<Object>} - The transcription result
 */
const getTranscriptionResult = async (transcriptId) => {
  try {
    const response = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: assemblyHeaders }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting transcription result from Assembly AI:', error);
    throw error;
  }
};

/**
 * Polls for transcription completion
 * 
 * @param {string} transcriptId - The ID of the transcription
 * @param {number} interval - Polling interval in milliseconds
 * @param {number} maxAttempts - Maximum number of polling attempts
 * @returns {Promise<Object>} - The completed transcription
 */
const pollForTranscriptionCompletion = async (transcriptId, interval = 30000, maxAttempts = 20) => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const result = await getTranscriptionResult(transcriptId);
    
    if (result.status === 'completed') {
      return result;
    } else if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error}`);
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }
  
  throw new Error('Transcription timed out');
};

/**
 * Processes a completed transcription and stores it in Supabase
 * 
 * @param {string} episodeId - The ID of the episode
 * @param {Object} transcriptionData - The transcription data from Assembly AI
 */
const processTranscription = async (episodeId, transcriptionData) => {
  try {
    // Step 1: Save raw transcript
    const { data: transcriptRecord, error: transcriptError } = await supabase
      .from('transcripts')
      .insert([{
        episode_id: episodeId,
        raw_transcript: transcriptionData
      }])
      .select();
      
    if (transcriptError) {
      throw new Error(`Error saving transcript: ${transcriptError.message}`);
    }
    
    // Step 2: Process words into segments
    if (transcriptionData.words && transcriptionData.words.length > 0) {
      // Group words into segments (approx. 30 second chunks)
      const segmentDuration = 30; // seconds
      let currentSegment = [];
      let segmentStart = transcriptionData.words[0].start / 1000; // Convert to seconds
      let segmentText = '';
      
      const segments = [];
      
      for (const word of transcriptionData.words) {
        const wordStart = word.start / 1000; // Convert to seconds
        const wordEnd = word.end / 1000;
        
        // If this word would extend the segment beyond our limit, save the current segment
        if (wordEnd - segmentStart > segmentDuration && currentSegment.length > 0) {
          segments.push({
            transcript_id: transcriptRecord[0].id,
            episode_id: episodeId,
            start_time: segmentStart,
            end_time: currentSegment[currentSegment.length - 1].end / 1000,
            text: segmentText.trim()
          });
          
          // Start a new segment
          segmentStart = wordStart;
          segmentText = '';
          currentSegment = [];
        }
        
        currentSegment.push(word);
        segmentText += ` ${word.text}`;
      }
      
      // Add the final segment if there are any words left
      if (currentSegment.length > 0) {
        segments.push({
          transcript_id: transcriptRecord[0].id,
          episode_id: episodeId,
          start_time: segmentStart,
          end_time: currentSegment[currentSegment.length - 1].end / 1000,
          text: segmentText.trim()
        });
      }
      
      // Save all segments
      if (segments.length > 0) {
        const { error: segmentsError } = await supabase
          .from('transcript_segments')
          .insert(segments);
          
        if (segmentsError) {
          throw new Error(`Error saving segments: ${segmentsError.message}`);
        }
      }
    }
    
    // Step 3: Update episode with duration and status
    const { error: episodeError } = await supabase
      .from('episodes')
      .update({ 
        transcription_status: 'completed',
        duration: Math.ceil(transcriptionData.audio_duration / 1000) // Convert to seconds
      })
      .eq('id', episodeId);
      
    if (episodeError) {
      throw new Error(`Error updating episode: ${episodeError.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error processing transcription:', error);
    
    // Update episode status to failed
    await supabase
      .from('episodes')
      .update({ transcription_status: 'failed' })
      .eq('id', episodeId);
      
    throw error;
  }
};

/**
 * Runs the complete transcription process
 * 
 * @param {string} episodeId - The ID of the episode
 * @param {string} audioUrl - URL of the audio file
 * @param {Object} options - Transcription options
 */
const transcribeEpisode = async (episodeId, audioUrl, options = {}) => {
  try {
    // Update episode status to in_progress
    await supabase
      .from('episodes')
      .update({ transcription_status: 'in_progress' })
      .eq('id', episodeId);
    
    // Request transcription
    const transcriptId = await requestTranscription(audioUrl, options);
    
    // Poll for completion
    const transcriptionData = await pollForTranscriptionCompletion(transcriptId);
    
    // Process and store the transcription
    await processTranscription(episodeId, transcriptionData);
    
    return {
      success: true,
      transcriptId
    };
  } catch (error) {
    console.error('Transcription process error:', error);
    
    // Update episode status to failed
    await supabase
      .from('episodes')
      .update({ transcription_status: 'failed' })
      .eq('id', episodeId);
    
    return {
      success: false,
      error: error.message || 'Transcription failed'
    };
  }
};

module.exports = {
  requestTranscription,
  getTranscriptionResult,
  pollForTranscriptionCompletion,
  processTranscription,
  transcribeEpisode
};
