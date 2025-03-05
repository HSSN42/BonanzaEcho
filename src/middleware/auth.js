// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const jwtSecret = process.env.JWT_SECRET;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Middleware to authenticate admin users
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateAdmin = async (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization');
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  
  try {
    // Verify token and extract user ID
    const decoded = jwt.verify(token, jwtSecret);
    
    // Check if user exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.id)
      .single();
      
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check if user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required' });
    }
    
    // Set user in request object for use in route handlers
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  authenticateAdmin
};
