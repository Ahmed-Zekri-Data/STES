import React, { useState } from 'react';
import { CheckCircle, Clock, Undo2 } from 'lucide-react';
import api from '../../utils/adminApi';

// How the customer pays, and whether the money came in. Cash on delivery
// and bank transfer are recorded here by an admin; online payments are
// confirmed by their gateway.

const PAYMENT_METHODS = {
  cash_on_delivery: 'Paiement à la livraison',
  bank_transfer: 'Virement bancaire',
  card: 'Carte bancaire',
  paymee: 'Paymee',
  flouci: 'Flouci',
  d17: 'D17',
  konnect: 'Konnect'
};
const MANUAL = ['cash_on_delivery', 'bank_transfer'];

const day = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// For the orders list
export const PaymentBadge = ({ order }) => (order.paymentStatus === 'paid'
  ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"><CheckCircle className="h-3 w-3" aria-hidden="true" /> Payé</span>
  : <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"><Clock className="h-3 w-3" aria-hidden="true" /> Non payé</span>);

const OrderPayment = ({ order, onChange }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmUndo, setConfirmUndo] = useState(false);
  const paid = order.paymentStatus === 'paid';
  const manual = MANUAL.includes(order.paymentMethod);
  const transfer = order.paymentMethod === 'bank_transfer';

  const save = async (received) => {
    setSaving(true);
    setError('');
    try {
      const response = await api.put(`/orders/${order._id}/payment`, { received, ...(note.trim() && { note: note.trim() }) });
      setNote('');
      setConfirmUndo(false);
      onChange(response.data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'L’enregistrement n’a pas abouti. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-gray-50 rounded-lg p-4 mb-6" aria-labelledby="payment-title">
      <h3 id="payment-title" className="text-lg font-semibold mb-4">Paiement</h3>
      <div className="space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Mode :</span>
          <span className="font-medium">{PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Statut :</span>
          <span className={`font-medium ${paid ? 'text-green-700' : 'text-gray-700'}`}>
            {paid ? `Payé${order.paidAt ? ` le ${day(order.paidAt)}` : ''}` : 'En attente'}
          </span>
        </div>
      </div>

      {!manual && <p className="mt-3 text-sm text-gray-600">Paiement en ligne : il est confirmé automatiquement par la passerelle de paiement.</p>}

      {manual && !paid && order.status === 'cancelled' && <p className="mt-3 text-sm text-gray-600">Commande annulée : aucun paiement à enregistrer.</p>}

      {manual && !paid && order.status !== 'cancelled' && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Remarque (facultatif)
            <input
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={transfer ? 'Ex. référence du virement' : 'Ex. encaissé par le livreur'}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <button type="button" onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            <CheckCircle className="h-4 w-4" aria-hidden="true" /> {saving ? 'Enregistrement…' : 'Marquer comme payé'}
          </button>
          <p className="text-xs text-gray-500">
            {transfer ? 'À faire quand le virement apparaît sur le compte. Le client reçoit un email de confirmation.' : 'À faire quand l’argent est encaissé (en général à la livraison).'}
          </p>
        </div>
      )}

      {manual && paid && (
        <div className="mt-4">
          {confirmUndo ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Repasser cette commande en « non payée » ?</span>
              <button type="button" onClick={() => save(false)} disabled={saving} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">Oui, annuler</button>
              <button type="button" onClick={() => setConfirmUndo(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Non</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmUndo(true)} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-700">
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Annuler l’enregistrement du paiement
            </button>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
};

export default OrderPayment;
