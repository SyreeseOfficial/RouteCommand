import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.GAS_URL_RECEIPT = 'http://gas.invalid/exec';
const { default: handler } = await import('../netlify/functions/submit.mjs');

const call = (body) => {
  globalThis.fetch = async (url, opts) => url === 'http://gas.invalid/exec'
    ? { headers: { get: () => 'http://gas.invalid/result' } }
    : { text: async () => body };
  return handler(new Request('http://x/api/submit-receipt', { method: 'POST', body: '{}' }));
};

test('JSON from Google passes through with 200', async () => {
  const res = await call('{"status":"success"}');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'success' });
});

test('an HTML error page from Google becomes a 502 JSON error', async () => {
  const res = await call('<html>Service unavailable</html>');
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { status: 'error', message: 'Google is busy, try again in a minute' });
});
