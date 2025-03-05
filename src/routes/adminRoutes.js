// src/routes/adminRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { transcribeEpisode } = require('../utils/assemblyAI');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.env.STORAGE_PATH || 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Limit file size to 500MB
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB in bytes
});

/**
 * @route   GET /api/admin/podcasts
 * @desc    Get all podcasts
 * @access  Admin
 */
router.get('/podcasts', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('title');
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching podcasts:', err);
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
});

/**
 * @route   POST /api/admin/podcasts
 * @desc    Create a new podcast
 * @access  Admin
 */
router.post('/podcasts', authenticateAdmin, async (req, res) => {
  const { title, description, author, cover_image_url } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Podcast title is required' });
  }
  
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
  } catch (err) {
    console.error('Error creating podcast:', err);
    res.status(500).json({ error: 'Failed to create podcast' });
  }
});

/**
 * @route   GET /api/admin/podcasts/:podcastId
 * @desc    Get a specific podcast
 * @access  Admin
 */
router.get('/podcasts/:podcastId', authenticateAdmin, async (req, res) => {
  const { podcastId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', podcastId)
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching podcast:', err);
    res.status(500).json({ error: 'Failed to fetch podcast' });
  }
});

/**
 * @route   PUT /api/admin/podcasts/:podcastId
 * @desc    Update a podcast
 * @access  Admin
 */
router.put('/podcasts/:podcastId', authenticateAdmin, async (req, res) => {
  const { podcastId } = req.params;
  const { title, description, author, cover_image_url } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Podcast title is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .update({ 
        title, 
        description, 
        author, 
        cover_image_url
      })
      .eq('id', podcastId)
      .select();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    
    res.json(data[0]);
  } catch (err) {
    console.error('Error updating podcast:', err);
    res.status(500).json({ error: 'Failed to update podcast' });
  }
});

/**
 * @route   DELETE /api/admin/podcasts/:podcastId
 * @desc    Delete a podcast
 * @access  Admin
 */
router.delete('/podcasts/:podcastId', authenticateAdmin, async (req, res) => {
  const { podcastId } = req.params;
  
  try {
    // First get all episodes for this podcast
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('podcast_id', podcastId);
      
    if (episodesError) {
      return res.status(400).json({ error: episodesError.message });
    }
    
    // Delete all associated transcripts and segments
    for (const episode of episodes) {
      // Delete transcript segments
      await supabase
        .from('transcript_segments')
        .delete()
        .eq('episode_id', episode.id);
      
      // Delete transcripts
      await supabase
        .from('transcripts')
        .delete()
        .eq('episode_id', episode.id);
      
      // Delete clips
      await supabase
        .from('clips')
        .delete()
        .eq('episode_id', episode.id);
    }
    
    // Delete all episodes
    await supabase
      .from('episodes')
      .delete()
      .eq('podcast_id', podcastId);
    
    // Finally delete the podcast
    const { error } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', podcastId);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: 'Podcast deleted successfully' });
  } catch (err) {
    console.error('Error deleting podcast:', err);
    res.status(500).json({ error: 'Failed to delete podcast' });
  }
});

/**
 * @route   GET /api/admin/podcasts/:podcastId/episodes
 * @desc    Get episodes for a specific podcast
 * @access  Admin
 */
router.get('/podcasts/:podcastId/episodes', authenticateAdmin, async (req, res) => {
  const { podcastId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('podcast_id', podcastId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching episodes:', err);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

/**
 * @route   POST /api/admin/episodes
 * @desc    Create a new episode with audio file upload
 * @access  Admin
 */
router.post('/episodes', authenticateAdmin, upload.single('audio_file'), async (req, res) => {
  const { podcast_id, title, description } = req.body;
  const audioFile = req.file;
  
  if (!podcast_id) {
    return res.status(400).json({ error: 'Podcast ID is required' });
  }
  
  if (!title) {
    return res.status(400).json({ error: 'Episode title is required' });
  }
  
  if (!audioFile) {
    return res.status(400).json({ error: 'Audio file is required' });
  }
  
  try {
    // Upload file to Supabase Storage
    const filePath = audioFile.path;
    const fileExt = path.extname(audioFile.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    
    const fileData = await fs.promises.readFile(filePath);
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('podcast-audio')
      .upload(fileName, fileData, {
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
        publication_date: new Date().toISOString(),
        transcription_status: 'pending'
      }])
      .select();
      
    if (episodeError) {
      return res.status(400).json({ error: episodeError.message });
    }
    
    // Clean up the local file
    fs.unlinkSync(filePath);
    
    // Initiate transcription process (async)
    transcribeEpisode(episodeData[0].id, publicUrl).catch(err => {
      console.error('Transcription error:', err);
    });
    
    res.status(201).json(episodeData[0]);
  } catch (err) {
    console.error('Error creating episode:', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

/**
 * @route   GET /api/admin/episodes/:episodeId
 * @desc    Get a specific episode
 * @access  Admin
 */
router.get('/episodes/:episodeId', authenticateAdmin, async (req, res) => {
  const { episodeId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episodeId)
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching episode:', err);
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
});

/**
 * @route   PUT /api/admin/episodes/:episodeId
 * @desc    Update an episode
 * @access  Admin
 */
router.put('/episodes/:episodeId', authenticateAdmin, async (req, res) => {
  const { episodeId } = req.params;
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Episode title is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('episodes')
      .update({ 
        title, 
        description
      })
      .eq('id', episodeId)
      .select();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    
    res.json(data[0]);
  } catch (err) {
    console.error('Error updating episode:', err);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

/**
 * @route   DELETE /api/admin/episodes/:episodeId
 * @desc    Delete an episode
 * @access  Admin
 */
router.delete('/episodes/:episodeId', authenticateAdmin, async (req, res) => {
  const { episodeId } = req.params;
  
  try {
    // Delete transcript segments
    await supabase
      .from('transcript_segments')
      .delete()
      .eq('episode_id', episodeId);
    
    // Delete transcripts
    await supabase
      .from('transcripts')
      .delete()
      .eq('episode_id', episodeId);
    
    // Delete clips
    await supabase
      .from('clips')
      .delete()
      .eq('episode_id', episodeId);
    
    // Delete the episode
    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', episodeId);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: 'Episode deleted successfully' });
  } catch (err) {
    console.error('Error deleting episode:', err);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

/**
 * @route   GET /api/admin/episodes/:episodeId/transcript
 * @desc    Get transcript for a specific episode
 * @access  Admin
 */
router.get('/episodes/:episodeId/transcript', authenticateAdmin, async (req, res) => {
  const { episodeId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('episode_id', episodeId)
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching transcript:', err);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

/**
 * @route   POST /api/admin/episodes/:episodeId/retry-transcription
 * @desc    Retry transcription for an episode
 * @access  Admin
 */
router.post('/episodes/:episodeId/retry-transcription', authenticateAdmin, async (req, res) => {
  const { episodeId } = req.params;
  
  try {
    // Get episode details
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('audio_file_url')
      .eq('id', episodeId)
      .single();
      
    if (episodeError) {
      return res.status(400).json({ error: episodeError.message });
    }
    
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    
    // Update episode status
    await supabase
      .from('episodes')
      .update({ transcription_status: 'pending' })
      .eq('id', episodeId);
    
    // Start transcription process (async)
    transcribeEpisode(episodeId, episode.audio_file_url).catch(err => {
      console.error('Transcription retry error:', err);
    });
    
    res.json({ message: 'Transcription retry initiated' });
  } catch (err) {
    console.error('Error retrying transcription:', err);
    res.status(500).json({ error: 'Failed to retry transcription' });
  }
});

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // Get podcasts count
    const { count: podcastCount, error: podcastError } = await supabase
      .from('podcasts')
      .select('*', { count: 'exact', head: true });
    
    if (podcastError) {
      return res.status(400).json({ error: podcastError.message });
    }
    
    // Get episodes count
    const { count: episodeCount, error: episodeError } = await supabase
      .from('episodes')
      .select('*', { count: 'exact', head: true });
    
    if (episodeError) {
      return res.status(400).json({ error: episodeError.message });
    }
    
    // Get transcription status counts
    const { data: episodeStatusData, error: statusError } = await supabase
      .from('episodes')
      .select('transcription_status');
    
    if (statusError) {
      return res.status(400).json({ error: statusError.message });
    }
    
    // Calculate status counts
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0
    };
    
    episodeStatusData.forEach(episode => {
      const status = episode.transcription_status;
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });
    
    // Get recent episodes
    const { data: recentEpisodes, error: recentError } = await supabase
      .from('episodes')
      .select(`
        id,
        title,
        created_at,
        transcription_status,
        podcast_id,
        podcasts(title)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      return res.status(400).json({ error: recentError.message });
    }
    
    res.json({
      podcasts: {
        total: podcastCount
      },
      episodes: {
        total: episodeCount,
        transcription_status: statusCounts
      },
      recent_episodes: recentEpisodes
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
