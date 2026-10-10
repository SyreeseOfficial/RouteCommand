/* Route Command — donations form */
import { $, plural, getName, markInvalid, focusFirstInvalid } from './util.js';
import { submitForm, autosaveDraft, loadDraft } from './submit.js';
import { createItemList, REMOVE_BTN_HTML, qtyFieldHTML } from './itemlist.js';

const DONATION_LAST_TYPE_KEY   = 'rc_donation_last_type';
const DONATION_LAST_REASON_KEY = 'rc_donation_last_reason';


const DONATION_DRAFT_KEY = 'rc_draft_donation';
let donationList;

function createDonationItemHTML(id) {
  const defaultType   = localStorage.getItem(DONATION_LAST_TYPE_KEY)   || 'chub';
  const defaultReason = localStorage.getItem(DONATION_LAST_REASON_KEY) || 'Out of Date';
  const active = (t) => defaultType === t ? 'pill-toggle__btn--active' : '';
  const reasonOptions = ['Out of Date', 'Damaged Packaging', 'Bad Seal', 'Other'].map(r =>
    `<option value="${r}"${r === defaultReason ? ' selected' : ''}>${r}</option>`
  ).join('');
  return `
    <div class="item-card" data-id="${id}">
      <div class="item-card__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn ${active('chub')}" data-type-btn="chub">Chub</button>
          <button type="button" class="pill-toggle__btn ${active('retail')}" data-type-btn="retail">Retail</button>
        </div>${REMOVE_BTN_HTML}
      </div>
      <div class="item-field">
        <label class="item-field__label" for="di-${id}-name">Item</label>
        <div class="store-search-wrap">
          <input type="text" class="form-input" id="di-${id}-name" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-fname="name" />
          <div class="store-suggestions hidden" role="listbox" aria-label="Item suggestions"></div>
        </div>
      </div>
      <div class="item-card__row">
        <div class="item-field">
          <label class="item-field__label" for="di-${id}-sellby">Sell-by date</label>
          <input type="date" class="form-input" id="di-${id}-sellby" data-fname="sellby" />
        </div>
        ${qtyFieldHTML()}
      </div>
      <div class="item-field">
        <label class="item-field__label" for="di-${id}-reason">Reason</label>
        <select class="form-select" id="di-${id}-reason" data-fname="reason">
          ${reasonOptions}
        </select>
      </div>
    </div>`;
}

/* Returns the items, or null if any required field is empty (fields get highlighted). */
export function collectDonationItems(listEl = donationList.el) {
  let valid = true;
  const items = [...listEl.children].map(itemEl => {
    const f      = (n) => itemEl.querySelector(`[data-fname="${n}"]`);
    const type   = itemEl.querySelector('.pill-toggle__btn--active')?.dataset.typeBtn || 'chub';
    const raw    = f('name').value.trim();
    const m      = raw.match(/^(\d+)\s+(.+)$/);   // "12345 Ham slices": only a leading number is a UPC
    if (!raw) valid = markInvalid(f('name'), 'Search for an item');
    if (!f('sellby').value) valid = markInvalid(f('sellby'), 'Pick a sell-by date');
    return {
      type:   type === 'chub' ? 'Chub' : 'Retail',
      upc:    m ? m[1] : '',
      name:   m ? m[2] : raw,
      qty:    parseInt(f('qty').value, 10) || 1,
      sellBy: f('sellby').value,
      reason: f('reason').value,
    };
  });
  return valid ? items : null;
}

function handleDonationSubmit(e) {
  e.preventDefault();
  const items = collectDonationItems();
  if (!items) { focusFirstInvalid($('donation-form')); return; }

  const employee = getName();
  submitForm({
    draftKey:    DONATION_DRAFT_KEY,
    endpoint:    '/api/submit-donation',
    payload:     { employee, notes: $('donation-notes').value.trim(), items, timestamp: new Date().toISOString() },
    btn:         $('donation-submit-btn'),
    type:        'Donation',
    histLabel:   `${employee} · ${plural(items.length, 'item')}`,
    formEl:      $('donation-form'),
    successEl:   $('donation-success-state'),
    summaryEl:   $('donation-success-summary'),
    data:        { items },
  });
}

export function initDonations() {
  donationList = createItemList({
    listId: 'donation-items-list',
    countId: 'donation-items-count',
    buildHTML: createDonationItemHTML,
    onType: (type) => localStorage.setItem(DONATION_LAST_TYPE_KEY, type),
  });
  const draft = loadDraft(DONATION_DRAFT_KEY);
  if (draft) {
    $('donation-notes').value = draft.notes || '';
    donationList.restore(draft.items || []);
  } else {
    donationList.add();
  }
  autosaveDraft(DONATION_DRAFT_KEY, $('donation-form'), () => ({
    notes: $('donation-notes').value,
    items: donationList.serialize(),
  }));

  donationList.el.addEventListener('change', (e) => {
    if (e.target.matches('[data-fname="reason"]')) localStorage.setItem(DONATION_LAST_REASON_KEY, e.target.value);
  });

  /* A new item starts with the previous item's sell-by date: one pile usually shares it */
  $('add-donation-item-btn').addEventListener('click', () => {
    const prev = donationList.el.lastElementChild?.querySelector('[data-fname="sellby"]').value;
    donationList.add();
    if (prev) donationList.el.lastElementChild.querySelector('[data-fname="sellby"]').value = prev;
    donationList.focusItem();
  });
  $('donation-form').addEventListener('submit', handleDonationSubmit);
  $('donation-submit-another-btn').addEventListener('click', () => {
    localStorage.removeItem(DONATION_DRAFT_KEY);
    $('donation-notes').value = '';
    donationList.reset();
    $('donation-success-state').classList.add('hidden');
    $('donation-form').classList.remove('hidden');
  });
}
