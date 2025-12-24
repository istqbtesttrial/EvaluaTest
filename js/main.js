/********************************************
 * main.js
 * Fichier JavaScript principal pour EvaluaTest
 * (Examens blancs ISTQB V4 Foundation Level)
 ********************************************/

/* --- Sélection des éléments HTML --- */
const startBtn = document.getElementById('start-btn');
const introSection = document.getElementById('intro');
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
const EXIT_CARD_DURATION_MS = 200;
const EXIT_SCROLL_DURATION_MS = 200;
const EXIT_SCROLL_DELTA_MIN = 120;
const EXIT_SCROLL_DELTA_MAX = 240;
const EXIT_FINAL_SCROLL_MS = 260;

/**
 * Variables globales :
 * - allQuestions (optionnel)
 * - selectedQuestions : le tableau final de 40 questions.
 */
let allQuestions = [];
let selectedQuestions = [];

/* ================================
    GESTION D'ÉTAT GLOBAL
   ================================ */
function getInitialExamState() {
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
    const isIdle = examState === 'idle';
    const isRunning = examState === 'running';
    const isResults = examState === 'results';

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

function smoothScrollTo(targetY, duration) {
    if (duration <= 0) {
        window.scrollTo(0, targetY);
        return Promise.resolve();
    }

    const startY = window.scrollY || window.pageYOffset;
    const delta = targetY - startY;
    const startTime = performance.now();

    return new Promise((resolve) => {
        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
            window.scrollTo(0, startY + delta * ease);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

function getScrollDeltaForCard(card) {
    const cardHeight = card.getBoundingClientRect().height || 0;
    const baseDelta = Math.max(cardHeight, EXIT_SCROLL_DELTA_MIN);
    return clampValue(baseDelta, EXIT_SCROLL_DELTA_MIN, EXIT_SCROLL_DELTA_MAX);
}

async function runQuestionExitTransition(cards) {
    if (!cards.length) {
        return;
    }

    if (questionsContainer) {
        questionsContainer.style.minHeight = `${questionsContainer.offsetHeight}px`;
    }

    for (const card of cards) {
        const { keyframes, easing } = buildExitAnimation(card);
        const duration = EXIT_CARD_DURATION_MS;
        const scrollDelta = getScrollDeltaForCard(card);
        const startScroll = window.scrollY || window.pageYOffset;
        const targetScroll = Math.max(0, startScroll - scrollDelta);

        card.style.willChange = 'transform, opacity';
        card.style.pointerEvents = 'none';

        const animation = animateElement(card, keyframes, {
            duration,
            easing,
            fill: 'forwards'
        });

        await Promise.all([
            Promise.resolve(animation.finished).catch(() => {}),
            smoothScrollTo(targetScroll, EXIT_SCROLL_DURATION_MS)
        ]);

        card.style.display = 'none';
    }
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

    const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    progressCount.textContent = `${answeredCount}/${total}`;
    progressTrack.setAttribute('aria-valuemax', total.toString());
    progressTrack.setAttribute('aria-valuenow', answeredCount.toString());
    progressBar.style.width = `${percent}%`;

    if (progressChip) {
        progressChip.textContent = `${answeredCount}/${total}`;
        progressChip.setAttribute('aria-label', `Progression ${answeredCount} sur ${total}`);
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

    const totalQuestions = selectedQuestions.length; // Doit être 40
    const pourcentage = ((score / totalQuestions) * 100).toFixed(2);

    // Calcul du temps utilisé et du pourcentage consommé
    const timeUsedSec = EXAM_DURATION - timeRemaining;
    const minutesUsed = Math.floor(timeUsedSec / 60);
    const secondsUsed = timeUsedSec % 60;
    const percentUsed = ((timeUsedSec / EXAM_DURATION) * 100).toFixed(2);
    const baseText = `Vous avez obtenu ${score}/${totalQuestions} (${pourcentage}%).`;
    const timeText = ` Temps utilisé : ${minutesUsed}m${secondsUsed.toString().padStart(2, '0')}s (${percentUsed}% du temps).`;
    scorePara.textContent = baseText;
    timeUsedPara.textContent = timeText;

    const threshold = 26;
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

    correctionDiv.innerHTML = "";
    selectedQuestions.forEach((q, index) => {
        const userAnswer = userAnswers.hasOwnProperty(q.questionId)
            ? userAnswers[q.questionId]
            : getUserAnswer(q.questionId);
        const isCorrect = (userAnswer === q.correctIndex);

        const resultLine = document.createElement('div');
        // Affichage de l'énoncé de la question avec son numéro
        const questionStatement = document.createElement('div');
        questionStatement.classList.add('result-question-statement');

        const questionTitle = document.createElement('p');
        questionTitle.classList.add('result-question-title');

        const questionNumber = document.createElement('strong');
        questionNumber.textContent = `Question ${index + 1} :`;
        questionTitle.appendChild(questionNumber);
        if (q.enonceFormat === 'markdown') {
            questionStatement.appendChild(questionTitle);

            const markdownWrapper = document.createElement('div');
            markdownWrapper.classList.add('result-question-content');
            markdownWrapper.innerHTML = marked.parse(q.enonce);
            questionStatement.appendChild(markdownWrapper);
        } else {
            questionTitle.append(` ${q.enonce}`);
            questionStatement.appendChild(questionTitle);
        }

        resultLine.appendChild(questionStatement);

        // Votre réponse
        const userAnswerContainer = document.createElement('div');
        const userAnswerLabel = document.createElement('span');
        userAnswerLabel.textContent = 'Votre réponse : ';
        const userAnswerValue = document.createElement('em');
        userAnswerValue.textContent = q.choices[userAnswer] || 'Aucune sélectionnée';
        userAnswerContainer.append(userAnswerLabel, userAnswerValue);
        resultLine.appendChild(userAnswerContainer);

        // Réponse correcte
        const correctAnswerContainer = document.createElement('div');
        const correctAnswerLabel = document.createElement('span');
        correctAnswerLabel.textContent = 'Réponse correcte : ';
        const correctAnswerValue = document.createElement('em');
        correctAnswerValue.textContent = q.choices[q.correctIndex];
        correctAnswerContainer.append(correctAnswerLabel, correctAnswerValue);
        resultLine.appendChild(correctAnswerContainer);

        // Indication correcte / incorrecte
        const statusContainer = document.createElement('div');
        const statusSpan = document.createElement('span');
        statusSpan.style.color = isCorrect ? 'green' : 'red';
        statusSpan.textContent = isCorrect ? '✔ Bonne réponse' : '✖ Mauvaise réponse';
        statusContainer.appendChild(statusSpan);
        resultLine.appendChild(statusContainer);

        correctionDiv.appendChild(resultLine);
        correctionDiv.appendChild(document.createElement('hr'));
    });

    retryBtn.style.display = "inline-block";

    if (resultsHeading) {
        resultsHeading.focus();
    }
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
    if (resultsBadge) {
        resultsBadge.textContent = "";
        resultsBadge.classList.remove('is-success', 'is-fail');
    }
    submitBtn.style.display = "none";
    retryBtn.style.display = "none";
    submitBtn.disabled = false;
    setExamState('idle');
    updateTimerDisplay(EXAM_DURATION);
    updateProgress();
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

examState = getInitialExamState();
applyExamState();
updateTimerVisibility();
updateProgress();
updateProgressVisibility();
initProgressObserver();

/* ================================
    GESTION DES ÉVÉNEMENTS
   ================================ */
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
