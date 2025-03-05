// src/pages/UploadEpisode.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function UploadEpisode() {
  const { podcastId } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        const response = await api.get(`/api/podcasts/${podcastId}`);
        setPodcast(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching podcast:', err);
        setError('Failed to load podcast');
        setLoading(false);
      }
    };
    
    fetchPodcast();
  }, [podcastId]);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setAudioFile(null);
      return;
    }
    
    // Check file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please select a valid audio file (MP3, WAV, or M4A)');
      e.target.value = null; // Clear the input
      return;
    }
    
    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
      setFileError('File size exceeds 500MB limit');
      e.target.value = null; // Clear the input
      return;
    }
    
    setFileError('');
    setAudioFile(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!title) {
      return setError('Episode title is required');
    }
    
    if (!audioFile) {
      return setError('Audio file is required');
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('podcast_id', podcastId);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('audio_file', audioFile);
      
      // Create custom axios request with upload progress
      const response = await api.post('/api/episodes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      setUploading(false);
      navigate(`/episodes/${response.data.id}`);
    } catch (err) {
      console.error('Error uploading episode:', err);
      setError(err.response?.data?.error || 'Failed to upload episode');
      setUploading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading podcast details...</div>
      </div>
    );
  }
  
  if (error && !podcast) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded">
        {error}
      </div>
    );
  }
  
  if (!podcast) {
    return (
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded">
        Podcast not found
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Upload New Episode</h1>
      <p className="text-gray-600 mb-6">
        <span className="font-medium">Podcast:</span> {podcast.title}
      </p>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="title">
              Episode Title *
            </label>
            <input
              id="title"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={uploading}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="audioFile">
              Audio File *
            </label>
            <input
              id="audioFile"
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleFileChange}
              required
              disabled={uploading}
            />
            {fileError && (
              <p className="text-red-500 text-sm mt-1">{fileError}</p>
            )}
            <p className="text-gray-500 text-sm mt-1">
              Supported formats: MP3, WAV, M4A (Max size: 500MB)
            </p>
            
            {audioFile && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Selected file: {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>
          
          {uploading && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Uploading: {uploadProgress}%
              </p>
              <p className="text-sm text-gray-600">
                Please do not close this page while uploading. After upload completes, 
                transcription will begin automatically.
              </p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="button"
              className="mr-4 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              onClick={() => navigate(`/podcasts/${podcastId}`)}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              disabled={uploading || !audioFile}
            >
              {uploading ? 'Uploading...' : 'Upload Episode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadEpisode;
