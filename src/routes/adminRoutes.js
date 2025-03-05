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
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max file size
  }
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
        cover_image_url,
        updated_at: new Date()
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
    // We'll rely on cascading deletes for the episodes and transcripts
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
      .order('publication_date', { ascending: false });
      
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
 * @desc    Create a new episode
 * @access  Admin
 */
router.post('/episodes', authenticateAdmin, upload.single('audio_file'), async (req, res) => {
  const { podcast_id, title, description, publication_date } = req.body;
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
    // Upload file to storage (Supabase Storage)
    const filePath = audioFile.path;
    const fileExt = path.extname(audioFile.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    
    const fileStream = fs.createReadStream(filePath);
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('podcast-audio')
      .upload(fileName, fileStream, {
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
    transcribeEpisode(episodeData[0].id, publicUrl)
      .then(result => {
        console.log('Transcription started:', result);
      })
      .catch(err => {
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
  const { title, description, publication_date } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Episode title is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('episodes')
      .update({ 
        title, 
        description, 
        publication_date,
        updated_at: new Date()
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
    // First, get the episode to find its audio file URL
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('audio_file_url')
      .eq('id', episodeId)
      .single();
      
    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }
    
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    // Delete the episode
    const { error: deleteError } = await supabase
      .from('episodes')
      .delete()
      .eq('id', episodeId);
      
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }
    
    // Try to delete the audio file from storage if it exists
    if (episode.audio_file_url) {
      try {
        // Extract the filename from the URL
        const url = new URL(episode.audio_file_url);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop();
        
        if (filename) {
          const { error: storageError } = await supabase.storage
            .from('podcast-audio')
            .remove([filename]);
            
          if (storageError) {
            console.error('Error deleting audio file:', storageError);
            // Continue with the response anyway since the DB record is deleted
          }
        }
      } catch (err) {
        console.error('Error parsing audio file URL:', err);
        // Continue with the response anyway
      }
    }
    
    res.json({ message: 'Episode deleted successfully' });
  } catch (err) {
    console.error('Error deleting episode:', err);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

/**
 * @route   GET /api/admin/episodes/:episodeId/transcript
 * @desc    Get the transcript for an episode
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

module.exports = router;