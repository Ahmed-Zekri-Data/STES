import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const AnimatedButton = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: `
      bg-gradient-to-r from-primary-600 to-secondary-600
      hover:from-primary-700 hover:to-secondary-700
      text-white focus:ring-primary-300 dark:focus:ring-primary-500
      shadow-soft hover:shadow-medium dark:shadow-glow dark:hover:shadow-glow-lg
    `,
    secondary: `
      bg-white dark:bg-neutral-800
      text-neutral-700 dark:text-neutral-300
      border border-neutral-200 dark:border-neutral-700
      hover:bg-neutral-50 dark:hover:bg-neutral-700
      focus:ring-neutral-300 dark:focus:ring-neutral-600
      shadow-soft hover:shadow-medium
    `,
    outline: `
      border-2 border-primary-600 dark:border-primary-500
      text-primary-600 dark:text-primary-400
      hover:bg-primary-600 dark:hover:bg-primary-500
      hover:text-white dark:hover:text-white
      focus:ring-primary-300 dark:focus:ring-primary-500
      bg-transparent
    `,
    ghost: `
      text-primary-600 dark:text-primary-400
      hover:bg-primary-50 dark:hover:bg-primary-900/20
      focus:ring-primary-300 dark:focus:ring-primary-500
      bg-transparent
    `,
    danger: `
      bg-gradient-to-r from-error-500 to-error-600
      hover:from-error-600 hover:to-error-700
      text-white focus:ring-error-300 dark:focus:ring-error-500
      shadow-soft hover:shadow-medium
    `,
    success: `
      bg-gradient-to-r from-success-500 to-success-600
      hover:from-success-600 hover:to-success-700
      text-white focus:ring-success-300 dark:focus:ring-success-500
      shadow-soft hover:shadow-medium
    `,
    pool: `
      bg-gradient-to-r from-pool-500 to-pool-600
      hover:from-pool-600 hover:to-pool-700
      text-white focus:ring-pool-300 dark:focus:ring-pool-500
      shadow-soft hover:shadow-medium dark:shadow-glow dark:hover:shadow-glow-lg
    `
  };

  const sizes = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    },
    tap: {
      scale: 0.95,
      y: 0
    }
  };

  const iconVariants = {
    hover: {
      rotate: [0, -10, 10, 0],
      transition: {
        duration: 0.5
      }
    }
  };

  const loadingVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const rippleVariants = {
    initial: {
      scale: 0,
      opacity: 0.5
    },
    animate: {
      scale: 4,
      opacity: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const handleClick = (e) => {
    if (loading || disabled) return;
    
    // Create ripple effect
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;
    
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} relative overflow-hidden`}
      variants={buttonVariants}
      whileHover={!disabled && !loading ? "hover" : undefined}
      whileTap={!disabled && !loading ? "tap" : undefined}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && (
        <motion.div
          className="mr-2"
          variants={loadingVariants}
          animate="animate"
        >
          <Loader2 className="w-4 h-4" />
        </motion.div>
      )}

      {/* Left Icon */}
      {Icon && iconPosition === 'left' && !loading && (
        <motion.div
          className="mr-2"
          variants={iconVariants}
          whileHover="hover"
        >
          <Icon className="w-5 h-5" />
        </motion.div>
      )}

      {/* Button Text */}
      <span className="relative z-10">
        {children}
      </span>

      {/* Right Icon */}
      {Icon && iconPosition === 'right' && !loading && (
        <motion.div
          className="ml-2"
          variants={iconVariants}
          whileHover="hover"
        >
          <Icon className="w-5 h-5" />
        </motion.div>
      )}

      {/* Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
    </motion.button>
  );
};

// Floating Action Button
export const FloatingButton = ({ 
  children, 
  className = '', 
  position = 'bottom-right',
  ...props 
}) => {
  const positions = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  };

  return (
    <motion.div
      className={`${positions[position]} z-50`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <AnimatedButton
        className={`w-14 h-14 rounded-full shadow-2xl ${className}`}
        {...props}
      >
        {children}
      </AnimatedButton>
    </motion.div>
  );
};

// Icon Button
export const IconButton = ({ 
  icon: Icon, 
  size = 'medium',
  variant = 'ghost',
  className = '',
  ...props 
}) => {
  const iconSizes = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12'
  };

  return (
    <AnimatedButton
      variant={variant}
      className={`${iconSizes[size]} p-0 ${className}`}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </AnimatedButton>
  );
};

export default AnimatedButton;
