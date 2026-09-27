import React from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, CreditCard, CheckCircle, Check } from 'lucide-react';
import { useCheckout } from '../../context/CheckoutContext';

const STEPS = [
  { id: 1, name: 'Informations', description: 'Vos coordonnées', icon: User },
  { id: 2, name: 'Livraison', description: 'Adresse de livraison', icon: MapPin },
  { id: 3, name: 'Paiement', description: 'Mode de paiement', icon: CreditCard },
  { id: 4, name: 'Confirmation', description: 'Vérification finale', icon: CheckCircle }
];

// Four segments that fill as the customer moves through checkout
const CheckoutProgress = () => {
  const { currentStep } = useCheckout();
  const current = STEPS.find(step => step.id === currentStep) || STEPS[0];

  return (
    <nav aria-label="Étapes de la commande">
      <p className="eyebrow sm:hidden">
        Étape {current.id} sur {STEPS.length} · {current.name}
      </p>
      <ol className="mt-3 grid grid-cols-4 gap-2 sm:mt-0 sm:gap-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          return (
            <li key={step.id} aria-current={active ? 'step' : undefined}>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: done ? 'rgb(var(--success-500))' : 'linear-gradient(90deg, rgb(var(--aqua-500)), rgb(var(--violet-500)))' }}
                  initial={false}
                  animate={{ width: done ? '100%' : active ? '50%' : '0%' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-3 hidden items-center gap-3 sm:flex">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                    done ? 'bg-green-100 text-green-700' : active ? 'text-on-brand shadow-glow' : 'bg-gray-100 text-gray-400'
                  }`}
                  style={active ? { background: 'rgb(var(--brand))' } : undefined}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${active || done ? 'text-gray-900' : 'text-gray-500'}`}>{step.name}</p>
                  <p className="truncate text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              <span className="sr-only">{done ? ' (terminée)' : active ? ' (en cours)' : ''}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default CheckoutProgress;
