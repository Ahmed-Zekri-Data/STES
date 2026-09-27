import React, { useId } from 'react';

// The STES mark: a drop of pool water with a highlight, in the brand
// gradient. `animated` makes the waterline inside it move gently.
export const LogoMark = ({ className = 'w-9 h-9', animated = false }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="6" y1="2" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--aqua-400))" />
          <stop offset="0.55" stopColor="rgb(var(--aqua-600))" />
          <stop offset="1" stopColor="rgb(var(--violet-600))" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d="M20 3c5 6.8 12 14 12 21.2A12 12 0 0 1 8 24.2C8 17 15 9.8 20 3z" />
        </clipPath>
      </defs>
      <path d="M20 3c5 6.8 12 14 12 21.2A12 12 0 0 1 8 24.2C8 17 15 9.8 20 3z" fill={`url(#${id}-g)`} />
      <g clipPath={`url(#${id}-c)`}>
        <path
          d="M-4 25c4 0 4-2.5 8-2.5s4 2.5 8 2.5 4-2.5 8-2.5 4 2.5 8 2.5 4-2.5 8-2.5 4 2.5 8 2.5V40H-4z"
          fill="white"
          fillOpacity="0.18"
        >
          {animated && (
            <animateTransform attributeName="transform" type="translate" values="0 0;-16 0" dur="3s" repeatCount="indefinite" />
          )}
        </path>
      </g>
      <path d="M14 26.5a6 6 0 0 0 6 6" stroke="white" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
};

const Logo = ({ className = '', animated = true }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <LogoMark animated={animated} />
    <span className="font-display text-xl font-bold tracking-tight text-gray-900">
      STES<span className="text-gradient">.tn</span>
    </span>
  </span>
);

export default Logo;
