// src/pages/SharedClip.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function SharedClip() {
  const { clipId } = useParams();
  const [clip, setClip] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [podcast, setPodcast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  
  useEffect(() => {
    const fetchClipData = async () => {
      try {
        // Get clip details
        const clipResponse = await api.get(`/api/public/clips/${clipId}`);
        const clipData = clipResponse.data;
        setClip(clipData);
        
        // Get episode details
        const episodeResponse = await api.get(`/api/public/episodes/${clipData.episode_id}`);
        const episodeData = episodeResponse.data;
        setEpisode(episodeData);
        
        // Get podcast details
        const podcastResponse = await api.get(`/api/public/podcasts/${episodeData.podcast_id}`);
        setPodcast(podcastResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching clip data:', err);
        setError('Failed to load clip');
        setLoading(false);
      }
    };
    
    fetchClipData();
  }, [clipId]);
  
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const shareClip = () => {
    // Copy current URL to clipboard
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Clip</h1>
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
  
  if (!clip || !episode || !podcast) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Clip Not Found</h1>
            <p className="text-gray-600 mb-6">The clip you're looking for doesn't exist or has been removed.</p>
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
        <div className="max-w-3xl mx-auto">
          {/* Podcast Info */}
          <div className="flex items-center mb-6">
            {podcast.cover_image_url && (
              <div className="w-16 h-16 mr-4 rounded overflow-hidden">
                <img
                  src={podcast.cover_image_url}
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{podcast.title}</h1>
              <p className="text-gray-600">From episode: {episode.title}</p>
            </div>
          </div>
          
          {/* Clip Player */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Audio Clip</h2>
              <button
                onClick={shareClip}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-150"
              >
                Share
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Segment: {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
              </p>
              {clip.search_query && (
                <p className="text-sm text-gray-600">
                  Search term: "{clip.search_query}"
                </p>
              )}
            </div>
            
            <audio
              ref={audioRef}
              src={clip.audio_clip_url}
              className="w-full mb-4"
              controls
              autoPlay
            />
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800">{clip.transcript_text}</p>
            </div>
          </div>
          
          {/* Listen to Full Episode */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Want to hear more?</h2>
            <p className="text-gray-600 mb-4">Listen to the full episode or explore other content</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to={`/public/episodes/${episode.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-150"
              >
                Listen to Full Episode
              </Link>
              <Link 
                to="/public/search"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-6 rounded-lg transition duration-150"
              >
                Search for More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SharedClip;
