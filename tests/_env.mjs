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

/* In-memory stand-in for the IndexedDB outbox (js/outbox.js useBackend) */
export function memoryBackend() {
  const rows = new Map(), meta = new Map();
  return {
    rows, meta,
    all: async () => [...rows.values()].map(r => ({ ...r })),
    get: async (id) => rows.has(id) ? { ...rows.get(id) } : undefined,
    put: async (rec) => void rows.set(rec.submissionId, { ...rec }),
    delete: async (id) => void rows.delete(id),
    clear: async () => { rows.clear(); meta.clear(); },
    getMeta: async (k) => meta.get(k),
    setMeta: async (k, v) => void meta.set(k, v),
  };
}
