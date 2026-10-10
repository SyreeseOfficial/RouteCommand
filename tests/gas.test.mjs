import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

for (const file of ['Code.gs', 'CreditCode.gs', 'DonationCode.gs']) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const fn = src.match(/^function sanitize[\s\S]*?^}/m)[0];
  const sanitize = vm.runInNewContext(`${fn}; sanitize`);

  test(`${file} sanitize: trims, caps at 500 chars, blanks non-strings`, () => {
    assert.equal(sanitize('  hi  '), 'hi');
    assert.equal(sanitize('x'.repeat(600)).length, 500);
    assert.equal(sanitize(42), '');
    assert.equal(sanitize(null), '');
  });
}

/* ── doPost against a fake spreadsheet ───────────────────────── */
function fakeSheet() {
  const grid = [];
  const hidden = [];
  const range = (r, c, nr = 1, nc = 1) => {
    const o = {
      getValue: () => grid[r - 1]?.[c - 1] ?? '',
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => grid[r - 1 + i]?.[c - 1 + j] ?? '')),
      setValue: (v) => { (grid[r - 1] ||= [])[c - 1] = v; return o; },
      setValues: (vs) => { vs.forEach((row, i) => row.forEach((v, j) => { ((grid[r - 1 + i]) ||= [])[c - 1 + j] = v; })); return o; },
      setFontWeight: () => o, setBackground: () => o, setFontColor: () => o,
    };
    return o;
  };
  return { grid, hidden, getLastRow: () => grid.length, getRange: range, appendRow: (row) => grid.push(row), hideColumns: (c) => hidden.push(c) };
}

function loadGas(file, { tabs = {}, props = {}, lockFails = false } = {}) {
  const log = { locks: 0, releases: 0, files: 0 };
  const sheet = fakeSheet();
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? 'x' }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => tabs[n] === undefined ? (n === 'Receipts' ? sheet : null) : tabs[n], getActiveSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { if (lockFails) throw new Error('timeout'); log.locks++; }, releaseLock: () => { log.releases++; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() {} }) },
    DriveApp: { Access: {}, Permission: {}, getFolderById: () => ({ createFile: () => { log.files++; return { setSharing() {}, getUrl: () => 'http://drive/f' }; } }) },
    Utilities: { base64Decode: () => [], newBlob: () => ({}) },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), ctx);
  const post = (payload) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
  return { post, sheet, log };
}

const receipt = (id, extra = {}) => ({ employeeName: 'A B', receiptDate: '2026-10-08', category: 'Fuel', amount: '12.50', submissionId: id, ...extra });

test('Code.gs: a repeated submissionId is acknowledged but saved once (row and photo)', () => {
  const { post, sheet, log } = loadGas('Code.gs');
  const r1 = post(receipt('id-1', { imageData: 'data:image/jpeg;base64,AAAA' }));
  const r2 = post(receipt('id-1', { imageData: 'data:image/jpeg;base64,AAAA' }));
  assert.equal(r1.status, 'success');
  assert.deepEqual([r2.status, r2.duplicate], ['success', true]);
  assert.equal(sheet.grid.length, 2);     // header + one receipt
  assert.equal(log.files, 1);
  post(receipt('id-2'));
  assert.equal(sheet.grid.length, 3);
});

test('Code.gs: one header row, with a hidden Submission ID column', () => {
  const { post, sheet } = loadGas('Code.gs');
  post(receipt('a')); post(receipt('b'));
  assert.equal(sheet.grid.filter(r => r[0] === 'Timestamp').length, 1);
  assert.equal(sheet.grid[0][8], 'Submission ID');
  assert.deepEqual(sheet.hidden, [9]);
  assert.equal(sheet.grid[1][8], 'a');
});

test('Code.gs: writes to the Receipts tab, errors clearly if it is missing', () => {
  const { post } = loadGas('Code.gs', { tabs: { Receipts: null } });
  const r = post(receipt('a'));
  assert.equal(r.status, 'error');
  assert.match(r.message, /Receipts/);
});

test('every doPost takes the script lock and releases it, even on error', () => {
  for (const file of ['Code.gs', 'CreditCode.gs', 'DonationCode.gs']) {
    const g = loadGas(file, { tabs: { Receipts: null } });
    g.post({ submissionId: 'x' });
    assert.deepEqual([g.log.locks, g.log.releases], [1, 1], file);
  }
  const busy = loadGas('Code.gs', { lockFails: true }).post(receipt('a'));
  assert.equal(busy.status, 'error');
});

test('CreditCode.gs: one row per item, retry adds nothing', () => {
  const { post, sheet } = loadGas('CreditCode.gs');
  const p = { salesperson: 'A', store: 'S', date: '2026-10-08', submissionId: 'c1',
    items: [{ type: 'Retail', product: '1', qty: '2 units', reason: 'x' }, { type: 'Retail', product: '2', qty: '1 units', reason: 'y' }] };
  assert.equal(post(p).status, 'success');
  assert.equal(post(p).duplicate, true);
  assert.equal(sheet.grid.length, 3);              // header + 2 items
  assert.equal(sheet.grid[1][10], 'c1');
  assert.equal(sheet.grid[2][10], 'c1');
});

test('DonationCode.gs: one row per item, retry adds nothing', () => {
  const { post, sheet } = loadGas('DonationCode.gs');
  const p = { employee: 'A', submissionId: 'd1', items: [{ type: 'Chub', upc: '1', name: 'Ham', qty: 2, sellBy: '2026-10-20', reason: 'x' }] };
  post(p); post(p);
  assert.equal(sheet.grid.length, 2);
  assert.equal(sheet.grid[1][9], 'd1');
});

test('a request without a submissionId (older app version) is still saved', () => {
  const { post, sheet } = loadGas('Code.gs');
  const { submissionId, ...old } = receipt('x');
  post(old); post(old);
  assert.equal(sheet.grid.length, 3);
});
