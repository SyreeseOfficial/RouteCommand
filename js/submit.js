/* Route Command — form submission: drafts, send, queue fallback */
import { summaryHTML } from './summary.js';
import { isNetworkError, newId, postJSON, recordError, resetSuccess, submitLabel } from './util.js';
import { outbox } from './outbox.js';
import { updateQueueBadge, requestSync } from './queue.js';
import { saveToHistory, setHistoryStatus, markSynced } from './history.js';

/* Save `snapshot()` to localStorage on every edit, so a reload doesn't lose a long list */
export function autosaveDraft(key, formEl, snapshot) {
  const save = () => localStorage.setItem(key, JSON.stringify(snapshot()));
  ['input', 'change', 'click'].forEach(ev => formEl.addEventListener(ev, save));
}
export function loadDraft(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
/* An untouched form also autosaves; only announce a draft that holds something the user typed */
export const draftFilled = (d) => !!(d.store || d.notes || d.items?.some(i => ['upc', 'name', 'weight', 'sellby'].some(k => i.values[k])));
/* "Draft restored · Clear" at the top of a form; onClear resets the form (which removes the note too) */
export function showDraftNote(formEl, onClear) {
  formEl.querySelector('.draft-note')?.remove();
  const note = document.createElement('p');
  note.className = 'draft-note';
  note.innerHTML = 'Draft restored · <button type="button" class="tip__link">Clear</button>';
  note.querySelector('button').addEventListener('click', onClear);
  formEl.prepend(note);
}

/* POST a form, drive the button spinner, error text, history status, and success screen. */
export async function submitForm({ draftKey, endpoint, payload: basePayload, btn, type, histLabel, formEl, successEl, summaryEl, data }) {
  if (btn.disabled) return;
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Submitting…';
  window.addEventListener('beforeunload', beforeUnloadHandler);

  let errEl = btn.parentElement.querySelector('.submit-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'submit-error';
    errEl.setAttribute('role', 'alert');
    btn.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = '';

  /* The success screen doubles as the "saved offline" screen */
  const showSuccess = (queued) => {
    const title = successEl.querySelector('.success-state__title');
    const msg   = successEl.querySelector('.success-state__msg');
    const icon  = successEl.querySelector('.success-state__icon use');
    title.dataset.orig = title.dataset.orig || title.textContent;
    msg.dataset.orig   = msg.dataset.orig   || msg.innerHTML;
    icon.setAttribute('href', queued ? '#icon-clock' : '#icon-check');   // a clock, not a check: it has not reached the office yet
    successEl.classList.toggle('success-state--queued', queued);
    title.textContent = queued ? 'Saved offline' : title.dataset.orig;
    msg.innerHTML     = queued ? 'It will send automatically when you\'re back online.' : msg.dataset.orig;
    summaryEl.innerHTML = summaryHTML(type, data);
    formEl.classList.add('hidden');
    successEl.classList.remove('hidden');
    successEl.scrollIntoView({ block: 'center' });
    clearTimeout(successEl._reset);
    successEl._reset = setTimeout(() => resetSuccess(successEl), 60000);   // leaving the tab resets it too (nav.js)
  };

  const payload = { ...basePayload, submissionId: newId() };   // the same id travels with every resend of this submission
  const id = payload.submissionId;

  /* Keep the payload on disk while it is in flight: if the app is closed mid-request, it is still there to resend */
  const rec = { submissionId: id, endpoint, payload, status: 'sending', queuedAt: Date.now() };
  const stored = await outbox.put(rec).then(() => true, () => false);   // false: IndexedDB unavailable, still send directly

  const historyId = saveToHistory({ type, label: histLabel, status: 'sending', data, submissionId: id });
  try {
    const res = await postJSON(endpoint, payload);
    if (res.status !== 'success') throw new Error(res.message || 'Server error');

    if (stored) await outbox.delete(id).catch(() => {});
    setHistoryStatus(historyId, 'saved');
    markSynced();
    if (draftKey) localStorage.removeItem(draftKey);
    showSuccess(false);
    navigator.vibrate?.(10);   // Android only; iOS ignores it
  } catch (err) {
    const queued = isNetworkError(err) && stored && await outbox.put({ ...rec, status: 'queued' }).then(() => true, () => false);
    if (queued) {
      setHistoryStatus(historyId, 'queued');
      updateQueueBadge();
      requestSync();
      if (draftKey) localStorage.removeItem(draftKey);
      showSuccess(true);
    } else {
      if (stored) await outbox.put({ ...rec, status: 'failed', error: err.message }).catch(() => {});
      setHistoryStatus(historyId, 'failed');
      recordError(err.message);
      errEl.textContent = isNetworkError(err)
        ? 'Network error. Please check your connection and try again.'
        : err.message;
    }
  } finally {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    btn.disabled    = false;
    btn.textContent = submitLabel(btn);
  }
}

function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = '';
}
