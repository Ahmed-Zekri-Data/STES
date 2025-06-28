import React from 'react';
import { motion } from 'framer-motion';
import { useAnimation } from './AnimationProvider';

// Modern spinning loader
export const SpinLoader = ({ size = 'medium', color = 'primary', className = '' }) => {
  const { prefersReducedMotion } = useAnimation();

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'border-primary-600 dark:border-primary-400',
    secondary: 'border-neutral-600 dark:border-neutral-400',
    success: 'border-success-600 dark:border-success-400',
    warning: 'border-warning-600 dark:border-warning-400',
    error: 'border-error-600 dark:border-error-400',
    pool: 'border-pool-600 dark:border-pool-400'
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        border-4 border-t-transparent rounded-full
        ${className}
      `}
      animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 1,
        repeat: prefersReducedMotion ? 0 : Infinity,
        ease: "linear"
      }}
    />
  );
};

// Dots loader
export const DotsLoader = ({ size = 'medium', color = 'primary', className = '' }) => {
  const { prefersReducedMotion } = useAnimation();

  const sizeClasses = {
    small: 'w-1 h-1',
    medium: 'w-2 h-2',
    large: 'w-3 h-3'
  };

  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-400',
    secondary: 'bg-neutral-600 dark:bg-neutral-400',
    success: 'bg-success-600 dark:bg-success-400',
    warning: 'bg-warning-600 dark:bg-warning-400',
    error: 'bg-error-600 dark:bg-error-400',
    pool: 'bg-pool-600 dark:bg-pool-400'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
          animate={prefersReducedMotion ? {} : {
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1.2,
            repeat: prefersReducedMotion ? 0 : Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// Wave loader
export const WaveLoader = ({ size = 'medium', color = 'primary', className = '' }) => {
  const { prefersReducedMotion } = useAnimation();

  const sizeClasses = {
    small: 'w-1 h-4',
    medium: 'w-1 h-8',
    large: 'w-2 h-12'
  };

  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-400',
    secondary: 'bg-neutral-600 dark:bg-neutral-400',
    success: 'bg-success-600 dark:bg-success-400',
    warning: 'bg-warning-600 dark:bg-warning-400',
    error: 'bg-error-600 dark:bg-error-400',
    pool: 'bg-pool-600 dark:bg-pool-400'
  };

  return (
    <div className={`flex items-end space-x-1 ${className}`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-sm`}
          animate={prefersReducedMotion ? {} : {
            scaleY: [1, 2, 1]
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1,
            repeat: prefersReducedMotion ? 0 : Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// Pulse loader
export const PulseLoader = ({ size = 'medium', color = 'primary', className = '' }) => {
  const { prefersReducedMotion } = useAnimation();

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-400',
    secondary: 'bg-neutral-600 dark:bg-neutral-400',
    success: 'bg-success-600 dark:bg-success-400',
    warning: 'bg-warning-600 dark:bg-warning-400',
    error: 'bg-error-600 dark:bg-error-400',
    pool: 'bg-pool-600 dark:bg-pool-400'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full ${className}`}
      animate={prefersReducedMotion ? {} : {
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : 1.5,
        repeat: prefersReducedMotion ? 0 : Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

// Skeleton loader with shimmer effect
export const SkeletonLoader = ({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  rounded = 'rounded' 
}) => {
  const { prefersReducedMotion } = useAnimation();

  return (
    <div 
      className={`bg-neutral-200 dark:bg-neutral-700 ${rounded} overflow-hidden relative ${className}`}
      style={{ width, height }}
    >
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );
};

// Progress bar loader
export const ProgressLoader = ({ 
  progress = 0, 
  color = 'primary', 
  className = '',
  showPercentage = false 
}) => {
  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-400',
    secondary: 'bg-neutral-600 dark:bg-neutral-400',
    success: 'bg-success-600 dark:bg-success-400',
    warning: 'bg-warning-600 dark:bg-warning-400',
    error: 'bg-error-600 dark:bg-error-400',
    pool: 'bg-pool-600 dark:bg-pool-400'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {showPercentage && (
        <motion.p
          className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(progress)}%
        </motion.p>
      )}
    </div>
  );
};

// Circular progress loader
export const CircularProgress = ({ 
  progress = 0, 
  size = 'medium', 
  color = 'primary',
  className = '',
  showPercentage = false 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const strokeWidths = {
    small: 2,
    medium: 3,
    large: 4
  };

  const colorClasses = {
    primary: 'stroke-primary-600 dark:stroke-primary-400',
    secondary: 'stroke-neutral-600 dark:stroke-neutral-400',
    success: 'stroke-success-600 dark:stroke-success-400',
    warning: 'stroke-warning-600 dark:stroke-warning-400',
    error: 'stroke-error-600 dark:stroke-error-400',
    pool: 'stroke-pool-600 dark:stroke-pool-400'
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
        {/* Background circle */}
        <circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidths[size]}
          className="text-neutral-200 dark:text-neutral-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          strokeWidth={strokeWidths[size]}
          strokeLinecap="round"
          className={colorClasses[color]}
          initial={{ strokeDasharray, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ strokeDasharray }}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {Math.round(progress)}%
          </motion.span>
        </div>
      )}
    </div>
  );
};
