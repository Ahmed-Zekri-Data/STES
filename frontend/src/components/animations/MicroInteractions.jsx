import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAnimation } from './AnimationProvider';

// Advanced hover card with tilt effect
export const TiltCard = ({ 
  children, 
  tiltStrength = 15, 
  className = '',
  glowEffect = false 
}) => {
  const ref = useRef(null);
  const { prefersReducedMotion } = useAnimation();
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    prefersReducedMotion ? [0, 0] : [tiltStrength, -tiltStrength]
  );
  
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    prefersReducedMotion ? [0, 0] : [-tiltStrength, tiltStrength]
  );

  const handleMouseMove = (e) => {
    if (prefersReducedMotion) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`transform-gpu ${className}`}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={glowEffect ? {
        boxShadow: prefersReducedMotion 
          ? "none" 
          : "0 20px 40px rgba(59, 130, 246, 0.3)"
      } : {}}
      transition={{ duration: 0.3 }}
    >
      <div style={{ transform: "translateZ(50px)" }}>
        {children}
      </div>
    </motion.div>
  );
};

// Ripple effect button
export const RippleButton = ({ 
  children, 
  onClick, 
  className = '',
  rippleColor = 'rgba(255, 255, 255, 0.6)',
  ...props 
}) => {
  const [ripples, setRipples] = useState([]);
  const { prefersReducedMotion } = useAnimation();

  const createRipple = (e) => {
    if (prefersReducedMotion) {
      onClick?.(e);
      return;
    }

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const newRipple = {
      x,
      y,
      size,
      id: Date.now()
    };

    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={createRipple}
      whileHover={{ scale: prefersReducedMotion ? 1 : 1.02 }}
      whileTap={{ scale: prefersReducedMotion ? 1 : 0.98 }}
      {...props}
    >
      {children}
      
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: rippleColor
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </motion.button>
  );
};

// Morphing icon
export const MorphingIcon = ({ 
  icons, 
  currentIndex = 0, 
  className = '',
  size = 24 
}) => {
  const { prefersReducedMotion } = useAnimation();
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {icons.map((Icon, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{
            scale: index === currentIndex ? 1 : 0,
            opacity: index === currentIndex ? 1 : 0,
            rotate: index === currentIndex ? 0 : (prefersReducedMotion ? 0 : 180)
          }}
          transition={{
            duration: prefersReducedMotion ? 0.1 : 0.3,
            ease: "easeInOut"
          }}
        >
          <Icon size={size} />
        </motion.div>
      ))}
    </div>
  );
};

// Elastic scale animation
export const ElasticScale = ({ 
  children, 
  scale = 1.1, 
  className = '',
  trigger = 'hover' 
}) => {
  const { prefersReducedMotion } = useAnimation();
  
  const variants = {
    initial: { scale: 1 },
    hover: {
      scale: prefersReducedMotion ? 1 : scale,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: prefersReducedMotion ? 1 : 0.95,
      transition: {
        type: "spring",
        stiffness: 600,
        damping: 15
      }
    }
  };

  const getAnimationProps = () => {
    switch (trigger) {
      case 'hover':
        return { whileHover: "hover" };
      case 'tap':
        return { whileTap: "tap" };
      case 'both':
        return { whileHover: "hover", whileTap: "tap" };
      default:
        return {};
    }
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      {...getAnimationProps()}
    >
      {children}
    </motion.div>
  );
};

// Floating label input
export const FloatingLabelInput = ({ 
  label, 
  value, 
  onChange, 
  type = 'text',
  className = '',
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const { prefersReducedMotion } = useAnimation();

  return (
    <div className={`relative ${className}`}>
      <motion.input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300"
        whileFocus={{ scale: prefersReducedMotion ? 1 : 1.02 }}
        {...props}
      />
      
      <motion.label
        className="absolute left-4 text-neutral-500 dark:text-neutral-400 pointer-events-none"
        animate={{
          y: (isFocused || hasValue) ? -28 : 12,
          scale: (isFocused || hasValue) ? 0.85 : 1,
          color: isFocused ? "rgb(59, 130, 246)" : "rgb(115, 115, 115)"
        }}
        transition={{
          duration: prefersReducedMotion ? 0.1 : 0.2,
          ease: "easeOut"
        }}
      >
        {label}
      </motion.label>
    </div>
  );
};

// Pulse on update
export const PulseOnUpdate = ({ 
  children, 
  value, 
  className = '',
  pulseColor = 'rgba(59, 130, 246, 0.3)' 
}) => {
  const [shouldPulse, setShouldPulse] = useState(false);
  const { prefersReducedMotion } = useAnimation();

  useEffect(() => {
    if (prefersReducedMotion) return;
    
    setShouldPulse(true);
    const timer = setTimeout(() => setShouldPulse(false), 600);
    return () => clearTimeout(timer);
  }, [value, prefersReducedMotion]);

  return (
    <motion.div
      className={className}
      animate={shouldPulse ? {
        boxShadow: [
          "0 0 0 0 rgba(59, 130, 246, 0)",
          `0 0 0 10px ${pulseColor}`,
          "0 0 0 0 rgba(59, 130, 246, 0)"
        ]
      } : {}}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
};

// Staggered list animation
export const StaggeredList = ({ 
  children, 
  staggerDelay = 0.1, 
  className = '' 
}) => {
  const { prefersReducedMotion } = useAnimation();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerDelay
          }
        }
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          variants={{
            hidden: { 
              opacity: 0, 
              y: prefersReducedMotion ? 0 : 20 
            },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: prefersReducedMotion ? 0.1 : 0.5,
                ease: "easeOut"
              }
            }
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};
