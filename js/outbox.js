/* Route Command — outbox: submissions that haven't reached the server, kept in IndexedDB.
 * No DOM access: the page and the service worker both import this file.
 *
 * Record: { submissionId, endpoint, payload, status, queuedAt, error? }
 *   sending : request in flight (a record still 'sending' after a restart was interrupted)
 *   queued  : waiting for a connection
 *   failed  : the server refused it; kept so the user can Retry
 * A submission that reached the server has no record.
 */
import { postJSON, isNetworkError } from './util.js';

const DB_NAME = 'rc';
let dbPromise;
const openDb = () => dbPromise ||= new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore('outbox', { keyPath: 'submissionId' });
    req.result.createObjectStore('meta');
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => { dbPromise = null; reject(req.error); };
});

/* Run `fn(store)` in one transaction and resolve with its request's result */
async function run(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

const idbBackend = {
  all:     ()          => run('outbox', 'readonly',  s => s.getAll()),
  get:     (id)        => run('outbox', 'readonly',  s => s.get(id)),
  put:     (rec)       => run('outbox', 'readwrite', s => s.put(rec)),
  delete:  (id)        => run('outbox', 'readwrite', s => s.delete(id)),
  clear:   ()          => run('outbox', 'readwrite', s => s.clear()),
  getMeta: (key)       => run('meta',   'readonly',  s => s.get(key)),
  setMeta: (key, val)  => run('meta',   'readwrite', s => s.put(val, key)),
};

let backend = idbBackend;
export const useBackend = (b) => { backend = b; };   // tests swap in a Map

export const outbox = {
  all:    () => backend.all(),
  get:    (id) => backend.get(id),
  put:    (rec) => backend.put(rec),
  delete: (id) => backend.delete(id),
  clear:  () => backend.clear(),
};
export const getMeta = (key) => backend.getMeta(key);
export const queuedCount = async () => (await backend.all()).filter(r => r.status === 'queued').length;

/* Only one flusher at a time across the page, other tabs and the service worker */
const withLock = (fn) => navigator.locks ? navigator.locks.request('rc-flush', { ifAvailable: true }, (lock) => lock && fn()) : fn();

/* Send every queued submission, oldest first. Stops at the first network error (still offline).
 * A repeat of something the server already saved is answered with success, so resending is always safe. */
let flushing = false;
export async function flushOutbox() {
  const result = { sent: 0, failed: 0, offline: !navigator.onLine };
  if (flushing || result.offline) return result;
  flushing = true;
  try {
    await withLock(async () => {
      const queued = (await backend.all()).filter(r => r.status === 'queued').sort((a, b) => a.queuedAt - b.queuedAt);
      for (const rec of queued) {
        let error;
        try {
          const data = await postJSON(rec.endpoint, rec.payload);
          if (data.status === 'success') {
            await backend.delete(rec.submissionId);
            await backend.setMeta('lastSynced', new Date().toISOString());
            result.sent++;
            continue;
          }
          error = data.message || 'Server error';
        } catch (err) {
          if (isNetworkError(err)) { result.offline = true; break; }   // try again on the next tick
          error = err.message;
        }
        await backend.put({ ...rec, status: 'failed', error });       // a retry would just fail again: wait for the user
        result.failed++;
      }
    });
  } finally {
    flushing = false;
  }
  return result;
}
