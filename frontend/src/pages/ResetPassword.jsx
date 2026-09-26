import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useLanguage } from '../context/LanguageContext';
import AnimatedButton from '../components/AnimatedButton';
import ForgotPassword from '../components/auth/ForgotPassword';

const MIN_LENGTH = 6;

const translations = {
  fr: {
    title: 'Choisir un nouveau mot de passe',
    forAccount: (email) => `Pour le compte ${email}`,
    checking: 'Vérification du lien…',
    password: 'Nouveau mot de passe',
    confirm: 'Confirmer le mot de passe',
    passwordHint: `Au moins ${MIN_LENGTH} caractères`,
    save: 'Enregistrer',
    tooShort: `Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`,
    mismatch: 'Les deux mots de passe ne sont pas identiques.',
    error: 'Le mot de passe n’a pas pu être changé. Veuillez réessayer.',
    doneTitle: 'Mot de passe changé',
    done: 'Vous êtes maintenant connecté avec votre nouveau mot de passe. Vos autres appareils ont été déconnectés.',
    account: 'Mon compte',
    shop: 'Continuer mes achats',
    invalidTitle: 'Ce lien n’est plus valable',
    invalid: 'Il a expiré, a déjà servi ou a été remplacé par un lien plus récent. Demandez-en un nouveau ci-dessous.',
    retry: 'Réessayer',
    show: 'Afficher le mot de passe',
    hide: 'Masquer le mot de passe'
  },
  ar: {
    title: 'اختر كلمة مرور جديدة',
    forAccount: (email) => `للحساب ${email}`,
    checking: 'جارٍ التحقق من الرابط…',
    password: 'كلمة المرور الجديدة',
    confirm: 'تأكيد كلمة المرور',
    passwordHint: `${MIN_LENGTH} أحرف على الأقل`,
    save: 'حفظ',
    tooShort: `يجب أن تحتوي كلمة المرور على ${MIN_LENGTH} أحرف على الأقل.`,
    mismatch: 'كلمتا المرور غير متطابقتين.',
    error: 'تعذر تغيير كلمة المرور. يرجى المحاولة مرة أخرى.',
    doneTitle: 'تم تغيير كلمة المرور',
    done: 'أنت الآن متصل بكلمة المرور الجديدة. تم تسجيل الخروج من أجهزتك الأخرى.',
    account: 'حسابي',
    shop: 'مواصلة التسوق',
    invalidTitle: 'هذا الرابط لم يعد صالحًا',
    invalid: 'انتهت صلاحيته أو تم استخدامه أو تم استبداله برابط أحدث. اطلب رابطًا جديدًا أدناه.',
    retry: 'إعادة المحاولة',
    show: 'إظهار كلمة المرور',
    hide: 'إخفاء كلمة المرور'
  },
  en: {
    title: 'Choose a new password',
    forAccount: (email) => `For the account ${email}`,
    checking: 'Checking the link…',
    password: 'New password',
    confirm: 'Confirm password',
    passwordHint: `At least ${MIN_LENGTH} characters`,
    save: 'Save',
    tooShort: `The password must be at least ${MIN_LENGTH} characters.`,
    mismatch: 'The two passwords do not match.',
    error: 'The password could not be changed. Please try again.',
    doneTitle: 'Password changed',
    done: 'You are now logged in with your new password. Your other devices have been logged out.',
    account: 'My account',
    shop: 'Continue shopping',
    invalidTitle: 'This link is no longer valid',
    invalid: 'It has expired, was already used or was replaced by a newer link. Request a new one below.',
    retry: 'Try again',
    show: 'Show password',
    hide: 'Hide password'
  }
};

const inputClass = 'w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';

// Opened from the link in the password reset email
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { checkResetLink, resetPassword } = useCustomer();
  const { language } = useLanguage();
  const text = translations[language] || translations.fr;

  // checking → form → done, or invalid / error
  const [status, setStatus] = useState(token ? 'checking' : 'invalid');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    checkResetLink(token)
      .then(email => {
        if (!cancelled) {
          setAccountEmail(email);
          setStatus('form');
        }
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 400) {
          setStatus('invalid');
        } else {
          // Too many attempts or no connection: the link may still be good
          setError(err.response?.data?.message || text.error);
          setStatus('error');
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(text.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(text.mismatch);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await resetPassword(token, password);
      setStatus('done');
    } catch (err) {
      if (err.response?.status === 400 && !err.response.data?.errors) {
        setStatus('invalid');
      } else {
        setError(err.response?.data?.message || text.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const passwordField = (id, label, value, onChange, autoFocus) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => { onChange(e.target.value); setError(''); }}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className={inputClass}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? text.hide : text.show}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        {status === 'checking' && (
          <p className="text-center text-gray-600 dark:text-gray-400">{text.checking}</p>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
            <button
              type="button"
              onClick={() => { setError(''); setStatus('checking'); setAttempt(attempt + 1); }}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {text.retry}
            </button>
          </div>
        )}

        {status === 'form' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{text.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{text.forAccount(accountEmail)}</p>
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {passwordField('new-password', text.password, password, setPassword, true)}
              <p className="-mt-3 text-xs text-gray-500">{text.passwordHint}</p>
              {passwordField('confirm-password', text.confirm, confirm, setConfirm, false)}
              <AnimatedButton
                type="submit"
                loading={saving}
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
              >
                {text.save}
              </AnimatedButton>
            </form>
          </>
        )}

        {status === 'done' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{text.doneTitle}</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{text.done}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/account" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">
                {text.account}
              </Link>
              <Link to="/shop" className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                {text.shop}
              </Link>
            </div>
          </div>
        )}

        {status === 'invalid' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{text.invalidTitle}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{text.invalid}</p>
            </div>
            <ForgotPassword initialEmail={accountEmail} showHeader={false} />
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
