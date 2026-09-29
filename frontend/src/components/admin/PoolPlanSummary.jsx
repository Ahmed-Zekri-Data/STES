import React from 'react';
import { ExternalLink } from 'lucide-react';

const SHAPES = { rectangle: 'Rectangular', rounded: 'Rounded corners', oval: 'Oval' };
const n = (value) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 });

// The pool a customer drew in "Construire ma piscine", sent with their quote
const PoolPlanSummary = ({ plan }) => {
  if (!plan?.surface) return null;
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Pool drawn by the customer</h3>
      <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-700">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><dt className="text-gray-500">Shape</dt><dd className="font-medium">{SHAPES[plan.shape] || plan.shape}</dd></div>
          <div><dt className="text-gray-500">Size</dt><dd className="font-medium">{n(plan.length)} × {n(plan.width)} m, {n(plan.depth)} m deep</dd></div>
          <div><dt className="text-gray-500">Water</dt><dd className="font-medium">{n(plan.surface)} m² · {n(plan.volume)} m³</dd></div>
          <div><dt className="text-gray-500">Filtration needed</dt><dd className="font-medium">{n(plan.flow)} m³/h</dd></div>
        </dl>
        {plan.equipment?.length > 0 && (
          <ul className="space-y-1">
            {plan.equipment.map(line => (
              <li key={String(line.product)} className="flex justify-between gap-3"><span>{line.quantity} × {line.name}</span><span className="font-medium">{n(line.price * line.quantity)} TND</span></li>
            ))}
            <li className="flex justify-between gap-3 border-t border-gray-200 pt-1 font-semibold"><span>Equipment</span><span>{n(plan.equipmentTotal)} TND</span></li>
          </ul>
        )}
        {plan.estimate?.max > 0 && <p>Construction estimate shown to the customer: <strong>{n(plan.estimate.min)} – {n(plan.estimate.max)} TND</strong></p>}
        {plan.link && (
          <a href={plan.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline">
            Open the plan <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};

export default PoolPlanSummary;
