// src/pages/CreatePodcast.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function CreatePodcast() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!title) {
      return setError('Podcast title is required');
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/api/podcasts', {
        title,
        description,
        author,
        cover_image_url: coverImageUrl
      });
      
      setLoading(false);
      navigate(`/podcasts/${response.data.id}`);
    } catch (err) {
      console.error('Error creating podcast:', err);
      setError(err.response?.data?.error || 'Failed to create podcast');
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create New Podcast</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="title">
              Podcast Title *
            </label>
            <input
              id="title"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="author">
              Author
            </label>
            <input
              id="author"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="coverImageUrl">
              Cover Image URL
            </label>
            <input
              id="coverImageUrl"
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {coverImageUrl && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Cover Preview:</p>
                <img 
                  src={coverImageUrl} 
                  alt="Podcast Cover Preview" 
                  className="w-32 h-32 object-cover border border-gray-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/128?text=Invalid+URL';
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="mr-4 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              onClick={() => navigate('/podcasts')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Podcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePodcast;
