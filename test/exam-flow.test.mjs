import test from 'node:test';
import assert from 'node:assert/strict';

global.document = {
  body: { classList: { toggle() {} } },
  getElementById() { return null; },
  querySelector() { return null; },
};
global.window = { alert() {} };

const state = await import('../js/state.js');
const exam = await import('../js/exam.js');

test('startExam orchestre correctement le démarrage', async () => {
  state.setExamStateValue('idle');
  state.setIsLoading(false);
  const calls = [];

  await exam.startExam({
    clearTimer: () => calls.push('clearTimer'),
    displayQuestions: (questions) => calls.push(['displayQuestions', questions.length]),
    focusFirstQuestion: () => calls.push('focusFirstQuestion'),
    handleQuestionLoadFailure: () => calls.push('handleFailure'),
    loadQuestions: async () => Array.from({ length: 40 }, (_, i) => ({ questionId: `q${i}` })),
    setExamState: (value) => { calls.push(['setExamState', value]); state.setExamStateValue(value); },
    startTimer: () => calls.push('startTimer'),
    updateProgress: () => calls.push('updateProgress'),
    updateTimerDisplay: (value) => calls.push(['updateTimerDisplay', value]),
  });

  assert.deepEqual(calls[0], ['setExamState', 'running']);
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === 'displayQuestions' && entry[1] === 40));
  assert.ok(calls.includes('startTimer'));
  assert.equal(state.isLoading(), false);
});

test('startExamCompletion arrête le flux si confirmation refusée', async () => {
  state.setExamStateValue('running');
  state.setIsTransitioning(false);
  state.setSelectedQuestions([{ questionId: 'q1' }, { questionId: 'q2' }]);
  global.confirm = () => false;
  const calls = [];

  await exam.startExamCompletion({
    calculateScore: () => 0,
    clearTimer: () => calls.push('clearTimer'),
    collectUserAnswers: () => ({}),
    getUserAnswer: () => -1,
    setExamState: () => calls.push('setExamState'),
    showResults: () => calls.push('showResults'),
  }, { requireConfirm: true });

  assert.deepEqual(calls, []);
});
