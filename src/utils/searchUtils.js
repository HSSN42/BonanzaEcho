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
 * Enhances search results with contextual segments
 * 
 * @param {Array} results - The basic search results
 * @param {Object} options - Context options
 * @returns {Promise<Array>} - The enhanced search results
 */
const addContextToResults = async (results, options = {}) => {
  const contextSize = options.contextSize || 1; // Number of segments before and after
  
  // If context size is 0, return the original results
  if (contextSize <= 0) {
    return results;
  }
  
  try {
    // For each result, fetch surrounding segments
    const enhancedResults = await Promise.all(results.map(async (result) => {
      // Get the segments before and after the matched segment
      const { data: contextSegments, error } = await supabase
        .from('transcript_segments')
        .select('id, start_time, end_time, text')
        .eq('episode_id', result.episode_id)
        .or(`start_time.gte.${result.start_time - (contextSize * 30)},end_time.lte.${result.end_time + (contextSize * 30)}`)
        .order('start_time');
        
      if (error) {
        console.error('Error fetching context segments:', error);
        return result;
      }
      
      const matchedSegmentIndex = contextSegments.findIndex(seg => seg.id === result.segment_id);
      
      // Add context to the result
      return {
        ...result,
        context_before: matchedSegmentIndex > 0 ? contextSegments.slice(0, matchedSegmentIndex) : [],
        context_after: matchedSegmentIndex < contextSegments.length - 1 ? contextSegments.slice(matchedSegmentIndex + 1) : []
      };
    }));
    
    return enhancedResults;
  } catch (error) {
    console.error('Error adding context to results:', error);
    // If there's an error, return the original results
    return results;
  }
};

/**
 * Performs semantic search using vector similarity
 * (Note: This requires the pgvector extension and vector embeddings)
 * 
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - The search results
 */
const semanticSearch = async (query, options = {}) => {
  // This is a placeholder for implementing semantic search
  // Actual implementation would require:
  // 1. Generating vector embeddings for the query
  // 2. Finding segments with similar vector embeddings
  console.log('Semantic search is not implemented yet');
  
  // Fall back to basic search
  return basicSearch(query, options);
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
    let results = await basicSearch(query, options);
    
    // If semantic search is enabled and results are limited, try to get more relevant results
    if (options.semanticSearch && options.limit && results.length < options.limit) {
      const semanticResults = await semanticSearch(query, {
        ...options,
        limit: options.limit - results.length
      });
      
      // Combine results, removing duplicates
      const seenIds = new Set(results.map(r => r.segment_id));
      for (const result of semanticResults) {
        if (!seenIds.has(result.segment_id)) {
          results.push(result);
          seenIds.add(result.segment_id);
        }
      }
    }
    
    // Add context segments if requested
    if (options.includeContext) {
      results = await addContextToResults(results, {
        contextSize: options.contextSize || 1
      });
    }
    
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
  semanticSearch,
  searchTranscripts,
  addContextToResults,
  getRelatedKeywords
};
