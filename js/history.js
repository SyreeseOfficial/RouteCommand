/* Route Command — submission history */
import { $, esc, today, confirmDialog, showToast, HISTORY_KEY } from './util.js';
import { navigateTo } from './nav.js';
import { summaryHTML } from './summary.js';
import { outbox, queuedCount } from './outbox.js';
import { flushQueue, updateQueueBadge, updateOnlineState, requestSync } from './queue.js';

const submissionHistoryEl = document.getElementById('submission-history');

export const loadHistory = () => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
const SYNC_KEY = 'rc_last_synced';
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CLOCK = icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
const STATUS_ICON = {
  saved:   icon('<polyline points="20 6 9 17 4 12"/>'),
  queued:  CLOCK,
  sending: CLOCK,
  failed:  icon('<line x1="12" y1="6" x2="12" y2="13"/><line x1="12" y1="18" x2="12.01" y2="18"/>'),
};
const openHistoryRows = new Set();   // rows the user expanded; survives re-renders

export function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* storage full: rows are small, but never break the submit flow */ }
  renderHistory();
}

/* Returns the new entry's id so the caller can update its status later. */
export function saveToHistory(entry) {
  const id = Date.now() + Math.random();
  /* A retry of a failed submission replaces the old failed row */
  const history = loadHistory().filter(h => !(h.status === 'failed' && h.type === entry.type && h.label === entry.label));
  history.unshift({ ...entry, id, timestamp: new Date().toISOString() });
  history.length = Math.min(history.length, 15);
  saveHistory(history);
  return id;
}

export function setHistoryStatus(id, status) {
  const history = loadHistory();
  const entry = history.find(h => h.id === id);
  if (entry) entry.status = status;
  saveHistory(history);
}

/* The payload of an unsent submission lives in the outbox. Retrying goes back through the queue (so it also waits
   for a connection); the same submissionId means the server ignores it if the first attempt did arrive. */
async function retryHistoryRow(id) {
  const entry = loadHistory().find(h => h.id === id);
  const rec = entry?.submissionId && await outbox.get(entry.submissionId).catch(() => null);
  if (!rec) return showToast("Can't retry: the details weren't kept");
  await outbox.put({ ...rec, status: 'queued', queuedAt: Date.now() });
  setHistoryStatus(id, 'queued');
  updateQueueBadge();
  updateOnlineState();
  flushQueue();
  requestSync();
}

/* Plain text of a row, built from the rendered summary (spans joined with " · " so it reads the same without CSS) */
async function copyHistoryRow(id, rowEl) {
  const entry = loadHistory().find(h => h.id === id);
  if (!entry) return;
  const lines = [...rowEl.querySelectorAll('.history-body > *')].map(el =>
    el.children.length ? [...el.children].map(c => c.textContent.trim()).join(' · ') : el.textContent.trim());
  const text = [`${entry.type}: ${entry.label}`, `${dayLabel(entry.timestamp)}, ${fmtTime(entry.timestamp)}`, ...lines].join('\n');
  try { await navigator.clipboard.writeText(text); showToast('Copied'); } catch { showToast("Couldn't copy"); }
}

async function deleteHistoryRow(id) {
  const entry = loadHistory().find(h => h.id === id);
  if (!entry) return;
  if (entry.status === 'failed' && !await confirmDialog("This submission was never sent. Delete it anyway?", 'Delete', true)) return;
  saveHistory(loadHistory().filter(h => h.id !== id));
  if (entry.submissionId) outbox.delete(entry.submissionId).catch(() => {});
}

function dayLabel(iso) {
  const day = new Date(iso).toLocaleDateString('en-CA');
  if (day === today()) return 'Today';
  if (day === new Date(Date.now() - 864e5).toLocaleDateString('en-CA')) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* Stamp the moment a submission last reached the server */
export const lastSynced = () => localStorage.getItem(SYNC_KEY) || '';
export function markSynced(at = new Date().toISOString()) {
  localStorage.setItem(SYNC_KEY, at);
  renderLastSynced();
}

function renderLastSynced() {
  const iso = localStorage.getItem(SYNC_KEY);
  const text = iso ? `Last sent: ${dayLabel(iso)}, ${fmtTime(iso)}` : 'Nothing sent from this device yet';
  const waiting = navigator.onLine && loadHistory().some(h => h.status === 'queued');
  $('last-synced').innerHTML = esc(text) + (waiting ? ' · <button type="button" class="tip__link" data-send-now>Send now</button>' : '');
}

export function renderHistory() {
  if (!submissionHistoryEl) return;
  renderLastSynced();
  const history = loadHistory();
  $('clear-history-btn').classList.toggle('hidden', !history.length);
  if (!history.length) {
    submissionHistoryEl.innerHTML = `<div class="history-empty">
      <p class="settings-hint">No submissions yet</p>
      <button type="button" class="btn btn--gold" data-goto="receipts">Submit a receipt</button>
    </div>`;
    return;
  }
  let lastDay = '';
  submissionHistoryEl.innerHTML = history.map(entry => {
    const day    = dayLabel(entry.timestamp);
    const time   = fmtTime(entry.timestamp);
    const status = entry.status || 'saved';   // rows from before statuses existed were all saved
    const heading = day !== lastDay ? `<h4 class="history-day">${esc(day)}</h4>` : '';
    lastDay = day;

    const head = `
        <span class="history-main">
          <span class="history-label">${esc(entry.label)}</span>
          <span class="history-date">${time}</span>
        </span>
        <span class="history-top">
          <span class="history-type history-type--${esc(entry.type.toLowerCase())}">${esc(entry.type)}</span>
          <span class="history-status history-status--${status}">${STATUS_ICON[status] || ''}${status}</span>
        </span>`;
    const btn = (attr, label, cls = '') => `<button type="button" class="btn btn--outline ${cls}" ${attr}="${entry.id}">${label}</button>`;
    /* Rows still waiting to send can't be deleted: the queue would send them anyway */
    const buttons = [
      status === 'failed' && entry.submissionId && btn('data-retry', 'Retry', 'history-retry'),
      entry.data && btn('data-copy', 'Copy details'),
      status !== 'queued' && status !== 'sending' && btn('data-delete', 'Delete'),
    ].filter(Boolean).join('');
    const actions = buttons ? `<div class="history-actions">${buttons}</div>` : '';

    /* Rows saved before details were stored as data have nothing to expand */
    if (!entry.data) return `${heading}<div class="settings-card history-card history-card--${status}">${head}${actions}</div>`;
    const open = openHistoryRows.has(String(entry.id)) ? ' open' : '';
    return `${heading}<details class="settings-card history-card history-card--${status}" data-id="${entry.id}"${open}>
        <summary>${head}</summary>
        <div class="history-body">${summaryHTML(entry.type, entry.data)}</div>${actions}
      </details>`;
  }).join('');
}

submissionHistoryEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-goto]')) navigateTo('receipts');
  const btn = e.target.closest('[data-retry]');
  if (btn) retryHistoryRow(Number(btn.dataset.retry));
  const copy = e.target.closest('[data-copy]');
  if (copy) copyHistoryRow(Number(copy.dataset.copy), copy.closest('details'));
  const del = e.target.closest('[data-delete]');
  if (del) deleteHistoryRow(Number(del.dataset.delete));
});
submissionHistoryEl.addEventListener('toggle', (e) => {
  const row = e.target.closest('details[data-id]');
  if (row) openHistoryRows[row.open ? 'add' : 'delete'](row.dataset.id);
}, true);
$('clear-history-btn').addEventListener('click', async () => {
  if (await confirmDialog('Clear submission history on this device?', 'Clear', true)) saveHistory([]);
});

/* Pull down from the top of History to send anything waiting */
const historyView = $('history-view');
let pullStart = null;
const pullDone = () => { pullStart = null; historyView.classList.remove('ptr-ready'); };
historyView.addEventListener('touchstart', (e) => { pullStart = window.scrollY === 0 ? e.touches[0].clientY : null; }, { passive: true });
historyView.addEventListener('touchmove', (e) => {
  if (pullStart !== null) historyView.classList.toggle('ptr-ready', e.touches[0].clientY - pullStart > 70);
}, { passive: true });
historyView.addEventListener('touchcancel', pullDone);
async function sendNow() {
  if (!navigator.onLine) return showToast("You're offline");
  const waiting = await queuedCount().catch(() => 0);
  await flushQueue();
  renderHistory();
  if (!waiting) showToast('Nothing waiting to send');
}
historyView.addEventListener('touchend', () => {
  const refresh = historyView.classList.contains('ptr-ready');
  pullDone();
  if (refresh) sendNow();
});
$('last-synced').addEventListener('click', (e) => { if (e.target.closest('[data-send-now]')) sendNow(); });
window.addEventListener('online', renderLastSynced);
window.addEventListener('offline', renderLastSynced);
