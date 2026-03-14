import test from 'node:test';
import assert from 'node:assert/strict';

const state = await import('../js/state.js');

test('state setters/getters conservent les valeurs', () => {
  state.setExamStateValue('running');
  state.setIsLoading(true);
  state.setIsProgressInView(false);
  state.setIsTransitioning(true);
  state.setTimeRemaining(123);
  state.setTimerInterval(999);
  state.setAllQuestions([{ id: 1 }]);
  state.setSelectedQuestions([{ id: 2 }]);
  state.setAuthenticatedState(true);
  state.setLatestResultItems([{ ok: true }]);

  assert.equal(state.getExamState(), 'running');
  assert.equal(state.isLoading(), true);
  assert.equal(state.getIsProgressInView(), false);
  assert.equal(state.getIsTransitioning(), true);
  assert.equal(state.getTimeRemaining(), 123);
  assert.equal(state.getTimerInterval(), 999);
  assert.deepEqual(state.getAllQuestions(), [{ id: 1 }]);
  assert.deepEqual(state.getSelectedQuestions(), [{ id: 2 }]);
  assert.equal(state.isAuthenticatedState(), true);
  assert.deepEqual(state.getLatestResultItems(), [{ ok: true }]);
});
