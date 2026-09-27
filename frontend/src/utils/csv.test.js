import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('CSV export', () => {
  it('quotes every cell and doubles quotes inside', () => {
    expect(toCsv([['Nom', 'Message'], ['Sami', 'Il a dit "bonjour", merci']]))
      .toBe('"Nom","Message"\r\n"Sami","Il a dit ""bonjour"", merci"');
  });

  it('keeps text a spreadsheet would run as a formula as plain text', () => {
    expect(toCsv([['=HYPERLINK("http://x.test","clic")', '+216 98 000 000', '-5', '@SUM(A1)']]))
      .toBe(`"'=HYPERLINK(""http://x.test"",""clic"")","'+216 98 000 000","'-5","'@SUM(A1)"`);
  });

  it('writes numbers and empty values as they are', () => {
    expect(toCsv([[12.5, null, undefined, 0]])).toBe('"12.5","","","0"');
  });
});
