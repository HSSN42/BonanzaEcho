// src/pages/PublicEpisode.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function PublicEpisode() {
  const { episodeId } = useParams();
  const [episode, setEpisode] = useState(null);
  const [podcast, setPodcast] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filteredSegments, setFilteredSegments] = useState([]);
  const audioRef = useRef(null);
  const segmentRefs = useRef({});
  
  useEffect(() => {
    const fetchEpisodeData = async () => {
      try {
        // Get episode details
        const episodeResponse = await api.get(`/api/public/episodes/${episodeId}`);
        const episodeData = episodeResponse.data;
        setEpisode(episodeData);
        
        // Get podcast details
        const podcastResponse = await api.get(`/api/public/podcasts/${episodeData.podcast_id}`);
        setPodcast(podcastResponse.data);
        
        // Get transcript segments
        if (episodeData.transcription_status === 'completed') {
          const segmentsResponse = await api.get(`/api/public/episodes/${episodeId}/segments`);
          setSegments(segmentsResponse.data);
          setFilteredSegments(segmentsResponse.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching episode data:', err);
        setError('Failed to load episode');
        setLoading(false);
      }
    };
    
    fetchEpisodeData();
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [episodeId]);
  
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredSegments(segments);
    } else {
      const filtered = segments.filter(segment => 
        segment.text.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredSegments(filtered);
    }
  }, [searchText, segments]);
  
  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      // Find active segment
      const active = segments.find(
        segment => time >= segment.start_time && time <= segment.end_time
      );
      
      if (active && active !== activeSegment) {
        setActiveSegment(active);
        
        // Scroll to active segment
        if (segmentRefs.current[active.id]) {
          segmentRefs.current[active.id].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  };
  
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  const handlePlay = () => {
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  
  const jumpToTime = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        audioRef.current.play();
      }
    }
  };
  
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };
  
  const highlightText = (text, query) => {
    if (!query || query.trim() === '') return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className="bg-yellow-200">{part}</span> 
        : part
    );
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Episode</h1>
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
  
  if (!episode || !podcast) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Episode Not Found</h1>
            <p className="text-gray-600 mb-6">The episode you're looking for doesn't exist or has been removed.</p>
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
          <Link to={`/podcasts/${podcast.id}`} className="text-blue-600 hover:text-blue-800">
            &larr; Back to {podcast.title}
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* Podcast and Episode Info */}
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
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{episode.title}</h1>
                <p className="text-gray-600 mb-4">
                  <span className="font-medium">{podcast.title}</span> • {new Date(episode.publication_date || episode.created_at).toLocaleDateString()}
                </p>
                
                {episode.duration && (
                  <p className="text-gray-600 mb-4">
                    <span className="font-medium">Duration:</span> {formatTime(episode.duration)}
                  </p>
                )}
                
                {episode.description && (
                  <div>
                    <h2 className="text-lg font-medium mb-2">Episode Description</h2>
                    <p className="text-gray-700 whitespace-pre-line">{episode.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Audio Player */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Listen to Episode</h2>
            
            <audio
              ref={audioRef}
              src={episode.audio_file_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              className="w-full mb-4"
              controls
            />
            
            <div className="flex items-center">
              <button
                onClick={togglePlayPause}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              
              <div className="flex-1 flex items-center">
                <span className="text-gray-600 mr-2">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 mx-2"
                />
                <span className="text-gray-600 ml-2">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          
          {/* Transcript */}
          {episode.transcription_status === 'completed' && segments.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Transcript</h2>
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search in transcript..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {searchText && (
                    <button
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchText('')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {searchText && filteredSegments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-600">No matches found for "{searchText}"</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-96">
                  {filteredSegments.map((segment) => (
                    <div 
                      key={segment.id} 
                      ref={el => segmentRefs.current[segment.id] = el}
                      className={`mb-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition duration-150 ${
                        activeSegment && activeSegment.id === segment.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => jumpToTime(segment.start_time)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-blue-600 font-medium">
                          {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToTime(segment.start_time);
                          }}
                          className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg transition duration-150"
                        >
                          Play
                        </button>
                      </div>
                      <p className="text-gray-800">
                        {searchText ? highlightText(segment.text, searchText) : segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : episode.transcription_status === 'pending' || episode.transcription_status === 'in_progress' ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-lg font-semibold mb-2">Transcript Processing</h2>
              <p className="text-gray-600">
                The transcript for this episode is still being processed. Please check back later.
              </p>
            </div>
          ) : episode.transcription_status === 'failed' ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold mb-2">Transcript Unavailable</h2>
              <p className="text-gray-600">
                We couldn't generate a transcript for this episode. You can still listen to the audio above.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PublicEpisode;
