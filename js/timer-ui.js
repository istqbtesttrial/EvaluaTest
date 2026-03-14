import { URGENT_THRESHOLD } from './constants.js';
import { progressBar, progressChip, progressContainer, progressCount, progressTrack, questionsContainer, submitSummary, summaryAnswered, summaryUnanswered, timerContainer, timerDisplay } from './dom.js';
import { getExamState, getIsProgressInView, getSelectedQuestions, getTimeRemaining, setIsProgressInView, setProgressObserver, setTimeRemaining, setTimerInterval } from './state.js';

export function collectUserAnswers(questions, getUserAnswer) {
  const answers = {};
  questions.forEach((question) => {
    answers[question.questionId] = getUserAnswer(question.questionId);
  });
  return answers;
}

export function startTimer({ clearTimer, onTimesUp, updateTimerDisplay }) {
  updateTimerDisplay(getTimeRemaining());
  const intervalId = setInterval(() => {
    setTimeRemaining(getTimeRemaining() - 1);
    updateTimerDisplay(getTimeRemaining());
    if (getTimeRemaining() <= 0) {
      clearTimer();
      onTimesUp();
    }
  }, 1000);
  setTimerInterval(intervalId);
  return intervalId;
}

export function updateTimerDisplay(seconds) {
  if (!timerDisplay) {
    return;
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  timerDisplay.textContent = `${hh}:${mm}:${ss}`;
  timerDisplay.setAttribute('aria-label', `Temps restant ${hh} heures, ${mm} minutes et ${ss} secondes`);

  if (timerContainer) {
    const isUrgent = seconds > 0 && seconds <= URGENT_THRESHOLD;
    timerContainer.classList.toggle('is-urgent', isUrgent);
  }
}

export function updateTimerVisibility() {
  if (!timerContainer) {
    return;
  }
  const shouldShowTimer = getExamState() === 'running';
  timerContainer.classList.toggle('hidden', !shouldShowTimer);
  timerContainer.classList.toggle('is-hidden', !shouldShowTimer);
  timerContainer.setAttribute('aria-hidden', shouldShowTimer ? 'false' : 'true');
}

export function updateProgress(getUserAnswer) {
  if (!progressCount || !progressTrack || !progressBar) {
    return;
  }

  const total = getSelectedQuestions().length;
  const answeredCount = getSelectedQuestions().reduce((count, question) => (
    getUserAnswer(question.questionId) !== -1 ? count + 1 : count
  ), 0);
  const unansweredCount = Math.max(total - answeredCount, 0);
  const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  progressCount.textContent = `${answeredCount}/${total}`;
  progressTrack.setAttribute('aria-valuemax', total.toString());
  progressTrack.setAttribute('aria-valuenow', answeredCount.toString());
  progressBar.style.width = `${percent}%`;

  if (progressChip) {
    progressChip.textContent = `${answeredCount}/${total}`;
    progressChip.setAttribute('aria-label', `Progression ${answeredCount} sur ${total}`);
  }

  if (submitSummary) {
    submitSummary.classList.toggle('hidden', !(getExamState() === 'running' && total > 0));
  }
  if (summaryAnswered) {
    summaryAnswered.textContent = `Répondues : ${answeredCount}`;
  }
  if (summaryUnanswered) {
    summaryUnanswered.textContent = `Non répondues : ${unansweredCount}`;
  }
}

export function updateProgressVisibility() {
  const isRunning = getExamState() === 'running';
  const showBar = isRunning && getIsProgressInView();

  if (progressContainer) {
    progressContainer.classList.toggle('is-collapsed', !showBar);
  }
  if (progressChip) {
    const showChip = isRunning && !getIsProgressInView();
    progressChip.classList.toggle('is-visible', showChip);
    progressChip.setAttribute('aria-hidden', showChip ? 'false' : 'true');
  }
}

export function initProgressObserver() {
  if (!progressContainer || !('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target !== progressContainer) {
        return;
      }
      setIsProgressInView(entry.isIntersecting && entry.intersectionRatio >= 0.2);
      updateProgressVisibility();
    });
  }, { threshold: [0, 0.2, 1] });

  observer.observe(progressContainer);
  setProgressObserver(observer);
}

export function focusFirstQuestion() {
  const firstQuestion = questionsContainer.querySelector('.question-block');
  if (firstQuestion) {
    firstQuestion.focus({ preventScroll: false });
  }
}
