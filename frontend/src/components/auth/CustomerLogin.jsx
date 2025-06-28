import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../../context/CustomerContext';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';
import AnimatedButton from '../AnimatedButton';
import LoadingSpinner from '../LoadingSpinner';

const CustomerLogin = ({ onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { login } = useCustomer();
  const { login: adminLogin } = useAdmin();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // List of admin emails that should be redirected to admin panel
  const adminEmails = [
    'ahmedzekri143@gmail.com',
    'admin@piscinefacile.tn',
    'admin@stes.tn'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if this is an admin email
      const isAdminEmail = adminEmails.includes(formData.email.toLowerCase());

      if (isAdminEmail) {
        // Try admin login - the backend accepts both email and username in the username field
        try {
          await adminLogin({
            username: formData.email, // Backend will accept email in username field
            password: formData.password
          });
          onClose();
          navigate('/admin/dashboard');
          return;
        } catch (adminError) {
          // If admin login fails, show specific error
          console.error('Admin login error:', adminError);
          setError(adminError.message || 'Invalid admin credentials');
          return;
        }
      } else {
        // Regular customer login
        await login(formData);
        onClose();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    fr: {
      title: 'Connexion',
      email: 'Email',
      password: 'Mot de passe',
      login: 'Se connecter',
      noAccount: "Vous n'avez pas de compte ?",
      register: "S'inscrire",
      forgotPassword: 'Mot de passe oublié ?',
      emailPlaceholder: 'votre@email.com',
      passwordPlaceholder: 'Votre mot de passe'
    },
    ar: {
      title: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      login: 'تسجيل الدخول',
      noAccount: 'ليس لديك حساب؟',
      register: 'إنشاء حساب',
      forgotPassword: 'نسيت كلمة المرور؟',
      emailPlaceholder: 'your@email.com',
      passwordPlaceholder: 'كلمة المرور'
    },
    en: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      login: 'Login',
      noAccount: "Don't have an account?",
      register: 'Register',
      forgotPassword: 'Forgot password?',
      emailPlaceholder: 'your@email.com',
      passwordPlaceholder: 'Your password'
    }
  };

  const text = translations[language];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <LogIn className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {text.title}
        </h2>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {text.email}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={text.emailPlaceholder}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {text.password}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={text.passwordPlaceholder}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatedButton
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
          >
            {loading ? <LoadingSpinner size="sm" /> : text.login}
          </AnimatedButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-4"
        >
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            {text.forgotPassword}
          </button>

          <div className="flex items-center justify-center space-x-2">
            <span className="text-gray-600 text-sm">{text.noAccount}</span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>{text.register}</span>
            </button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default CustomerLogin;
