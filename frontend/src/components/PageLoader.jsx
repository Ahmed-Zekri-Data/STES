import React from 'react';

// Shown while a page's code is being downloaded: a drop that fills and
// empties, with rings spreading from it
const PageLoader = ({ fullScreen = false }) => (
  <div
    role="status"
    aria-label="Chargement"
    className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-32'}`}
  >
    <div className="relative grid h-16 w-16 place-items-center">
      <span className="absolute inset-0 rounded-full border border-blue-500/40 motion-safe:animate-ping" />
      <span className="absolute inset-3 rounded-full border border-purple-500/30 motion-safe:animate-ping [animation-delay:300ms]" />
      <span
        className="h-6 w-6 rounded-full motion-safe:animate-pulse"
        style={{ background: 'linear-gradient(135deg, rgb(var(--aqua-400)), rgb(var(--violet-500)))', boxShadow: 'var(--shadow-glow)' }}
      />
    </div>
  </div>
);

export default PageLoader;
