import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const cell = 'w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

// The versions of a product in the admin form: the maker's code, a name, a
// price (empty: price on request) and the stock of each
const VariantsEditor = ({ value, onChange }) => {
  const set = (index, key) => (event) => onChange(value.map((v, i) => (i === index ? { ...v, [key]: event.target.value } : v)));
  const add = () => onChange([...value, { sku: '', label: '', price: '', stockQuantity: '0' }]);
  const remove = (index) => onChange(value.filter((_, i) => i !== index));

  return (
    <div>
      {value.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="pb-2 pe-2 font-medium">Code</th>
                <th className="pb-2 pe-2 font-medium">Version</th>
                <th className="pb-2 pe-2 font-medium">Price (TND)<span className="sr-only">, empty for a price on request</span></th>
                <th className="pb-2 pe-2 font-medium">Stock</th>
                <th className="pb-2"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {value.map((v, index) => (
                <tr key={index}>
                  <td className="pb-2 pe-2 w-28"><input aria-label={`Version ${index + 1} code`} className={cell} value={v.sku} onChange={set(index, 'sku')} maxLength={40} placeholder="65557" /></td>
                  <td className="pb-2 pe-2"><input aria-label={`Version ${index + 1} name`} className={cell} value={v.label} onChange={set(index, 'label')} required maxLength={120} placeholder="1 HP 230 V" /></td>
                  <td className="pb-2 pe-2 w-28"><input aria-label={`Version ${index + 1} price`} className={cell} type="number" min="0" step="0.001" value={v.price} onChange={set(index, 'price')} placeholder="—" /></td>
                  <td className="pb-2 pe-2 w-20"><input aria-label={`Version ${index + 1} stock`} className={cell} type="number" min="0" step="1" value={v.stockQuantity} onChange={set(index, 'stockQuantity')} /></td>
                  <td className="pb-2 w-8">
                    <button type="button" onClick={() => remove(index)} className="p-1.5 text-gray-500 hover:text-red-600" aria-label={`Remove version ${v.label || index + 1}`}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">
        <Plus className="w-4 h-4" /> Add a version
      </button>
      <p className="mt-1 text-xs text-gray-500">
        {value.length > 0
          ? 'Customers choose a version. The product shows the lowest price and the total stock. Leave a price empty for “price on request”.'
          : 'For a product sold in several sizes or powers (e.g. a pump in 1/2, 3/4 and 1 HP), each with its own code, price and stock.'}
      </p>
    </div>
  );
};

export default VariantsEditor;
