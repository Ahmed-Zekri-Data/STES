import React from 'react';
import { motion } from 'framer-motion';

const ModernCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  glow = false,
  glass = false,
  gradient = false,
  onClick,
  ...props 
}) => {
  const baseClasses = `
    relative overflow-hidden rounded-2xl
    transition-all duration-300 ease-out
    ${hover ? 'hover:scale-[1.02] hover:shadow-large' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `;

  const variantClasses = {
    default: `
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-800
      shadow-soft dark:shadow-none
      ${hover ? 'hover:shadow-medium dark:hover:shadow-glow' : ''}
    `,
    elevated: `
      bg-white dark:bg-neutral-900
      shadow-medium dark:shadow-glow
      border border-neutral-100 dark:border-neutral-800
      ${hover ? 'hover:shadow-large dark:hover:shadow-glow-lg' : ''}
    `,
    outlined: `
      bg-transparent
      border-2 border-neutral-200 dark:border-neutral-700
      ${hover ? 'hover:border-primary-300 dark:hover:border-primary-600' : ''}
    `,
    ghost: `
      bg-transparent
      ${hover ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''}
    `,
  };

  const effectClasses = {
    glow: glow ? 'shadow-glow dark:shadow-glow-lg' : '',
    glass: glass ? 'glass backdrop-blur-xl' : '',
    gradient: gradient ? 'bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800' : '',
  };

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${effectClasses.glow}
    ${effectClasses.glass}
    ${effectClasses.gradient}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: hover ? {
      y: -4,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    } : {},
    tap: onClick ? {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    } : {}
  };

  return (
    <motion.div
      className={combinedClasses}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      {...props}
    >
      {/* Gradient overlay for hover effect */}
      {hover && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Glow effect */}
      {glow && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

// Specialized card variants
export const ProductCard = ({ children, className = '', ...props }) => (
  <ModernCard 
    variant="elevated" 
    hover={true}
    className={`group ${className}`}
    {...props}
  >
    {children}
  </ModernCard>
);

export const FeatureCard = ({ children, className = '', ...props }) => (
  <ModernCard 
    variant="default" 
    hover={true}
    glow={true}
    className={`group ${className}`}
    {...props}
  >
    {children}
  </ModernCard>
);

export const GlassCard = ({ children, className = '', ...props }) => (
  <ModernCard 
    variant="ghost" 
    glass={true}
    hover={true}
    className={`group ${className}`}
    {...props}
  >
    {children}
  </ModernCard>
);

export const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'up',
  className = '',
  ...props 
}) => (
  <ModernCard 
    variant="elevated" 
    hover={true}
    className={`p-6 ${className}`}
    {...props}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {value}
        </p>
        {change && (
          <p className={`text-sm font-medium mt-1 ${
            trend === 'up' 
              ? 'text-success-600 dark:text-success-400' 
              : 'text-error-600 dark:text-error-400'
          }`}>
            {trend === 'up' ? '↗' : '↘'} {change}
          </p>
        )}
      </div>
      {Icon && (
        <div className="flex-shrink-0 ml-4">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      )}
    </div>
  </ModernCard>
);

export default ModernCard;
