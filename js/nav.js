/* Route Command — SPA view switching */
import { resetSuccess } from './util.js';

const sidebarNavItems  = document.querySelectorAll('.sidebar .nav-item[data-view]');
const bottomNavItems   = document.querySelectorAll('.bottom-nav .bottom-nav__item[data-view]');
const views            = document.querySelectorAll('.view');

export const VALID_VIEWS = new Set(['receipts', 'credits', 'donations', 'history', 'settings']);

export function navigateTo(viewId, updateHistory = true, moveFocus = true) {
  /* Hide all views; a confirmation left behind in the one being left goes back to a fresh form */
  views.forEach(v => {
    if (v.classList.contains('active') && v.id !== `${viewId}-view`) v.querySelectorAll('.success-state').forEach(resetSuccess);
    v.classList.remove('active');
  });

  /* Show target */
  const target = document.getElementById(`${viewId}-view`);
  if (target) target.classList.add('active');

  /* Sync sidebar and bottom nav active state */
  [...sidebarNavItems, ...bottomNavItems].forEach(item => {
    const on = item.dataset.view === viewId;
    item.classList.toggle('active', on);
    if (on) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
  });

  /* Title and focus for screen readers / keyboard users */
  document.title = `${viewId[0].toUpperCase()}${viewId.slice(1)} · Route Command`;
  const heading = target && target.querySelector('.view__title');
  if (heading && moveFocus) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  /* Scroll to top of new view */
  window.scrollTo({ top: 0, behavior: 'instant' });

  /* Update browser URL. Tabs are peers, not drill-downs: replace, so Back leaves the app instead of walking every tab visited */
  if (updateHistory) history.replaceState(null, '', '/' + viewId);
}

/* Handle browser back / forward */
window.addEventListener('popstate', () => {
  const seg = window.location.pathname.slice(1);
  navigateTo(VALID_VIEWS.has(seg) ? seg : 'receipts', false);
});

/* "View in history" links on success screens, and the name button in the header */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-goto-history]')) navigateTo('history');
  else if (e.target.closest('[data-goto-settings]')) navigateTo('settings');
});

/* Sidebar nav */
sidebarNavItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});

/* Bottom nav */
bottomNavItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});
