/* Route Command — page side of the offline queue (storage and sending: outbox.js) */
import { $, plural, newId, showToast, submitLabel, recordError } from './util.js';
import { outbox, flushOutbox, queuedCount, getMeta } from './outbox.js';
import { loadHistory, saveHistory, markSynced, lastSynced } from './history.js';

/* Badge on the History tab: how many submissions are waiting to send */
export async function updateQueueBadge() {
  const n = await queuedCount().catch(() => 0);
  document.querySelectorAll('[data-view="history"]').forEach(nav => {
    const badge = nav.querySelector('.nav-badge');
    badge.textContent = n;
    badge.classList.toggle('hidden', !n);
    if (nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', n ? `History, ${n} waiting to send` : 'History');
  });
}

/* Ask the browser to send the outbox even if the app is closed (Chrome/Android; elsewhere the page does it) */
export function requestSync() {
  navigator.serviceWorker?.ready.then(reg => reg.sync?.register('flush-outbox')).catch(() => {});
}

/* The outbox is the truth about what is still unsent, and the service worker may have sent things while the
   app was closed. Bring the history rows (localStorage) in line with it. */
export async function reconcile() {
  const recs = new Map((await outbox.all()).map(r => [r.submissionId, r]));
  const history = loadHistory();
  let changed = false;
  for (const h of history) {
    const rec = recs.get(h.submissionId);
    let status = h.status;
    if (!h.submissionId) continue;
    if (!rec && (status === 'queued' || status === 'sending')) status = 'saved';   // gone from the outbox: it arrived
    else if (rec?.status === 'failed' && status !== 'failed') { status = 'failed'; recordError(rec.error || 'Server error'); }
    if (status !== h.status) { h.status = status; changed = true; }
  }
  if (changed) saveHistory(history);

  const sentAt = await getMeta('lastSynced');
  if (sentAt && sentAt > lastSynced()) markSynced(sentAt);

  /* Failed submissions no history row points at any more (trimmed, replaced or deleted) are not needed */
  const shown = new Set(history.map(h => h.submissionId));
  for (const rec of recs.values()) if (rec.status === 'failed' && !shown.has(rec.submissionId)) await outbox.delete(rec.submissionId);
  updateQueueBadge();
}

export async function flushQueue() {
  let result;
  try {
    result = await flushOutbox();
    await reconcile();
  } catch { return; }   // IndexedDB unavailable: nothing was queued
  if (result.sent) showToast(`${plural(result.sent, 'submission')} sent`);
}

/* Before IndexedDB, unsent submissions lived in localStorage (queue) and in history rows (failed). Move them over once. */
async function migrateLegacyQueue() {
  let old = [];
  try { old = JSON.parse(localStorage.getItem('rc_queue')) || []; } catch { /* unreadable: nothing to move */ }
  const history = loadHistory();
  if (!old.length && !history.some(h => h.retry || h.summary)) return;

  const add = async (item, status, h) => {
    const submissionId = newId();
    await outbox.put({ submissionId, endpoint: item.endpoint, payload: { ...item.payload, submissionId }, status, queuedAt: Date.now() });
    if (h) h.submissionId = submissionId;
  };
  for (const q of old) await add(q, 'queued', history.find(h => h.id === q.historyId));
  for (const h of history) if (h.retry && !h.submissionId) await add(h.retry, 'failed', h);
  history.forEach(h => { delete h.retry; delete h.summary; });   // payloads moved; old stored HTML is no longer used
  saveHistory(history);
  localStorage.removeItem('rc_queue');
}

export async function startQueue() {
  try {
    await migrateLegacyQueue();
    /* Still 'sending' after a restart: the app closed mid-request. The server may or may not have it, and resending
       is safe because it ignores a repeated submissionId. */
    for (const rec of await outbox.all()) if (rec.status === 'sending') await outbox.put({ ...rec, status: 'queued' });
  } catch { /* IndexedDB unavailable: submissions still send directly */ }
  saveHistory(loadHistory().map(h => h.status !== 'sending' ? h : { ...h, status: h.submissionId ? 'queued' : 'failed' }));
  await flushQueue();
  requestSync();
}

window.addEventListener('online', flushQueue);
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type !== 'outbox-changed') return;
  reconcile().catch(() => {});
  if (e.data.sent) showToast(`${plural(e.data.sent, 'submission')} sent`);
});

export function updateOnlineState() {
  $('offline-banner').classList.toggle('hidden', navigator.onLine);
  document.querySelectorAll('[data-label]').forEach(btn => { if (!btn.disabled) btn.textContent = submitLabel(btn); });   // busy buttons relabel when they finish
}
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);
setInterval(flushQueue, 30000);
