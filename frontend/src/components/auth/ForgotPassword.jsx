import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useLanguage } from '../../context/LanguageContext';
import AnimatedButton from '../AnimatedButton';

const translations = {
  fr: {
    title: 'Mot de passe oublié',
    intro: 'Entrez l’email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.',
    email: 'Email',
    emailPlaceholder: 'votre@email.com',
    send: 'Envoyer le lien',
    sentTitle: 'Vérifiez votre boîte mail',
    sent: (email) => `Si un compte existe pour ${email}, vous allez recevoir un email avec un lien valable 1 heure.`,
    spam: 'Rien reçu après quelques minutes ? Regardez dans les spams.',
    back: 'Retour à la connexion',
    error: 'Impossible d’envoyer le lien. Veuillez réessayer.',
    invalidEmail: 'Veuillez entrer une adresse email valide.'
  },
  ar: {
    title: 'نسيت كلمة المرور',
    intro: 'أدخل البريد الإلكتروني لحسابك. سنرسل لك رابطًا لاختيار كلمة مرور جديدة.',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'your@email.com',
    send: 'إرسال الرابط',
    sentTitle: 'تحقق من بريدك الإلكتروني',
    sent: (email) => `إذا كان هناك حساب مرتبط بـ ${email}، ستتلقى رسالة تحتوي على رابط صالح لمدة ساعة.`,
    spam: 'لم يصلك شيء بعد بضع دقائق؟ تحقق من البريد غير المرغوب فيه.',
    back: 'العودة إلى تسجيل الدخول',
    error: 'تعذر إرسال الرابط. يرجى المحاولة مرة أخرى.',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.'
  },
  en: {
    title: 'Forgot password',
    intro: 'Enter your account email. We will send you a link to choose a new password.',
    email: 'Email',
    emailPlaceholder: 'your@email.com',
    send: 'Send the link',
    sentTitle: 'Check your inbox',
    sent: (email) => `If an account exists for ${email}, you will receive an email with a link valid for 1 hour.`,
    spam: 'Nothing after a few minutes? Check your spam folder.',
    back: 'Back to login',
    error: 'The link could not be sent. Please try again.',
    invalidEmail: 'Please enter a valid email address.'
  }
};

// Asks for the account email and sends the reset link. Used in the login
// window and on the reset page when a link has expired.
const ForgotPassword = ({ initialEmail = '', onBack, showHeader = true }) => {
  const { forgotPassword } = useCustomer();
  const { language } = useLanguage();
  const text = translations[language] || translations.fr;
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors ? text.invalidEmail : data?.message || text.error);
    } finally {
      setLoading(false);
    }
  };

  const backButton = onBack && (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {text.back}
    </button>
  );

  if (sentTo) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{text.sentTitle}</h2>
        <p className="text-gray-700 mb-2">{text.sent(sentTo)}</p>
        <p className="text-gray-500 text-sm mb-6">{text.spam}</p>
        {backButton}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
      {showHeader && <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{text.title}</h2>
        <p className="text-gray-600 text-sm">{text.intro}</p>
      </div>}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
            {text.email}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder={text.emailPlaceholder}
              autoComplete="email"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all duration-200"
              required
            />
          </div>
        </div>

        <AnimatedButton
          type="submit"
          loading={loading}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
        >
          {text.send}
        </AnimatedButton>

        {backButton && <div className="text-center">{backButton}</div>}
      </form>
    </motion.div>
  );
};

export default ForgotPassword;
