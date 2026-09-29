import React from 'react';
import { motion } from 'framer-motion';
import { SplitWords } from '../fx/Motion';
import { EASE } from '../../utils/motion';

// A striped float ring bobbing on moving water, like on the home page's pool
const Float = () => (
  <div className="pointer-events-none absolute end-[4%] top-1/2 hidden h-72 w-96 -translate-y-1/2 md:block" aria-hidden="true">
    <div className="page-float absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-[bob_5s_ease-in-out_infinite]">
      <div className="page-float__ring" />
    </div>
    <svg viewBox="0 0 400 120" className="absolute inset-x-0 bottom-10 h-28 w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]">
      {[0, 1, 2].map(i => (
        <path
          key={i}
          d="M-200 60 q50 -18 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0"
          fill="none"
          stroke={i === 1 ? 'rgb(var(--violet-500) / 0.35)' : 'rgb(var(--aqua-500) / 0.4)'}
          strokeWidth={2.5 - i * 0.6}
          strokeLinecap="round"
          transform={`translate(0 ${i * 16})`}
          className="motion-safe:animate-[wave_var(--d)_linear_infinite]"
          style={{ '--d': `${6 + i * 3}s` }}
        />
      ))}
    </svg>
  </div>
);

// Page title band shared by the content pages
const PageHero = ({ eyebrow, title, subtitle, children }) => (
  <header className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" aria-hidden="true" />
    <Float />
    <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
      {eyebrow && (
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="eyebrow">
          {eyebrow}
        </motion.p>
      )}
      <h1 className="mt-3 max-w-4xl font-display text-5xl font-bold leading-[1] tracking-[-0.035em] text-gray-900 sm:text-7xl">
        <SplitWords text={title} highlightLast={1} delay={0.05} />
      </h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl"
        >
          {subtitle}
        </motion.p>
      )}
      {children && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }} className="mt-8">
          {children}
        </motion.div>
      )}
    </div>
  </header>
);

export default PageHero;
