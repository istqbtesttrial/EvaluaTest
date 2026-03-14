import test from 'node:test';
import assert from 'node:assert/strict';

global.document = {
  body: { classList: { toggle() {} } },
  getElementById() { return null; },
  querySelector() { return null; },
};

global.window = {
  alert() {},
  motion: null,
  scrollTo() {},
  pageYOffset: 0,
  scrollY: 0,
  matchMedia() { return { matches: false }; },
};

global.performance = { now: () => 0 };
global.requestAnimationFrame = (cb) => cb(0);

const { loadQuestionsFromMultipleJson } = await import('../js/exam.js');

test('loadQuestionsFromMultipleJson assemble les 40 questions attendues', async () => {
  const chapterPayload = (chapterId, count) => ({
    chapterId,
    title: `Chapitre ${chapterId}`,
    enonceFormat: 'markdown',
    questions: Array.from({ length: count }, (_, index) => ({
      questionId: `${chapterId}-${index + 1}`,
      enonce: `Q${index + 1}`,
      choices: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
    })),
  });

  const payloads = {
    'chapt1.json': chapterPayload(1, 8),
    'chapt2.json': chapterPayload(2, 6),
    'chapt3.json': chapterPayload(3, 4),
    'chapt4.json': chapterPayload(4, 11),
    'chapt5.json': chapterPayload(5, 9),
    'chapt6.json': chapterPayload(6, 2),
  };

  global.fetch = async (file) => ({
    ok: true,
    status: 200,
    async json() { return payloads[file]; },
  });

  const result = await loadQuestionsFromMultipleJson((questions, n) => questions.slice(0, n));
  assert.equal(result.length, 40);
  assert.equal(result.every((question) => question.chapterId && question.chapterTitle && question.enonceFormat), true);
});
