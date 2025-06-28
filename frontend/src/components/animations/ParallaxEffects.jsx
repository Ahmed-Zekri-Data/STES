import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useAnimation } from './AnimationProvider';

// Basic parallax container
export const ParallaxContainer = ({ 
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

// Parallax hero section
export const ParallaxHero = ({ 
  children, 
  backgroundImage, 
  height = '100vh',
  overlay = true,
  overlayOpacity = 0.4,
  className = '' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();
  
  const y = useTransform(
    scrollYProgress, 
    [0, 1], 
    prefersReducedMotion ? [0, 0] : [0, -50]
  );
  
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Background Image */}
      {backgroundImage && (
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
            y: prefersReducedMotion ? 0 : y
          }}
        />
      )}
      
      {/* Overlay */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {/* Content */}
      <motion.div
        className="relative z-10 h-full flex items-center justify-center"
        style={{ opacity }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Layered parallax effect
export const LayeredParallax = ({ layers = [], className = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();

  return (
    <div ref={ref} className={`relative ${className}`}>
      {layers.map((layer, index) => {
        const y = useTransform(
          scrollYProgress,
          [0, 1],
          prefersReducedMotion ? [0, 0] : [0, -(layer.speed || 0.5) * 100]
        );

        return (
          <motion.div
            key={index}
            className={`absolute inset-0 ${layer.className || ''}`}
            style={{ 
              y,
              zIndex: layer.zIndex || index
            }}
          >
            {layer.content}
          </motion.div>
        );
      })}
    </div>
  );
};

// Parallax text reveal
export const ParallaxTextReveal = ({ 
  text, 
  className = '',
  speed = 0.3 
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
    prefersReducedMotion ? [0, 0] : [100, -100]
  );
  
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y, opacity }}
        className="text-center"
      >
        {text}
      </motion.div>
    </div>
  );
};

// 3D parallax card
export const Parallax3DCard = ({ 
  children, 
  className = '',
  intensity = 15 
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
      
      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);
      
      const rotateX = deltaY * intensity;
      const rotateY = deltaX * intensity;
      
      element.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity, prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
};

// Smooth parallax with spring physics
export const SmoothParallax = ({ 
  children, 
  speed = 0.5, 
  className = '' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();
  
  const rawY = useTransform(
    scrollYProgress, 
    [0, 1], 
    prefersReducedMotion ? [0, 0] : [0, -speed * 100]
  );
  
  const y = useSpring(rawY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y }}
    >
      {children}
    </motion.div>
  );
};

// Parallax background elements
export const ParallaxBackground = ({ 
  elements = [], 
  className = '' 
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const { prefersReducedMotion } = useAnimation();

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`}>
      {elements.map((element, index) => {
        const y = useTransform(
          scrollYProgress,
          [0, 1],
          prefersReducedMotion ? [0, 0] : [0, -(element.speed || 0.3) * 200]
        );

        const rotate = useTransform(
          scrollYProgress,
          [0, 1],
          prefersReducedMotion ? [0, 0] : [0, element.rotate || 0]
        );

        const scale = useTransform(
          scrollYProgress,
          [0, 1],
          [element.initialScale || 1, element.finalScale || 1]
        );

        return (
          <motion.div
            key={index}
            className={`absolute ${element.className || ''}`}
            style={{
              y,
              rotate,
              scale,
              left: element.left || '50%',
              top: element.top || '50%',
              zIndex: element.zIndex || index
            }}
          >
            {element.content}
          </motion.div>
        );
      })}
    </div>
  );
};

// Parallax section divider
export const ParallaxDivider = ({ 
  height = '200px',
  backgroundImage,
  speed = 0.5,
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
    prefersReducedMotion ? [0, 0] : [0, -speed * 100]
  );

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ height }}
    >
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          y
        }}
      />
    </div>
  );
};
