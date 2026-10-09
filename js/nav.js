/* Route Command — SPA view switching */

const sidebarNavItems  = document.querySelectorAll('.sidebar .nav-item[data-view]');
const bottomNavItems   = document.querySelectorAll('.bottom-nav .bottom-nav__item[data-view]');
const views            = document.querySelectorAll('.view');

export const VALID_VIEWS = new Set(['receipts', 'credits', 'donations', 'history', 'settings']);

export function navigateTo(viewId, updateHistory = true, moveFocus = true) {
  /* Hide all views */
  views.forEach(v => v.classList.remove('active'));

  /* Show target */
  const target = document.getElementById(`${viewId}-view`);
  if (target) target.classList.add('active');

  /* Sync sidebar active state */
  sidebarNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  /* Sync bottom nav active state */
  bottomNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  /* Title and focus for screen readers / keyboard users */
  document.title = `${viewId[0].toUpperCase()}${viewId.slice(1)} · Route Command`;
  const heading = target && target.querySelector('.view__title');
  if (heading && moveFocus) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  /* Scroll to top of new view */
  window.scrollTo(0, 0);

  /* Trigger scroll-based animations for the new view */
  observeAnimatables();

  /* Update browser URL */
  if (updateHistory) history.pushState(null, '', '/' + viewId);
}

/* Handle browser back / forward */
window.addEventListener('popstate', () => {
  const seg = window.location.pathname.slice(1);
  navigateTo(VALID_VIEWS.has(seg) ? seg : 'receipts', false);
});

/* "View in history" links on success screens */
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-goto-history]')) return;
  navigateTo('history');
});

/* Sidebar nav */
sidebarNavItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});

/* Bottom nav */
bottomNavItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});

let observer = null;

function observeAnimatables() {
  const animatables = document.querySelectorAll(
    '.stat-card:not(.visible), .form-card:not(.visible), .placeholder-card:not(.visible), .section-card:not(.visible), .view-copy-card:not(.visible)'
  );

  if (!animatables.length) return;

  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          /* Stagger each element slightly */
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  animatables.forEach(el => observer.observe(el));
}
