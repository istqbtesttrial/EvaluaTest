import { validateCredentials } from './auth.js';
import { EXAM_DURATION } from './constants.js';
import {
  examHeading,
  examSection,
  introSection,
  loginBtn,
  loginError,
  loginForm,
  loginPassword,
  loginSection,
  loginUsername,
  logoutBtn,
  mainContainer,
  questionsContainer,
  rememberMeCheckbox,
  resultsFilter,
  resultsHeading,
  resultsSection,
  retryBtn,
  startBtn,
  submitBtn,
  submitSummary,
  timerContainer,
} from './dom.js';
import {
  clearStoredAuthFlag,
  readStoredAuthFlag,
  writeStoredAuthFlag,
} from './storage.js';
import { renderDashboard } from './dashboard.js';
import { renderCorrections, showResults } from './results.js';
import { displayQuestions } from './question-renderer.js';
import { loadQuestionsFromMultipleJson as loadQuestionsFromMultipleJsonModule, retryExam as retryExamFlow, startExam as startExamFlow, startExamCompletion as startExamCompletionFlow } from './exam.js';
import { collectUserAnswers, focusFirstQuestion, initProgressObserver, startTimer, updateProgress, updateProgressVisibility, updateTimerDisplay, updateTimerVisibility } from './timer-ui.js';
import { completeExamSubmission } from './transitions.js';
import {
  getExamState,
  getIsTransitioning,
  getSelectedQuestions,
  setAuthenticatedState,
  setExamStateValue,
  setTimeRemaining,
  setSelectedQuestions,
  isAuthenticatedState,
} from './state.js';

/********************************************
 * main.js
 * Fichier JavaScript principal pour EvaluaTest
 * (Examens blancs ISTQB V4 Foundation Level)
 ********************************************/


if (timerContainer) {
    timerContainer.setAttribute('aria-hidden', 'true');
}

setTimeRemaining(EXAM_DURATION);
let timerInterval; // alias legacy, now synced through state

/**
 * Variables globales :
 * - allQuestions (optionnel)
 * - selectedQuestions : le tableau final de 40 questions.
 */


/* ================================
    GESTION D'ÉTAT GLOBAL
   ================================ */
function isAuthenticated() {
    return isAuthenticatedState();
}

function setAuthenticated(value, options = {}) {
    const shouldRemember = Boolean(options.remember);
    setAuthenticatedState(Boolean(value));

    if (isAuthenticatedState() && shouldRemember) {
        writeStoredAuthFlag(true);
    } else {
        clearStoredAuthFlag();
    }
}

function syncAuthFromStorage() {
    setAuthenticatedState(readStoredAuthFlag());
}

function getInitialExamState() {
    if (!isAuthenticated()) {
        return 'locked';
    }
    if (resultsSection && !resultsSection.classList.contains('hidden')) {
        return 'results';
    }
    if (examSection && !examSection.classList.contains('hidden')) {
        return 'running';
    }
    return 'idle';
}

function setExamState(newState) {
    setExamStateValue(newState);
    applyExamState();
    updateTimerVisibility();
    updateProgressVisibility();
}

function applyExamState() {
    const isLocked = getExamState() === 'locked';
    const isIdle = getExamState() === 'idle';
    const isRunning = getExamState() === 'running';
    const isResults = getExamState() === 'results';

    if (loginSection) {
        loginSection.classList.toggle('hidden', !isLocked);
    }

    if (introSection) {
        introSection.classList.toggle('hidden', !isIdle);
    }

    if (examSection) {
        examSection.classList.toggle('hidden', !isRunning);
    }

    if (examHeading) {
        examHeading.classList.toggle('hidden', !isRunning);
    }

    if (submitBtn) {
        submitBtn.style.display = isRunning ? 'inline-block' : 'none';
    }

    if (resultsSection) {
        resultsSection.classList.toggle('hidden', !isResults);
        resultsSection.classList.toggle('mt-5', !isResults);
    }

    if (submitSummary) {
        submitSummary.classList.toggle('hidden', !isRunning);
    }

    if (loginBtn) {
        loginBtn.disabled = !isLocked && getIsTransitioning();
    }

    if (retryBtn) {
        retryBtn.style.display = isResults ? 'inline-block' : 'none';
    }

    if (mainContainer) {
        mainContainer.classList.toggle('results-visible', isResults);
    }
}

// -------------------------------
// Transition de fin d'examen
// -------------------------------
/**
 * Charge et assemble les questions depuis 6 fichiers JSON (ex : chapt1.json … chapt6.json)
 * La répartition est définie par le nombre de questions à tirer dans chaque fichier.
 *
 * Pour chaque fichier, on enrichit chaque question avec les informations du chapitre (enonceFormat,
 * chapterId et title). Cela fonctionne aussi bien avec l’ancien format (où questionId est un nombre)
 * qu’avec le nouveau format (où questionId est une chaîne, par exemple "6-1").
 */
function loadQuestionsFromMultipleJson() {
    return loadQuestionsFromMultipleJsonModule(getRandomQuestions);
}

/* ================================
    FONCTIONS PRINCIPALES
   ================================ */

/**
 * Démarre l'examen
 */
async function startExam() {
    return startExamFlow({
        clearTimer: () => clearInterval(timerInterval),
        displayQuestions,
        focusFirstQuestion,
        handleQuestionLoadFailure,
        loadQuestions: loadQuestionsFromMultipleJson,
        setExamState,
        startTimer: () => startTimer({ clearTimer: () => clearInterval(timerInterval), onTimesUp: () => startExamCompletion({ showTimeoutAlert: true }), updateTimerDisplay }),
        updateProgress: () => updateProgress(getUserAnswer),
        updateTimerDisplay,
    });
}

function handleQuestionLoadFailure() {
    clearInterval(timerInterval);
    setExamState('idle');
    setTimeRemaining(EXAM_DURATION);
    setSelectedQuestions([]);
    updateTimerDisplay(EXAM_DURATION);
    updateProgress(getUserAnswer);
}


function showLoginError(message) {
    if (!loginError) {
        return;
    }
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

function clearLoginError() {
    if (!loginError) {
        return;
    }
    loginError.textContent = '';
    loginError.classList.add('hidden');
}

function handleLogin(event) {
    event.preventDefault();

    const username = loginUsername ? loginUsername.value.trim() : '';
    const password = loginPassword ? loginPassword.value : '';
    const remember = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

    if (!username || !password) {
        showLoginError('Merci de renseigner le login et le mot de passe.');
        return;
    }

    if (validateCredentials(username, password)) {
        clearLoginError();
        setAuthenticated(true, { remember });
        if (loginPassword) {
            loginPassword.value = '';
        }
        setExamState('idle');
        return;
    }

    showLoginError('Login ou mot de passe incorrect.');
}

function handleLogout() {
    clearInterval(timerInterval);
    setAuthenticated(false);
    setSelectedQuestions([]);
    questionsContainer.innerHTML = '';
    questionsContainer.style.minHeight = '';
    correctionDiv.innerHTML = '';
    setTimeRemaining(EXAM_DURATION);
    updateTimerDisplay(EXAM_DURATION);
    updateProgress(getUserAnswer);
    if (loginUsername) {
        loginUsername.value = '';
    }
    if (loginPassword) {
        loginPassword.value = '';
    }
    if (rememberMeCheckbox) {
        rememberMeCheckbox.checked = false;
    }
    setExamState('locked');
}

/**
 * Affiche dynamiquement les questions dans le DOM.
 */

/**
 * Lance la transition de fin d'examen (animation + affichage des résultats).
 */
async function startExamCompletion(options = {}) {
    return startExamCompletionFlow({
        calculateScore,
        clearTimer: () => clearInterval(timerInterval),
        collectUserAnswers: (questions) => collectUserAnswers(questions, getUserAnswer),
        completeSubmission: completeExamSubmission,
        getUserAnswer,
        setExamState,
        showResults: (score, userAnswers) => showResults(score, userAnswers, getUserAnswer),
    }, options);
}

/**
 * Gère le clic sur le bouton de soumission.
 */
function handleSubmitClick() {
    startExamCompletion({ requireConfirm: true });
}

/**
 * Affiche les résultats (score global et détail question par question)
 */
function retryExam() {
    return retryExamFlow({
        setExamState,
        updateProgress: () => updateProgress(getUserAnswer),
        updateTimerDisplay,
    });
}

/* ================================
    FONCTIONS TIMER
   ================================ */
syncAuthFromStorage();
setExamStateValue(getInitialExamState());
applyExamState();
updateTimerVisibility();
updateProgress(getUserAnswer);
updateProgressVisibility();
initProgressObserver();
clearLoginError();
renderDashboard();

/* ================================
    GESTION DES ÉVÉNEMENTS
   ================================ */
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

if (loginUsername) {
    loginUsername.addEventListener('input', clearLoginError);
}

if (loginPassword) {
    loginPassword.addEventListener('input', clearLoginError);
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

if (resultsFilter) {
    resultsFilter.addEventListener('change', (event) => {
        renderCorrections(event.target.value, getUserAnswer);
    });
}

window.addEventListener('pageshow', () => {
    syncAuthFromStorage();
    if (!isAuthenticated()) {
        setExamState('locked');
    }
});

startBtn.addEventListener('click', startExam);
submitBtn.addEventListener('click', handleSubmitClick);
retryBtn.addEventListener('click', retryExam);
questionsContainer.addEventListener('change', (event) => {
    if (event.target.matches('input[type="radio"]')) {
        const currentLabel = event.target.closest('label');
        const questionBlock = event.target.closest('.question-block');
        if (questionBlock) {
            questionBlock.querySelectorAll('.choice-label.is-selected').forEach((label) => {
                label.classList.remove('is-selected');
            });
        }
        if (currentLabel) {
            currentLabel.classList.add('is-selected');
        }
        updateProgress(getUserAnswer);
    }
});
