import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAnimation } from './AnimationProvider';

const PageTransition = ({ children, className = '' }) => {
  const location = useLocation();
  const { variants, prefersReducedMotion } = useAnimation();

  // Different transition types based on route
  const getTransitionType = (pathname) => {
    if (pathname.includes('/admin')) return 'slideInRight';
    if (pathname.includes('/shop') || pathname.includes('/boutique')) return 'fadeInUp';
    if (pathname.includes('/product/')) return 'scaleIn';
    return 'pageTransition';
  };

  const transitionType = getTransitionType(location.pathname);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        variants={variants[transitionType]}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Specialized page transitions
export const FadeTransition = ({ children, className = '' }) => {
  const location = useLocation();
  const { prefersReducedMotion } = useAnimation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          transition: {
            duration: prefersReducedMotion ? 0.1 : 0.4,
            ease: "easeOut"
          }
        }}
        exit={{ 
          opacity: 0,
          transition: {
            duration: prefersReducedMotion ? 0.1 : 0.2,
            ease: "easeIn"
          }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const SlideTransition = ({ children, direction = 'right', className = '' }) => {
  const location = useLocation();
  const { prefersReducedMotion } = useAnimation();

  const getSlideVariants = (dir) => {
    const distance = prefersReducedMotion ? 0 : 100;
    
    switch (dir) {
      case 'left':
        return {
          initial: { x: -distance, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: distance, opacity: 0 }
        };
      case 'right':
        return {
          initial: { x: distance, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -distance, opacity: 0 }
        };
      case 'up':
        return {
          initial: { y: distance, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -distance, opacity: 0 }
        };
      case 'down':
        return {
          initial: { y: -distance, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: distance, opacity: 0 }
        };
      default:
        return {
          initial: { x: distance, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -distance, opacity: 0 }
        };
    }
  };

  const variants = getSlideVariants(direction);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        initial={variants.initial}
        animate={{
          ...variants.animate,
          transition: {
            duration: prefersReducedMotion ? 0.1 : 0.5,
            ease: "easeOut"
          }
        }}
        exit={{
          ...variants.exit,
          transition: {
            duration: prefersReducedMotion ? 0.1 : 0.3,
            ease: "easeIn"
          }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const ScaleTransition = ({ children, className = '' }) => {
  const location = useLocation();
  const { prefersReducedMotion } = useAnimation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        initial={{ 
          scale: prefersReducedMotion ? 1 : 0.9, 
          opacity: 0 
        }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          transition: {
            duration: prefersReducedMotion ? 0.1 : 0.5,
            ease: "easeOut"
          }
        }}
        exit={{ 
          scale: prefersReducedMotion ? 1 : 1.1, 
          opacity: 0,
          transition: {
            duration: prefersReducedMotion ? 0.1 : 0.3,
            ease: "easeIn"
          }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Loading transition overlay
export const LoadingTransition = ({ isLoading, children }) => {
  const { prefersReducedMotion } = useAnimation();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center space-y-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: prefersReducedMotion ? 0.1 : 0.5,
              delay: 0.2 
            }}
          >
            {/* Loading spinner */}
            <motion.div
              className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full"
              animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.p
              className="text-lg font-medium text-neutral-600 dark:text-neutral-400"
              animate={{ 
                opacity: prefersReducedMotion ? 1 : [0.5, 1, 0.5] 
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              Chargement...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
      {children}
    </AnimatePresence>
  );
};

export default PageTransition;
