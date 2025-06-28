import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const ModernInput = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  success,
  disabled = false,
  required = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  inputClassName = '',
  labelClassName = '',
  helperText,
  variant = 'default',
  size = 'md',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(e);
  };

  const currentValue = value !== undefined ? value : internalValue;
  const hasValue = currentValue && currentValue.length > 0;
  const isPassword = type === 'password';

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  // Variant styles
  const variantClasses = {
    default: `
      bg-white dark:bg-neutral-800
      border border-neutral-300 dark:border-neutral-600
      focus:border-primary-500 dark:focus:border-primary-400
      focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20
    `,
    filled: `
      bg-neutral-100 dark:bg-neutral-800
      border border-transparent
      focus:bg-white dark:focus:bg-neutral-700
      focus:border-primary-500 dark:focus:border-primary-400
      focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20
    `,
    outlined: `
      bg-transparent
      border-2 border-neutral-300 dark:border-neutral-600
      focus:border-primary-500 dark:focus:border-primary-400
    `,
    ghost: `
      bg-transparent
      border border-transparent
      border-b-2 border-b-neutral-300 dark:border-b-neutral-600
      focus:border-b-primary-500 dark:focus:border-b-primary-400
      rounded-none
    `,
  };

  const baseInputClasses = `
    w-full rounded-xl transition-all duration-300 ease-out
    text-neutral-900 dark:text-neutral-100
    placeholder-neutral-500 dark:placeholder-neutral-400
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${error ? 'border-error-500 dark:border-error-400 focus:border-error-500 dark:focus:border-error-400 focus:ring-error-500/20 dark:focus:ring-error-400/20' : ''}
    ${success ? 'border-success-500 dark:border-success-400 focus:border-success-500 dark:focus:border-success-400 focus:ring-success-500/20 dark:focus:ring-success-400/20' : ''}
    ${Icon && iconPosition === 'left' ? 'pl-12' : ''}
    ${Icon && iconPosition === 'right' ? 'pr-12' : ''}
    ${isPassword ? 'pr-12' : ''}
    ${inputClassName}
  `;

  const labelClasses = `
    block text-sm font-medium mb-2 transition-colors duration-200
    ${error ? 'text-error-600 dark:text-error-400' : success ? 'text-success-600 dark:text-success-400' : 'text-neutral-700 dark:text-neutral-300'}
    ${labelClassName}
  `;

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <motion.label
          className={labelClasses}
          initial={false}
          animate={{
            color: isFocused 
              ? error 
                ? 'rgb(239 68 68)' 
                : success 
                  ? 'rgb(34 197 94)' 
                  : 'rgb(59 130 246)'
              : undefined
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </motion.label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {Icon && iconPosition === 'left' && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <Icon className={`w-5 h-5 transition-colors duration-200 ${
              isFocused 
                ? error 
                  ? 'text-error-500 dark:text-error-400' 
                  : success 
                    ? 'text-success-500 dark:text-success-400' 
                    : 'text-primary-500 dark:text-primary-400'
                : 'text-neutral-400 dark:text-neutral-500'
            }`} />
          </div>
        )}

        {/* Input Field */}
        <motion.input
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          value={currentValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInputClasses}
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
          {...props}
        />

        {/* Right Icon */}
        {Icon && iconPosition === 'right' && !isPassword && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            <Icon className={`w-5 h-5 transition-colors duration-200 ${
              isFocused 
                ? error 
                  ? 'text-error-500 dark:text-error-400' 
                  : success 
                    ? 'text-success-500 dark:text-success-400' 
                    : 'text-primary-500 dark:text-primary-400'
                : 'text-neutral-400 dark:text-neutral-500'
            }`} />
          </div>
        )}

        {/* Password Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors duration-200"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}

        {/* Status Icons */}
        {(error || success) && !isPassword && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            {error && <AlertCircle className="w-5 h-5 text-error-500 dark:text-error-400" />}
            {success && <CheckCircle className="w-5 h-5 text-success-500 dark:text-success-400" />}
          </div>
        )}

        {/* Focus Ring */}
        <motion.div
          className={`absolute inset-0 rounded-xl pointer-events-none ${
            error 
              ? 'ring-2 ring-error-500/20 dark:ring-error-400/20' 
              : success 
                ? 'ring-2 ring-success-500/20 dark:ring-success-400/20' 
                : 'ring-2 ring-primary-500/20 dark:ring-primary-400/20'
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1 : 0.95
          }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Helper Text / Error Message */}
      <AnimatePresence>
        {(helperText || error) && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`mt-2 text-sm ${
              error 
                ? 'text-error-600 dark:text-error-400' 
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {error || helperText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ModernInput.displayName = 'ModernInput';

export default ModernInput;
