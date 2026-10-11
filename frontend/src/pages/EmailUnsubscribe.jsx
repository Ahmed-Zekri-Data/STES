import React, { useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { MailX, Check } from 'lucide-react';

// /emails/desinscription?token=… : the link at the bottom of the shop's
// automatic emails (cart reminder, quote follow-up, review request,
// reorder reminder). A click, not the link itself, stops them: mail
// scanners open links on their own.
const EmailUnsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState('ready'); // ready, sending, done, invalid
  const [message, setMessage] = useState('');

  const stop = async () => {
    setState('sending');
    try {
      const response = await axios.post('/api/emails/unsubscribe', { token });
      setMessage(response.data.message);
      setState('done');
    } catch (err) {
      setMessage(err.response?.data?.message || 'La désinscription n’a pas abouti. Réessayez dans un instant.');
      setState(err.response?.status === 400 ? 'invalid' : 'ready');
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:pt-20">
      <p className="eyebrow">Emails</p>
      <h1 className="mt-3 text-4xl font-bold text-gray-900">Désinscription</h1>

      {state === 'done' ? (
        <div className="panel mt-6 p-6 text-center" role="status">
          <Check className="mx-auto h-10 w-10 text-green-600" aria-hidden="true" />
          <p className="mt-3 text-gray-700">{message}</p>
          <p className="mt-2 text-sm text-gray-500">Vous recevrez toujours les emails liés à vos commandes (confirmation, livraison, facture).</p>
          <Link to="/shop" className="btn-ghost mt-4">Retour à la boutique</Link>
        </div>
      ) : state === 'invalid' || !token ? (
        <div className="panel mt-6 p-6" role="alert">
          <p className="text-gray-700">{message || 'Ce lien de désinscription n’est pas complet.'}</p>
          <p className="mt-2 text-sm text-gray-600">Utilisez le lien en bas de l’email reçu, ou écrivez-nous depuis la page Contact.</p>
          <Link to="/contact" className="btn-ghost mt-4">Nous contacter</Link>
        </div>
      ) : (
        <div className="panel mt-6 p-6">
          <p className="text-gray-700">
            Vous ne recevrez plus nos emails automatiques : rappel de panier, suivi de devis, demande d’avis et rappel de réassort.
            Les emails de vos commandes, eux, continueront d’arriver.
          </p>
          {message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}
          <button type="button" className="btn-brand mt-5 w-full" onClick={stop} disabled={state === 'sending'}>
            <MailX className="h-4 w-4" aria-hidden="true" /> {state === 'sending' ? 'Un instant…' : 'Ne plus recevoir ces emails'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailUnsubscribe;
