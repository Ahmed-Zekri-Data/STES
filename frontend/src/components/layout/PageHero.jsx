import React from 'react';
import { motion } from 'framer-motion';
import { SplitWords } from '../fx/Motion';
import { EASE } from '../../utils/motion';

// Three glowing rings turning in 3D around a drop of light
const Rings = () => (
  <div className="pointer-events-none absolute end-[-6rem] top-1/2 hidden h-[26rem] w-[26rem] -translate-y-1/2 [perspective:900px] md:block" aria-hidden="true">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="absolute inset-0 m-auto rounded-full border motion-safe:animate-[tilt-spin_var(--d)_linear_infinite]"
        style={{
          width: `${16 + i * 5}rem`,
          height: `${16 + i * 5}rem`,
          borderColor: i === 1 ? 'rgb(var(--violet-500) / 0.4)' : 'rgb(var(--aqua-500) / 0.45)',
          boxShadow: `0 0 36px ${i === 1 ? 'rgb(var(--violet-500) / 0.18)' : 'rgb(var(--aqua-500) / 0.18)'}`,
          '--d': `${18 + i * 7}s`,
          '--tilt': `${58 + i * 9}deg`
        }}
      />
    ))}
    <div
      className="absolute inset-0 m-auto h-20 w-20 rounded-full motion-safe:animate-float"
      style={{
        background: 'radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.9), rgb(var(--aqua-400)) 35%, rgb(var(--violet-500)) 100%)',
        boxShadow: '0 0 60px rgb(var(--aqua-400) / 0.6)'
      }}
    />
  </div>
);

// Page title band shared by the content pages
const PageHero = ({ eyebrow, title, subtitle, children }) => (
  <header className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" aria-hidden="true" />
    <Rings />
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
