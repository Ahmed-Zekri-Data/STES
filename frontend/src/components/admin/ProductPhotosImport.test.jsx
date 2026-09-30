import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import adminApi from '../../utils/adminApi';
import ProductPhotosImport from './ProductPhotosImport';

const photo = (name) => new File(['x'], name, { type: 'image/jpeg' });

describe('product photos import', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the photos a few at a time and says what happened', async () => {
    const post = vi.spyOn(adminApi, 'post').mockImplementation((url, body) => Promise.resolve({
      data: { results: body.getAll('photos').map(f => ({ file: f.name, code: f.name.replace('.jpg', ''), status: f.name.startsWith('9') ? 'unknown' : 'set' })) }
    }));
    const onImported = vi.fn();
    render(<ProductPhotosImport onClose={() => {}} onImported={onImported} />);

    const files = [...Array.from({ length: 24 }, (_, i) => photo(`${10000 + i}.jpg`)), photo('99999.jpg'), new File(['x'], 'notes.txt')];
    fireEvent.change(screen.getByLabelText(/Choose the photos/), { target: { files } });

    expect(await screen.findByText('24 product photos set')).toBeTruthy();
    expect(screen.getByText(/1 with no product of that code: 99999/)).toBeTruthy();
    // 25 photos (the text file is left out): 2 requests
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][1].getAll('photos')).toHaveLength(20);
    expect(post.mock.calls[0][1].get('replace')).toBe('false');
    expect(onImported).toHaveBeenCalled();
  });

  it('can replace photos already set', async () => {
    const post = vi.spyOn(adminApi, 'post').mockResolvedValue({ data: { results: [{ file: '65557.jpg', code: '65557', status: 'set' }] } });
    render(<ProductPhotosImport onClose={() => {}} onImported={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Replace photos already set/));
    fireEvent.change(screen.getByLabelText(/Choose the photos/), { target: { files: [photo('65557.jpg')] } });
    expect(await screen.findByText('1 product photo set')).toBeTruthy();
    expect(post.mock.calls[0][1].get('replace')).toBe('true');
  });
});
