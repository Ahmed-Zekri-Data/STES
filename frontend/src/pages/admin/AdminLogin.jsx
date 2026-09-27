import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { LogoMark } from '../../components/brand/Logo';
import ThemeToggle from '../../components/ThemeToggle';
import { EASE } from '../../utils/motion';

// The deep-water side of the login: brand, glowing rings, a line of text
const BrandPanel = () => (
  <div className="dark relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12" style={{ backgroundColor: 'rgb(var(--deep))' }}>
    <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
    <div className="pointer-events-none absolute inset-0 [perspective:900px]" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full border motion-safe:animate-[tilt-spin_var(--d)_linear_infinite]"
          style={{
            width: `${20 + i * 8}rem`,
            height: `${20 + i * 8}rem`,
            marginLeft: `-${10 + i * 4}rem`,
            marginTop: `-${10 + i * 4}rem`,
            borderColor: i % 2 ? 'rgb(167 139 250 / 0.35)' : 'rgb(45 212 238 / 0.4)',
            boxShadow: `0 0 40px ${i % 2 ? 'rgb(167 139 250 / 0.12)' : 'rgb(45 212 238 / 0.14)'}`,
            '--d': `${20 + i * 6}s`,
            '--tilt': `${60 + i * 6}deg`
          }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-float">
        <LogoMark className="h-full w-full drop-shadow-[0_0_40px_rgb(45_212_238/0.6)]" animated />
      </div>
    </div>
    <p className="relative font-display text-2xl font-bold text-white">STES<span className="text-cyan-300">.tn</span></p>
    <div className="relative">
      <p className="eyebrow">Console d&apos;administration</p>
      <p className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight text-white">
        Commandes, catalogue et clients, au même endroit.
      </p>
    </div>
  </div>
);

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAdmin();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/admin/dashboard');
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Nom d\'utilisateur ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const field = 'block w-full rounded-2xl border-gray-200 bg-surface py-3.5 ps-12 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <div className="relative isolate flex flex-col px-6 py-8 sm:px-12">
        <div className="ambient" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour au site
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="m-auto w-full max-w-sm py-12"
        >
          <LogoMark className="h-12 w-12 lg:hidden" animated />
          <p className="eyebrow mt-6 lg:mt-0">Espace sécurisé</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-gray-900">Administration</h1>
          <p className="mt-2 text-gray-600">Connectez-vous à votre espace d&apos;administration</p>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                transition={{ duration: 0.4 }}
                className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
              </motion.p>
            )}

            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">Nom d&apos;utilisateur</label>
              <div className="relative">
                <input id="username" name="username" type="text" required autoComplete="username" value={formData.username} onChange={handleInputChange} className={field} placeholder="Votre nom d'utilisateur" />
                <User className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${field} pe-12`}
                  placeholder="Votre mot de passe"
                />
                <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setShowPassword(shown => !shown)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                  className="absolute end-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-brand w-full py-4 text-base">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Connexion...</> : 'Se connecter'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
