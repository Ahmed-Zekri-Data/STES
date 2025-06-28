import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Apply theme to document
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsTransitioning(true);
    
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Apply to document with smooth transition
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const setLightTheme = () => {
    if (theme !== 'light') {
      setIsTransitioning(true);
      setTheme('light');
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const setDarkTheme = () => {
    if (theme !== 'dark') {
      setIsTransitioning(true);
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const value = {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isTransitioning,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={`transition-colors duration-300 ${isTransitioning ? 'transition-all' : ''}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
