import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductSelect, ProductList } from './ProductPickers';

const products = [
  {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Victoria Plus', price: 865, stockQuantity: 2,
    variants: [
      { sku: '65557', label: '1/2 CV', price: 865, stockQuantity: 2 },
      { sku: '65562', label: '1 CV', price: 903, stockQuantity: 0 },
      { sku: '65569', label: '3 CV', price: null, stockQuantity: 0 }
    ]
  },
  { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Chlore choc 5 kg', sku: 'CL5', price: 65, stockQuantity: 4 }
];

const type = (input, text) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
};

describe('admin product pickers', () => {
  it('finds a version by its code, and chooses it', () => {
    const onChange = vi.fn();
    render(<label>Pump<ProductSelect id="pump" value={null} products={products} onChange={onChange} /></label>);
    type(screen.getByLabelText('Pump'), '65562');
    const options = screen.getAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual(['Victoria Plus3 versions · the customer chooses', 'Victoria Plus – 1 CV65562 · 903 TND · out of stock']);
    fireEvent.mouseDown(options[1]);
    expect(onChange).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa:65562');
  });

  it('shows the version chosen, and can be cleared', () => {
    const onChange = vi.fn();
    render(<label>Pump<ProductSelect id="pump" value="aaaaaaaaaaaaaaaaaaaaaaaa:65569" products={products} onChange={onChange} /></label>);
    expect(screen.getByLabelText('Pump').value).toBe('Victoria Plus – 3 CV');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Victoria Plus – 3 CV' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('adds to a list with the keyboard, leaving out what is already chosen', () => {
    const onChange = vi.fn();
    render(<><label htmlFor="list">Products</label><ProductList id="list" value={['aaaaaaaaaaaaaaaaaaaaaaaa:65557']} products={products} max={3} onChange={onChange} /></>);
    expect(screen.getByText('Victoria Plus – 1/2 CV')).toBeTruthy();
    const input = screen.getByLabelText('Products');
    type(input, 'victoria');
    expect(screen.getAllByRole('option').map(o => o.textContent.split(/\d/)[0])).toEqual(['Victoria Plus', 'Victoria Plus – ', 'Victoria Plus – ']);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['aaaaaaaaaaaaaaaaaaaaaaaa:65557', 'aaaaaaaaaaaaaaaaaaaaaaaa:65562']);
  });
});
