/* Route Command — form submission: drafts, send, queue fallback */
import { isNetworkError, postJSON, recordError, submitLabel } from './util.js';
import { enqueue } from './queue.js';
import { saveToHistory, setHistoryStatus, markSynced } from './history.js';

/* Save `snapshot()` to localStorage on every edit, so a reload doesn't lose a long list */
export function autosaveDraft(key, formEl, snapshot) {
  const save = () => localStorage.setItem(key, JSON.stringify(snapshot()));
  ['input', 'change', 'click'].forEach(ev => formEl.addEventListener(ev, save));
}
export function loadDraft(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

/* POST a form, drive the button spinner, error text, history status, and success screen. */
export async function submitForm({ draftKey, endpoint, payload, btn, type, histLabel, formEl, successEl, summaryEl, summaryHTML }) {
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
    title.dataset.orig = title.dataset.orig || title.textContent;
    msg.dataset.orig   = msg.dataset.orig   || msg.innerHTML;
    title.textContent = queued ? 'Saved Offline' : title.dataset.orig;
    msg.innerHTML     = queued ? 'It will send automatically when you\'re back online.' : msg.dataset.orig;
    summaryEl.innerHTML = summaryHTML;
    formEl.classList.add('hidden');
    successEl.classList.remove('hidden');
    successEl.scrollIntoView({ block: 'center' });
  };

  const historyId = saveToHistory({ type, label: histLabel, status: 'sending', summary: summaryHTML });
  try {
    const data = await postJSON(endpoint, payload);
    if (data.status !== 'success') throw new Error(data.message || 'Server error');

    setHistoryStatus(historyId, 'saved');
    markSynced();
    if (draftKey) localStorage.removeItem(draftKey);
    showSuccess(false);
    navigator.vibrate?.(10);   // Android only; iOS ignores it
  } catch (err) {
    if (isNetworkError(err) && enqueue({ endpoint, payload, historyId })) {
      setHistoryStatus(historyId, 'queued');
      if (draftKey) localStorage.removeItem(draftKey);
      showSuccess(true);
    } else {
      setHistoryStatus(historyId, 'failed', { endpoint, payload });
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
