const test = require('node:test');
const assert = require('node:assert/strict');

const {
  shuffleArray,
  getRandomQuestions,
  calculateScore,
  getUserAnswer,
  selectQuestionsByChapter,
} = require('../js/utils.js');

test('shuffleArray conserve tous les éléments et modifie le tableau sur place', () => {
  const original = [1, 2, 3, 4, 5];
  const reference = original;
  const shuffled = shuffleArray(original);

  assert.strictEqual(shuffled, reference);
  assert.deepStrictEqual([...shuffled].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test('getRandomQuestions retourne exactement n questions sans modifier la source', () => {
  const questions = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const clone = JSON.parse(JSON.stringify(questions));

  const result = getRandomQuestions(questions, 2);

  assert.equal(result.length, 2);
  assert.deepStrictEqual(questions, clone);
  for (const item of result) {
    assert.ok(questions.some((question) => question.id === item.id));
  }
});

test('calculateScore compte correctement les bonnes réponses via userAnswersMap', () => {
  const selectedQuestions = [
    { questionId: '1-1', correctIndex: 1 },
    { questionId: '1-2', correctIndex: 0 },
    { questionId: '1-3', correctIndex: 2 },
  ];
  const userAnswersMap = {
    '1-1': 1,
    '1-2': 3,
    '1-3': 2,
  };

  const score = calculateScore(selectedQuestions, userAnswersMap);
  assert.equal(score, 2);
});

test('getUserAnswer retourne la valeur cochée dans le DOM simulé', () => {
  global.document = {
    getElementsByName(name) {
      assert.equal(name, 'question-demo');
      return [
        { checked: false, value: '0' },
        { checked: true, value: '2' },
        { checked: false, value: '1' },
      ];
    },
  };

  const answer = getUserAnswer('demo');
  assert.equal(answer, 2);

  delete global.document;
});

test('getUserAnswer retourne -1 quand aucune réponse n’est cochée', () => {
  global.document = {
    getElementsByName() {
      return [
        { checked: false, value: '0' },
        { checked: false, value: '1' },
      ];
    },
  };

  const answer = getUserAnswer('demo');
  assert.equal(answer, -1);

  delete global.document;
});

test('selectQuestionsByChapter respecte la distribution par chapitre', () => {
  const chapters = [
    {
      title: 'Chapitre 1',
      questions: [{ id: '1a' }, { id: '1b' }, { id: '1c' }],
    },
    {
      title: 'Chapitre 2',
      questions: [{ id: '2a' }, { id: '2b' }],
    },
  ];
  const distribution = {
    'Chapitre 1': 2,
    'Chapitre 2': 1,
  };

  const selected = selectQuestionsByChapter(chapters, distribution);

  assert.equal(selected.length, 3);
  assert.equal(selected.filter((item) => item.id.startsWith('1')).length, 2);
  assert.equal(selected.filter((item) => item.id.startsWith('2')).length, 1);
});
