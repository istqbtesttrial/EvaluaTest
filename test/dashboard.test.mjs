import test from 'node:test';
import assert from 'node:assert/strict';

function createClassList() {
  const set = new Set();
  return {
    add: (...items) => items.forEach((item) => set.add(item)),
    remove: (...items) => items.forEach((item) => set.delete(item)),
    contains: (item) => set.has(item),
  };
}

const elements = {
  'dashboard-last-score': { textContent: '' },
  'dashboard-best-score': { textContent: '' },
  'dashboard-attempts': { textContent: '' },
  'dashboard-average-time': { textContent: '' },
  'history-panel': { classList: createClassList() },
  'history-list': { innerHTML: '' },
};

global.document = {
  getElementById(id) { return elements[id] ?? null; },
  querySelector() { return null; },
};

global.window = {
  localStorage: {
    store: new Map(),
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
    setItem(key, value) { this.store.set(key, String(value)); },
    removeItem(key) { this.store.delete(key); },
    clear() { this.store.clear(); },
  },
};

const dashboard = await import('../js/dashboard.js');
const storage = await import('../js/storage.js');

test('formatDuration formate correctement les durées', () => {
  assert.equal(dashboard.formatDuration(0), '-');
  assert.equal(dashboard.formatDuration(65), '1m05s');
});

test('renderDashboard affiche les statistiques et l’historique', () => {
  window.localStorage.clear();
  storage.saveAttemptHistory([
    { score: 28, totalQuestions: 40, percent: 70, timeUsedSec: 1200, unansweredCount: 1, takenAt: '2026-03-14T10:00:00.000Z' },
    { score: 30, totalQuestions: 40, percent: 75, timeUsedSec: 1500, unansweredCount: 0, takenAt: '2026-03-13T10:00:00.000Z' },
  ]);

  dashboard.renderDashboard();

  assert.equal(elements['dashboard-last-score'].textContent, '28/40');
  assert.equal(elements['dashboard-best-score'].textContent, '30/40');
  assert.equal(elements['dashboard-attempts'].textContent, '2');
  assert.equal(elements['dashboard-average-time'].textContent, '22m30s');
  assert.equal(elements['history-panel'].classList.contains('hidden'), false);
  assert.match(elements['history-list'].innerHTML, /28\/40/);
  assert.match(elements['history-list'].innerHTML, /30\/40/);
});
