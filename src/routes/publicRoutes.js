// src/routes/publicRoutes.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { searchTranscripts, getRelatedKeywords } = require('../utils/searchUtils');
const { generateClip } = require('../utils/clipGenerator');

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @route   GET /api/public/podcasts
 * @desc    Get all podcasts
 * @access  Public
 */
router.get('/podcasts', async (req, res) => {
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
 * @route   GET /api/public/podcasts/:podcastId
 * @desc    Get a specific podcast
 * @access  Public
 */
router.get('/podcasts/:podcastId', async (req, res) => {
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
 * @route   GET /api/public/podcasts/:podcastId/episodes
 * @desc    Get episodes for a specific podcast
 * @access  Public
 */
router.get('/podcasts/:podcastId/episodes', async (req, res) => {
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
 * @route   GET /api/public/episodes/:episodeId
 * @desc    Get a specific episode
 * @access  Public
 */
router.get('/episodes/:episodeId', async (req, res) => {
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
 * @route   GET /api/public/episodes/:episodeId/segments
 * @desc    Get transcript segments for a specific episode
 * @access  Public
 */
router.get('/episodes/:episodeId/segments', async (req, res) => {
  const { episodeId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('transcript_segments')
      .select('*')
      .eq('episode_id', episodeId)
      .order('start_time');
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching transcript segments:', err);
    res.status(500).json({ error: 'Failed to fetch transcript segments' });
  }
});

/**
 * @route   GET /api/public/search
 * @desc    Search through transcripts
 * @access  Public
 */
router.get('/search', async (req, res) => {
  const { query, podcast_id, limit = 20, include_context } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
    const results = await searchTranscripts(query, {
      podcast_id,
      limit: parseInt(limit),
      includeContext: include_context === 'true',
      contextSize: 1
    });
    
    // Get related keywords if there are results
    let relatedKeywords = [];
    if (results.length > 0) {
      relatedKeywords = await getRelatedKeywords(query);
    }
    
    res.json({
      results,
      related_keywords: relatedKeywords
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * @route   POST /api/public/clips
 * @desc    Create a clip from an episode
 * @access  Public
 */
router.post('/clips', async (req, res) => {
  const { episode_id, start_time, end_time, transcript_text, search_query } = req.body;
  
  if (!episode_id || start_time === undefined || end_time === undefined) {
    return res.status(400).json({ error: 'Episode ID, start time, and end time are required' });
  }
  
  try {
    const clip = await generateClip({
      episode_id,
      start_time,
      end_time,
      transcript_text,
      search_query
    });
    
    res.status(201).json(clip);
  } catch (err) {
    console.error('Error creating clip:', err);
    res.status(500).json({ error: 'Failed to create clip' });
  }
});

/**
 * @route   GET /api/public/clips/:clipId
 * @desc    Get a specific clip
 * @access  Public
 */
router.get('/clips/:clipId', async (req, res) => {
  const { clipId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching clip:', err);
    res.status(500).json({ error: 'Failed to fetch clip' });
  }
});

module.exports = router;
