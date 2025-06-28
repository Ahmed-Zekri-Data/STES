import React, { useRef, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform, useSpring } from 'framer-motion';
import { useAnimation } from './AnimationProvider';

// Reveal animation when element comes into view
export const RevealOnScroll = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 0.6,
  className = '',
  threshold = 0.1,
  once = true 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { threshold, once });
  const { prefersReducedMotion } = useAnimation();

  const getVariants = () => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      };
    }

    const distance = 50;
    switch (direction) {
      case 'up':
        return {
          hidden: { opacity: 0, y: distance },
          visible: { opacity: 1, y: 0 }
        };
      case 'down':
        return {
          hidden: { opacity: 0, y: -distance },
          visible: { opacity: 1, y: 0 }
        };
      case 'left':
        return {
          hidden: { opacity: 0, x: distance },
          visible: { opacity: 1, x: 0 }
        };
      case 'right':
        return {
          hidden: { opacity: 0, x: -distance },
          visible: { opacity: 1, x: 0 }
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: { opacity: 1, scale: 1 }
        };
      default:
        return {
          hidden: { opacity: 0, y: distance },
          visible: { opacity: 1, y: 0 }
        };
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={getVariants()}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{
        duration: prefersReducedMotion ? 0.1 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Stagger children animation
export const StaggerContainer = ({ 
  children, 
  staggerDelay = 0.1, 
  className = '',
  threshold = 0.1 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { threshold, once: true });
  const { prefersReducedMotion } = useAnimation();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
            delayChildren: prefersReducedMotion ? 0 : 0.2
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

// Parallax scroll effect
export const ParallaxScroll = ({ 
  children, 
  speed = 0.5, 
  className = '',
  direction = 'vertical' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();
  
  const y = useTransform(
    scrollYProgress, 
    [0, 1], 
    prefersReducedMotion ? [0, 0] : [0, -speed * 100]
  );
  
  const x = useTransform(
    scrollYProgress, 
    [0, 1], 
    prefersReducedMotion ? [0, 0] : [0, speed * 100]
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={direction === 'vertical' ? { y } : { x }}
    >
      {children}
    </motion.div>
  );
};

// Scroll progress indicator
export const ScrollProgress = ({ className = '' }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 transform-gpu z-50 ${className}`}
      style={{ scaleX, transformOrigin: "0%" }}
    />
  );
};

// Floating elements that move with scroll
export const FloatingElement = ({ 
  children, 
  speed = 0.3, 
  rotate = false,
  className = '' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();
  
  const y = useTransform(
    scrollYProgress, 
    [0, 1], 
    prefersReducedMotion ? [0, 0] : [0, speed * 200]
  );
  
  const rotateValue = useTransform(
    scrollYProgress, 
    [0, 1], 
    prefersReducedMotion ? [0, 0] : [0, rotate ? 360 : 0]
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ 
        y,
        rotate: rotate ? rotateValue : 0
      }}
    >
      {children}
    </motion.div>
  );
};

// Scale on scroll
export const ScaleOnScroll = ({ 
  children, 
  scaleRange = [0.8, 1.2], 
  className = '' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();
  
  const scale = useTransform(
    scrollYProgress, 
    [0, 0.5, 1], 
    prefersReducedMotion ? [1, 1, 1] : [scaleRange[0], 1, scaleRange[1]]
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ scale }}
    >
      {children}
    </motion.div>
  );
};

// Opacity fade on scroll
export const FadeOnScroll = ({ 
  children, 
  fadeRange = [0, 1], 
  className = '' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const opacity = useTransform(
    scrollYProgress, 
    [0, 0.3, 0.7, 1], 
    [fadeRange[0], fadeRange[1], fadeRange[1], fadeRange[0]]
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity }}
    >
      {children}
    </motion.div>
  );
};

// Magnetic hover effect
export const MagneticHover = ({ 
  children, 
  strength = 0.3, 
  className = '' 
}) => {
  const ref = useRef(null);
  const { prefersReducedMotion } = useAnimation();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;
      
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0px, 0px)';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
};
