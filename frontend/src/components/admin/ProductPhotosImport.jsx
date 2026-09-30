import React, { useState } from 'react';
import { X, ImagePlus, Upload, CheckCircle, Loader2 } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';

const PER_REQUEST = 20;
const IMAGE = /\.(jpe?g|png|webp)$/i;

// Admin → Products → Import photos: photos named after a product code
// ("65557.jpg") go on the product with that code, sent a few at a time
const ProductPhotosImport = ({ onClose, onImported }) => {
  const [replace, setReplace] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const send = async (fileList) => {
    const files = [...fileList].filter(f => IMAGE.test(f.name));
    if (!files.length) {
      setError('Choose JPEG, PNG or WebP photos.');
      return;
    }
    setError('');
    setResults(null);
    const all = [];
    try {
      for (let i = 0; i < files.length; i += PER_REQUEST) {
        setProgress({ done: i, total: files.length });
        const body = new FormData();
        body.append('replace', String(replace));
        for (const file of files.slice(i, i + PER_REQUEST)) body.append('photos', file);
        const response = await adminApi.post('/admin/products/photos', body, { timeout: 120000 });
        all.push(...response.data.results);
      }
      setResults(all);
      onImported();
    } catch (err) {
      setResults(all.length ? all : null);
      setError(`${errorMessage(err)}${all.length ? ` (after ${all.length} photos)` : ''}`);
    } finally {
      setProgress(null);
    }
  };

  const by = (status) => (results || []).filter(r => r.status === status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="photos-title">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 id="photos-title" className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ImagePlus className="h-6 w-6 text-blue-600" aria-hidden="true" /> Import photos</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-6">
          <p className="text-sm text-gray-600">
            Name each photo with a product code, for example <b>65557.jpg</b>: it goes on the product that has this code (itself or one of its versions). JPEG, PNG or WebP, up to 5 MB each. You can choose hundreds of photos at once.
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded" checked={replace} onChange={(event) => setReplace(event.target.checked)} disabled={Boolean(progress)} />
            <span><span className="font-medium">Replace photos already set</span>. Unticked, only products without a photo get one.</span>
          </label>
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm font-medium ${progress ? 'cursor-wait border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700 hover:border-blue-400'}`}>
            <Upload className="h-5 w-5" aria-hidden="true" />
            Choose the photos
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(progress)} onChange={(event) => { const list = event.target.files; if (list?.length) send(list); event.target.value = ''; }} />
          </label>

          {progress && (
            <div role="status">
              <p className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending photos {progress.done} of {progress.total}…</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          {results && (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-green-700"><CheckCircle className="h-5 w-5" aria-hidden="true" /> {by('set').length} product photo{by('set').length === 1 ? '' : 's'} set</p>
              <ul className="list-disc space-y-1 ps-5 text-gray-700">
                {by('kept').length > 0 && <li>{by('kept').length} left as they were: the product already had a photo</li>}
                {by('invalid').length > 0 && <li>{by('invalid').length} not a JPEG, PNG or WebP image: {by('invalid').map(r => r.file).join(', ')}</li>}
                {by('unknown').length > 0 && <li>{by('unknown').length} with no product of that code: {by('unknown').slice(0, 30).map(r => r.code || r.file).join(', ')}{by('unknown').length > 30 ? '…' : ''}</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPhotosImport;
