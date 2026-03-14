import test from 'node:test';
import assert from 'node:assert/strict';

global.window = {
  localStorage: {
    store: new Map(),
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
    setItem(key, value) { this.store.set(key, String(value)); },
    removeItem(key) { this.store.delete(key); },
    clear() { this.store.clear(); },
  },
};

const storage = await import('../js/storage.js');

test('writeStoredAuthFlag et readStoredAuthFlag fonctionnent ensemble', () => {
  window.localStorage.clear();
  storage.writeStoredAuthFlag(true);
  assert.equal(storage.readStoredAuthFlag(), true);
  storage.clearStoredAuthFlag();
  assert.equal(storage.readStoredAuthFlag(), false);
});

test('saveAttemptHistory limite le nombre d’entrées', () => {
  window.localStorage.clear();
  const history = Array.from({ length: 20 }, (_, index) => ({ index }));
  storage.saveAttemptHistory(history);
  assert.equal(storage.getAttemptHistory().length, 12);
});
