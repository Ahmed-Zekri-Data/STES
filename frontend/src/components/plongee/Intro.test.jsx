import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Intro from './Intro';

describe('the opening', () => {
  afterEach(() => vi.useRealTimers());

  it('plays on its own to the end: filling, "Marhba", then the drop into the pool', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const onImpact = vi.fn(), onSkip = vi.fn();
    render(<Intro ready short={false} onImpact={onImpact} onSkip={onSkip} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText('Marhba.')).toBeTruthy();
    expect(onImpact).not.toHaveBeenCalled();

    // Nobody touches anything: the welcome ends and the drop falls
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(onImpact).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Bienvenue chez STES' })).toBeNull();
  });

  it('returning visitors only see the loader until the pool is ready', async () => {
    const onSkip = vi.fn();
    const { rerender } = render(<Intro ready={false} short onImpact={vi.fn()} onSkip={onSkip} />);
    expect(screen.queryByText('Marhba.')).toBeNull();
    rerender(<Intro ready short onImpact={vi.fn()} onSkip={onSkip} />);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
