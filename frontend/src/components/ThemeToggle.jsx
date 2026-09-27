import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const STARS = [[9, 7, 1], [15, 13, 0.7], [7, 18, 0.8], [20, 6, 0.6]];

// Day over the lagoon or night over the abyss. Switching spreads the new
// theme from this button as a ripple (see ThemeContext).
const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Passer au thème clair' : 'Passer au thème sombre';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={`group relative inline-flex h-9 w-[3.75rem] shrink-0 items-center rounded-full p-1 transition-shadow duration-300 hover:shadow-glow ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgb(8 16 30), rgb(40 22 80))'
          : 'linear-gradient(135deg, rgb(125 211 252), rgb(56 189 248) 55%, rgb(20 184 166))'
      }}
    >
      {/* Sky: stars at night, a waterline by day */}
      <svg viewBox="0 0 60 36" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {STARS.map(([x, y, r], i) => (
          <circle
            key={i}
            cx={x + 26}
            cy={y + 4}
            r={r}
            fill="white"
            className="transition-opacity duration-500"
            style={{ opacity: isDark ? 0.9 : 0, transitionDelay: `${i * 60}ms` }}
          />
        ))}
        <path
          d="M0 27c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3 5-3 10-3 5 3 10 3v9H0z"
          fill="white"
          className="transition-opacity duration-500"
          style={{ opacity: isDark ? 0 : 0.35 }}
        />
      </svg>

      <motion.span
        className="relative z-10 grid h-7 w-7 place-items-center rounded-full"
        animate={{ x: isDark ? 24 : 0, rotate: isDark ? -30 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          background: isDark ? 'rgb(226 232 240)' : 'rgb(253 224 71)',
          boxShadow: isDark
            ? 'inset -4px -3px 0 rgb(148 163 184), 0 0 14px rgb(167 139 250 / 0.7)'
            : '0 0 0 3px rgb(254 240 138 / 0.5), 0 0 18px rgb(250 204 21 / 0.9)'
        }}
      >
        {isDark && (
          <>
            <span className="absolute left-2 top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400/60" />
            <span className="absolute bottom-2 left-3.5 h-1 w-1 rounded-full bg-slate-400/60" />
          </>
        )}
      </motion.span>
    </button>
  );
};

export default ThemeToggle;
