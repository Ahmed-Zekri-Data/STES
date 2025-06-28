import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ variant = 'button', className = '' }) => {
  const { theme, isDark, toggleTheme, isTransitioning } = useTheme();

  if (variant === 'dropdown') {
    return (
      <ThemeDropdown className={className} />
    );
  }

  return (
    <motion.button
      onClick={toggleTheme}
      disabled={isTransitioning}
      className={`
        relative inline-flex items-center justify-center
        w-12 h-12 rounded-xl
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-700
        shadow-soft dark:shadow-none
        hover:shadow-medium dark:hover:shadow-glow
        transition-all duration-300
        group overflow-hidden
        ${isTransitioning ? 'pointer-events-none' : ''}
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={false}
    >
      {/* Background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        layoutId="theme-bg"
      />
      
      {/* Icon container */}
      <div className="relative w-6 h-6">
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {isTransitioning && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
    </motion.button>
  );
};

const ThemeDropdown = ({ className = '' }) => {
  const { theme, setLightTheme, setDarkTheme, isTransitioning } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const handleThemeSelect = (themeId) => {
    if (themeId === 'light') setLightTheme();
    if (themeId === 'dark') setDarkTheme();
    if (themeId === 'system') {
      // TODO: Implement system theme detection
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? setDarkTheme() : setLightTheme();
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTransitioning}
        className="
          inline-flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white dark:bg-neutral-800
          border border-neutral-200 dark:border-neutral-700
          text-sm font-medium text-neutral-700 dark:text-neutral-300
          hover:bg-neutral-50 dark:hover:bg-neutral-700
          transition-all duration-200
        "
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {theme === 'light' && <Sun className="w-4 h-4" />}
        {theme === 'dark' && <Moon className="w-4 h-4" />}
        <span className="capitalize">{theme}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="
              absolute top-full mt-2 right-0 z-50
              w-40 py-2 rounded-xl
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-700
              shadow-large dark:shadow-glow
              backdrop-blur-sm
            "
          >
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isActive = theme === themeOption.id;
              
              return (
                <motion.button
                  key={themeOption.id}
                  onClick={() => handleThemeSelect(themeOption.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2
                    text-sm font-medium text-left
                    transition-colors duration-200
                    ${isActive 
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }
                  `}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-4 h-4" />
                  {themeOption.label}
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 rounded-full bg-primary-500"
                      layoutId="active-theme"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ThemeToggle;
