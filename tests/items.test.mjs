import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeEl } from './_env.mjs';
const { collectCreditItems } = await import('../js/credits.js');
const { collectDonationItems } = await import('../js/donations.js');

/* An item row whose querySelector answers by data-fname, like the real markup */
const row = (type, fields) => {
  const els = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fakeEl({ value: v })]));
  return { els, querySelector: (sel) => /pill-toggle__btn--active/.test(sel) ? { dataset: { typeBtn: type } } : els[sel.match(/data-fname="(\w+)"/)?.[1]] ?? null };
};
const list = (...rows) => ({ children: rows });

test('credit items: retail row shapes as units, chub row as lbs', () => {
  const items = collectCreditItems(list(
    row('retail', { upc: ' 12345 ', qty: '3', reason: 'Expired' }),
    row('chub',   { name: 'Ham', weight: '2.5', reason: '10-Day' }),
  ));
  assert.deepEqual(items, [
    { type: 'Retail',      product: '12345', qty: '3 units',  reason: 'Expired' },
    { type: 'Chub / Deli', product: 'Ham',   qty: '2.5 lbs', reason: '10-Day' },
  ]);
});

test('credit items: empty product or non-positive qty returns null and flags the field', () => {
  const bad = row('retail', { upc: '', qty: '0', reason: 'Expired' });
  assert.equal(collectCreditItems(list(bad)), null);
  assert.ok(bad.els.upc._err && bad.els.qty._err);   // markInvalid ran on both
});

test('donation items: only a leading number is a UPC', () => {
  const items = collectDonationItems(list(
    row('chub',   { name: '12345 Ham slices', qty: '2', sellby: '2026-10-20', reason: 'Out of Date' }),
    row('retail', { name: 'Swiss 2 lb',        qty: 'x', sellby: '2026-10-21', reason: 'Other' }),
  ));
  assert.deepEqual(items, [
    { type: 'Chub',   upc: '12345', name: 'Ham slices', qty: 2, sellBy: '2026-10-20', reason: 'Out of Date' },
    { type: 'Retail', upc: '',      name: 'Swiss 2 lb', qty: 1, sellBy: '2026-10-21', reason: 'Other' },   // bad qty falls back to 1
  ]);
});

test('donation items: missing name or sell-by returns null', () => {
  assert.equal(collectDonationItems(list(row('chub', { name: '', qty: '1', sellby: '', reason: 'Other' }))), null);
});
