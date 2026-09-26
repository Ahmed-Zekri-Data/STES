import { describe, it, expect } from 'vitest';
import { submitErrorMessage } from './forms';

describe('submitErrorMessage', () => {
  it('passes on the rate limit message', () => {
    const error = { response: { status: 429, data: { message: 'Trop de messages envoyés.' } } };
    expect(submitErrorMessage(error, 'fallback')).toBe('Trop de messages envoyés.');
  });

  it('asks to check the fields when the server refuses them', () => {
    expect(submitErrorMessage({ response: { status: 400, data: {} } }, 'fallback'))
      .toMatch(/vérifier les champs/);
  });

  it('falls back for anything else', () => {
    expect(submitErrorMessage({ response: { status: 500 } }, 'Erreur')).toBe('Erreur');
    expect(submitErrorMessage({}, 'Erreur')).toBe('Erreur');
  });
});
