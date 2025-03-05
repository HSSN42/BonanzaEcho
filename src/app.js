// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PodcastsList from './pages/PodcastsList';
import PodcastDetail from './pages/PodcastDetail';
import EpisodeDetail from './pages/EpisodeDetail';
import UploadEpisode from './pages/UploadEpisode';
import CreatePodcast from './pages/CreatePodcast';
import Navbar from './components/Navbar';

// Private route component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/podcasts" 
                element={
                  <PrivateRoute>
                    <PodcastsList />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/podcasts/create" 
                element={
                  <PrivateRoute>
                    <CreatePodcast />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/podcasts/:podcastId" 
                element={
                  <PrivateRoute>
                    <PodcastDetail />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/episodes/:episodeId" 
                element={
                  <PrivateRoute>
                    <EpisodeDetail />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/podcasts/:podcastId/upload" 
                element={
                  <PrivateRoute>
                    <UploadEpisode />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if token exists and is valid
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Configure API with token
        api.defaults.headers.common['Authorization'] = token;
        
        // Fetch user profile
        const response = await api.get('/api/auth/me');
        setCurrentUser(response.data);
      } catch (error) {
        // If token is invalid, clear it
        console.error('Error validating token:', error);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    
    validateToken();
  }, [token]);
  
  // Login function
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token: newToken, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setCurrentUser(user);
      
      // Configure API with token
      api.defaults.headers.common['Authorization'] = newToken;
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };
  
  // Register function
  const register = async (email, password) => {
    try {
      await api.post('/api/auth/register', { email, password });
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    delete api.defaults.headers.common['Authorization'];
  };
  
  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    login,
    register,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000'
});

// Add token to requests if it exists
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = token;
}

export default api;

// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { success, error } = await login(email, password);
    
    setLoading(false);
    
    if (success) {
      navigate('/');
    } else {
      setError(error);
    }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to Admin Portal</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-500 hover:text-blue-700">
                Register
              </Link>
            </p>
          </div>