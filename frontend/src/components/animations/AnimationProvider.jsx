import React, { createContext, useContext, useState, useEffect } from 'react';

const AnimationContext = createContext();

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

export const AnimationProvider = ({ children }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Common animation variants
  const variants = {
    // Page transitions
    pageTransition: {
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: prefersReducedMotion ? 0.1 : 0.6,
          ease: "easeOut"
        }
      },
      exit: { 
        opacity: 0, 
        y: -20,
        transition: {
          duration: prefersReducedMotion ? 0.1 : 0.3,
          ease: "easeIn"
        }
      }
    },

    // Stagger children
    staggerContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          delayChildren: prefersReducedMotion ? 0 : 0.2,
          staggerChildren: prefersReducedMotion ? 0 : 0.1
        }
      }
    },

    // Fade in up
    fadeInUp: {
      hidden: { 
        opacity: 0, 
        y: prefersReducedMotion ? 0 : 30 
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: prefersReducedMotion ? 0.1 : 0.6,
          ease: "easeOut"
        }
      }
    },

    // Scale in
    scaleIn: {
      hidden: { 
        opacity: 0, 
        scale: prefersReducedMotion ? 1 : 0.8 
      },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: prefersReducedMotion ? 0.1 : 0.5,
          ease: "easeOut"
        }
      }
    },

    // Slide in from left
    slideInLeft: {
      hidden: { 
        opacity: 0, 
        x: prefersReducedMotion ? 0 : -50 
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: prefersReducedMotion ? 0.1 : 0.6,
          ease: "easeOut"
        }
      }
    },

    // Slide in from right
    slideInRight: {
      hidden: { 
        opacity: 0, 
        x: prefersReducedMotion ? 0 : 50 
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: prefersReducedMotion ? 0.1 : 0.6,
          ease: "easeOut"
        }
      }
    },

    // Hover effects
    hoverScale: {
      hover: {
        scale: prefersReducedMotion ? 1 : 1.05,
        transition: {
          duration: 0.2,
          ease: "easeOut"
        }
      }
    },

    hoverLift: {
      hover: {
        y: prefersReducedMotion ? 0 : -8,
        transition: {
          duration: 0.3,
          ease: "easeOut"
        }
      }
    },

    // Button interactions
    buttonPress: {
      tap: {
        scale: prefersReducedMotion ? 1 : 0.95,
        transition: {
          duration: 0.1
        }
      }
    },

    // Loading animations
    pulse: {
      animate: {
        scale: prefersReducedMotion ? 1 : [1, 1.05, 1],
        opacity: prefersReducedMotion ? 1 : [0.7, 1, 0.7],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },

    // Floating animation
    float: {
      animate: {
        y: prefersReducedMotion ? 0 : [-10, 10, -10],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },

    // Rotation animation
    rotate: {
      animate: {
        rotate: prefersReducedMotion ? 0 : 360,
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }
      }
    },

    // Glow effect
    glow: {
      animate: {
        boxShadow: prefersReducedMotion 
          ? "0 0 0 rgba(59, 130, 246, 0)" 
          : [
              "0 0 20px rgba(59, 130, 246, 0.3)",
              "0 0 40px rgba(59, 130, 246, 0.5)",
              "0 0 20px rgba(59, 130, 246, 0.3)"
            ],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    }
  };

  // Spring configurations
  const springs = {
    gentle: {
      type: "spring",
      stiffness: 300,
      damping: 30
    },
    bouncy: {
      type: "spring",
      stiffness: 400,
      damping: 17
    },
    snappy: {
      type: "spring",
      stiffness: 500,
      damping: 25
    }
  };

  // Easing functions
  const easings = {
    easeOut: [0.0, 0.0, 0.2, 1],
    easeIn: [0.4, 0.0, 1, 1],
    easeInOut: [0.4, 0.0, 0.2, 1],
    backOut: [0.34, 1.56, 0.64, 1],
    anticipate: [0.0, 0.0, 0.2, 1]
  };

  const value = {
    variants,
    springs,
    easings,
    prefersReducedMotion,
    isPageLoading,
    setIsPageLoading
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};
