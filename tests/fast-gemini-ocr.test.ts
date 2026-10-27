import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeDateToISO, formatISOToDisplayDate } from '../backend/fastGeminiOCR.js';

test('normalizeDateToISO standardizes diverse dates into YYYY-MM-DD or YYYY', () => {
  assert.equal(normalizeDateToISO('15/06/1995'), '1995-06-15');
  assert.equal(normalizeDateToISO('15-06-1995'), '1995-06-15');
  assert.equal(normalizeDateToISO('1995-06-15'), '1995-06-15');
  assert.equal(normalizeDateToISO('1990'), '1990');
  assert.equal(normalizeDateToISO(''), '');
});

test('formatISOToDisplayDate formats ISO date to display format DD/MM/YYYY', () => {
  assert.equal(formatISOToDisplayDate('1995-06-15'), '15/06/1995');
  assert.equal(formatISOToDisplayDate('2000'), '2000');
  assert.equal(formatISOToDisplayDate(''), '');
});
