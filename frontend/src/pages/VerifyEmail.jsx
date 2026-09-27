import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useLanguage } from '../context/LanguageContext';
import ResendVerification from '../components/auth/ResendVerification';

const translations = {
  fr: {
    checking: 'Confirmation de votre adresse…',
    doneTitle: 'Adresse email confirmée',
    done: (email) => `Merci ! ${email} est confirmée. Vous recevrez nos confirmations de commande et le suivi de vos livraisons.`,
    shop: 'Découvrir la boutique',
    account: 'Mon compte',
    invalidTitle: 'Ce lien n’est plus valable',
    invalid: 'Il a expiré, a déjà servi ou a été remplacé par un lien plus récent.',
    loggedOut: 'Connectez-vous pour recevoir un nouveau lien, depuis la page Mon compte.',
    error: 'La confirmation n’a pas pu être vérifiée. Veuillez réessayer dans quelques minutes.',
    retry: 'Réessayer'
  },
  ar: {
    checking: 'جارٍ تأكيد بريدك الإلكتروني…',
    doneTitle: 'تم تأكيد البريد الإلكتروني',
    done: (email) => `شكرًا! تم تأكيد ${email}. ستتلقى تأكيدات الطلبات وتتبع الشحنات.`,
    shop: 'اكتشف المتجر',
    account: 'حسابي',
    invalidTitle: 'هذا الرابط لم يعد صالحًا',
    invalid: 'انتهت صلاحيته أو تم استخدامه أو تم استبداله برابط أحدث.',
    loggedOut: 'سجّل الدخول لتلقي رابط جديد من صفحة حسابي.',
    error: 'تعذر التحقق من التأكيد. يرجى المحاولة بعد بضع دقائق.',
    retry: 'إعادة المحاولة'
  },
  en: {
    checking: 'Confirming your address…',
    doneTitle: 'Email address confirmed',
    done: (email) => `Thank you! ${email} is confirmed. You will receive order confirmations and delivery tracking.`,
    shop: 'Browse the shop',
    account: 'My account',
    invalidTitle: 'This link is no longer valid',
    invalid: 'It has expired, was already used or was replaced by a newer link.',
    loggedOut: 'Log in to get a new link from the My account page.',
    error: 'The confirmation could not be checked. Please try again in a few minutes.',
    retry: 'Try again'
  }
};

// Opened from the link in the welcome email
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { verifyEmail, isAuthenticated, customer } = useCustomer();
  const { language } = useLanguage();
  const text = translations[language] || translations.fr;
  const [status, setStatus] = useState(token ? 'checking' : 'invalid'); // checking | done | invalid | error
  const [email, setEmail] = useState('');
  const [attempt, setAttempt] = useState(0);
  // A link works once: don't send it twice (React runs effects twice in development)
  const sentFor = useRef(null);

  useEffect(() => {
    if (!token || sentFor.current === `${token}:${attempt}`) return;
    sentFor.current = `${token}:${attempt}`;
    verifyEmail(token)
      .then(data => {
        setEmail(data.email);
        setStatus('done');
      })
      .catch(err => setStatus(err.response?.status === 400 ? 'invalid' : 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt]);

  // Already confirmed (for example, the link opened twice): show that
  const alreadyConfirmed = status === 'invalid' && customer?.isEmailVerified;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
      >
        {status === 'checking' && <p className="text-gray-600 dark:text-gray-400">{text.checking}</p>}

        {(status === 'done' || alreadyConfirmed) && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{text.doneTitle}</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{text.done(email || customer?.email)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/shop" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">{text.shop}</Link>
              {isAuthenticated && (
                <Link to="/account" className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">{text.account}</Link>
              )}
            </div>
          </>
        )}

        {status === 'invalid' && !alreadyConfirmed && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{text.invalidTitle}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{text.invalid}</p>
            {isAuthenticated
              ? <ResendVerification />
              : <p className="text-sm text-gray-600 dark:text-gray-400">{text.loggedOut}</p>}
          </>
        )}

        {status === 'error' && (
          <>
            <p role="alert" className="text-red-600 mb-4">{text.error}</p>
            <button
              type="button"
              onClick={() => { setStatus('checking'); setAttempt(attempt + 1); }}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {text.retry}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
