import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CustomerLogin from './CustomerLogin';
import CustomerRegister from './CustomerRegister';
import ForgotPassword from './ForgotPassword';
import { LogoMark } from '../brand/Logo';

const TABS = [
  ['login', 'Connexion'],
  ['register', 'Inscription']
];

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  // Carried from the login form to the "forgot password" form
  const [forgotEmail, setForgotEmail] = useState('');

  // Open in the mode the caller asked for ("S'inscrire" vs "Connexion")
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  const handleClose = () => {
    onClose();
  };

  // Escape closes; the page behind does not scroll
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  const handleForgotPassword = (email) => {
    setForgotEmail(email);
    setMode('forgot');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-gray-950/50 p-3 backdrop-blur-md sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'register' ? 'Inscription' : mode === 'forgot' ? 'Mot de passe oublié' : 'Connexion'}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="glass relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* A band of water light across the top */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-32"
              style={{ background: 'radial-gradient(60% 100% at 30% 0%, rgb(var(--aqua-400) / 0.25), transparent 70%), radial-gradient(50% 100% at 85% 0%, rgb(var(--violet-500) / 0.2), transparent 70%)' }}
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between px-6 pt-5">
              <LogoMark className="h-9 w-9" animated />
              {mode !== 'forgot' && (
                <div className="flex rounded-full bg-gray-100 p-1" role="tablist" aria-label="Compte">
                  {TABS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={mode === key}
                      onClick={() => setMode(key)}
                      className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${mode === key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {mode === key && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-surface shadow-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="grid h-9 w-9 place-items-center rounded-full text-gray-500 transition-transform hover:rotate-90 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative p-6 pt-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'register' ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'register' ? -24 : 24 }}
                  transition={{ duration: 0.25 }}
                >
                  {mode === 'login' && (
                    <CustomerLogin onClose={handleClose} onSwitchToRegister={() => setMode('register')} onForgotPassword={handleForgotPassword} />
                  )}
                  {mode === 'register' && (
                    <CustomerRegister onClose={handleClose} onSwitchToLogin={() => setMode('login')} />
                  )}
                  {mode === 'forgot' && (
                    <ForgotPassword initialEmail={forgotEmail} onBack={() => setMode('login')} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
