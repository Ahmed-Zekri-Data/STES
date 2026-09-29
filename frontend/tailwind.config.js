import forms from '@tailwindcss/forms';
import { SCALES, STEPS } from './scripts/palette.mjs';

// Every colour name used in the code points to one of the shop's scales
// (src/styles/palette.css), which change with the light and dark themes.
// So bg-blue-600 is the brand aqua, text-gray-500 a muted ink, and both
// adapt to dark mode without dark: classes.
const ALIASES = {
  ink: ['gray', 'neutral', 'slate', 'zinc', 'stone'],
  aqua: ['blue', 'primary', 'secondary', 'cyan', 'sky', 'teal', 'pool'],
  violet: ['purple', 'violet', 'indigo', 'fuchsia'],
  coral: ['pink', 'rose'],
  danger: ['red', 'error'],
  success: ['green', 'emerald', 'lime', 'success'],
  amber: ['yellow', 'amber', 'warning'],
  orange: ['orange']
};

// kind '' → background/border/gradient values, 't' → text values
const scale = (name, kind) => Object.fromEntries(
  STEPS.map(step => [step, `rgb(var(--${name}-${kind}${step}) / <alpha-value>)`])
);

const palette = (kind) => Object.fromEntries(
  Object.keys(SCALES).flatMap(name => [name, ...(ALIASES[name] || [])].map(alias => [alias, scale(name, kind)]))
);

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// Surfaces and text that are not part of a scale (src/styles/theme.css)
const semantic = {
  page: token('page'),
  surface: token('surface'),
  raised: token('raised'),
  line: token('line'),
  fg: token('fg'),
  muted: token('fg-muted'),
  brand: token('brand'),
  'brand-2': token('brand-2'),
  'on-brand': token('on-brand')
};

const base = {
  transparent: 'transparent',
  current: 'currentColor',
  inherit: 'inherit',
  white: '#ffffff',
  black: '#000000'
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    colors: { ...base, ...palette(''), ...semantic },
    textColor: { ...base, ...palette('t'), ...semantic },
    extend: {
      fontFamily: {
        // The home page's type: Plus Jakarta Sans for text, Unbounded for titles
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Unbounded', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        arabic: ['"Noto Sans Arabic"', 'sans-serif'],
        french: ['"Plus Jakarta Sans"', 'sans-serif']
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        medium: 'var(--shadow-medium)',
        large: 'var(--shadow-large)',
        glow: 'var(--shadow-glow)',
        'glow-lg': 'var(--shadow-glow-lg)',
        float: 'var(--shadow-float)'
      },
      transitionTimingFunction: {
        // Fast start, long soft landing: most things arriving on screen
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      transitionDuration: {
        400: '400ms',
        600: '600ms'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'spin-slow': 'spin 18s linear infinite',
        caustics: 'caustics 14s ease-in-out infinite alternate'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        caustics: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '100%': { transform: 'translate3d(-4%, 3%, 0) scale(1.08)' }
        }
      }
    }
  },
  plugins: [forms]
};
