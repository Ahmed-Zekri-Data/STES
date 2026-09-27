import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { EASE } from '../../utils/motion';

const NBSP = String.fromCharCode(160); // non-breaking space

// Rises into view the first time it is scrolled to
export const Reveal = ({ as = 'div', delay = 0, y = 24, className = '', children, ...props }) => {
  const Component = motion[as] || motion.div;
  return (
    <Component
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
};

// A headline whose words rise one after another from behind a mask.
// `highlight` words (by index from the end) get the brand gradient.
export const SplitWords = ({ text, className = '', delay = 0, highlightLast = 0, inView = false }) => {
  // French puts a space before ? ! : ; — keep those on their word
  const words = String(text).split(' ').reduce((list, word) => {
    if (list.length && /^[?!:;»]+$/.test(word)) list[list.length - 1] += `${NBSP}${word}`;
    else list.push(word);
    return list;
  }, []);
  const animate = inView
    ? { whileInView: { y: '0%', opacity: 1 }, viewport: { once: true } }
    : { animate: { y: '0%', opacity: 1 } };
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={`inline-block ${i >= words.length - highlightLast ? 'text-gradient' : ''}`}
            initial={{ y: '110%', opacity: 0 }}
            {...animate}
            transition={{ duration: 0.9, delay: delay + i * 0.06, ease: EASE }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && NBSP}
        </span>
      ))}
      </span>
    </span>
  );
};

// A card lit by a soft spotlight that follows the mouse
export const SpotlightCard = ({ as: Component = 'div', className = '', children, ...props }) => {
  const ref = useRef(null);
  const onPointerMove = (event) => {
    const box = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${event.clientX - box.left}px`);
    ref.current.style.setProperty('--my', `${event.clientY - box.top}px`);
  };
  return (
    <Component ref={ref} onPointerMove={onPointerMove} className={`spotlight group ${className}`} {...props}>
      {children}
    </Component>
  );
};

// An endless band of content sliding sideways (paused on hover, still when
// the visitor asked for less motion)
export const Marquee = ({ children, reverse = false, duration = 40, className = '' }) => (
  <div className={`marquee group flex overflow-hidden ${className}`}>
    {[0, 1].map(copy => (
      <div
        key={copy}
        aria-hidden={copy === 1 ? 'true' : undefined}
        className="marquee__track flex shrink-0 items-center"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {children}
      </div>
    ))}
  </div>
);

// Leans towards the mouse, as if magnetised
export const Magnetic = ({ strength = 0.25, className = '', children }) => {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });
  const onPointerMove = (event) => {
    if (reduce || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left - box.width / 2) * strength);
    y.set((event.clientY - box.top - box.height / 2) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.div style={{ x: sx, y: sy }} onPointerMove={onPointerMove} onPointerLeave={reset} className={`inline-flex ${className}`}>
      {children}
    </motion.div>
  );
};

// Section heading: mono eyebrow, big title, optional text and action
export const SectionHeader = ({ eyebrow, title, text, action, align = 'left', className = '' }) => (
  <div className={`flex flex-col gap-6 ${align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} ${className}`}>
    <div className={align === 'center' ? 'max-w-3xl' : 'max-w-2xl'}>
      {eyebrow && <Reveal as="p" className="eyebrow">{eyebrow}</Reveal>}
      <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl">
        <SplitWords text={title} inView highlightLast={1} />
      </h2>
      {text && <Reveal as="p" delay={0.15} className="mt-4 text-lg text-gray-600">{text}</Reveal>}
    </div>
    {action && <Reveal delay={0.2}>{action}</Reveal>}
  </div>
);
