/* Route Command — credits form */
import { $, today, plural, getName, markInvalid, focusFirstInvalid } from './util.js';
import { submitForm, autosaveDraft, loadDraft } from './submit.js';
import { createItemList, REMOVE_BTN_HTML, searchStores, showSuggestions, hideSuggestions, pickSuggestion, suggestionKeydown } from './itemlist.js';

function initStoreSearch() {
  const input = $('credit-store-input');
  const box   = $('store-suggestions');

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    const results = q ? await searchStores(q) : [];
    if (input.value.trim() === q) showSuggestions(input, box, results);   // ignore stale results
  });
  box.addEventListener('click', (e) => {
    const hit = e.target.closest('.store-suggestion');
    if (!hit) return;
    pickSuggestion(input, box, hit.textContent);
    creditList.focusItem(creditList.el.firstElementChild);
  });
  input.addEventListener('keydown', (e) => suggestionKeydown(e, input, box));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) hideSuggestions(box);
  });
}

function createCreditItemHTML(id) {
  return `
    <div class="credit-item" data-id="${id}">
      <div class="credit-item__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn pill-toggle__btn--active" data-type-btn="retail">Retail</button>
          <button type="button" class="pill-toggle__btn" data-type-btn="chub">Chub / Deli</button>
        </div>${REMOVE_BTN_HTML}
      </div>
      <div data-fields-type="retail">
        <div class="credit-item__row">
          <input type="text" class="form-input" placeholder="UPC / Item #" inputmode="numeric" autocomplete="off" data-fname="upc" />
          <div class="qty-stepper">
            <button type="button" class="qty-stepper__btn" data-dir="-1" aria-label="Decrease quantity">−</button>
            <input type="number" class="qty-stepper__input" value="1" min="1" inputmode="numeric" aria-label="Quantity" data-fname="qty" />
            <button type="button" class="qty-stepper__btn" data-dir="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>
      <div class="hidden" data-fields-type="chub">
        <div class="store-search-wrap store-search-wrap--spaced">
          <input type="text" class="form-input" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-fname="name" />
          <div class="store-suggestions hidden" role="listbox" aria-label="Item suggestions"></div>
        </div>
        <input type="number" class="form-input" placeholder="Weight (lbs)" inputmode="decimal" step="0.01" min="0" data-fname="weight" />
      </div>
      <select class="form-select" data-fname="reason">
        <option value="10-Day" selected>10-Day</option>
        <option value="Expired">Expired</option>
        <option value="Damaged Packaging">Damaged Packaging</option>
        <option value="Poor Quality">Poor Quality</option>
        <option value="Bad Seal">Bad Seal</option>
        <option value="Other">Other</option>
      </select>
    </div>`;
}

const CREDIT_DRAFT_KEY = 'rc_draft_credit';
let creditList;

/* Returns the items, or null if any required field is empty (fields get highlighted). */
export function collectCreditItems(listEl = creditList.el) {
  let valid = true;
  const items = [...listEl.children].map(itemEl => {
    const type   = itemEl.querySelector('.pill-toggle__btn--active').dataset.typeBtn;
    const retail = type === 'retail';
    const f      = (n) => itemEl.querySelector(`[data-fname="${n}"]`);
    const prod   = f(retail ? 'upc' : 'name');
    const qty    = f(retail ? 'qty' : 'weight');
    if (!prod.value.trim()) valid = markInvalid(prod, retail ? 'Enter a UPC or item number' : 'Search for an item');
    if (!(parseFloat(qty.value) > 0)) valid = markInvalid(qty, retail ? 'Enter a quantity' : 'Enter the weight in lbs');
    return {
      type:    retail ? 'Retail' : 'Chub / Deli',
      product: prod.value.trim(),
      qty:     `${qty.value.trim()} ${retail ? 'units' : 'lbs'}`,
      reason:  f('reason').value,
    };
  });
  return valid ? items : null;
}

function handleCreditSubmit(e) {
  e.preventDefault();
  const dateEl     = $('credit-date');
  const storeInput = $('credit-store-input');
  let valid = true;
  if (!dateEl.value) valid = markInvalid(dateEl, 'Pick a date');
  if (!storeInput.value.trim()) valid = markInvalid(storeInput, 'Choose or type a store');
  const items = collectCreditItems();
  if (!valid || !items) { focusFirstInvalid($('credit-form')); return; }

  const store = storeInput.value.trim();
  const date  = dateEl.value;
  submitForm({
    draftKey:    CREDIT_DRAFT_KEY,
    endpoint:    '/api/submit-credit',
    payload:     { salesperson: getName(), store, date, notes: $('credit-notes').value.trim(), items, timestamp: new Date().toISOString() },
    btn:         $('credit-submit-btn'),
    type:        'Credit',
    histLabel:   `${store} · ${plural(items.length, 'item')}`,
    formEl:      $('credit-form'),
    successEl:   $('credit-success-state'),
    summaryEl:   $('credit-success-summary'),
    data:        { store, date, items },
  });
}

function resetCreditForm() {
  localStorage.removeItem(CREDIT_DRAFT_KEY);
  $('credit-date').value = today();
  $('credit-store-input').value = '';
  $('credit-notes').value = '';
  creditList.reset();
  $('credit-success-state').classList.add('hidden');
  $('credit-form').classList.remove('hidden');
}

export function initCredits() {
  $('credit-date').value = today();

  creditList = createItemList({ listId: 'credit-items-list', countId: 'credit-items-count', buildHTML: createCreditItemHTML });
  const draft = loadDraft(CREDIT_DRAFT_KEY);
  if (draft) {
    $('credit-store-input').value = draft.store || '';
    $('credit-notes').value       = draft.notes || '';
    creditList.restore(draft.items || []);
  } else {
    creditList.add();
  }
  autosaveDraft(CREDIT_DRAFT_KEY, $('credit-form'), () => ({
    store: $('credit-store-input').value,
    notes: $('credit-notes').value,
    items: creditList.serialize(),
  }));

  $('add-credit-item-btn').addEventListener('click', () => { creditList.add(); creditList.focusItem(); });
  $('credit-form').addEventListener('submit', handleCreditSubmit);
  $('credit-submit-another-btn').addEventListener('click', resetCreditForm);

  initStoreSearch();
}
