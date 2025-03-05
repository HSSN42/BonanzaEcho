// src/pages/PodcastDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function PodcastDetail() {
  const { podcastId } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedAuthor, setEditedAuthor] = useState('');
  const [editedCoverImageUrl, setEditedCoverImageUrl] = useState('');
  const [savingEdits, setSavingEdits] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    const fetchPodcastData = async () => {
      try {
        // Get podcast details
        const podcastResponse = await api.get(`/api/podcasts/${podcastId}`);
        const podcastData = podcastResponse.data;
        setPodcast(podcastData);
        
        // Initialize edit form state
        setEditedTitle(podcastData.title);
        setEditedDescription(podcastData.description || '');
        setEditedAuthor(podcastData.author || '');
        setEditedCoverImageUrl(podcastData.cover_image_url || '');
        
        // Get episodes for this podcast
        const episodesResponse = await api.get(`/api/podcasts/${podcastId}/episodes`);
        setEpisodes(episodesResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching podcast data:', err);
        setError('Failed to load podcast data');
        setLoading(false);
      }
    };
    
    fetchPodcastData();
  }, [podcastId]);
  
  const handleSaveEdits = async () => {
    if (!editedTitle) {
      return setError('Podcast title is required');
    }
    
    setSavingEdits(true);
    
    try {
      const response = await api.put(`/api/podcasts/${podcastId}`, {
        title: editedTitle,
        description: editedDescription,
        author: editedAuthor,
        cover_image_url: editedCoverImageUrl
      });
      
      setPodcast(response.data);
      setSavingEdits(false);
      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Error updating podcast:', err);
      setError(err.response?.data?.error || 'Failed to update podcast');
      setSavingEdits(false);
    }
  };
  
  const handleDeletePodcast = async () => {
    setDeleting(true);
    
    try {
      await api.delete(`/api/podcasts/${podcastId}`);
      navigate('/podcasts');
    } catch (err) {
      console.error('Error deleting podcast:', err);
      setError(err.response?.data?.error || 'Failed to delete podcast');
      setDeleting(false);
      setDeleteConfirmation(false);
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
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isEditing ? (
        // Edit Form
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Edit Podcast</h1>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="title">
              Podcast Title *
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
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="author">
              Author
            </label>
            <input
              id="author"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editedAuthor}
              onChange={(e) => setEditedAuthor(e.target.value)}
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
              value={editedCoverImageUrl}
              onChange={(e) => setEditedCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {editedCoverImageUrl && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Cover Preview:</p>
                <img 
                  src={editedCoverImageUrl} 
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
              onClick={() => {
                setIsEditing(false);
                setEditedTitle(podcast.title);
                setEditedDescription(podcast.description || '');
                setEditedAuthor(podcast.author || '');
                setEditedCoverImageUrl(podcast.cover_image_url || '');
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
        // Display Podcast Details
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="md:flex">
            <div className="md:w-1/3 p-6">
              {podcast.cover_image_url ? (
                <img
                  src={podcast.cover_image_url}
                  alt={podcast.title}
                  className="w-full h-auto rounded"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-gray-200 rounded">
                  <span className="text-gray-400">No Cover Image</span>
                </div>
              )}
            </div>
            <div className="md:w-2/3 p-6">
              <div className="flex justify-between items-start">
                <h1 className="text-3xl font-bold mb-4">{podcast.title}</h1>
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
              
              {podcast.author && (
                <p className="text-gray-600 mb-4">
                  <span className="font-semibold">Author:</span> {podcast.author}
                </p>
              )}
              
              {podcast.description ? (
                <div>
                  <h2 className="text-lg font-semibold mb-2">Description</h2>
                  <p className="text-gray-700 whitespace-pre-line">{podcast.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No description available</p>
              )}
              
              <div className="mt-6">
                <Link
                  to={`/podcasts/${podcastId}/upload`}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Upload New Episode
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Episodes List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Episodes</h2>
        
        {episodes.length === 0 ? (
          <p className="text-gray-500">No episodes yet. Upload your first episode!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {episodes.map((episode) => (
                  <tr key={episode.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{episode.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(episode.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {episode.duration ? `${Math.floor(episode.duration / 60)}:${String(episode.duration % 60).padStart(2, '0')}` : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${episode.transcription_status === 'completed' ? 'bg-green-100 text-green-800' : 
                            episode.transcription_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {episode.transcription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/episodes/${episode.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Podcast</h2>
            <p className="mb-6">
              Are you sure you want to delete "{podcast.title}"? This will also delete all episodes and transcripts. This action cannot be undone.
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
                onClick={handleDeletePodcast}
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

export default PodcastDetail;