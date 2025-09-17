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
const resultsSection = document.getElementById('results');
const scorePara = document.getElementById('score');
const correctionDiv = document.getElementById('correction');
const retryBtn = document.getElementById('retry-btn');
const timerDisplay = document.getElementById('timer-display');
const timerContainer = document.getElementById('timer-container');
const timeUsedPara = document.getElementById('time-used');


/* --- Timer (1h15) --- */
const EXAM_DURATION = 75 * 60; // durée totale de l'examen en secondes (75 min)
let timeRemaining = EXAM_DURATION; // temps restant en secondes
let timerInterval; // pour stocker l'intervalle
let timerOffsetTop = 0; // position initiale du minuteur

/**
 * Variables globales :
 * - allQuestions (optionnel)
 * - selectedQuestions : le tableau final de 40 questions.
 */
let allQuestions = [];
let selectedQuestions = [];

/**
 * Fonction utilitaire pour sélectionner aléatoirement un sous-ensemble d'éléments dans un tableau.
 */
function getRandomQuestions(array, count) {
    const copy = array.slice();
    shuffleArray(copy);
    return copy.slice(0, count);
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
    introSection.classList.add('hidden');
    examSection.classList.remove('hidden');

    timeRemaining = EXAM_DURATION;
    startTimer();

    // Une fois l'animation d'apparition du minuteur terminée,
    // on recalcule sa position de référence pour le comportement fixe.
    if (timerContainer) {
        timerContainer.addEventListener('animationend', updateTimerOffset, { once: true });
    }

    selectedQuestions = await loadQuestionsFromMultipleJson();
    if (selectedQuestions.length < 40) {
        console.warn("Le total de questions récupérées est inférieur à 40 !");
    }

    displayQuestions(selectedQuestions);
    submitBtn.style.display = "inline-block";
    updateTimerOffset();
}

/**
 * Affiche dynamiquement les questions dans le DOM.
 */
function displayQuestions(questions) {
    questionsContainer.innerHTML = "";

    questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-block');

        // Animation AOS (alternance fade-right / fade-left)
        const aosEffect = (index % 2 === 0) ? "fade-right" : "fade-left";
        questionDiv.setAttribute("data-aos", aosEffect);
        questionDiv.setAttribute("data-aos-duration", "600");

        // Création du conteneur pour le contenu de la question
        const questionContent = document.createElement('div');
        questionContent.classList.add('question-content');

        if (q.enonceFormat && q.enonceFormat === "markdown") {
            questionContent.innerHTML = `<strong>Question ${index + 1}:</strong> ${marked.parse(q.enonce)}`;
        } else {
            questionContent.textContent = `Question ${index + 1}: ${q.enonce}`;
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


/**
 * Soumet l'examen, arrête le timer, calcule le score et affiche les résultats.
 */
function submitExam() {
    clearInterval(timerInterval);
    const score = calculateScore(selectedQuestions);
    showResults(score);
    examSection.classList.add('hidden');
}

/**
 * Gère le clic sur le bouton de soumission.
 */
function handleSubmitClick() {
    // Calculer le nombre de questions auxquelles l'utilisateur a répondu
    let answeredCount = 0;
    selectedQuestions.forEach(q => {
        if (getUserAnswer(q.questionId) !== -1) {
            answeredCount++;
        }
    });

    // Si toutes les questions ne sont pas répondues, demander confirmation
    if (answeredCount < selectedQuestions.length) {
        const unanswered = selectedQuestions.length - answeredCount;
        const proceed = confirm(`Il reste ${unanswered} question${unanswered > 1 ? 's' : ''} non répondue${unanswered > 1 ? 's' : ''}. Soumettre l'examen malgré tout ?`);
        if (!proceed) {
            return;
        }
    }

    submitExam();
}

/**
 * Affiche les résultats (score global et détail question par question)
 */
function showResults(score) {
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
    } else {
        scorePara.textContent += " Désolé, vous avez échoué l'examen.";
        scorePara.classList.add("animate__animated", "animate__shakeX");
    }

    correctionDiv.innerHTML = "";
    selectedQuestions.forEach(q => {
        const userAnswer = getUserAnswer(q.questionId);
        const isCorrect = (userAnswer === q.correctIndex);
        const resultLine = document.createElement('p');
        resultLine.innerHTML =
            `<strong>${q.enonce}</strong> <br>
          Votre réponse : <em>${ q.choices[userAnswer] || "Aucune sélectionnée" }</em> <br>
          Réponse correcte : <em>${q.choices[q.correctIndex]}</em> <br>
          <span style="color:${isCorrect ? 'green' : 'red'};">
            ${isCorrect ? '✔ Bonne réponse' : '✖ Mauvaise réponse'}
          </span>`;
        correctionDiv.appendChild(resultLine);
        correctionDiv.appendChild(document.createElement('hr'));
    });

    retryBtn.style.display = "inline-block";
}

/**
 * Réinitialise l'examen pour permettre une nouvelle tentative.
 */
function retryExam() {
    resultsSection.classList.add('hidden');
    scorePara.classList.remove("animate__animated", "animate__tada", "animate__shakeX");
    introSection.classList.remove('hidden');
    correctionDiv.innerHTML = "";
    questionsContainer.innerHTML = "";
    scorePara.textContent = "";
    timeUsedPara.textContent = "";
    submitBtn.style.display = "none";
    retryBtn.style.display = "none";
}

/* ================================
    FONCTIONS TIMER
   ================================ */
function startTimer() {
    updateTimerDisplay(timeRemaining);
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay(timeRemaining);
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert("Temps écoulé ! L'examen se termine automatiquement.");
            submitExam();
        }
    }, 1000);
}

/**
 * Met à jour l'affichage du timer (format HH:MM:SS)
 */
function updateTimerDisplay(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hh = (h < 10) ? "0" + h : h;
    const mm = (m < 10) ? "0" + m : m;
    const ss = (s < 10) ? "0" + s : s;
    timerDisplay.textContent = `${hh}:${mm}:${ss}`;
}

// Met à jour la position de référence du minuteur
function updateTimerOffset() {
    if (timerContainer) {
        timerOffsetTop = timerContainer.offsetTop;
    }
}

// Ajuste la classe du minuteur en fonction du défilement
function handleTimerPosition() {
    if (!timerContainer) return;
    if (window.scrollY > timerOffsetTop) {
        timerContainer.classList.add('timer-fixed');
    } else {
        timerContainer.classList.remove('timer-fixed');
    }
}

/* ================================
    GESTION DES ÉVÉNEMENTS
   ================================ */
startBtn.addEventListener('click', startExam);
submitBtn.addEventListener('click', handleSubmitClick);
retryBtn.addEventListener('click', retryExam);
window.addEventListener('scroll', handleTimerPosition);
window.addEventListener('resize', updateTimerOffset);
