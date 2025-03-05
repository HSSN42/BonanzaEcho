# Podcast Search Application

A searchable podcast archive that allows users to find specific audio clips based on keywords, topics, or questions, leveraging AI-powered transcription for accurate indexing and retrieval.

## Features

- 🎙️ **Podcast Management**: Upload and manage podcast episodes
- 🔍 **Advanced Search**: Find specific content within podcast episodes
- 🤖 **AI Transcription**: Automatic transcription using Assembly AI
- 🎬 **Clip Generation**: Automatically create shareable audio clips
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (via Supabase)
- **Transcription**: Assembly AI
- **Storage**: Supabase Storage
- **Authentication**: JWT, bcrypt

## Project Structure

```
podcast-search/
├── client/                  # React frontend application
├── routes/                  # API routes
│   ├── adminRoutes.js       # Admin API endpoints
│   ├── authRoutes.js        # Authentication endpoints
│   └── publicRoutes.js      # Public-facing endpoints
├── middleware/              # Express middleware
│   └── auth.js              # Authentication middleware
├── utils/                   # Utility functions
│   ├── assemblyAI.js        # Assembly AI integration
│   ├── clipGenerator.js     # Audio clip generation
│   └── searchUtils.js       # Search functionality
├── uploads/                 # Temporary file storage
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
└── server.js                # Main application file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- Assembly AI API key
- ffmpeg (for clip generation)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/podcast-search.git
cd podcast-search
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory based on the `.env.example` template:
```
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
ASSEMBLY_API_KEY=your_assembly_ai_api_key_here
JWT_SECRET=your_jwt_secret_key_here
STORAGE_PATH=uploads
```

4. Set up the database with the provided SQL schema (from the PRD) in Supabase.

5. Install ffmpeg (for clip generation):
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu/Debian**: `apt-get install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Build and start the production server:
```bash
npm run build
npm start
```

## API Documentation

### Public Routes

- `GET /api/public/podcasts` - Get all podcasts
- `GET /api/public/podcasts/:podcastId` - Get a specific podcast
- `GET /api/public/podcasts/:podcastId/episodes` - Get episodes for a podcast
- `GET /api/public/episodes/:episodeId` - Get a specific episode
- `GET /api/public/episodes/:episodeId/segments` - Get transcript segments
- `GET /api/public/search` - Search transcripts
- `POST /api/public/clips` - Create an audio clip
- `GET /api/public/clips/:clipId` - Get a specific clip

### Admin Routes

- `GET /api/admin/podcasts` - Get all podcasts
- `POST /api/admin/podcasts` - Create a new podcast
- `GET /api/admin/podcasts/:podcastId` - Get a specific podcast
- `PUT /api/admin/podcasts/:podcastId` - Update a podcast
- `DELETE /api/admin/podcasts/:podcastId` - Delete a podcast
- `GET /api/admin/podcasts/:podcastId/episodes` - Get episodes for a podcast
- `POST /api/admin/episodes` - Create a new episode
- `GET /api/admin/episodes/:episodeId` - Get a specific episode
- `PUT /api/admin/episodes/:episodeId` - Update an episode
- `DELETE /api/admin/episodes/:episodeId` - Delete an episode
- `GET /api/admin/episodes/:episodeId/transcript` - Get transcript
- `POST /api/admin/episodes/:episodeId/retry-transcription` - Retry transcription
- `GET /api/admin/dashboard` - Get dashboard statistics

### Authentication Routes

- `POST /api/auth/register` - Register a new admin user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

## License

MIT
