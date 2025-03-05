// src/pages/EpisodeDetail.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function EpisodeDetail() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(null);
  const [podcast, setPodcast] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [savingEdits, setSavingEdits] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  
  useEffect(() => {
    const fetchEpisodeData = async () => {
      try {
        // Get episode details
        const episodeResponse = await api.get(`/api/episodes/${episodeId}`);
        const episodeData = episodeResponse.data;
        setEpisode(episodeData);
        
        // Initialize edit form state
        setEditedTitle(episodeData.title);
        setEditedDescription(episodeData.description || '');
        
        // Get podcast details
        const podcastResponse = await api.get(`/api/podcasts/${episodeData.podcast_id}`);
        setPodcast(podcastResponse.data);
        
        // Get transcript data if available
        if (episodeData.transcription_status === 'completed') {
          const transcriptResponse = await api.get(`/api/episodes/${episodeId}/transcript`);
          setTranscript(transcriptResponse.data);
          
          // Get transcript segments
          const segmentsResponse = await api.get(`/api/episodes/${episodeId}/segments`);
          setSegments(segmentsResponse.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching episode data:', err);
        setError('Failed to load episode data');
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
  
  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
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
  
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
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
  
  const handleSaveEdits = async () => {
    if (!editedTitle) {
      return setError('Episode title is required');
    }
    
    setSavingEdits(true);
    
    try {
      const response = await api.put(`/api/episodes/${episodeId}`, {
        title: editedTitle,
        description: editedDescription
      });
      
      setEpisode(response.data);
      setSavingEdits(false);
      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Error updating episode:', err);
      setError(err.response?.data?.error || 'Failed to update episode');
      setSavingEdits(false);
    }
  };
  
  const handleDeleteEpisode = async () => {
    setDeleting(true);
    
    try {
      await api.delete(`/api/episodes/${episodeId}`);
      navigate(`/podcasts/${podcast.id}`);
    } catch (err) {
      console.error('Error deleting episode:', err);
      setError(err.response?.data?.error || 'Failed to delete episode');
      setDeleting(false);
      setDeleteConfirmation(false);
    }
  };
  
  const handleRetryTranscription = async () => {
    try {
      await api.post(`/api/episodes/${episodeId}/retry-transcription`);
      // Reload the page to show updated status
      window.location.reload();
    } catch (err) {
      console.error('Error retrying transcription:', err);
      setError(err.response?.data?.error || 'Failed to retry transcription');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading episode details...</div>
      </div>
    );
  }
  
  if (error && !episode) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded">
        {error}
      </div>
    );
  }
  
  if (!episode) {
    return (
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded">
        Episode not found
      </div>
    );
  }
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <Link to={`/podcasts/${podcast.id}`} className="text-blue-500 hover:text-blue-700">
          &larr; Back to {podcast.title}
        </Link>
      </div>
      
      {isEditing ? (
        // Edit Form
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Edit Episode</h1>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="title">
              Episode Title *
            </label>
            <input
              id="title"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="mr-4 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              onClick={() => {
                setIsEditing(false);
                setEditedTitle(episode.title);
                setEditedDescription(episode.description || '');
                setError('');
              }}
              disabled={savingEdits}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={handleSaveEdits}
              disabled={savingEdits}
            >
              {savingEdits ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        // Display Episode Details
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold mb-4">{episode.title}</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirmation(true)}
                className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">
            <span className="font-semibold">Podcast:</span> {podcast.title}
          </p>
          
          <p className="text-gray-600 mb-4">
            <span className="font-semibold">Published:</span> {new Date(episode.created_at).toLocaleDateString()}
          </p>
          
          {episode.duration && (
            <p className="text-gray-600 mb-4">
              <span className="font-semibold">Duration:</span> {formatTime(episode.duration)}
            </p>
          )}
          
          <div className="mb-4">
            <span className="font-semibold text-gray-600 mr-2">Transcription Status:</span>
            <span 
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${episode.transcription_status === 'completed' ? 'bg-green-100 text-green-800' : 
                  episode.transcription_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
            >
              {episode.transcription_status}
            </span>
            
            {episode.transcription_status === 'failed' && (
              <button
                onClick={handleRetryTranscription}
                className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
              >
                Retry Transcription
              </button>
            )}
          </div>
          
          {episode.description && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{episode.description}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Audio Player */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Audio Player</h2>
        
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
        
        <div className="flex items-center mb-4">
          <button
            onClick={togglePlayPause}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
          <h2 className="text-lg font-semibold mb-4">Transcript</h2>
          
          <div className="overflow-y-auto max-h-96">
            {segments.map((segment, index) => (
              <div 
                key={index} 
                className="mb-4 p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                    className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                  >
                    Play
                  </button>
                </div>
                <p>{segment.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : episode.transcription_status === 'pending' || episode.transcription_status === 'in_progress' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-2">Transcript</h2>
          <p className="text-gray-500">
            Transcription is in progress. This may take some time depending on the length of the episode.
          </p>
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      ) : episode.transcription_status === 'failed' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-2">Transcript</h2>
          <p className="text-red-500">
            Transcription failed. You can try again by clicking the "Retry Transcription" button above.
          </p>
        </div>
      ) : null}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Episode</h2>
            <p className="mb-6">
              Are you sure you want to delete "{episode.title}"? This will also delete the transcript and all associated data. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation(false)}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEpisode}
                className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EpisodeDetail;