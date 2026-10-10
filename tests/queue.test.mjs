import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { memoryBackend } from './_env.mjs';
const { useBackend, flushOutbox, outbox } = await import('../js/outbox.js');
const { reconcile, startQueue } = await import('../js/queue.js');
const { loadHistory } = await import('../js/history.js');

let db;
beforeEach(() => { db = memoryBackend(); useBackend(db); localStorage.clear(); });

const rec = (id, extra = {}) => ({ submissionId: id, endpoint: `/api/${id}`, payload: { id }, status: 'queued', queuedAt: Number(id.replace(/\D/g, '')) || 0, ...extra });
const seed = (...recs) => Promise.all(recs.map(r => outbox.put(r)));
const rows = (...pairs) => localStorage.setItem('rc_history', JSON.stringify(pairs.map(([id, status], i) => ({ id: i + 1, type: 'Receipt', label: 'x', status, submissionId: id, timestamp: new Date().toISOString() }))));
const statuses = () => Object.fromEntries(loadHistory().map(h => [h.submissionId, h.status]));
const reply = (body) => ({ json: async () => body });

test('flushOutbox sends oldest first and stops at the first network error', async () => {
  await seed(rec('s3'), rec('s1'), rec('s2'));
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === '/api/s2') throw new TypeError('Failed to fetch');
    return reply({ status: 'success' });
  };
  const r = await flushOutbox();
  assert.deepEqual(calls, ['/api/s1', '/api/s2']);                    // s3 never tried
  assert.deepEqual([r.sent, r.offline], [1, true]);
  assert.deepEqual((await db.all()).map(x => x.submissionId).sort(), ['s2', 's3']);   // s1 is gone: it arrived
  assert.ok(db.meta.get('lastSynced'));
});

test('flushOutbox keeps a refused submission as failed (with the reason) and carries on', async () => {
  await seed(rec('s1'), rec('s2'));
  globalThis.fetch = async (url) => reply(url === '/api/s1' ? { status: 'error', message: 'Bad data' } : { status: 'success' });
  const r = await flushOutbox();
  assert.deepEqual([r.sent, r.failed], [1, 1]);
  const left = await db.all();
  assert.equal(left.length, 1);
  assert.deepEqual([left[0].submissionId, left[0].status, left[0].error], ['s1', 'failed', 'Bad data']);
  assert.deepEqual(left[0].payload, { id: 's1' });                    // payload kept for Retry
});

test('flushOutbox leaves sending and failed records alone', async () => {
  await seed(rec('s1', { status: 'sending' }), rec('s2', { status: 'failed' }));
  let called = false;
  globalThis.fetch = async () => { called = true; return reply({ status: 'success' }); };
  await flushOutbox();
  assert.equal(called, false);
});

test('reconcile: rows missing from the outbox arrived; failed outbox records mark their row failed', async () => {
  rows(['a', 'queued'], ['b', 'queued'], ['c', 'sending'], ['d', 'queued'], ['e', 'saved']);
  await seed(rec('b'), rec('d', { status: 'failed', error: 'nope' }));
  await reconcile();
  assert.deepEqual(statuses(), { a: 'saved', b: 'queued', c: 'saved', d: 'failed', e: 'saved' });
});

test('reconcile: copies the service worker\'s last-sent time and drops orphaned failed records', async () => {
  rows(['a', 'saved']);
  await seed(rec('orphan', { status: 'failed' }), rec('still', { status: 'queued' }));
  db.meta.set('lastSynced', '2026-10-09T10:00:00.000Z');
  await reconcile();
  assert.equal(localStorage.getItem('rc_last_synced'), '2026-10-09T10:00:00.000Z');
  assert.deepEqual((await db.all()).map(x => x.submissionId), ['still']);
});

test('startQueue: an interrupted send is queued again, then sent with the same id', async () => {
  rows(['x1', 'sending']);
  await seed(rec('x1', { status: 'sending' }));
  const bodies = [];
  globalThis.fetch = async (url) => { bodies.push(url); return reply({ status: 'success', duplicate: true }); };
  await startQueue();
  assert.deepEqual(bodies, ['/api/x1']);
  assert.deepEqual(statuses(), { x1: 'saved' });
  assert.deepEqual(await db.all(), []);
});

test('startQueue: a pre-IndexedDB localStorage queue and failed rows move into the outbox', async () => {
  localStorage.setItem('rc_queue', JSON.stringify([{ endpoint: '/api/old', payload: { n: 1 }, historyId: 1 }]));
  localStorage.setItem('rc_history', JSON.stringify([
    { id: 1, type: 'Receipt', label: 'q', status: 'queued', timestamp: new Date().toISOString(), summary: '<b>x</b>' },
    { id: 2, type: 'Receipt', label: 'f', status: 'failed', timestamp: new Date().toISOString(), retry: { endpoint: '/api/failed', payload: { n: 2 } } },
  ]));
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await startQueue();
  const all = await db.all();
  const queued = all.find(r => r.endpoint === '/api/old'), failed = all.find(r => r.endpoint === '/api/failed');
  assert.deepEqual([queued.status, failed.status], ['queued', 'failed']);
  assert.equal(queued.payload.submissionId, queued.submissionId);       // id is inside the payload the server sees
  const h = loadHistory();
  assert.deepEqual(h.map(x => [x.status, x.submissionId === (x.id === 1 ? queued : failed).submissionId]), [['queued', true], ['failed', true]]);
  assert.ok(h.every(x => !x.retry && !x.summary));
  assert.equal(localStorage.getItem('rc_queue'), null);
});
