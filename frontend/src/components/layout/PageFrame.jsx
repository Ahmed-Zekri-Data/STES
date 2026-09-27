import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';

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

// Each page fades in when it opens, and the window starts at its top.
// Changing only the query (shop filters) keeps the scroll. Only opacity is
// animated here: a transform or filter on this wrapper would make every
// fixed-position element of the page (dialogs, bottom bars) position itself
// inside the page instead of the screen. Pages animate their own content.
export const PageTransition = ({ children }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
};

// Soft drifting light behind every page (styles in index.css)
export const Ambient = () => <div className="ambient" aria-hidden="true" />;
