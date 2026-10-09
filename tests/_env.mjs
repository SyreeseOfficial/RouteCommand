/* Minimal browser stubs so js/*.js can be imported under node --test (no jsdom). Import this first. */
const noop = () => {};
export const fakeEl = (props = {}) => ({
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  setAttribute: noop, removeAttribute: noop, addEventListener: noop, removeEventListener: noop,
  insertAdjacentElement: noop, closest: () => null, parentElement: { matches: () => false },
  querySelector: () => null, querySelectorAll: () => [], ...props,
});

const store = new Map();
const def = (k, value) => Object.defineProperty(globalThis, k, { value, configurable: true, writable: true });
def('localStorage', {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
});
def('navigator', { onLine: true });
def('window', { addEventListener: noop, location: { pathname: '/' } });
def('document', {
  getElementById: () => fakeEl(), querySelectorAll: () => [], addEventListener: noop,
  createElement: () => fakeEl(),
});
globalThis.setInterval = () => 0;   // queue.js polls every 30 s; keep the test process able to exit
