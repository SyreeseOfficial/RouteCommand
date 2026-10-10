/* Route Command — credits form */
import { $, today, plural, getName, markInvalid, focusFirstInvalid } from './util.js';
import { submitForm, autosaveDraft, loadDraft, draftFilled, showDraftNote } from './submit.js';
import { createItemList, REMOVE_BTN_HTML, qtyFieldHTML, searchStores, runSearch, hideSuggestions, pickSuggestion, suggestionKeydown } from './itemlist.js';

function initStoreSearch() {
  const input = $('credit-store-input');
  const box   = $('store-suggestions');

  input.addEventListener('input', () => runSearch(input, box, searchStores, 'No match. Check the spelling or use the exact store name'));
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
    <div class="item-card" data-id="${id}">
      <div class="item-card__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn pill-toggle__btn--active" data-type-btn="retail">Retail</button>
          <button type="button" class="pill-toggle__btn" data-type-btn="chub">Chub / Deli</button>
        </div>${REMOVE_BTN_HTML}
      </div>
      <div data-fields-type="retail">
        <div class="item-card__row">
          <div class="item-field">
            <label class="item-field__label" for="ci-${id}-upc">UPC / Item #</label>
            <input type="text" class="form-input" id="ci-${id}-upc" placeholder="e.g. 0123456789" inputmode="numeric" autocomplete="off" data-fname="upc" />
          </div>
          ${qtyFieldHTML()}
        </div>
      </div>
      <div class="hidden" data-fields-type="chub">
        <div class="item-field store-search-wrap--spaced">
          <label class="item-field__label" for="ci-${id}-name">Item</label>
          <div class="store-search-wrap">
            <input type="text" class="form-input" id="ci-${id}-name" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-fname="name" />
            <div class="store-suggestions hidden" role="listbox" aria-label="Item suggestions"></div>
          </div>
        </div>
        <div class="item-field">
          <label class="item-field__label" for="ci-${id}-weight">Weight (lbs)</label>
          <input type="number" class="form-input" id="ci-${id}-weight" placeholder="0.00" inputmode="decimal" step="0.01" min="0" data-fname="weight" />
        </div>
      </div>
      <div class="item-field">
        <label class="item-field__label" for="ci-${id}-reason">Reason</label>
        <select class="form-select" id="ci-${id}-reason" data-fname="reason">
          <option value="10-Day" selected>10-Day</option>
          <option value="Expired">Expired</option>
          <option value="Damaged Packaging">Damaged Packaging</option>
          <option value="Poor Quality">Poor Quality</option>
          <option value="Bad Seal">Bad Seal</option>
          <option value="Other">Other</option>
        </select>
      </div>
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
  $('credit-form').querySelector('.draft-note')?.remove();
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
    if (draftFilled(draft)) showDraftNote($('credit-form'), resetCreditForm);
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
