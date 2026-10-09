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
