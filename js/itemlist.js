/* Route Command — credit/donation item lists and suggestion boxes */
import { $, esc, plural, clearInvalid, catalog } from './util.js';

/* Every space-separated word must appear somewhere in the entry */
function matchAll(list, query) {
  const words = query.toLowerCase().split(/\s+/);
  return list.filter(s => { const l = s.toLowerCase(); return words.every(w => l.includes(w)); }).slice(0, 8);
}
export const searchStores        = async (q) => matchAll(await catalog('stores'), q);
const searchDonationItems = async (q) => matchAll(await catalog('donationItems'), q);

/* Bring a focused search field near the top so the list and the keyboard don't hide each other */
document.addEventListener('focusin', (e) => {
  if (e.target.matches('.store-search-wrap input')) setTimeout(() => e.target.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
});

/* Combobox behaviour shared by the store search and the item search boxes */
let suggestionSeq = 0;

export function showSuggestions(input, box, results) {
  box.id = box.id || `suggestions-${++suggestionSeq}`;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', box.id);
  box.innerHTML = results.map((s, i) => `<div class="store-suggestion" role="option" id="${box.id}-${i}" tabindex="-1">${esc(s)}</div>`).join('');
  box.classList.toggle('hidden', !results.length);
  /* The keyboard covers the bottom of the screen: open upward if the list won't fit below the field */
  const below = visualViewport.height - input.getBoundingClientRect().bottom;
  box.classList.toggle('store-suggestions--up', results.length > 0 && below < Math.min(box.offsetHeight, 220) + 8);
  input.setAttribute('aria-expanded', String(results.length > 0));
  input.removeAttribute('aria-activedescendant');
}

export function hideSuggestions(box) {
  box.classList.add('hidden');
  const input = box.parentElement.querySelector('input');
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

export function pickSuggestion(input, box, text) {
  input.value = text;
  clearInvalid(input);
  hideSuggestions(box);
  input.dispatchEvent(new Event('change', { bubbles: true }));   // lets draft autosave see keyboard picks
}

/* Arrow keys move through the options, Enter picks, Escape closes */
export function suggestionKeydown(e, input, box) {
  if (box.classList.contains('hidden')) return;
  const opts = [...box.children];
  const cur  = box.querySelector('.focused');
  let idx    = opts.indexOf(cur);

  if (e.key === 'ArrowDown')      idx = (idx + 1) % opts.length;
  else if (e.key === 'ArrowUp')   idx = idx <= 0 ? opts.length - 1 : idx - 1;
  else if (e.key === 'Enter' && cur) { e.preventDefault(); pickSuggestion(input, box, cur.textContent); return; }
  else if (e.key === 'Escape')    { hideSuggestions(box); return; }
  else return;

  e.preventDefault();
  cur?.classList.remove('focused');
  opts[idx].classList.add('focused');
  input.setAttribute('aria-activedescendant', opts[idx].id);
  opts[idx].scrollIntoView({ block: 'nearest' });
}

export const REMOVE_BTN_HTML = `
  <button type="button" class="credit-item__remove" data-remove aria-label="Remove item">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>`;

/* One add/remove/count/suggest/type-toggle implementation for the credit and donation item lists. */
export function createItemList({ listId, countId, buildHTML, onType }) {
  const el = $(listId);
  let counter = 0;

  const refresh = () => {
    const n = el.children.length;
    $(countId).textContent = plural(n, 'item');
    el.querySelectorAll('.credit-item__remove').forEach(b => b.classList.toggle('credit-item__remove--hidden', n <= 1));
  };
  const add   = () => { el.insertAdjacentHTML('beforeend', buildHTML(++counter)); refresh(); };
  /* Focus an item's first visible field (default: the newest); the browser scrolls it into view */
  const focusItem = (item = el.lastElementChild) => [...item.querySelectorAll('input, select')].find(f => !f.closest('.hidden'))?.focus();
  const reset = () => { el.innerHTML = ''; counter = 0; add(); };

  const setType = (item, type) => {
    item.querySelectorAll('[data-type-btn]').forEach(b => b.classList.toggle('pill-toggle__btn--active', b.dataset.typeBtn === type));
    item.querySelectorAll('[data-fields-type]').forEach(f => f.classList.toggle('hidden', f.dataset.fieldsType !== type));
  };

  /* Draft support: plain-data snapshot of every item, and the reverse */
  const serialize = () => [...el.children].map(item => ({
    type:   item.querySelector('.pill-toggle__btn--active')?.dataset.typeBtn,
    values: Object.fromEntries([...item.querySelectorAll('[data-fname]')].map(f => [f.dataset.fname, f.value])),
  }));
  const restore = (items) => {
    el.innerHTML = ''; counter = 0;
    items.forEach(({ type, values }) => {
      add();
      const item = el.lastElementChild;
      if (type) setType(item, type);
      Object.entries(values).forEach(([k, v]) => {
        const f = item.querySelector(`[data-fname="${k}"]`);
        if (f) f.value = v;
      });
    });
    if (!el.children.length) add();
  };

  el.addEventListener('input', async (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (!input) return;
    const box = input.closest('.store-search-wrap').querySelector('.store-suggestions');
    const q   = input.value.trim();
    const results = q ? await searchDonationItems(q) : [];
    if (input.value.trim() === q) showSuggestions(input, box, results);   // ignore stale results
  });

  el.addEventListener('keydown', (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (input) suggestionKeydown(e, input, input.closest('.store-search-wrap').querySelector('.store-suggestions'));
  });

  el.addEventListener('click', (e) => {
    const hit = e.target.closest('.store-suggestion');
    if (hit) {
      pickSuggestion(hit.closest('.store-search-wrap').querySelector('input'), hit.parentElement, hit.textContent);
      return;
    }
    const typeBtn = e.target.closest('[data-type-btn]');
    if (typeBtn) {
      setType(typeBtn.closest('[data-id]'), typeBtn.dataset.typeBtn);
      if (onType) onType(typeBtn.dataset.typeBtn);
      return;
    }
    const step = e.target.closest('.qty-stepper__btn');
    if (step) {
      const qty = step.closest('.qty-stepper').querySelector('[data-fname="qty"]');
      qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + parseInt(step.dataset.dir, 10));
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) { rm.closest('[data-id]').remove(); refresh(); }
  });

  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-fname="qty"]') && !(parseInt(e.target.value, 10) >= 1)) e.target.value = 1;
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) el.querySelectorAll('.store-suggestions').forEach(hideSuggestions);
  });

  return { el, add, focusItem, reset, serialize, restore };
}
