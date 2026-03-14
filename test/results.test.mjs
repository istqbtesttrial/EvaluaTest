import test from 'node:test';
import assert from 'node:assert/strict';

function createClassList() {
  const set = new Set();
  return {
    add: (...items) => items.forEach((item) => set.add(item)),
    remove: (...items) => items.forEach((item) => set.delete(item)),
    toggle: (item, force) => {
      if (force === undefined) {
        if (set.has(item)) set.delete(item); else set.add(item);
      } else if (force) set.add(item); else set.delete(item);
    },
    contains: (item) => set.has(item),
  };
}

function createElement(tag = 'div') {
  return {
    tag,
    textContent: '',
    innerHTML: '',
    children: [],
    dataset: {},
    style: {},
    classList: createClassList(),
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
    focus() { this.focused = true; },
  };
}

const elements = {
  'results': createElement(),
  'results-badge': createElement(),
  'results-correct-count': createElement(),
  'results-incorrect-count': createElement(),
  'results-unanswered-count': createElement(),
  'results-insight': createElement(),
  'results-filter': { value: '', classList: createClassList() },
  'results-heading': createElement(),
  'retry-btn': { style: {}, classList: createClassList() },
  'score': createElement(),
  'time-used': createElement(),
  'correction': createElement(),
};

global.document = {
  getElementById(id) { return elements[id] ?? null; },
  querySelector() { return null; },
  createElement,
};

global.marked = { parse: (value) => `<p>${value}</p>` };
global.window = {};

global.Date = class extends Date {
  constructor(...args) {
    super(...(args.length ? args : ['2026-03-14T12:00:00.000Z']));
  }
  static now() { return new Date('2026-03-14T12:00:00.000Z').getTime(); }
};

const storageState = await import('../js/state.js');
const storage = await import('../js/storage.js');
window.localStorage = {
  store: new Map(),
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
  setItem(key, value) { this.store.set(key, String(value)); },
  removeItem(key) { this.store.delete(key); },
  clear() { this.store.clear(); },
};
await import('../js/dashboard.js');
const results = await import('../js/results.js');

test('showResults remplit le résumé et enregistre les résultats', () => {
  window.localStorage.clear();
  storageState.setTimeRemaining(3600);
  storageState.setSelectedQuestions([
    { questionId: 'q1', enonce: 'Q1', choices: ['A', 'B'], correctIndex: 0 },
    { questionId: 'q2', enonce: 'Q2', choices: ['A', 'B'], correctIndex: 1 },
  ]);

  results.showResults(1, { q1: 0, q2: -1 }, () => -1);

  assert.match(elements['score'].textContent, /1\/2/);
  assert.equal(elements['results-correct-count'].textContent, '1');
  assert.equal(elements['results-unanswered-count'].textContent, '1');
  assert.equal(elements['retry-btn'].style.display, 'inline-block');
  assert.equal(storage.getAttemptHistory().length, 1);
});

test('renderCorrections affiche un message vide quand le filtre ne retourne rien', () => {
  storageState.setLatestResultItems([]);
  results.renderCorrections('incorrect');
  assert.match(elements['correction'].innerHTML, /Aucune question/);
});
