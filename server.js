// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const publicRoutes = require('./src/routes/publicRoutes');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize storage directory
const storagePath = process.env.STORAGE_PATH || 'uploads';
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for React app
app.use(express.static(path.join(__dirname, 'client/build')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size limit exceeded (max: 500MB)' });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app; // For testing
