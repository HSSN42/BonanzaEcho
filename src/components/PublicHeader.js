// src/components/PublicHeader.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center" onClick={closeMenu}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-xl font-bold text-gray-800">Podcast Search</span>
          </Link>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`text-gray-600 hover:text-blue-600 ${location.pathname === '/' ? 'text-blue-600 font-medium' : ''}`}
            >
              Search
            </Link>
            <a 
              href="/admin" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-150"
            >
              Admin Login
            </a>
          </nav>
        </div>
        
        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <ul className="space-y-4">
              <li>
                <Link 
                  to="/" 
                  className={`block py-2 ${location.pathname === '/' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                  onClick={closeMenu}
                >
                  Search
                </Link>
              </li>
              <li>
                <a 
                  href="/admin" 
                  className="block py-2 text-gray-600"
                  onClick={closeMenu}
                >
                  Admin Login
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}

export default PublicHeader;
