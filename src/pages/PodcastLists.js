// src/pages/PodcastsList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function PodcastsList() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const response = await api.get('/api/podcasts');
        setPodcasts(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching podcasts:', err);
        setError('Failed to load podcasts');
        setLoading(false);
      }
    };
    
    fetchPodcasts();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading podcasts...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded">
        {error}
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Podcasts</h1>
        <Link
          to="/podcasts/create"
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Add New Podcast
        </Link>
      </div>
      
      {podcasts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500 mb-4">No podcasts yet. Create your first podcast!</p>
          <Link
            to="/podcasts/create"
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Create Podcast
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {podcasts.map((podcast) => (
            <div key={podcast.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {podcast.cover_image_url ? (
                  <img
                    src={podcast.cover_image_url}
                    alt={podcast.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400">No Cover Image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{podcast.title}</h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {podcast.description || 'No description available'}
                </p>
                <div className="flex justify-between items-center">
                  <Link
                    to={`/podcasts/${podcast.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/podcasts/${podcast.id}/upload`}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  >
                    Upload Episode
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PodcastsList;
