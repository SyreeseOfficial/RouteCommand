import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
process.env.TZ = 'America/Los_Angeles';   // before any Date use
import './_env.mjs';
const { today, fmtDate, esc, plural } = await import('../js/util.js');

test('today() is the local date, not the UTC date', () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-09T03:00:00Z') });   // 8pm Oct 8 in Pacific
  assert.equal(today(), '2026-10-08');
  mock.timers.reset();
});

test('today(n) moves by calendar days, across a month end', () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-31T20:00:00Z') });
  assert.equal(today(1), '2026-11-01');
  assert.equal(today(-1), '2026-10-30');
  assert.equal(today(3), '2026-11-03');
  mock.timers.reset();
});

test('fmtDate formats ISO dates and dashes empty ones', () => {
  assert.equal(fmtDate('2026-10-08'), 'Oct 8, 2026');
  assert.equal(fmtDate(''), '—');
});

test('esc escapes HTML', () => {
  assert.equal(esc(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('plural', () => {
  assert.equal(plural(1, 'item'), '1 item');
  assert.equal(plural(0, 'item'), '0 items');
  assert.equal(plural(3, 'item'), '3 items');
});
