/* Route Command — offline queue */
import { $, plural, postJSON, isNetworkError, showToast, submitLabel, recordError } from './util.js';
import { setHistoryStatus, markSynced } from './history.js';

/* ── Offline queue: submissions that failed for lack of network wait here and retry ── */
const QUEUE_KEY = 'rc_queue';
export const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; } };

/* Badge on the History tab: how many submissions are waiting to send */
export function updateQueueBadge() {
  const n = loadQueue().length;
  document.querySelectorAll('[data-view="history"]').forEach(nav => {
    const badge = nav.querySelector('.nav-badge');
    badge.textContent = n;
    badge.classList.toggle('hidden', !n);
    if (nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', n ? `History, ${n} waiting to send` : 'History');
  });
}

/* Returns false if the item couldn't be stored (e.g. storage full), so the caller can show the error instead */
export function enqueue(item) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...loadQueue(), item]));
    updateQueueBadge();
    return true;
  } catch { return false; }
}

let flushing = false;
export async function flushQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  let sent = 0;
  for (const item of loadQueue()) {
    let status;
    try {
      const data = await postJSON(item.endpoint, item.payload);
      status = data.status === 'success' ? 'saved' : 'failed';
      if (status === 'failed') recordError(data.message || 'Server error');
    } catch (err) {
      if (isNetworkError(err)) break;   // still offline; try again on the next tick
      status = 'failed';                // any other reply ends the item: a retry would just fail again
      recordError(err.message);
    }
    setHistoryStatus(item.historyId, status, status === 'failed' ? { endpoint: item.endpoint, payload: item.payload } : undefined);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(loadQueue().filter(q => q.historyId !== item.historyId)));
    updateQueueBadge();
    if (status === 'saved') { sent++; markSynced(); }
  }
  flushing = false;
  if (sent) showToast(`${plural(sent, 'submission')} sent`);
}
window.addEventListener('online', flushQueue);

export function updateOnlineState() {
  $('offline-banner').classList.toggle('hidden', navigator.onLine);
  document.querySelectorAll('[data-label]').forEach(btn => { if (!btn.disabled) btn.textContent = submitLabel(btn); });   // busy buttons relabel when they finish
}
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);
setInterval(flushQueue, 30000);
