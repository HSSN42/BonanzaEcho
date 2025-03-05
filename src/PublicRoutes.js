// src/PublicRoutes.js
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicSearch from './pages/PublicSearch';
import SharedClip from './pages/SharedClip';
import PublicEpisode from './pages/PublicEpisode';
import PublicPodcast from './pages/PublicPodcast';
import PublicHeader from './components/PublicHeader';
import PublicFooter from './components/PublicFooter';

function PublicRoutes() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<PublicSearch />} />
          <Route path="/search" element={<PublicSearch />} />
          <Route path="/share/:clipId" element={<SharedClip />} />
          <Route path="/episodes/:episodeId" element={<PublicEpisode />} />
          <Route path="/podcasts/:podcastId" element={<PublicPodcast />} />
        </Routes>
      </main>
      <PublicFooter />
    </div>
  );
}

export default PublicRoutes;
