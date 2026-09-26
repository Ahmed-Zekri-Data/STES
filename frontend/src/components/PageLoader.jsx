import React from 'react';

// Shown while a page's code is being downloaded
const PageLoader = ({ fullScreen = false }) => (
  <div
    role="status"
    aria-label="Chargement"
    className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-32'}`}
  >
    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

export default PageLoader;
