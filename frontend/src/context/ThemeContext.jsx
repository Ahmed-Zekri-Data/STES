import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

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
const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// The choice saved in the browser, or 'system' to follow the device
const savedPreference = () => {
  try {
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
};

const paint = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');

// The new theme spreads from `origin` (the toggle) as a growing circle, like
// a ripple. Browsers without view transitions, and visitors who asked for
// less motion, get an instant switch.
const rippleTo = (update, origin) => {
  if (!document.startViewTransition || reducedMotion()) {
    update();
    return;
  }
  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 40;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = document.startViewTransition(update);
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
};

// Where a click happened, to start the ripple there
const originOf = (event) => {
  const target = event?.currentTarget;
  if (target?.getBoundingClientRect) {
    const box = target.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  return undefined;
};

export const ThemeProvider = ({ children }) => {
  const [preference, setPreference] = useState(savedPreference);
  const [device, setDevice] = useState(deviceTheme);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timer = useRef();

  // Follow the device's light/dark setting while it changes
  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return undefined;
    const update = () => setDevice(query.matches ? 'dark' : 'light');
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const theme = preference === 'system' ? device : preference;

  useEffect(() => {
    paint(theme);
  }, [theme]);

  const choose = (next, event) => {
    if (next === preference) return;
    const shown = next === 'system' ? device : next;
    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // Storage blocked: the choice lasts until the page is closed
    }
    setIsTransitioning(true);
    rippleTo(() => {
      // The page must show the new theme when this returns
      flushSync(() => setPreference(next));
      paint(shown);
    }, originOf(event));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIsTransitioning(false), 750);
  };

  const value = {
    theme, // what is shown: 'light' or 'dark'
    preference, // what was chosen: 'light', 'dark' or 'system'
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isTransitioning,
    // Pass the click event so the ripple starts from the button
    toggleTheme: (event) => choose(theme === 'light' ? 'dark' : 'light', event),
    setLightTheme: (event) => choose('light', event),
    setDarkTheme: (event) => choose('dark', event),
    setSystemTheme: (event) => choose('system', event)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
