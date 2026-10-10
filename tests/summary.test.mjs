import { test } from 'node:test';
import assert from 'node:assert/strict';
import './_env.mjs';
const { summaryHTML } = await import('../js/summary.js');

test('summaryHTML escapes user-supplied text', () => {
  const html = summaryHTML('Credit', { store: '<b>Shop</b>', date: '2026-10-08', items: [{ type: 'Retail', product: '<img src=x onerror=1>', qty: '1 units', reason: 'Other' }] });
  assert.ok(!html.includes('<b>') && !html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('summaryHTML receipt: amount, vehicle and photo note', () => {
  const html = summaryHTML('Receipt', { amount: 12.5, category: 'Fuel', date: '2026-10-08', vehicle: 'Truck 4', photo: false });
  assert.match(html, /\$12\.50 &middot; Fuel/);
  assert.match(html, /Oct 8, 2026 · Truck 4/);
  assert.match(html, /No photo/);
});

test('summaryHTML donation: UPC and name joined, quantity shown', () => {
  const html = summaryHTML('Donation', { items: [{ type: 'Chub', upc: '123', name: 'Ham', qty: 2, sellBy: '2026-10-20', reason: 'Other' }] });
  assert.match(html, /123 — Ham/);
  assert.match(html, /x2/);
});
