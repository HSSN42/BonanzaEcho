// src/pages/Search.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPodcast, setSelectedPodcast] = useState('');
  const [podcasts, setPodcasts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState('');
  const [currentClip, setCurrentClip] = useState(null);
  const audioRef = useRef(null);
  
  // Get all podcasts for the filter dropdown
  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const response = await api.get('/api/podcasts');
        setPodcasts(response.data);
      } catch (err) {
        console.error('Error fetching podcasts:', err);
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
    
    try {
      // Add podcast filter if selected
      const podcastParam = selectedPodcast ? `&podcast_id=${selectedPodcast}` : '';
      
      const response = await api.get(`/api/search?query=${encodeURIComponent(searchTerm)}${podcastParam}`);
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
      const response = await api.post('/api/clips', {
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
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Search Podcasts</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="searchTerm" className="block text-gray-700 font-medium mb-2">
                Search Term
              </label>
              <input
                id="searchTerm"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter keywords or phrases"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                required
              />
            </div>
            
            <div className="md:w-1/3">
              <label htmlFor="podcastFilter" className="block text-gray-700 font-medium mb-2">
                Filter by Podcast (Optional)
              </label>
              <select
                id="podcastFilter"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            
            <div className="md:self-end">
              <button
                type="submit"
                className="w-full md:w-auto bg-blue-500 text-white py-2 px-6 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Current Clip Player */}
      {currentClip && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Clip Player</h2>
          
          <div className="mb-2">
            <p className="text-sm text-gray-600">
              From episode: <Link to={`/episodes/${currentClip.episode_id}`} className="text-blue-500 hover:text-blue-700">{searchResults.find(r => r.episode_id === currentClip.episode_id)?.episode_title}</Link>
            </p>
            <p className="text-sm text-gray-600">
              Time: {formatTime(currentClip.start_time)} - {formatTime(currentClip.end_time)}
            </p>
          </div>
          
          <audio
            ref={audioRef}
            src={currentClip.audio_clip_url}
            className="w-full mb-2"
            controls
            autoPlay
          />
          
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-800">{highlightMatchText(currentClip.transcript_text, searchTerm)}</p>
          </div>
        </div>
      )}
      
      {/* Search Results */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Search Results</h2>
          
          <div className="mb-2 text-sm text-gray-600">
            Found {searchResults.length} results for "{searchTerm}"
          </div>
          
          <div className="space-y-6">
            {searchResults.map((result, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{result.episode_title}</h3>
                    <p className="text-sm text-gray-600">
                      Time: {formatTime(result.start_time)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => createClip(result)}
                      className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    >
                      Play Clip
                    </button>
                    <Link
                      to={`/episodes/${result.episode_id}`}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                      View Episode
                    </Link>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-800">{highlightMatchText(result.text, searchTerm)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : noResults ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No results found for "{searchTerm}"</p>
          <p className="text-sm text-gray-500 mt-2">Try different keywords or check your spelling</p>
        </div>
      ) : null}
    </div>
  );
}

export default Search;
