import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const DARK_QUERY = '(prefers-color-scheme: dark)';
const deviceTheme = () => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light');

// The choice saved in the browser, or 'system' to follow the device
const savedPreference = () => {
  try {
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
};

export const ThemeProvider = ({ children }) => {
  const [preference, setPreference] = useState(savedPreference);
  const [device, setDevice] = useState(deviceTheme);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Follow the device's light/dark setting while it changes
  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return undefined;
    const update = () => setDevice(query.matches ? 'dark' : 'light');
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const theme = preference === 'system' ? device : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const choose = (next) => {
    if (next === preference) return;
    setIsTransitioning(true);
    setPreference(next);
    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // Storage blocked: the choice lasts until the page is closed
    }
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const value = {
    theme, // what is shown: 'light' or 'dark'
    preference, // what was chosen: 'light', 'dark' or 'system'
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isTransitioning,
    toggleTheme: () => choose(theme === 'light' ? 'dark' : 'light'),
    setLightTheme: () => choose('light'),
    setDarkTheme: () => choose('dark'),
    setSystemTheme: () => choose('system')
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={`transition-colors duration-300 ${isTransitioning ? 'transition-all' : ''}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
