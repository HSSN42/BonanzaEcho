// src/utils/searchUtils.js
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Performs a basic text search on transcript segments
 * 
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - The search results
 */
const basicSearch = async (query, options = {}) => {
  try {
    // Build the search query
    let searchQuery = supabase
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
          audio_file_url,
          podcasts!inner(
            id,
            title
          )
        )
      `)
      .textSearch('text_search', query, { 
        type: 'plain',
        config: 'english'
      });
    
    // Add podcast filter if provided
    if (options.podcast_id) {
      searchQuery = searchQuery.eq('episodes.podcast_id', options.podcast_id);
    }
    
    // Add limit if provided
    if (options.limit) {
      searchQuery = searchQuery.limit(options.limit);
    }
    
    const { data: segments, error } = await searchQuery;
    
    if (error) {
      throw new Error(`Search error: ${error.message}`);
    }
    
    // Transform the results for easier consumption
    const results = segments.map(segment => ({
      segment_id: segment.id,
      episode_id: segment.episode_id,
      episode_title: segment.episodes.title,
      podcast_id: segment.episodes.podcast_id,
      podcast_title: segment.episodes.podcasts.title,
      start_time: segment.start_time,
      end_time: segment.end_time,
      text: segment.text,
      audio_file_url: segment.episodes.audio_file_url
    }));
    
    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

/**
 * Performs a combined search using both text and semantic approaches
 * 
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - The search results
 */
const searchTranscripts = async (query, options = {}) => {
  try {
    // Get basic text search results
    const results = await basicSearch(query, options);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

/**
 * Gets related keywords for a search query
 * 
 * @param {string} query - The search query
 * @returns {Promise<Array>} - Related keywords
 */
const getRelatedKeywords = async (query) => {
  try {
    // This is a simple implementation that finds words that appear frequently
    // with the query words in the transcript segments
    
    // Split the query into words
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    
    if (queryWords.length === 0) {
      return [];
    }
    
    // Build the query to find segments containing any of the query words
    let textSearchQuery = '';
    queryWords.forEach((word, index) => {
      if (index > 0) textSearchQuery += ' | ';
      textSearchQuery += word;
    });
    
    // Get segments containing the query words
    const { data: segments, error } = await supabase
      .from('transcript_segments')
      .select('text')
      .textSearch('text_search', textSearchQuery, { type: 'plain' })
      .limit(50);
      
    if (error) {
      throw new Error(`Error fetching related keywords: ${error.message}`);
    }
    
    // Extract all words from the segments
    const allWords = segments
      .flatMap(segment => segment.text.toLowerCase().split(/\s+/))
      .filter(word => word.length > 3) // Only consider words longer than 3 characters
      .filter(word => !queryWords.includes(word)); // Exclude the original query words
    
    // Count word frequencies
    const wordCounts = {};
    allWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency and return top 10
    const relatedKeywords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return relatedKeywords;
  } catch (error) {
    console.error('Error getting related keywords:', error);
    return [];
  }
};

module.exports = {
  basicSearch,
  searchTranscripts,
  getRelatedKeywords
};
