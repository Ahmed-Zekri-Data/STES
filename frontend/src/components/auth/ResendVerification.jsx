import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useLanguage } from '../../context/LanguageContext';

const translations = {
  fr: { send: "Renvoyer l'email de confirmation", sending: 'Envoi…', sent: (email) => `C'est envoyé. Regardez dans la boîte mail de ${email} (et dans les spams).`, error: "L'email n'a pas pu être envoyé. Veuillez réessayer." },
  ar: { send: 'إعادة إرسال رسالة التأكيد', sending: 'جارٍ الإرسال…', sent: (email) => `تم الإرسال. تحقق من بريد ${email} (والبريد غير المرغوب فيه).`, error: 'تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى.' },
  en: { send: 'Send the confirmation email again', sending: 'Sending…', sent: (email) => `Sent. Check the inbox of ${email} (and the spam folder).`, error: 'The email could not be sent. Please try again.' }
};

// Button that emails a new confirmation link to the logged-in customer
const ResendVerification = ({ className = '' }) => {
  const { customer, resendVerification } = useCustomer();
  const { language } = useLanguage();
  const text = translations[language] || translations.fr;
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  const send = async () => {
    setState('sending');
    setError('');
    try {
      await resendVerification();
      setState('sent');
    } catch (err) {
      setError(err.response?.data?.message || text.error);
      setState('idle');
    }
  };

  if (state === 'sent') {
    return <p role="status" className={`text-sm text-green-700 ${className}`}>{text.sent(customer?.email)}</p>;
  }
  return (
    <div className={className}>
      <button
        type="button"
        onClick={send}
        disabled={state === 'sending'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        <Mail className="w-4 h-4" />
        {state === 'sending' ? text.sending : text.send}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ResendVerification;
