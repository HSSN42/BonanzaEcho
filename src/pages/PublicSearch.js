// src/pages/PublicSearch.js
import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function PublicSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPodcast, setSelectedPodcast] = useState('');
  const [podcasts, setPodcasts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState('');
  const [currentClip, setCurrentClip] = useState(null);
  const audioRef = useRef(null);
  
  // Get all podcasts for the filter dropdown
  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const response = await api.get('/api/public/podcasts');
        setPodcasts(response.data);
        setInitialLoad(false);
      } catch (err) {
        console.error('Error fetching podcasts:', err);
        setError('Failed to load podcasts');
        setInitialLoad(false);
      }
    };
    
    fetchPodcasts();
  }, []);
  
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      return;
    }
    
    setLoading(true);
    setNoResults(false);
    setSearchResults([]);
    setError('');
    setCurrentClip(null);
    
    try {
      // Add podcast filter if selected
      const podcastParam = selectedPodcast ? `&podcast_id=${selectedPodcast}` : '';
      
      const response = await api.get(`/api/public/search?query=${encodeURIComponent(searchTerm)}${podcastParam}`);
      const results = response.data;
      
      setSearchResults(results);
      setNoResults(results.length === 0);
      setLoading(false);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search');
      setLoading(false);
    }
  };
  
  const createClip = async (result) => {
    try {
      const response = await api.post('/api/public/clips', {
        episode_id: result.episode_id,
        start_time: Math.max(0, result.start_time - 3), // Start 3 seconds before the match
        end_time: result.end_time + 3, // End 3 seconds after the match
        transcript_text: result.text,
        search_query: searchTerm
      });
      
      setCurrentClip(response.data);
      
      // Play the clip
      if (audioRef.current) {
        audioRef.current.src = response.data.audio_clip_url;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('Error creating clip:', err);
      setError('Failed to create clip');
    }
  };
  
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const highlightMatchText = (text, query) => {
    if (!query) return text;
    
    // Simple highlight by splitting on the query term
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className="bg-yellow-200">{part}</span> 
        : part
    );
  };
  
  const shareClip = (clip) => {
    // Generate shareable URL
    const shareUrl = `${window.location.origin}/share/${clip.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };
  
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Podcast Search</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Search for specific content across our podcast library. Find the exact moments you're looking for.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 max-w-3xl mx-auto">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-3xl mx-auto">
          <form onSubmit={handleSearch}>
            <div className="mb-4">
              <label htmlFor="searchTerm" className="block text-gray-700 font-medium mb-2">
                What are you looking for?
              </label>
              <input
                id="searchTerm"
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter keywords or phrases"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="podcastFilter" className="block text-gray-700 font-medium mb-2">
                Filter by Podcast (Optional)
              </label>
              <select
                id="podcastFilter"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPodcast}
                onChange={(e) => setSelectedPodcast(e.target.value)}
              >
                <option value="">All Podcasts</option>
                {podcasts.map((podcast) => (
                  <option key={podcast.id} value={podcast.id}>
                    {podcast.title}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : 'Search'}
            </button>
          </form>
        </div>
        
        {/* Current Clip Player */}
        {currentClip && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Audio Clip</h2>
              <button
                onClick={() => shareClip(currentClip)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-150"
              >
                Share Clip
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                From episode: <span className="font-medium">{searchResults.find(r => r.episode_id === currentClip.episode_id)?.episode_title}</span>
              </p>
              <p className="text-sm text-gray-600">
                Time: {formatTime(currentClip.start_time)} - {formatTime(currentClip.end_time)}
              </p>
            </div>
            
            <audio
              ref={audioRef}
              src={currentClip.audio_clip_url}
              className="w-full mb-4"
              controls
              autoPlay
            />
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800">{highlightMatchText(currentClip.transcript_text, searchTerm)}</p>
            </div>
          </div>
        )}
        
        {/* Search Results */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            
            <div className="mb-4 text-gray-600">
              Found {searchResults.length} results for "{searchTerm}"
            </div>
            
            <div className="space-y-6">
              {searchResults.map((result, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{result.episode_title}</h3>
                      <p className="text-gray-600">
                        Time: {formatTime(result.start_time)}
                      </p>
                    </div>
                    <button
                      onClick={() => createClip(result)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150"
                    >
                      Play Clip
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800">{highlightMatchText(result.text, searchTerm)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : noResults ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-3xl mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No results found</h3>
            <p className="text-gray-600 mb-4">
              We couldn't find any matches for "{searchTerm}"
            </p>
            <div className="text-sm text-gray-500">
              <p>Suggestions:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Check your spelling</li>
                <li>Try more general keywords</li>
                <li>Try different keywords</li>
                <li>Try searching in a specific podcast</li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PublicSearch;
