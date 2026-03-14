import { EXAM_DURATION } from './constants.js';
import { introSection, resultsBadge, resultsCorrectCount, resultsFilter, resultsIncorrectCount, resultsInsight, resultsSection, resultsUnansweredCount, retryBtn, scorePara, submitBtn, timeUsedPara, correctionDiv, questionsContainer } from './dom.js';
import { renderDashboard } from './dashboard.js';
import { setLatestResultItems, setSelectedQuestions, setTimeRemaining, getSelectedQuestions, getExamState, setIsLoading, isLoading, setIsTransitioning, getIsTransitioning } from './state.js';
import { setTransitionLock, completeExamSubmission } from './transitions.js';

export async function loadQuestionsFromMultipleJson(getRandomQuestions) {
  try {
    const distribution = [
      { file: 'chapt1.json', count: 8 },
      { file: 'chapt2.json', count: 6 },
      { file: 'chapt3.json', count: 4 },
      { file: 'chapt4.json', count: 11 },
      { file: 'chapt5.json', count: 9 },
      { file: 'chapt6.json', count: 2 },
    ];

    const finalQuestions = [];

    for (const dist of distribution) {
      const response = await fetch(dist.file);
      if (!response.ok) {
        const errorMessage = `Échec du chargement du fichier ${dist.file} (statut ${response.status})`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      const data = await response.json();

      data.questions.forEach((question) => {
        if (!Object.prototype.hasOwnProperty.call(question, 'enonceFormat') && data.enonceFormat) {
          question.enonceFormat = data.enonceFormat;
        }
        if (data.chapterId) {
          question.chapterId = data.chapterId;
        }
        if (data.title) {
          question.chapterTitle = data.title;
        }
      });

      finalQuestions.push(...getRandomQuestions(data.questions, dist.count));
    }

    return finalQuestions;
  } catch (error) {
    console.error('Erreur lors du chargement des JSON :', error);
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`Impossible de charger les questions pour un chapitre : ${error.message}`);
    }
    return [];
  }
}

export async function startExam({
  clearTimer,
  displayQuestions,
  focusFirstQuestion,
  handleQuestionLoadFailure,
  loadQuestions,
  setExamState,
  startTimer,
  updateProgress,
  updateTimerDisplay,
}) {
  if (getExamState() === 'running' || isLoading()) {
    return;
  }

  setIsLoading(true);
  setIsTransitioning(false);
  setTransitionLock(false);
  setExamState('running');
  clearTimer();
  setTimeRemaining(EXAM_DURATION);
  updateTimerDisplay(EXAM_DURATION);

  try {
    setSelectedQuestions(await loadQuestions());
    if (getSelectedQuestions().length === 0) {
      handleQuestionLoadFailure();
      return;
    }

    if (getSelectedQuestions().length < 40) {
      console.warn('Le total de questions récupérées est inférieur à 40 !');
    }

    startTimer();
    displayQuestions(getSelectedQuestions());
    updateProgress();
    focusFirstQuestion();
  } finally {
    setIsLoading(false);
  }
}

export async function startExamCompletion({
  calculateScore,
  clearTimer,
  collectUserAnswers,
  completeSubmission = completeExamSubmission,
  getUserAnswer,
  setExamState,
  showResults,
}, options = {}) {
  const { requireConfirm = false, showTimeoutAlert = false } = options;

  if (getExamState() !== 'running' || getIsTransitioning()) {
    return;
  }

  if (requireConfirm) {
    let answeredCount = 0;
    getSelectedQuestions().forEach((question) => {
      if (getUserAnswer(question.questionId) !== -1) {
        answeredCount += 1;
      }
    });

    if (answeredCount < getSelectedQuestions().length) {
      const unanswered = getSelectedQuestions().length - answeredCount;
      const proceed = confirm(`Il reste ${unanswered} question${unanswered > 1 ? 's' : ''} non répondue${unanswered > 1 ? 's' : ''}. Soumettre l'examen malgré tout ?`);
      if (!proceed) {
        return;
      }
    }
  }

  if (showTimeoutAlert && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert("Temps écoulé ! L'examen se termine automatiquement.");
  }

  setIsTransitioning(true);
  clearTimer();
  setTransitionLock(true);

  const userAnswers = collectUserAnswers(getSelectedQuestions());
  const score = calculateScore(getSelectedQuestions(), userAnswers);

  try {
    await completeSubmission({ score, userAnswers, showResults, setExamState });
  } finally {
    setIsTransitioning(false);
    setTransitionLock(false);
  }
}

export function retryExam({ setExamState, updateProgress, updateTimerDisplay }) {
  setIsTransitioning(false);
  setTransitionLock(false);
  resultsSection.classList.add('hidden');
  scorePara.classList.remove('animate__animated', 'animate__tada', 'animate__shakeX');
  introSection.classList.remove('hidden');
  correctionDiv.innerHTML = '';
  questionsContainer.innerHTML = '';
  questionsContainer.style.minHeight = '';
  scorePara.textContent = '';
  timeUsedPara.textContent = '';
  setLatestResultItems([]);

  if (resultsBadge) {
    resultsBadge.textContent = '';
    resultsBadge.classList.remove('is-success', 'is-fail');
  }
  if (resultsInsight) {
    resultsInsight.innerHTML = '';
  }
  if (resultsCorrectCount) {
    resultsCorrectCount.textContent = '0';
  }
  if (resultsIncorrectCount) {
    resultsIncorrectCount.textContent = '0';
  }
  if (resultsUnansweredCount) {
    resultsUnansweredCount.textContent = '0';
  }
  if (resultsFilter) {
    resultsFilter.value = 'all';
  }

  submitBtn.style.display = 'none';
  retryBtn.style.display = 'none';
  submitBtn.disabled = false;
  setTimeRemaining(EXAM_DURATION);
  setExamState('idle');
  updateTimerDisplay(EXAM_DURATION);
  updateProgress();
  renderDashboard();
}
