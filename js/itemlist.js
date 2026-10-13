/* Route Command — credit/donation item lists and suggestion boxes */
import { $, esc, plural, clearInvalid, catalog, isDataReady, setPill, showToast } from './util.js';

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

/* Shared by the store and item boxes: search, then show matches, "loading" or a "no match" note */
export async function runSearch(input, box, search, emptyMsg) {
  const q = input.value.trim();
  if (q && !isDataReady()) showSuggestions(input, box, [], 'Loading list…');
  const results = q ? await search(q) : [];
  if (input.value.trim() === q) showSuggestions(input, box, results, q && !results.length ? emptyMsg : '');   // ignore stale results
}

export function showSuggestions(input, box, results, note = '') {
  box.id = box.id || `suggestions-${++suggestionSeq}`;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', box.id);
  /* Items are "<upc> <name>": show the number as a muted prefix so rows scan. data-value is what gets picked. */
  const row = (s, i) => {
    const m = s.match(/^(\d+)\s+(.+)$/);
    return `<div class="store-suggestion" role="option" id="${box.id}-${i}" tabindex="-1" data-value="${esc(s)}">${m ? `<span class="suggestion-upc">${esc(m[1])}</span>${esc(m[2])}` : esc(s)}</div>`;
  };
  box.innerHTML = results.length
    ? results.map(row).join('')
    : note && `<div class="suggestion-note" role="status">${esc(note)}</div>`;
  box.classList.toggle('hidden', !results.length && !note);
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
  const opts = [...box.querySelectorAll('[role=option]')];
  if (!opts.length && e.key !== 'Escape') return;
  const cur  = box.querySelector('.focused');
  let idx    = opts.indexOf(cur);

  if (e.key === 'ArrowDown')      idx = (idx + 1) % opts.length;
  else if (e.key === 'ArrowUp')   idx = idx <= 0 ? opts.length - 1 : idx - 1;
  else if (e.key === 'Enter' && cur) { e.preventDefault(); pickSuggestion(input, box, cur.dataset.value); return; }
  else if (e.key === 'Escape')    { hideSuggestions(box); return; }
  else return;

  e.preventDefault();
  cur?.classList.remove('focused');
  opts[idx].classList.add('focused');
  input.setAttribute('aria-activedescendant', opts[idx].id);
  opts[idx].scrollIntoView({ block: 'nearest' });
}

/* Header buttons shared by both item cards: duplicate, and remove (hidden while it is the only item) */
const iconBtn = (cls, attr, label, paths) => `
  <button type="button" class="${cls}" ${attr} aria-label="${label}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${paths}</svg>
  </button>`;
export const ITEM_BUTTONS_HTML =
  iconBtn('item-card__dup', 'data-duplicate', 'Duplicate item', '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>') +
  iconBtn('item-card__remove', 'data-remove', 'Remove item', '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>');

/* Labeled quantity stepper shared by both item cards (the label is a span: a <label> would forward taps to the − button) */
export const qtyFieldHTML = () => `
  <div class="item-field">
    <span class="item-field__label">Qty</span>
    <div class="qty-stepper">
      <button type="button" class="qty-stepper__btn" data-dir="-1" aria-label="Decrease quantity">−</button>
      <input type="number" class="qty-stepper__input" value="1" min="1" inputmode="numeric" aria-label="Quantity" enterkeyhint="next" data-fname="qty" />
      <button type="button" class="qty-stepper__btn" data-dir="1" aria-label="Increase quantity">+</button>
    </div>
  </div>`;

/* One add/remove/count/suggest/type-toggle implementation for the credit and donation item lists. */
export function createItemList({ listId, countId, buildHTML, onType }) {
  const el = $(listId);
  let counter = 0;

  const refresh = () => {
    const n = el.children.length;
    $(countId).textContent = plural(n, 'item');
    el.querySelectorAll('.item-card__remove').forEach(b => b.classList.toggle('item-card__remove--hidden', n <= 1));
  };
  const add   = () => { el.insertAdjacentHTML('beforeend', buildHTML(++counter)); refresh(); };
  /* Focus an item's first visible field (default: the newest); the browser scrolls it into view */
  const focusItem = (item = el.lastElementChild) => [...item.querySelectorAll('input, select')].find(f => !f.closest('.hidden'))?.focus();
  const reset = () => { el.innerHTML = ''; counter = 0; add(); };

  const setType = (item, type) => {
    item.querySelectorAll('[data-type-btn]').forEach(b => setPill(b, b.dataset.typeBtn === type));
    item.querySelectorAll('[data-fields-type]').forEach(f => f.classList.toggle('hidden', f.dataset.fieldsType !== type));
  };

  /* Draft support: plain-data snapshot of every item, and the reverse */
  const serializeItem = (item) => ({
    type:   item.querySelector('.pill-toggle__btn--active')?.dataset.typeBtn,
    values: Object.fromEntries([...item.querySelectorAll('[data-fname]')].map(f => [f.dataset.fname, f.value])),
  });
  const restoreItem = (item, { type, values }) => {
    if (type) setType(item, type);
    Object.entries(values).forEach(([k, v]) => {
      const f = item.querySelector(`[data-fname="${k}"]`);
      if (f) f.value = v;
    });
  };
  const serialize = () => [...el.children].map(serializeItem);
  const restore = (items) => {
    el.innerHTML = ''; counter = 0;
    items.forEach(it => { add(); restoreItem(el.lastElementChild, it); });
    if (!el.children.length) add();
  };

  /* A copy right below the original with its type, reason and date; the product and the amounts are what changes between lines */
  const PER_LINE = ['upc', 'name', 'qty', 'weight'];
  const duplicate = (item) => {
    const { type, values } = serializeItem(item);
    add();
    const copy = el.lastElementChild;
    item.after(copy);
    restoreItem(copy, { type, values: Object.fromEntries(Object.entries(values).filter(([k]) => !PER_LINE.includes(k))) });
    el.dispatchEvent(new Event('change', { bubbles: true }));   // lets draft autosave see it
    focusItem(copy);
  };

  el.addEventListener('input', (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (input) runSearch(input, input.closest('.store-search-wrap').querySelector('.store-suggestions'), searchDonationItems, 'No match. It will be sent as typed.');
  });

  el.addEventListener('keydown', (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (input) suggestionKeydown(e, input, input.closest('.store-search-wrap').querySelector('.store-suggestions'));
  });

  el.addEventListener('click', (e) => {
    const hit = e.target.closest('.store-suggestion');
    if (hit) {
      pickSuggestion(hit.closest('.store-search-wrap').querySelector('input'), hit.parentElement, hit.dataset.value);
      return;
    }
    const typeBtn = e.target.closest('[data-type-btn]');
    if (typeBtn) {
      setType(typeBtn.closest('[data-id]'), typeBtn.dataset.typeBtn);
      if (onType) onType(typeBtn.dataset.typeBtn);
      return;
    }
    const dup = e.target.closest('[data-duplicate]');
    if (dup) { duplicate(dup.closest('[data-id]')); return; }
    const step = e.target.closest('.qty-stepper__btn');
    if (step) {
      const qty = step.closest('.qty-stepper').querySelector('[data-fname="qty"]');
      qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + parseInt(step.dataset.dir, 10));
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      /* Keep the node (with everything typed into it) so Undo can put it back where it was */
      const item = rm.closest('[data-id]');
      const next = item.nextElementSibling;
      item.remove();
      refresh();
      showToast('Item removed', { label: 'Undo', run: () => {
        el.insertBefore(item, next?.parentNode === el ? next : null);
        refresh();
        el.dispatchEvent(new Event('change', { bubbles: true }));   // lets draft autosave see it
      } }, 5000);
    }
  });

  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-fname="qty"]') && !(parseInt(e.target.value, 10) >= 1)) e.target.value = 1;
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) el.querySelectorAll('.store-suggestions').forEach(hideSuggestions);
  });

  return { el, add, focusItem, reset, serialize, restore };
}
