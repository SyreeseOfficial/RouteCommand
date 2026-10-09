import { test } from 'node:test';
import assert from 'node:assert/strict';
import './_env.mjs';
const { flushQueue, loadQueue } = await import('../js/queue.js');
const { loadHistory } = await import('../js/history.js');

const item = (n) => ({ endpoint: `/api/${n}`, payload: { n }, historyId: n });
const seed = (...ids) => {
  localStorage.setItem('rc_queue', JSON.stringify(ids.map(item)));
  localStorage.setItem('rc_history', JSON.stringify(ids.map(id => ({ id, type: 'Receipt', label: 'x', status: 'queued', timestamp: new Date().toISOString() }))));
};
const statuses = () => Object.fromEntries(loadHistory().map(h => [h.id, h.status]));

test('flushQueue sends oldest first and stops at the first network error', async () => {
  seed(1, 2, 3);
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === '/api/2') throw new TypeError('Failed to fetch');
    return { json: async () => ({ status: 'success' }) };
  };
  await flushQueue();
  assert.deepEqual(calls, ['/api/1', '/api/2']);          // 3 never tried
  assert.deepEqual(loadQueue().map(q => q.historyId), [2, 3]);
  assert.equal(statuses()[1], 'saved');
  assert.equal(statuses()[2], 'queued');
});

test('flushQueue drops a rejected item as failed (with retry data) and carries on', async () => {
  seed(1, 2);
  globalThis.fetch = async (url) => ({ json: async () => (url === '/api/1' ? { status: 'error' } : { status: 'success' }) });
  await flushQueue();
  assert.deepEqual(loadQueue(), []);
  assert.deepEqual(statuses(), { 1: 'failed', 2: 'saved' });
  assert.deepEqual(loadHistory().find(h => h.id === 1).retry, { endpoint: '/api/1', payload: { n: 1 } });
});
