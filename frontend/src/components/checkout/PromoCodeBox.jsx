import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Loader2, Check } from 'lucide-react';
import { useCheckout } from '../../context/CheckoutContext';

// Type a promo code; the server checks it and prices the order with it
const PromoCodeBox = () => {
  const { quote, promoError, promoChecking, applyPromo, removePromo } = useCheckout();
  const [code, setCode] = useState('');
  const applied = quote?.discountCode;

  const submit = (event) => {
    event.preventDefault();
    applyPromo(code);
  };

  return (
    <div className="mb-6 rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-4">
      <AnimatePresence mode="wait" initial={false}>
        {applied ? (
          <motion.div
            key="applied"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-100 text-green-700">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono font-semibold text-gray-900">{applied}</span>
                <span className="block text-xs text-green-700">Code appliqué : −{Number(quote.discountAmount).toFixed(3)} TND</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => { removePromo(); setCode(''); }}
              aria-label={`Retirer le code ${applied}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} noValidate>
            <label htmlFor="promo-code" className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
              <Tag className="h-4 w-4 text-blue-600" aria-hidden="true" /> Code promo
            </label>
            <div className="flex gap-2">
              <input
                id="promo-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Entrez votre code"
                autoComplete="off"
                autoCapitalize="characters"
                aria-invalid={Boolean(promoError)}
                aria-describedby={promoError ? 'promo-error' : undefined}
                className="min-w-0 flex-1 rounded-xl border-gray-200 px-3 py-2 font-mono text-sm uppercase placeholder:font-sans placeholder:normal-case focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
              />
              <button type="submit" disabled={!code.trim() || promoChecking} className="btn-brand !px-4 !py-2 text-sm">
                {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Vérification" /> : 'Appliquer'}
              </button>
            </div>
            {promoError && (
              <p id="promo-error" role="alert" className="mt-2 text-sm text-red-600">{promoError}</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromoCodeBox;
