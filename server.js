// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

// Create src/routes directory if it doesn't exist
const routesDir = path.join(__dirname, 'src', 'routes');
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir, { recursive: true });
}

// Create src/utils directory if it doesn't exist
const utilsDir = path.join(__dirname, 'src', 'utils');
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}

// Create src/middleware directory if it doesn't exist
const middlewareDir = path.join(__dirname, 'src', 'middleware');
if (!fs.existsSync(middlewareDir)) {
  fs.mkdirSync(middlewareDir, { recursive: true });
}

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const publicRoutes = require('./src/routes/publicRoutes');

// Static files for React app
if (fs.existsSync(path.join(__dirname, 'client/build'))) {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root route handler - serve welcome page if client build doesn't exist
app.get('/', (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'client/build', 'index.html'))) {
    // If client build exists, the wildcard route below will handle this
    return next();
  } else {
    // If client build doesn't exist yet, show a welcome page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Podcast Search API</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; }
            h2 { color: #4b5563; margin-top: 30px; }
            pre { background: #f1f5f9; padding: 15px; border-radius: 5px; overflow-x: auto; }
            .endpoint { font-family: monospace; background: #e5e7eb; padding: 2px 4px; border-radius: 4px; }
            .note { background: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Podcast Search API</h1>
          <p>Welcome to the Podcast Search API. The server is running successfully!</p>
          
          <div class="note">
            <p><strong>Note:</strong> This is the API server. The React frontend is not built or not being served from this location.</p>
          </div>
          
          <h2>Available Endpoints</h2>
          <p>Here are some of the available API endpoints:</p>
          
          <h3>Public API</h3>
          <ul>
            <li><span class="endpoint">GET /api/public/podcasts</span> - Get all podcasts</li>
            <li><span class="endpoint">GET /api/public/search?query=your_search_term</span> - Search transcripts</li>
          </ul>
          
          <h3>Auth API</h3>
          <ul>
            <li><span class="endpoint">POST /api/auth/register</span> - Register a new admin user</li>
            <li><span class="endpoint">POST /api/auth/login</span> - Login and get JWT token</li>
          </ul>
          
          <h2>Next Steps</h2>
          <p>To see the full web application:</p>
          <ol>
            <li>Make sure you've built the React frontend with <code>npm run client-build</code></li>
            <li>Or run the development server with <code>npm run dev-full</code> to serve both backend and frontend</li>
          </ol>
          
          <h2>API Health Check</h2>
          <p>You can check the API health at <a href="/api/health">/api/health</a></p>
        </body>
      </html>
    `);
  }
});

// Serve React app for all other routes
if (fs.existsSync(path.join(__dirname, 'client/build'))) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

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
  console.log(`Access API at http://localhost:${port}/api/health`);
  console.log(`Access frontend at http://localhost:${port}`);
});

module.exports = app; // For testing
