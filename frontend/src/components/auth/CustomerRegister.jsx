import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, UserPlus, LogIn } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useLanguage } from '../../context/LanguageContext';
import AnimatedButton from '../AnimatedButton';
import LoadingSpinner from '../LoadingSpinner';

const CustomerRegister = ({ onClose, onSwitchToLogin }) => {
  const { register } = useCustomer();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: 'other',
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = text.firstNameRequired;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = text.lastNameRequired;
    }
    if (!formData.email.trim()) {
      newErrors.email = text.emailRequired;
    }
    if (formData.password.length < 6) {
      newErrors.password = text.passwordMinLength;
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = text.passwordMismatch;
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = text.acceptTermsRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, acceptTerms, ...registrationData } = formData;
      await register(registrationData);
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    fr: {
      title: 'Créer un compte',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      gender: 'Genre',
      male: 'Homme',
      female: 'Femme',
      other: 'Autre',
      register: 'Créer le compte',
      haveAccount: 'Vous avez déjà un compte ?',
      login: 'Se connecter',
      acceptTerms: "J'accepte les conditions d'utilisation",
      firstNameRequired: 'Le prénom est requis',
      lastNameRequired: 'Le nom est requis',
      emailRequired: 'L\'email est requis',
      passwordMinLength: 'Le mot de passe doit contenir au moins 6 caractères',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      acceptTermsRequired: 'Vous devez accepter les conditions d\'utilisation'
    },
    ar: {
      title: 'إنشاء حساب',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      gender: 'الجنس',
      male: 'ذكر',
      female: 'أنثى',
      other: 'آخر',
      register: 'إنشاء الحساب',
      haveAccount: 'لديك حساب بالفعل؟',
      login: 'تسجيل الدخول',
      acceptTerms: 'أوافق على شروط الاستخدام',
      firstNameRequired: 'الاسم الأول مطلوب',
      lastNameRequired: 'اسم العائلة مطلوب',
      emailRequired: 'البريد الإلكتروني مطلوب',
      passwordMinLength: 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      acceptTermsRequired: 'يجب الموافقة على شروط الاستخدام'
    },
    en: {
      title: 'Create Account',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      register: 'Create Account',
      haveAccount: 'Already have an account?',
      login: 'Login',
      acceptTerms: 'I accept the terms and conditions',
      firstNameRequired: 'First name is required',
      lastNameRequired: 'Last name is required',
      emailRequired: 'Email is required',
      passwordMinLength: 'Password must be at least 6 characters',
      passwordMismatch: 'Passwords do not match',
      acceptTermsRequired: 'You must accept the terms and conditions'
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
          className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <UserPlus className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {text.title}
        </h2>
      </div>

      {errors.general && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
        >
          {errors.general}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {text.firstName}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
            </div>
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {text.lastName}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
            </div>
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {text.email}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {text.phone} (Optional)
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+216 12 345 678"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {text.password}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-9 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {text.confirmPassword}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-9 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center space-x-2"
        >
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            required
          />
          <label className="text-sm text-gray-700 dark:text-gray-300">
            {text.acceptTerms}
          </label>
        </motion.div>
        {errors.acceptTerms && (
          <p className="text-red-500 text-xs">{errors.acceptTerms}</p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <AnimatedButton
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
          >
            {loading ? <LoadingSpinner size="sm" /> : text.register}
          </AnimatedButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-gray-600 text-sm">{text.haveAccount}</span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-green-600 hover:text-green-700 text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <LogIn className="w-4 h-4" />
              <span>{text.login}</span>
            </button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default CustomerRegister;
