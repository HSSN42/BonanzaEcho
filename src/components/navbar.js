// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-xl font-bold">Podcast Search Admin</Link>
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link to="/" className="hover:text-blue-200">Dashboard</Link>
              <Link to="/podcasts" className="hover:text-blue-200">Podcasts</Link>
              <button 
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-800 py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link 
                to="/login"
                className="hover:text-blue-200"
              >
                Login
              </Link>
              <Link 
                to="/register"
                className="bg-blue-700 hover:bg-blue-800 py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
