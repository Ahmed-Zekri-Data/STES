import React from 'react';
import { motion } from 'framer-motion';
import { Waves, Droplets, Sparkles, Circle } from 'lucide-react';

const FloatingElements = ({ variant = 'default' }) => {
  const variants = {
    default: [
      { icon: Waves, size: 'w-8 h-8', color: 'text-blue-300', position: 'top-20 left-10' },
      { icon: Droplets, size: 'w-6 h-6', color: 'text-cyan-300', position: 'top-40 right-20' },
      { icon: Sparkles, size: 'w-10 h-10', color: 'text-blue-200', position: 'bottom-32 left-1/4' },
    ],
    hero: [
      { icon: Waves, size: 'w-16 h-16', color: 'text-blue-300', position: 'top-20 left-10' },
      { icon: Droplets, size: 'w-12 h-12', color: 'text-cyan-300', position: 'top-40 right-20' },
      { icon: Sparkles, size: 'w-20 h-20', color: 'text-blue-200', position: 'bottom-32 left-1/4' },
      { icon: Circle, size: 'w-14 h-14', color: 'text-purple-200', position: 'top-1/2 right-10' },
    ],
    minimal: [
      { icon: Waves, size: 'w-6 h-6', color: 'text-blue-200', position: 'top-10 right-10' },
      { icon: Droplets, size: 'w-4 h-4', color: 'text-cyan-200', position: 'bottom-10 left-10' },
    ]
  };

  const elements = variants[variant] || variants.default;

  const floatingVariants = {
    animate: (i) => ({
      y: [-10, 10, -10],
      x: [-5, 5, -5],
      rotate: [0, 180, 360],
      transition: {
        duration: 3 + i * 0.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: i * 0.5
      }
    })
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((element, index) => {
        const Icon = element.icon;
        return (
          <motion.div
            key={index}
            className={`absolute ${element.position} ${element.color} opacity-20`}
            variants={floatingVariants}
            animate="animate"
            custom={index}
          >
            <Icon className={element.size} />
          </motion.div>
        );
      })}
      
      {/* Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/3 w-32 h-32 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
    </div>
  );
};

export default FloatingElements;
