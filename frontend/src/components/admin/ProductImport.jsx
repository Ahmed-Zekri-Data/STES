import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { readProductSheet } from '../../utils/productSheet';

const count = (n, one, many = `${one}s`) => `${Number(n).toLocaleString('en-GB')} ${n === 1 ? one : many}`;

// What an import did, or would do
const Report = ({ report }) => (
  <div className="space-y-3 text-sm">
    <ul className="grid gap-2 sm:grid-cols-2">
      <li className="rounded-xl bg-blue-50 p-3"><span className="block text-2xl font-bold text-gray-900">{report.created.toLocaleString('en-GB')}</span>new products</li>
      <li className="rounded-xl bg-blue-50 p-3"><span className="block text-2xl font-bold text-gray-900">{report.updated.toLocaleString('en-GB')}</span>products updated</li>
    </ul>
    <ul className="list-disc space-y-1 ps-5 text-gray-700">
      <li>{count(report.versions, 'code')} read{report.skipped > 0 && `, ${count(report.skipped, 'row')} left out (“À vendre” = Non)`}</li>
      {report.onRequest > 0 && <li>{count(report.onRequest, 'code')} without a price: shown as “Prix sur demande”</li>}
      {report.versionsAdded > 0 && <li>{count(report.versionsAdded, 'new version')} added to existing products</li>}
      {report.priceChanges > 0 && <li>{count(report.priceChanges, 'price')} changed</li>}
      {report.newCategories.length > 0 && <li>New categories: {report.newCategories.join(', ')}</li>}
    </ul>
    {report.errorCount > 0 && (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {count(report.errorCount, 'row')} with a problem {report.saved ? 'were left out' : 'will be left out'}</p>
        <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs">
          {report.errors.map((e, i) => <li key={i}>{e.row ? `Row ${e.row}: ` : ''}{e.message}</li>)}
        </ul>
      </div>
    )}
  </div>
);

// Admin → Products → Import: products from a spreadsheet, one row per
// maker's code. First a preview of what will change, then the import.
const ProductImport = ({ onClose, onImported }) => {
  const [brand, setBrand] = useState('AstralPool');
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const check = async (chosen, brandName = brand) => {
    setError('');
    setPreview(null);
    setBusy('Reading the file…');
    try {
      const sheet = chosen === file && rows ? { rows } : await readProductSheet(chosen);
      setFile(chosen);
      setRows(sheet.rows);
      if (!sheet.rows.length) throw new Error('The file has no product rows.');
      setBusy(`Checking ${count(sheet.rows.length, 'row')}…`);
      const response = await adminApi.post('/admin/products/import', { rows: sheet.rows, brand: brandName, dryRun: true }, { timeout: 120000 });
      setPreview(response.data);
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message || 'The file could not be read. Save it as an Excel file (.xlsx) and try again.');
    } finally {
      setBusy('');
    }
  };

  const importNow = async () => {
    setError('');
    setBusy('Importing…');
    try {
      const response = await adminApi.post('/admin/products/import', { rows, brand, dryRun: false }, { timeout: 300000 });
      setResult(response.data);
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 id="import-title" className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileSpreadsheet className="h-6 w-6 text-green-600" aria-hidden="true" /> Import products</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-6">
          {result ? (
            <>
              <p className="flex items-center gap-2 font-medium text-green-700" role="status"><CheckCircle className="h-5 w-5" aria-hidden="true" /> Import done</p>
              <Report report={result} />
              <button type="button" onClick={onClose} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">Close</button>
            </>
          ) : (
            <>
              <div className="space-y-2 text-sm text-gray-600">
                <p>An Excel file (.xlsx) with one row per product code, like the AstralPool catalogue file. Rows with the same <b>Produit</b> become one product with versions.</p>
                <p><b>Prix STES</b> empty: “price on request”. <b>Stock</b> empty: new products are sold on order. Importing the file again updates prices and stock by code, and adds new versions; names, texts and photos you edited stay as they are.</p>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Brand of these products
                <input className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" value={brand} maxLength={60} onChange={(event) => setBrand(event.target.value)} onBlur={() => file && check(file)} />
              </label>
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm font-medium ${busy ? 'cursor-wait border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700 hover:border-blue-400'}`}>
                <Upload className="h-5 w-5" aria-hidden="true" />
                {file ? `${file.name} (choose another)` : 'Choose the Excel file'}
                <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" disabled={Boolean(busy)} onChange={(event) => { const chosen = event.target.files?.[0]; event.target.value = ''; if (chosen) { setRows(null); check(chosen); } }} />
              </label>

              {busy && <p className="flex items-center gap-2 text-sm text-gray-600" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {busy}</p>}
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

              {preview && !busy && (
                <>
                  <h3 className="font-semibold text-gray-900">Before importing</h3>
                  <Report report={preview} />
                  <button type="button" onClick={importNow} disabled={!(preview.created + preview.updated)} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    Import {count(preview.created + preview.updated, 'product')}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductImport;
