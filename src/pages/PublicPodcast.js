// src/pages/PublicPodcast.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function PublicPodcast() {
  const { podcastId } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEpisodes, setFilteredEpisodes] = useState([]);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  
  useEffect(() => {
    const fetchPodcastData = async () => {
      try {
        // Get podcast details
        const podcastResponse = await api.get(`/api/public/podcasts/${podcastId}`);
        setPodcast(podcastResponse.data);
        
        // Get episodes for this podcast
        const episodesResponse = await api.get(`/api/public/podcasts/${podcastId}/episodes`);
        setEpisodes(episodesResponse.data);
        setFilteredEpisodes(episodesResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching podcast data:', err);
        setError('Failed to load podcast');
        setLoading(false);
      }
    };
    
    fetchPodcastData();
  }, [podcastId]);
  
  // Filter episodes when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEpisodes(episodes);
    } else {
      const filtered = episodes.filter(episode => 
        episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (episode.description && episode.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredEpisodes(filtered);
    }
  }, [searchTerm, episodes]);
  
  // Sort episodes when sort order changes or filtered episodes change
  useEffect(() => {
    const sorted = [...filteredEpisodes].sort((a, b) => {
      const dateA = new Date(a.publication_date || a.created_at);
      const dateB = new Date(b.publication_date || b.created_at);
      
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredEpisodes(sorted);
  }, [sortOrder]); // Don't include filteredEpisodes in the dependency array to avoid an infinite loop
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const formatDuration = (durationInSeconds) => {
    if (!durationInSeconds) return 'Unknown';
    
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Podcast</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link 
              to="/" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-150"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!podcast) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Podcast Not Found</h1>
            <p className="text-gray-600 mb-6">The podcast you're looking for doesn't exist or has been removed.</p>
            <Link 
              to="/" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-150"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            &larr; Back to Search
          </Link>
        </div>
        
        <div className="max-w-5xl mx-auto">
          {/* Podcast Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="md:flex">
              {podcast.cover_image_url && (
                <div className="md:w-1/4 mb-4 md:mb-0 md:mr-6">
                  <img
                    src={podcast.cover_image_url}
                    alt={podcast.title}
                    className="w-full h-auto rounded"
                  />
                </div>
              )}
              <div className="md:w-3/4">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{podcast.title}</h1>
                
                {podcast.author && (
                  <p className="text-gray-600 mb-4">
                    <span className="font-medium">By:</span> {podcast.author}
                  </p>
                )}
                
                {podcast.description && (
                  <div>
                    <h2 className="text-lg font-medium mb-2">About this Podcast</h2>
                    <p className="text-gray-700 whitespace-pre-line">{podcast.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Episodes List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-semibold mb-4 md:mb-0">Episodes</h2>
              
              <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search episodes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchTerm('')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
            
            {filteredEpisodes.length === 0 ? (
              <div className="text-center py-10">
                {searchTerm ? (
                  <>
                    <p className="text-gray-600 mb-2">No episodes match your search "{searchTerm}"</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <p className="text-gray-600">No episodes available for this podcast yet.</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredEpisodes.map((episode) => (
                  <div key={episode.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <Link to={`/episodes/${episode.id}`} className="block hover:bg-gray-50 p-4 rounded-lg transition duration-150">
                      <h3 className="text-xl font-medium text-gray-800 mb-2">{episode.title}</h3>
                      
                      <div className="flex flex-wrap text-sm text-gray-600 mb-3">
                        <span className="mr-4">
                          {formatDate(episode.publication_date || episode.created_at)}
                        </span>
                        {episode.duration && (
                          <span>
                            {formatDuration(episode.duration)}
                          </span>
                        )}
                      </div>
                      
                      {episode.description && (
                        <p className="text-gray-700 line-clamp-3">{episode.description}</p>
                      )}
                      
                      <div className="mt-3 flex items-center text-blue-600">
                        <span className="mr-2">Listen</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicPodcast;
