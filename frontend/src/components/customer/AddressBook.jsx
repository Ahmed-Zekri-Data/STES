import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, X } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { TUNISIAN_GOVERNORATES } from '../../utils/governorates';

const TYPE_LABELS = { home: 'Domicile', work: 'Travail', other: 'Autre' };

const EMPTY = {
  type: 'home', firstName: '', lastName: '', company: '', address1: '', address2: '',
  city: '', state: '', postalCode: '', phone: ''
};

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const Field = ({ label, id, hint, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={id} className={inputClass} {...props} />
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

// The server's reason: its message or the first field that failed
const reason = (error, fallback) =>
  error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || fallback;

// Account → Adresses: the customer's saved delivery addresses. The default
// one is filled in at checkout; the others can be picked there.
const AddressBook = () => {
  const { customer, getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useCustomer();
  const [addresses, setAddresses] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null); // null, 'new' or an address id
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      setLoadError('');
      setAddresses(await getAddresses());
    } catch {
      setLoadError('Vos adresses n’ont pas pu être chargées.');
    }
  };

  useEffect(() => {
    load();
    // Once, when the tab opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setForm({ ...EMPTY, firstName: customer?.firstName || '', lastName: customer?.lastName || '', phone: customer?.phone || '' });
    setEditing('new');
    setFormError('');
    setNotice('');
  };

  const startEdit = (address) => {
    setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map(key => [key, address[key] || EMPTY[key]])) });
    setEditing(address._id);
    setFormError('');
    setNotice('');
  };

  const setField = (field) => (e) => setForm(current => ({ ...current, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const result = editing === 'new' ? await addAddress(form) : await updateAddress(editing, form);
      setAddresses(result.addresses);
      setNotice(editing === 'new' ? 'Adresse ajoutée.' : 'Adresse enregistrée.');
      setEditing(null);
    } catch (error) {
      setFormError(reason(error, "L'adresse n'a pas pu être enregistrée."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (address) => {
    if (!window.confirm(`Supprimer l'adresse « ${address.address1}, ${address.city} » ?`)) return;
    try {
      setAddresses((await deleteAddress(address._id)).addresses);
      setNotice('Adresse supprimée.');
    } catch (error) {
      setNotice(reason(error, "L'adresse n'a pas pu être supprimée."));
    }
  };

  const makeDefault = async (address) => {
    try {
      setAddresses((await setDefaultAddress(address._id)).addresses);
      setNotice('Adresse par défaut changée : elle sera proposée à la commande.');
    } catch (error) {
      setNotice(reason(error, "L'adresse par défaut n'a pas pu être changée."));
    }
  };

  const form_ = editing && (
    <form onSubmit={save} className="bg-white rounded-xl p-6 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{editing === 'new' ? 'Nouvelle adresse' : "Modifier l'adresse"}</h3>
        <button type="button" onClick={() => setEditing(null)} aria-label="Annuler" className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
      </div>
      {formError && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</p>}

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">Type</legend>
        <div className="flex gap-2">
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <label key={value} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${form.type === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}>
              <input type="radio" name="address-type" value={value} checked={form.type === value} onChange={setField('type')} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="address-first-name" label="Prénom" value={form.firstName} onChange={setField('firstName')} required />
        <Field id="address-last-name" label="Nom" value={form.lastName} onChange={setField('lastName')} required />
      </div>
      <Field id="address-line1" label="Adresse" value={form.address1} onChange={setField('address1')} placeholder="Rue, numéro" required />
      <Field id="address-line2" label="Complément" value={form.address2} onChange={setField('address2')} placeholder="Étage, appartement, résidence (facultatif)" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field id="address-city" label="Ville" value={form.city} onChange={setField('city')} required />
        <div>
          <label htmlFor="address-state" className="block text-sm font-medium text-gray-700 mb-1">Gouvernorat</label>
          <select id="address-state" value={form.state} onChange={setField('state')} required className={inputClass}>
            <option value="">Choisir…</option>
            {TUNISIAN_GOVERNORATES.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <Field id="address-postal-code" label="Code postal" value={form.postalCode} onChange={setField('postalCode')} inputMode="numeric" maxLength={4} hint="Facultatif" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="address-phone" label="Téléphone pour la livraison" type="tel" value={form.phone} onChange={setField('phone')} placeholder="98 765 432" />
        <Field id="address-company" label="Société" value={form.company} onChange={setField('company')} hint="Facultatif" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Mes adresses</h3>
            <p className="text-sm text-gray-600">L'adresse par défaut est proposée automatiquement lors de vos commandes.</p>
          </div>
          {!editing && (
            <button type="button" onClick={startNew} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Ajouter une adresse
            </button>
          )}
        </div>
        {notice && <p role="status" className="mt-4 text-sm text-blue-700">{notice}</p>}
      </div>

      {form_}

      {loadError && (
        <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {loadError} <button type="button" onClick={load} className="underline ml-2">Réessayer</button>
        </p>
      )}
      {!addresses && !loadError && <p className="text-gray-500">Chargement…</p>}
      {addresses?.length === 0 && !editing && (
        <div className="bg-white rounded-xl p-8 shadow-lg text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Aucune adresse enregistrée. Ajoutez-en une pour ne plus la retaper à chaque commande.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses?.map(address => (
          <div key={address._id} className={`bg-white rounded-xl p-5 shadow-lg border-2 ${address.isDefault ? 'border-blue-500' : 'border-transparent'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">{TYPE_LABELS[address.type] || 'Adresse'}</span>
              {address.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Par défaut</span>}
            </div>
            <address className="not-italic text-sm text-gray-700 space-y-0.5">
              <p>{address.firstName} {address.lastName}{address.company && ` · ${address.company}`}</p>
              <p>{address.address1}</p>
              {address.address2 && <p>{address.address2}</p>}
              <p>{[address.postalCode, address.city].filter(Boolean).join(' ')}, {address.state}</p>
              {address.phone && <p>{address.phone}</p>}
            </address>
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" onClick={() => startEdit(address)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Pencil className="w-4 h-4" /> Modifier
              </button>
              {!address.isDefault && (
                <button type="button" onClick={() => makeDefault(address)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Star className="w-4 h-4" /> Par défaut
                </button>
              )}
              <button type="button" onClick={() => remove(address)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddressBook;
