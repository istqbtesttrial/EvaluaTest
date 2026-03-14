/********************************************
 * main.js
 * Fichier JavaScript principal pour EvaluaTest
 * (Examens blancs ISTQB V4 Foundation Level)
 ********************************************/

/* --- Sélection des éléments HTML --- */
const startBtn = document.getElementById('start-btn');
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const rememberMeCheckbox = document.getElementById('remember-me');
const introSection = document.getElementById('intro');
const logoutBtn = document.getElementById('logout-btn');
const dashboardLastScore = document.getElementById('dashboard-last-score');
const dashboardBestScore = document.getElementById('dashboard-best-score');
const dashboardAttempts = document.getElementById('dashboard-attempts');
const dashboardAverageTime = document.getElementById('dashboard-average-time');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const examSection = document.getElementById('exam');
const questionsContainer = document.getElementById('questions-container');
const submitBtn = document.getElementById('submit-btn');
const examHeading = document.getElementById('exam-heading');
const mainContainer = document.querySelector('main');
const resultsSection = document.getElementById('results');
const scorePara = document.getElementById('score');
const correctionDiv = document.getElementById('correction');
const retryBtn = document.getElementById('retry-btn');
const timerDisplay = document.getElementById('timer-display');
const timerContainer = document.getElementById('timer-container');
const timeUsedPara = document.getElementById('time-used');
const resultsHeading = document.getElementById('results-heading');
const resultsBadge = document.getElementById('results-badge');
const progressCount = document.getElementById('progress-count');
const progressTrack = document.getElementById('progress-track');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.querySelector('.exam-progress');
const progressChip = document.getElementById('progress-chip');
const submitSummary = document.getElementById('submit-summary');
const summaryAnswered = document.getElementById('summary-answered');
const summaryUnanswered = document.getElementById('summary-unanswered');
const resultsCorrectCount = document.getElementById('results-correct-count');
const resultsIncorrectCount = document.getElementById('results-incorrect-count');
const resultsUnansweredCount = document.getElementById('results-unanswered-count');
const resultsInsight = document.getElementById('results-insight');
const resultsFilter = document.getElementById('results-filter');
let examState = 'idle';
let isLoadingQuestions = false;
let progressObserver;
let isProgressInView = true;
let isTransitioning = false;

if (timerContainer) {
    timerContainer.setAttribute('aria-hidden', 'true');
}


/* --- Timer (1h15) --- */
const EXAM_DURATION = 75 * 60; // durée totale de l'examen en secondes (75 min)
const URGENT_THRESHOLD = 5 * 60; // seuil d'urgence (5 min)
let timeRemaining = EXAM_DURATION; // temps restant en secondes
let timerInterval; // pour stocker l'intervalle
const EXIT_TOTAL_DURATION_MS = 1800;
const EXIT_CARD_DURATION_MIN = 60;
const EXIT_CARD_DURATION_MAX = 200;
const EXIT_FINAL_SCROLL_MS = 260;

/**
 * Variables globales :
 * - allQuestions (optionnel)
 * - selectedQuestions : le tableau final de 40 questions.
 */
let allQuestions = [];
let selectedQuestions = [];

const AUTH_STORAGE_KEY = 'evaluatest-authenticated';
const ATTEMPT_HISTORY_KEY = 'evaluatest-attempt-history';
const MAX_HISTORY_ITEMS = 12;
let isUserAuthenticated = false;
let latestResultItems = [];
const APP_CREDENTIALS = {
    username: 'joe',
    password: 'admin'
};

/* ================================
    GESTION D'ÉTAT GLOBAL
   ================================ */
function isAuthenticated() {
    return isUserAuthenticated;
}

function setAuthenticated(value, options = {}) {
    const shouldRemember = Boolean(options.remember);
    isUserAuthenticated = Boolean(value);

    if (isUserAuthenticated && shouldRemember) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}

function syncAuthFromStorage() {
    isUserAuthenticated = window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
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
    examState = newState;
    applyExamState();
    updateTimerVisibility();
    updateProgressVisibility();
}

function applyExamState() {
    const isLocked = examState === 'locked';
    const isIdle = examState === 'idle';
    const isRunning = examState === 'running';
    const isResults = examState === 'results';

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
        loginBtn.disabled = !isLocked && isTransitioning;
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
function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setTransitionLock(isLocked) {
    document.body.classList.toggle('is-transitioning', isLocked);
    if (submitBtn) {
        submitBtn.disabled = isLocked;
    }
    if (questionsContainer) {
        const inputs = questionsContainer.querySelectorAll('input, select, textarea, button');
        inputs.forEach((input) => {
            input.disabled = isLocked;
        });
    }
}

function getRandomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomSign() {
    return Math.random() < 0.5 ? -1 : 1;
}

function getRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function animateElement(target, keyframes, options) {
    if (window.motion && typeof window.motion.animate === 'function') {
        return window.motion.animate(target, keyframes, options);
    }
    return target.animate(keyframes, options);
}

function buildExitAnimation(card) {
    const rotate = getRandomBetween(6, 14) * getRandomSign();
    const translateX = getRandomBetween(24, 60) * getRandomSign();
    const translateY = getRandomBetween(12, 26);
    const flipAxis = getRandomItem(['X', 'Y']);
    const flipAngle = getRandomBetween(45, 70) * getRandomSign();

    const variants = [
        {
            keyframes: [
                { opacity: 1, transform: 'translateY(0) scale(1) rotate(0deg)' },
                { opacity: 0, transform: `translateY(${translateY / 2}px) scale(0.75) rotate(${rotate}deg)` }
            ],
            easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)'
        },
        {
            keyframes: [
                { opacity: 1, transform: 'translateX(0) rotate(0deg)' },
                { opacity: 0, transform: `translateX(${translateX}px) rotate(${rotate}deg)` }
            ],
            easing: 'cubic-bezier(0.3, 0.8, 0.35, 1)'
        },
        {
            keyframes: [
                { opacity: 1, transform: 'scale(1) rotate(0deg)', offset: 0 },
                { opacity: 1, transform: `scale(1.08) rotate(${rotate / 2}deg)`, offset: 0.4 },
                { opacity: 0, transform: `scale(0.6) rotate(${rotate}deg)`, offset: 1 }
            ],
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        },
        {
            keyframes: [
                { opacity: 1, transform: 'translateY(0) scale(1)' },
                { opacity: 0, transform: `translateY(${translateY}px) scale(0.92) rotate(${rotate}deg)` }
            ],
            easing: 'cubic-bezier(0.25, 0.7, 0.35, 1)'
        },
        {
            keyframes: [
                { opacity: 1, transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)' },
                { opacity: 0, transform: `perspective(800px) rotate${flipAxis}(${flipAngle}deg) scale(0.9)` }
            ],
            easing: 'cubic-bezier(0.2, 0.85, 0.35, 1)'
        }
    ];

    return getRandomItem(variants);
}

function easeInOutSine(progress) {
    return 0.5 - Math.cos(progress * Math.PI) / 2;
}

async function runQuestionExitTransition(cards) {
    if (!cards.length) {
        return;
    }

    if (questionsContainer) {
        questionsContainer.style.minHeight = `${questionsContainer.offsetHeight}px`;
    }

    const totalDuration = EXIT_TOTAL_DURATION_MS;
    const cardCount = cards.length;
    const baseDuration = totalDuration / cardCount;
    const cardDuration = clampValue(baseDuration, EXIT_CARD_DURATION_MIN, EXIT_CARD_DURATION_MAX);
    const cardStagger = cardCount > 1 ? (totalDuration - cardDuration) / (cardCount - 1) : totalDuration;
    const startScroll = window.scrollY || window.pageYOffset;

    const animationItems = cards.map((card, index) => {
        const { keyframes, easing } = buildExitAnimation(card);
        card.style.willChange = 'transform, opacity';
        card.style.pointerEvents = 'none';

        const animation = animateElement(card, keyframes, {
            duration: cardDuration,
            easing,
            fill: 'forwards'
        });
        animation.pause();

        return {
            card,
            animation,
            startTime: index * cardStagger,
            done: false
        };
    });

    return new Promise((resolve) => {
        const timelineStart = performance.now();

        function step(now) {
            const elapsed = now - timelineStart;
            const progress = clampValue(elapsed / totalDuration, 0, 1);
            const eased = easeInOutSine(progress);

            window.scrollTo(0, startScroll * (1 - eased));

            animationItems.forEach((item) => {
                const localElapsed = elapsed - item.startTime;
                const localProgress = clampValue(localElapsed / cardDuration, 0, 1);
                item.animation.currentTime = localProgress * cardDuration;
                if (localProgress >= 1 && !item.done) {
                    item.card.style.display = 'none';
                    item.done = true;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                window.scrollTo(0, 0);
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

function finalizeScrollToTop() {
    const reducedMotion = prefersReducedMotion();
    if (reducedMotion) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        return Promise.resolve();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    return new Promise((resolve) => {
        const startTime = performance.now();

        function verifyPosition(now) {
            if (window.scrollY === 0) {
                resolve();
                return;
            }

            if (now - startTime >= EXIT_FINAL_SCROLL_MS) {
                window.scrollTo({ top: 0, behavior: 'auto' });
                resolve();
                return;
            }

            requestAnimationFrame(verifyPosition);
        }

        requestAnimationFrame(verifyPosition);
    });
}

async function completeExamSubmission({ score, userAnswers }) {
    const cards = Array.from(questionsContainer.querySelectorAll('.question-block'));
    const reducedMotion = prefersReducedMotion();

    if (reducedMotion) {
        cards.forEach((card) => {
            card.style.opacity = '0';
            card.style.transform = 'none';
            card.style.display = 'none';
        });
        setExamState('results');
        showResults(score, userAnswers);
        await finalizeScrollToTop();
        questionsContainer.innerHTML = "";
        questionsContainer.style.minHeight = "";
        return;
    }

    await runQuestionExitTransition(cards);
    setExamState('results');
    showResults(score, userAnswers);
    await finalizeScrollToTop();

    questionsContainer.innerHTML = "";
    questionsContainer.style.minHeight = "";
}

/**
 * Charge et assemble les questions depuis 6 fichiers JSON (ex : chapt1.json … chapt6.json)
 * La répartition est définie par le nombre de questions à tirer dans chaque fichier.
 *
 * Pour chaque fichier, on enrichit chaque question avec les informations du chapitre (enonceFormat,
 * chapterId et title). Cela fonctionne aussi bien avec l’ancien format (où questionId est un nombre)
 * qu’avec le nouveau format (où questionId est une chaîne, par exemple "6-1").
 */
async function loadQuestionsFromMultipleJson() {
    try {
        // Répartition des fichiers et nombre de questions
        const distribution = [
            { file: 'chapt1.json', count: 8 },
            { file: 'chapt2.json', count: 6 },
            { file: 'chapt3.json', count: 4 },
            { file: 'chapt4.json', count: 11 },
            { file: 'chapt5.json', count: 9 },
            { file: 'chapt6.json', count: 2 },
        ];

        let finalQuestions = [];

        for (const dist of distribution) {
            const response = await fetch(dist.file);
            if (!response.ok) {
                const errorMessage = `Échec du chargement du fichier ${dist.file} (statut ${response.status})`;
                console.error(errorMessage);
                throw new Error(errorMessage);
            }
            const data = await response.json();

            // Pour chaque question, on complète avec les infos du chapitre si disponibles.
            data.questions.forEach(q => {
                if (!q.hasOwnProperty('enonceFormat') && data.enonceFormat) {
                    q.enonceFormat = data.enonceFormat;
                }
                if (data.chapterId) {
                    q.chapterId = data.chapterId;
                }
                if (data.title) {
                    q.chapterTitle = data.title;
                }
            });

            // Sélectionner aléatoirement le nombre de questions demandé
            const subset = getRandomQuestions(data.questions, dist.count);
            finalQuestions.push(...subset);
        }

        // On doit obtenir 40 questions
        return finalQuestions;
    } catch (error) {
        console.error("Erreur lors du chargement des JSON :", error);
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert(`Impossible de charger les questions pour un chapitre : ${error.message}`);
        }
        return [];
    }
}

/* ================================
    FONCTIONS PRINCIPALES
   ================================ */

/**
 * Démarre l'examen
 */
async function startExam() {
    if (examState === 'running' || isLoadingQuestions) {
        return;
    }

    isLoadingQuestions = true;
    isTransitioning = false;
    setTransitionLock(false);
    setExamState('running');
    clearInterval(timerInterval);
    timeRemaining = EXAM_DURATION;
    updateTimerDisplay(timeRemaining);

    try {
        selectedQuestions = await loadQuestionsFromMultipleJson();
        if (selectedQuestions.length === 0) {
            handleQuestionLoadFailure();
            return;
        }

        if (selectedQuestions.length < 40) {
            console.warn("Le total de questions récupérées est inférieur à 40 !");
        }

        startTimer();
        displayQuestions(selectedQuestions);
        updateProgress();
        focusFirstQuestion();
    } finally {
        isLoadingQuestions = false;
    }
}

function handleQuestionLoadFailure() {
    clearInterval(timerInterval);
    setExamState('idle');
    timeRemaining = EXAM_DURATION;
    selectedQuestions = [];
    updateTimerDisplay(EXAM_DURATION);
    updateProgress();
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '-';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds.toString().padStart(2, '0')}s`;
}

function getAttemptHistory() {
    try {
        const raw = window.localStorage.getItem(ATTEMPT_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Impossible de lire l’historique des tentatives.', error);
        return [];
    }
}

function saveAttemptHistory(history) {
    window.localStorage.setItem(ATTEMPT_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
}

function recordAttempt({ score, totalQuestions, percent, timeUsedSec, unansweredCount }) {
    const history = getAttemptHistory();
    history.unshift({
        score,
        totalQuestions,
        percent,
        timeUsedSec,
        unansweredCount,
        takenAt: new Date().toISOString()
    });
    saveAttemptHistory(history);
    renderDashboard();
}

function renderDashboard() {
    const history = getAttemptHistory();
    const lastAttempt = history[0];
    const bestAttempt = history.reduce((best, attempt) => {
        if (!best) {
            return attempt;
        }
        return attempt.percent > best.percent ? attempt : best;
    }, null);
    const averageTime = history.length
        ? Math.round(history.reduce((sum, attempt) => sum + (attempt.timeUsedSec || 0), 0) / history.length)
        : 0;

    if (dashboardLastScore) {
        dashboardLastScore.textContent = lastAttempt ? `${lastAttempt.score}/${lastAttempt.totalQuestions}` : '-';
    }
    if (dashboardBestScore) {
        dashboardBestScore.textContent = bestAttempt ? `${bestAttempt.score}/${bestAttempt.totalQuestions}` : '-';
    }
    if (dashboardAttempts) {
        dashboardAttempts.textContent = `${history.length}`;
    }
    if (dashboardAverageTime) {
        dashboardAverageTime.textContent = history.length ? formatDuration(averageTime) : '-';
    }

    if (!historyPanel || !historyList) {
        return;
    }

    if (!history.length) {
        historyPanel.classList.add('hidden');
        historyList.innerHTML = '';
        return;
    }

    historyPanel.classList.remove('hidden');
    historyList.innerHTML = history.slice(0, 5).map((attempt, index) => {
        const date = new Date(attempt.takenAt);
        const readableDate = Number.isNaN(date.getTime()) ? 'Session récente' : date.toLocaleString('fr-FR');
        return `
            <article class="history-item ${index === 0 ? 'is-latest' : ''}">
                <div>
                    <strong>${attempt.score}/${attempt.totalQuestions}</strong>
                    <span>${attempt.percent.toFixed(2)}%</span>
                </div>
                <div>
                    <small>${readableDate}</small>
                    <small>${formatDuration(attempt.timeUsedSec)} · ${attempt.unansweredCount} non-répondues</small>
                </div>
            </article>
        `;
    }).join('');
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

    if (username === APP_CREDENTIALS.username && password === APP_CREDENTIALS.password) {
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
    selectedQuestions = [];
    questionsContainer.innerHTML = '';
    questionsContainer.style.minHeight = '';
    correctionDiv.innerHTML = '';
    timeRemaining = EXAM_DURATION;
    updateTimerDisplay(EXAM_DURATION);
    updateProgress();
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
function displayQuestions(questions) {
    questionsContainer.innerHTML = "";

    questions.forEach((q, index) => {
        const questionDiv = document.createElement('fieldset');
        questionDiv.classList.add('question-block');
        questionDiv.setAttribute('role', 'group');
        questionDiv.setAttribute('aria-labelledby', `question-title-${index + 1}`);
        questionDiv.tabIndex = -1;

        const legend = document.createElement('legend');
        legend.id = `question-title-${index + 1}`;
        legend.textContent = `Question ${index + 1} :`;
        questionDiv.appendChild(legend);

        // Animation AOS (alternance fade-right / fade-left)
        const aosEffect = (index % 2 === 0) ? "fade-right" : "fade-left";
        questionDiv.setAttribute("data-aos", aosEffect);
        questionDiv.setAttribute("data-aos-duration", "600");

        // Création du conteneur pour le contenu de la question
        const questionContent = document.createElement('div');
        questionContent.classList.add('question-content');

        if (q.enonceFormat && q.enonceFormat === "markdown") {
            questionContent.innerHTML = marked.parse(q.enonce);
        } else {
            const questionText = document.createElement('p');
            questionText.textContent = q.enonce;
            questionContent.appendChild(questionText);
        }

        // -------------------------------
        // Conversion des tableaux Markdown en JSTable avec gestion améliorée
        // -------------------------------
        const markdownTables = questionContent.querySelectorAll('table');
        markdownTables.forEach((table, tableIndex) => {
            const containerId = `table-${q.questionId}-${tableIndex}`;
            const tableContainer = document.createElement('table');
            tableContainer.id = containerId;
            table.replaceWith(tableContainer);

            // Extraction des en-têtes avec gestion des retours chariot
            let headers = Array.from(table.querySelectorAll('th')).map(th =>
                th.textContent.trim().replace(/\n/g, ' ')
            );
            if (headers.length === 0) {
                const firstRow = table.querySelector('tr');
                if (firstRow) {
                    headers = Array.from(firstRow.querySelectorAll('td')).map(td =>
                        td.textContent.trim().replace(/\n/g, ' ')
                    );
                }
            }

            // Extraction des données avec gestion des cellules vides
            const rows = [];
            let rowElements = table.querySelectorAll('tbody tr');
            if (rowElements.length === 0) {
                rowElements = table.querySelectorAll('tr:not(:first-child)');
            }
            rowElements.forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td')).map(td =>
                    td.textContent.trim().replace(/\n/g, ' ') || ""
                );
                if (cells.some(cell => cell !== "")) {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = cells[index] || "";
                    });
                    rows.push(rowData);
                }
            });

            // Ajout des classes de style fixe si le nombre de colonnes est de 2, 3 ou 4
            if (headers.length >= 2 && headers.length <= 4) {
                tableContainer.classList.add('fixed-columns', `fixed-columns-${headers.length}`);
            }

            // Création du tableau via JSTable si les données sont valides
            if (headers.length > 0 && rows.length > 0) {
                try {
                    new JSTable({
                        table: `#${containerId}`,
                        data: rows,
                        columns: headers.map(header => ({
                            name: header,
                            title: header,
                            width: 'auto'
                        })),
                        classes: ['table', 'table-bordered', 'table-hover'],
                        search: false,
                        pagination: false
                    });
                } catch (error) {
                    console.error("Erreur JSTable :", error);
                    tableContainer.outerHTML = table.outerHTML; // Fallback au tableau original
                }
            } else {
                tableContainer.outerHTML = table.outerHTML; // Afficher le tableau original
            }
        });
        // -------------------------------

        questionDiv.appendChild(questionContent);

        // Affichage des choix de réponse
        q.choices.forEach((choiceText, choiceIndex) => {
            const label = document.createElement('label');
            label.classList.add('choice-label', 'd-block', 'mb-2');

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question-${q.questionId}`;
            radio.value = choiceIndex;
            radio.classList.add('me-2');
            radio.setAttribute('aria-describedby', `question-title-${index + 1}`);

            label.appendChild(radio);
            label.appendChild(document.createTextNode(choiceText));
            questionDiv.appendChild(label);
        });

        questionsContainer.appendChild(questionDiv);
    });

    if (window.AOS) {
        AOS.refresh();
    }
}

function updateProgress() {
    if (!progressCount || !progressTrack || !progressBar) {
        return;
    }

    const total = selectedQuestions.length;
    const answeredCount = selectedQuestions.reduce((count, question) => {
        return getUserAnswer(question.questionId) !== -1 ? count + 1 : count;
    }, 0);
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
        const shouldShowSummary = examState === 'running' && total > 0;
        submitSummary.classList.toggle('hidden', !shouldShowSummary);
    }
    if (summaryAnswered) {
        summaryAnswered.textContent = `Répondues : ${answeredCount}`;
    }
    if (summaryUnanswered) {
        summaryUnanswered.textContent = `Non répondues : ${unansweredCount}`;
    }
}


/**
 * Lance la transition de fin d'examen (animation + affichage des résultats).
 */
async function startExamCompletion({ requireConfirm = false, showTimeoutAlert = false } = {}) {
    if (examState !== 'running' || isTransitioning) {
        return;
    }

    if (requireConfirm) {
        let answeredCount = 0;
        selectedQuestions.forEach(q => {
            if (getUserAnswer(q.questionId) !== -1) {
                answeredCount++;
            }
        });

        if (answeredCount < selectedQuestions.length) {
            const unanswered = selectedQuestions.length - answeredCount;
            const proceed = confirm(`Il reste ${unanswered} question${unanswered > 1 ? 's' : ''} non répondue${unanswered > 1 ? 's' : ''}. Soumettre l'examen malgré tout ?`);
            if (!proceed) {
                return;
            }
        }
    }

    if (showTimeoutAlert && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert("Temps écoulé ! L'examen se termine automatiquement.");
    }

    isTransitioning = true;
    clearInterval(timerInterval);
    setTransitionLock(true);

    const userAnswers = collectUserAnswers(selectedQuestions);
    const score = calculateScore(selectedQuestions, userAnswers);

    try {
        await completeExamSubmission({ score, userAnswers });
    } finally {
        isTransitioning = false;
        setTransitionLock(false);
    }
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
function showResults(score, userAnswers = {}) {
    resultsSection.classList.remove('hidden');

    const totalQuestions = selectedQuestions.length;
    const pourcentage = totalQuestions > 0 ? ((score / totalQuestions) * 100) : 0;
    const timeUsedSec = EXAM_DURATION - timeRemaining;
    const minutesUsed = Math.floor(timeUsedSec / 60);
    const secondsUsed = timeUsedSec % 60;
    const percentUsed = ((timeUsedSec / EXAM_DURATION) * 100).toFixed(2);
    const baseText = `Vous avez obtenu ${score}/${totalQuestions} (${pourcentage.toFixed(2)}%).`;
    const timeText = `Temps utilisé : ${minutesUsed}m${secondsUsed.toString().padStart(2, '0')}s (${percentUsed}% du temps).`;
    scorePara.textContent = baseText;
    timeUsedPara.textContent = timeText;
    scorePara.classList.remove("animate__animated", "animate__tada", "animate__shakeX");

    const threshold = 26;
    const resultItems = selectedQuestions.map((q, index) => {
        const userAnswer = userAnswers.hasOwnProperty(q.questionId)
            ? userAnswers[q.questionId]
            : getUserAnswer(q.questionId);
        const isUnanswered = userAnswer === -1;
        const isCorrect = userAnswer === q.correctIndex;
        return { q, index, userAnswer, isUnanswered, isCorrect };
    });
    latestResultItems = resultItems;

    const correctCount = resultItems.filter((item) => item.isCorrect).length;
    const unansweredCount = resultItems.filter((item) => item.isUnanswered).length;
    const incorrectCount = totalQuestions - correctCount - unansweredCount;

    if (resultsCorrectCount) {
        resultsCorrectCount.textContent = `${correctCount}`;
    }
    if (resultsIncorrectCount) {
        resultsIncorrectCount.textContent = `${incorrectCount}`;
    }
    if (resultsUnansweredCount) {
        resultsUnansweredCount.textContent = `${unansweredCount}`;
    }

    if (score >= threshold) {
        scorePara.textContent += " Félicitations, vous avez réussi l'examen !";
        scorePara.classList.add("animate__animated", "animate__tada");
        if (resultsBadge) {
            resultsBadge.textContent = "Réussi ✅";
            resultsBadge.classList.remove('is-fail');
            resultsBadge.classList.add('is-success');
        }
    } else {
        scorePara.textContent += " Désolé, vous avez échoué l'examen.";
        scorePara.classList.add("animate__animated", "animate__shakeX");
        if (resultsBadge) {
            resultsBadge.textContent = "Échec ❌";
            resultsBadge.classList.remove('is-success');
            resultsBadge.classList.add('is-fail');
        }
    }

    if (resultsInsight) {
        if (incorrectCount === 0 && unansweredCount === 0) {
            resultsInsight.innerHTML = `<strong>Excellent travail.</strong> Toutes les questions ont reçu une réponse correcte.`;
        } else if (unansweredCount > 0) {
            resultsInsight.innerHTML = `<strong>Point d’attention :</strong> ${unansweredCount} question(s) n’ont pas reçu de réponse. Revois surtout ta gestion du temps avant la prochaine session.`;
        } else {
            resultsInsight.innerHTML = `<strong>Conseil :</strong> concentre-toi d’abord sur les ${incorrectCount} question(s) incorrectes ci-dessous, puis relis les bonnes réponses pour consolider la logique attendue.`;
        }
    }

    recordAttempt({
        score,
        totalQuestions,
        percent: pourcentage,
        timeUsedSec,
        unansweredCount
    });

    renderCorrections('all');
    if (resultsFilter) {
        resultsFilter.value = 'all';
    }

    retryBtn.style.display = "inline-block";

    if (resultsHeading) {
        resultsHeading.focus();
    }
}

function renderCorrections(filter = 'all') {
    if (!correctionDiv) {
        return;
    }

    const filteredItems = latestResultItems.filter((item) => {
        if (filter === 'incorrect') {
            return !item.isCorrect && !item.isUnanswered;
        }
        if (filter === 'unanswered') {
            return item.isUnanswered;
        }
        if (filter === 'correct') {
            return item.isCorrect;
        }
        return true;
    });

    correctionDiv.innerHTML = '';

    if (!filteredItems.length) {
        correctionDiv.innerHTML = '<p class="text-center text-muted mt-3">Aucune question dans ce filtre.</p>';
        return;
    }

    filteredItems.forEach((item) => {
        const { q, index, userAnswer, isCorrect, isUnanswered } = item;
        const resultLine = document.createElement('article');
        resultLine.classList.add('result-card');
        resultLine.dataset.resultState = isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'incorrect');

        const questionStatement = document.createElement('div');
        questionStatement.classList.add('result-question-statement');

        const questionTitle = document.createElement('p');
        questionTitle.classList.add('result-question-title');
        questionTitle.innerHTML = `<strong>Question ${index + 1} :</strong>`;
        questionStatement.appendChild(questionTitle);

        if (q.enonceFormat === 'markdown') {
            const markdownWrapper = document.createElement('div');
            markdownWrapper.classList.add('result-question-content');
            markdownWrapper.innerHTML = marked.parse(q.enonce);
            questionStatement.appendChild(markdownWrapper);
        } else {
            const text = document.createElement('p');
            text.classList.add('result-question-content');
            text.textContent = q.enonce;
            questionStatement.appendChild(text);
        }

        const answerGrid = document.createElement('div');
        answerGrid.classList.add('result-answer-grid');
        answerGrid.innerHTML = `
            <div><span class="result-answer-label">Votre réponse</span><em>${q.choices[userAnswer] || 'Aucune sélectionnée'}</em></div>
            <div><span class="result-answer-label">Réponse correcte</span><em>${q.choices[q.correctIndex]}</em></div>
        `;

        const status = document.createElement('div');
        status.classList.add('result-status-pill');
        status.classList.add(isCorrect ? 'is-correct' : (isUnanswered ? 'is-unanswered' : 'is-incorrect'));
        status.textContent = isCorrect ? '✔ Bonne réponse' : (isUnanswered ? '⏳ Non répondue' : '✖ À revoir');

        const insight = document.createElement('p');
        insight.classList.add('result-insight-text');
        insight.textContent = isCorrect
            ? 'Bonne logique : retiens bien le raisonnement qui mène à cette réponse.'
            : isUnanswered
                ? 'Cette question a été laissée vide. En simulation officielle, surveille ton rythme pour éviter ce cas.'
                : 'À retravailler : compare ta réponse à la bonne et identifie précisément ce qui t’a induit en erreur.';

        resultLine.append(questionStatement, answerGrid, status, insight);
        correctionDiv.appendChild(resultLine);
    });
}

/**
 * Réinitialise l'examen pour permettre une nouvelle tentative.
 */
function retryExam() {
    isTransitioning = false;
    setTransitionLock(false);
    resultsSection.classList.add('hidden');
    scorePara.classList.remove("animate__animated", "animate__tada", "animate__shakeX");
    introSection.classList.remove('hidden');
    correctionDiv.innerHTML = "";
    questionsContainer.innerHTML = "";
    questionsContainer.style.minHeight = "";
    scorePara.textContent = "";
    timeUsedPara.textContent = "";
    latestResultItems = [];
    if (resultsBadge) {
        resultsBadge.textContent = "";
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
    submitBtn.style.display = "none";
    retryBtn.style.display = "none";
    submitBtn.disabled = false;
    timeRemaining = EXAM_DURATION;
    setExamState('idle');
    updateTimerDisplay(EXAM_DURATION);
    updateProgress();
    renderDashboard();
}

/* ================================
    FONCTIONS TIMER
   ================================ */
function collectUserAnswers(questions) {
    const answers = {};
    questions.forEach(q => {
        answers[q.questionId] = getUserAnswer(q.questionId);
    });
    return answers;
}

function startTimer() {
    updateTimerDisplay(timeRemaining);
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay(timeRemaining);
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            startExamCompletion({ showTimeoutAlert: true });
        }
    }, 1000);
}

/**
 * Met à jour l'affichage du timer (format HH:MM:SS)
 */
function updateTimerDisplay(seconds) {
    if (!timerDisplay) {
        return;
    }

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hh = (h < 10) ? "0" + h : h;
    const mm = (m < 10) ? "0" + m : m;
    const ss = (s < 10) ? "0" + s : s;
    timerDisplay.textContent = `${hh}:${mm}:${ss}`;

    if (timerDisplay) {
        timerDisplay.setAttribute('aria-label', `Temps restant ${hh} heures, ${mm} minutes et ${ss} secondes`);
    }

    if (timerContainer) {
        const isUrgent = seconds > 0 && seconds <= URGENT_THRESHOLD;
        timerContainer.classList.toggle('is-urgent', isUrgent);
    }
}

function updateTimerVisibility() {
    if (!timerContainer) {
        return;
    }

    const shouldShowTimer = examState === 'running';
    timerContainer.classList.toggle('hidden', !shouldShowTimer);
    timerContainer.classList.toggle('is-hidden', !shouldShowTimer);
    timerContainer.setAttribute('aria-hidden', shouldShowTimer ? 'false' : 'true');
}

function updateProgressVisibility() {
    const isRunning = examState === 'running';
    const showBar = isRunning && isProgressInView;

    if (progressContainer) {
        progressContainer.classList.toggle('is-collapsed', !showBar);
    }

    if (progressChip) {
        const showChip = isRunning && !isProgressInView;
        progressChip.classList.toggle('is-visible', showChip);
        progressChip.setAttribute('aria-hidden', showChip ? 'false' : 'true');
    }
}

function initProgressObserver() {
    if (!progressContainer || !('IntersectionObserver' in window)) {
        return;
    }

    progressObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.target !== progressContainer) {
                return;
            }

            isProgressInView = entry.isIntersecting && entry.intersectionRatio >= 0.2;
            updateProgressVisibility();
        });
    }, {
        threshold: [0, 0.2, 1]
    });

    progressObserver.observe(progressContainer);
}

function focusFirstQuestion() {
    const firstQuestion = questionsContainer.querySelector('.question-block');
    if (firstQuestion) {
        firstQuestion.focus({ preventScroll: false });
    }
}

syncAuthFromStorage();
examState = getInitialExamState();
applyExamState();
updateTimerVisibility();
updateProgress();
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
        renderCorrections(event.target.value);
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
        updateProgress();
    }
});
