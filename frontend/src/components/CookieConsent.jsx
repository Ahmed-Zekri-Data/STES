import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useShopSettings } from '../context/shopSettings';
import { configureAnalytics, getConsent, setConsent, onConsentChange, trackPage } from '../utils/analytics';
import { OPEN_COOKIE_CHOICE } from '../utils/cookieChoice';

// The shop's audience measurement (see utils/analytics.js): sets it up from
// the shop settings, asks the visitor once, and counts each page shown.
// Nothing shows while Admin → Settings → Marketing has no measurement id.
const CookieConsent = () => {
  const { marketing } = useShopSettings();
  const { pathname, search } = useLocation();
  const [consent, setConsentState] = useState(getConsent);
  const [reopened, setReopened] = useState(false);
  const gaMeasurementId = marketing?.gaMeasurementId || '';
  const metaPixelId = marketing?.metaPixelId || '';
  const active = Boolean(gaMeasurementId || metaPixelId);

  useEffect(() => { configureAnalytics({ gaMeasurementId, metaPixelId }); }, [gaMeasurementId, metaPixelId]);
  useEffect(() => onConsentChange(setConsentState), []);
  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_COOKIE_CHOICE, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_CHOICE, reopen);
  }, []);

  // Each page shown, and the current one as soon as the visitor accepts
  useEffect(() => {
    if (active && consent === 'granted') trackPage(`${pathname}${search}`);
  }, [active, consent, pathname, search]);

  if (!active || (consent && !reopened)) return null;

  const choose = (value) => {
    setConsent(value);
    setReopened(false);
  };

  return (
    <section
      aria-labelledby="cookies-title"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-surface p-5 shadow-large sm:inset-x-6 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
        <div>
          <h2 id="cookies-title" className="font-semibold text-gray-900">Mesure d’audience et publicités</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Avec votre accord, nous utilisons les cookies de Google Analytics et de Meta (Facebook, Instagram) pour savoir comment le site est utilisé et mesurer l’efficacité de nos publicités.
            Sans votre accord, rien n’est envoyé. Vous pouvez changer d’avis à tout moment depuis le bas de page.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" className="btn-ghost justify-center" onClick={() => choose('denied')}>Refuser</button>
        <button type="button" className="btn-brand justify-center" onClick={() => choose('granted')}>Accepter</button>
      </div>
    </section>
  );
};

export default CookieConsent;
