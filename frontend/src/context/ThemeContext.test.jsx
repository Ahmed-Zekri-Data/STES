import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// A fake device setting that can change while the page is open
let deviceDark = false;
let listeners = [];
const setDevice = (dark) => {
  deviceDark = dark;
  listeners.forEach(listener => listener({ matches: dark }));
};

const Probe = () => {
  const { theme, preference, setDarkTheme, setSystemTheme } = useTheme();
  return (
    <div>
      <p data-testid="theme">{theme}/{preference}</p>
      <button onClick={setDarkTheme}>dark</button>
      <button onClick={setSystemTheme}>system</button>
    </div>
  );
};
const shown = () => screen.getByTestId('theme').textContent;

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    deviceDark = false;
    listeners = [];
    window.matchMedia = () => ({
      get matches() { return deviceDark; },
      addEventListener: (_, listener) => listeners.push(listener),
      removeEventListener: (_, listener) => { listeners = listeners.filter(l => l !== listener); }
    });
  });

  it('follows the device, also when it changes, until a choice is made', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(shown()).toBe('light/system');

    act(() => setDevice(true));
    expect(shown()).toBe('dark/system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('keeps a chosen theme whatever the device does, and "system" goes back to following it', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByText('dark'));
    expect(localStorage.getItem('theme')).toBe('dark');

    act(() => setDevice(false));
    expect(shown()).toBe('dark/dark');

    fireEvent.click(screen.getByText('system'));
    expect(shown()).toBe('light/system');
    expect(localStorage.getItem('theme')).toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('starts with the saved choice', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(shown()).toBe('dark/dark');
  });
});
