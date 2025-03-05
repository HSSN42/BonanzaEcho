// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalEpisodes: 0,
    pendingTranscriptions: 0,
    completedTranscriptions: 0,
    failedTranscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentEpisodes, setRecentEpisodes] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real implementation, you'd have a dedicated dashboard endpoint
        // For now, we'll make separate requests
        
        // Get podcasts count
        const podcastsResponse = await api.get('/api/podcasts');
        const podcasts = podcastsResponse.data;
        
        // Get all episodes
        let allEpisodes = [];
        for (const podcast of podcasts) {
          const episodesResponse = await api.get(`/api/podcasts/${podcast.id}/episodes`);
          allEpisodes = [...allEpisodes, ...episodesResponse.data];
        }
        
        // Calculate statistics
        const pendingTranscriptions = allEpisodes.filter(
          episode => episode.transcription_status === 'pending' || 
                     episode.transcription_status === 'in_progress'
        ).length;
        
        const completedTranscriptions = allEpisodes.filter(
          episode => episode.transcription_status === 'completed'
        ).length;
        
        const failedTranscriptions = allEpisodes.filter(
          episode => episode.transcription_status === 'failed'
        ).length;
        
        // Get recent episodes
        const sortedEpisodes = [...allEpisodes].sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        setStats({
          totalPodcasts: podcasts.length,
          totalEpisodes: allEpisodes.length,
          pendingTranscriptions,
          completedTranscriptions,
          failedTranscriptions
        });
        
        setRecentEpisodes(sortedEpisodes.slice(0, 5)); // Get 5 most recent episodes
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading dashboard data...</div>
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
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Podcasts</h2>
          <p className="text-4xl font-bold text-blue-600">{stats.totalPodcasts}</p>
          <Link to="/podcasts" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">
            View all podcasts →
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Episodes</h2>
          <p className="text-4xl font-bold text-blue-600">{stats.totalEpisodes}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Transcription Status</h2>
          <div className="flex justify-between items-center mt-2">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-lg font-semibold">{stats.pendingTranscriptions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-lg font-semibold text-green-600">{stats.completedTranscriptions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-lg font-semibold text-red-600">{stats.failedTranscriptions}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/podcasts/create"
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Create New Podcast
          </Link>
          {stats.totalPodcasts > 0 && (
            <Link
              to="/podcasts"
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Upload New Episode
            </Link>
          )}
        </div>
      </div>
      
      {/* Recent Episodes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Episodes</h2>
        
        {recentEpisodes.length === 0 ? (
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentEpisodes.map((episode) => (
                  <tr key={episode.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{episode.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(episode.created_at).toLocaleDateString()}
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
    </div>
  );
}

export default Dashboard;
