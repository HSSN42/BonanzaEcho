// src/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const jwtSecret = process.env.JWT_SECRET;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new admin user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user in Supabase
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        role: 'admin' // Default role for now
      }])
      .select();
      
    if (createError) {
      return res.status(400).json({ error: createError.message });
    }
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: newUser[0].id,
        email: newUser[0].email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login and get JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, role')
      .eq('email', email)
      .single();
      
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    // Sign token
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateAdmin, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
});

module.exports = router;
