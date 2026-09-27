import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import adminApi from '../../utils/adminApi';
import Reports from './Reports';

const report = {
  period: { from: '2026-09-01', to: '2026-09-03', days: 3, group: 'day' },
  totals: { revenue: 1500, orders: 3, averageOrder: 500, itemsSold: 7, delivery: 21, cancelled: 1 },
  previous: { from: '2026-08-29', to: '2026-08-31', revenue: 1000, orders: 4, averageOrder: 250, itemsSold: 5, delivery: 0, cancelled: 0 },
  series: [
    { period: '2026-09-01', revenue: 500, orders: 1 },
    { period: '2026-09-02', revenue: 0, orders: 0 },
    { period: '2026-09-03', revenue: 1000, orders: 2 }
  ],
  categories: [{ category: 'pumps', name: 'Pompes et Moteurs', quantity: 2, revenue: 1200 }, { category: 'filters', name: 'Filtration', quantity: 5, revenue: 300 }],
  products: [{ id: 'p1', name: 'Pompe Hayward', quantity: 2, orders: 2, revenue: 1200 }],
  governorates: [{ name: 'Sfax', orders: 2, revenue: 1000 }],
  paymentMethods: [{ method: 'cash_on_delivery', orders: 3, revenue: 1500 }]
};

describe('admin reports page', () => {
  let get;

  beforeEach(() => {
    vi.restoreAllMocks();
    get = vi.spyOn(adminApi, 'get').mockImplementation(async (url) => {
      if (url === '/admin/reports/orders') {
        return {
          data: {
            truncated: false,
            orders: [{ orderNumber: 'ORD-1', createdAt: '2026-09-01T10:00:00Z', status: 'delivered', paymentMethod: 'cash_on_delivery', customerName: '=cmd', total: 500 }]
          }
        };
      }
      return { data: report };
    });
  });

  it('shows the totals with the change since the previous period, and the breakdowns', async () => {
    render(<Reports />);

    expect(await screen.findByText('Pompe Hayward')).toBeTruthy();
    expect(screen.getByText('+50% vs previous period')).toBeTruthy(); // revenue
    expect(screen.getByText('-25% vs previous period')).toBeTruthy(); // orders
    expect(screen.getByText('+100% vs previous period')).toBeTruthy(); // average order
    expect(screen.getByText('80%')).toBeTruthy(); // pumps' share of the category revenue
    expect(screen.getByText('Cash on delivery')).toBeTruthy();
    expect(screen.getByText('Sfax')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Revenue per period' })).toBeTruthy();
  });

  it('asks for the chosen period and grouping', async () => {
    render(<Reports />);
    await screen.findByText('Pompe Hayward');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Chart by'), { target: { value: 'month' } });

    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/admin/reports/sales', {
      params: expect.objectContaining({ from: '2026-01-01', group: 'month' })
    }));
    expect(screen.getByLabelText('Period').value).toBe('custom');
  });

  it('exports the period’s orders as a CSV file', async () => {
    const createObjectURL = vi.fn(() => 'blob:orders');
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<Reports />);
    await screen.findByText('Pompe Hayward');

    fireEvent.click(screen.getByRole('button', { name: /Export orders/ }));

    expect(await screen.findByText('1 order exported.')).toBeTruthy();
    expect(click).toHaveBeenCalled();
    const text = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(createObjectURL.mock.calls[0][0]);
    });
    expect(text).toContain('"ORD-1"');
    expect(text).toContain(`"'=cmd"`);
  });
});
