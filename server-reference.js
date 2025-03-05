// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Assembly AI
const assemblyApiKey = process.env.ASSEMBLY_API_KEY || '7c2f6e1ac9e647a196cf5e249942c95c';
const assemblyHeaders = {
  'Authorization': assemblyApiKey,
  'Content-Type': 'application/json'
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  
  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(authorization);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is an admin
    const { data: adminData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'admin')
      .single();
      
    if (!adminData) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ROUTES

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    
    // Add user to our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ 
        id: authData.user.id, 
        email,
        role: 'admin' // Default role for now
      }]);
      
    if (userError) {
      console.error('Error creating user record:', userError);
      return res.status(500).json({ error: 'User registration failed' });
    }
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.status(401).json({ error: error.message });
    }
    
    res.json({ token: data.session.access_token, user: data.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// PODCAST ROUTES
app.post('/api/podcasts', authenticateAdmin, async (req, res) => {
  const { title, description, author, cover_image_url } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .insert([{ 
        title, 
        description, 
        author, 
        cover_image_url
      }])
      .select();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating podcast:', error);
    res.status(500).json({ error: 'Failed to create podcast' });
  }
});

app.get('/api/podcasts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .select('*');
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
});

// EPISODE ROUTES
app.post('/api/episodes', authenticateAdmin, upload.single('audio_file'), async (req, res) => {
  const { podcast_id, title, description, publication_date } = req.body;
  const audioFile = req.file;
  
  if (!audioFile) {
    return res.status(400).json({ error: 'Audio file is required' });
  }
  
  try {
    // Upload file to storage (Supabase Storage)
    const filePath = audioFile.path;
    const fileExt = path.extname(audioFile.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('podcast-audio')
      .upload(fileName, fs.createReadStream(filePath), {
        contentType: audioFile.mimetype,
        cacheControl: '3600'
      });
      
    if (storageError) {
      return res.status(400).json({ error: storageError.message });
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('podcast-audio')
      .getPublicUrl(fileName);
    
    // Create episode record
    const { data: episodeData, error: episodeError } = await supabase
      .from('episodes')
      .insert([{
        podcast_id,
        title,
        description,
        audio_file_url: publicUrl,
        publication_date: publication_date || new Date().toISOString(),
        transcription_status: 'pending'
      }])
      .select();
      
    if (episodeError) {
      return res.status(400).json({ error: episodeError.message });
    }
    
    // Clean up the local file
    fs.unlinkSync(filePath);
    
    // Initiate transcription process (async)
    startTranscription(episodeData[0].id, publicUrl);
    
    res.status(201).json(episodeData[0]);
  } catch (error) {
    console.error('Error creating episode:', error);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

app.get('/api/podcasts/:podcastId/episodes', async (req, res) => {
  const { podcastId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('podcast_id', podcastId);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

// TRANSCRIPTION FUNCTIONS
async function startTranscription(episodeId, audioUrl) {
  try {
    // Update episode status
    await supabase
      .from('episodes')
      .update({ transcription_status: 'in_progress' })
      .eq('id', episodeId);
    
    // Request transcription from Assembly AI
    const response = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      { audio_url: audioUrl },
      { headers: assemblyHeaders }
    );
    
    const transcriptId = response.data.id;
    
    // Poll for transcription completion
    pollTranscriptionStatus(transcriptId, episodeId);
  } catch (error) {
    console.error('Error starting transcription:', error);
    // Update episode status to failed
    await supabase
      .from('episodes')
      .update({ transcription_status: 'failed' })
      .eq('id', episodeId);
  }
}

async function pollTranscriptionStatus(transcriptId, episodeId) {
  try {
    const response = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: assemblyHeaders }
    );
    
    const transcriptionStatus = response.data.status;
    
    if (transcriptionStatus === 'completed') {
      // Save transcript
      await saveTranscript(episodeId, response.data);
    } else if (transcriptionStatus === 'error') {
      // Update episode status to failed
      await supabase
        .from('episodes')
        .update({ transcription_status: 'failed' })
        .eq('id', episodeId);
    } else {
      // Check again in 30 seconds
      setTimeout(() => pollTranscriptionStatus(transcriptId, episodeId), 30000);
    }
  } catch (error) {
    console.error('Error polling transcription status:', error);
    setTimeout(() => pollTranscriptionStatus(transcriptId, episodeId), 30000);
  }
}

async function saveTranscript(episodeId, transcriptData) {
  try {
    // Save raw transcript
    const { data: transcriptRecord, error: transcriptError } = await supabase
      .from('transcripts')
      .insert([{
        episode_id: episodeId,
        raw_transcript: transcriptData
      }])
      .select();
      
    if (transcriptError) {
      throw new Error(transcriptError.message);
    }
    
    // Process words into segments
    if (transcriptData.words && transcriptData.words.length > 0) {
      // Group words into segments (approx. 30 second chunks)
      const segmentDuration = 30; // seconds
      let currentSegment = [];
      let segmentStart = transcriptData.words[0].start / 1000; // Convert to seconds
      let segmentText = '';
      
      const segments = [];
      
      for (const word of transcriptData.words) {
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
          throw new Error(segmentsError.message);
        }
      }
    }
    
    // Update episode status
    await supabase
      .from('episodes')
      .update({ 
        transcription_status: 'completed',
        duration: Math.ceil(transcriptData.audio_duration / 1000) // Convert to seconds
      })
      .eq('id', episodeId);
    
  } catch (error) {
    console.error('Error saving transcript:', error);
    
    // Update episode status to failed
    await supabase
      .from('episodes')
      .update({ transcription_status: 'failed' })
      .eq('id', episodeId);
  }
}

// SEARCH ROUTES
app.get('/api/search', async (req, res) => {
  const { query, podcast_id } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
    // First, handle exact phrase matches in postgres
    let segmentsQuery = supabase
      .from('transcript_segments')
      .select(`
        id,
        start_time,
        end_time,
        text,
        episode_id,
        episodes!inner(
          id,
          title,
          podcast_id,
          audio_file_url
        )
      `)
      .textSearch('text_search', query, { 
        type: 'plain',
        config: 'english'
      });
    
    // Add podcast filter if provided
    if (podcast_id) {
      segmentsQuery = segmentsQuery.eq('episodes.podcast_id', podcast_id);
    }
    
    const { data: segments, error: segmentsError } = await segmentsQuery;
    
    if (segmentsError) {
      return res.status(400).json({ error: segmentsError.message });
    }
    
    // Transform the results to include episode data
    const results = segments.map(segment => ({
      segment_id: segment.id,
      episode_id: segment.episode_id,
      episode_title: segment.episodes.title,
      podcast_id: segment.episodes.podcast_id,
      start_time: segment.start_time,
      end_time: segment.end_time,
      text: segment.text,
      audio_file_url: segment.episodes.audio_file_url
    }));
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// CLIP GENERATION ROUTE
app.post('/api/clips', async (req, res) => {
  const { episode_id, start_time, end_time, transcript_text, search_query } = req.body;
  
  if (!episode_id || start_time === undefined || end_time === undefined) {
    return res.status(400).json({ error: 'Episode ID, start time, and end time are required' });
  }
  
  try {
    // Get episode details
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('audio_file_url')
      .eq('id', episode_id)
      .single();
      
    if (episodeError) {
      return res.status(400).json({ error: episodeError.message });
    }
    
    // Generate clip using ffmpeg (this would be implemented separately)
    // For now, we'll just create a record
    
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .insert([{
        episode_id,
        start_time,
        end_time,
        transcript_text,
        search_query,
        // In a real implementation, we would generate the clip and update this URL
        audio_clip_url: `${episode.audio_file_url}#t=${start_time},${end_time}`
      }])
      .select();
      
    if (clipError) {
      return res.status(400).json({ error: clipError.message });
    }
    
    res.status(201).json(clip[0]);
  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: 'Failed to create clip' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
