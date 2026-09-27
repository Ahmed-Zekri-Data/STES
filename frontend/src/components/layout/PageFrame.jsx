import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion';

// A thin line of light across the top of the screen, showing how far down
// the page is scrolled
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left"
      style={{ scaleX, background: 'linear-gradient(90deg, rgb(var(--aqua-500)), rgb(var(--violet-500)))' }}
    />
  );
};

// Each page rises out of a light blur when it opens, and the window starts
// at its top. Changing only the query (shop filters) keeps the scroll.
export const PageTransition = ({ children }) => {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      // Any filter or transform left on would make fixed-position children
      // (dialogs, sticky bars) position themselves inside this box
      onAnimationComplete={() => {
        if (ref.current) {
          ref.current.style.filter = 'none';
          ref.current.style.transform = 'none';
        }
      }}
      ref={ref}
    >
      {children}
    </motion.div>
  );
};

// Soft drifting light behind every page (styles in index.css)
export const Ambient = () => <div className="ambient" aria-hidden="true" />;
