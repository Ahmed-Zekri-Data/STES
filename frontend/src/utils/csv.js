// A cell starting with = + - @ (or a tab or carriage return) is run as a
// formula by Excel and LibreOffice: a customer could type
// =HYPERLINK("http://evil",...) as their name. A leading quote keeps it text.
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
  const text = String(value ?? '');
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (rows) => rows.map(row => row.map(cell).join(',')).join('\r\n');

// Saves the rows as a .csv file. The byte order mark makes Excel read
// accents correctly.
export const downloadCsv = (filename, rows) => {
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
