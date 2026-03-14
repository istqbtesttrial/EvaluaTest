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

const elements = {
  'progress-count': { textContent: '' },
  'progress-track': { attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } },
  'progress-bar': { style: {} },
  'progress-chip': { textContent: '', attrs: {}, classList: createClassList(), setAttribute(key, value) { this.attrs[key] = value; } },
  'submit-summary': { classList: createClassList() },
  'summary-answered': { textContent: '' },
  'summary-unanswered': { textContent: '' },
  'timer-container': { classList: createClassList(), attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } },
  'timer-display': { textContent: '', attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } },
  'questions-container': { querySelector() { return null; } },
};
const progressContainer = { classList: createClassList() };

global.document = {
  getElementById(id) { return elements[id] ?? null; },
  querySelector(selector) { return selector === '.exam-progress' ? progressContainer : null; },
};

global.window = {};

const state = await import('../js/state.js');
const timerUi = await import('../js/timer-ui.js');

test('updateTimerDisplay formate le timer et active le mode urgent', () => {
  timerUi.updateTimerDisplay(299);
  assert.equal(elements['timer-display'].textContent, '00:04:59');
  assert.equal(elements['timer-container'].classList.contains('is-urgent'), true);
});

test('updateProgress calcule le résumé des réponses', () => {
  state.setExamStateValue('running');
  state.setSelectedQuestions([{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }]);

  timerUi.updateProgress((questionId) => (questionId === 'q1' ? 1 : -1));

  assert.equal(elements['progress-count'].textContent, '1/3');
  assert.equal(elements['progress-bar'].style.width, '33%');
  assert.equal(elements['summary-answered'].textContent, 'Répondues : 1');
  assert.equal(elements['summary-unanswered'].textContent, 'Non répondues : 2');
});
