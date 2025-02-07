/********************************************
 * main.js
 * Fichier JavaScript principal pour EvaluaTest
 * (Examens blancs ISTQB v4 Foundation Level)
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

/* --- Timer (1h15) --- */
let timeRemaining = 75 * 60; // 75 minutes en secondes
let timerInterval; // pour stocker l'intervalle

/**
 * Variables globales :
 * - allQuestions (optionnel)
 * - selectedQuestions : le tableau final de 40 questions.
 */
let allQuestions = [];
let selectedQuestions = [];

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
                // Si la question ne définit pas déjà le format d’énoncé, on prend celui du chapitre.
                if (!q.hasOwnProperty('enonceFormat') && data.enonceFormat) {
                    q.enonceFormat = data.enonceFormat;
                }
                // Ajouter l'identifiant et le titre du chapitre (pour d'éventuelles utilisations ultérieures)
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
    // Masquer la section d'intro et afficher la section d'examen
    introSection.classList.add('hidden');
    examSection.classList.remove('hidden');

    // Réinitialiser le timer
    timeRemaining = 75 * 60;
    startTimer();

    // Charger les questions et composer la sélection de 40 questions
    selectedQuestions = await loadQuestionsFromMultipleJson();
    if (selectedQuestions.length < 40) {
        console.warn("Le total de questions récupérées est inférieur à 40 !");
    }

    // Afficher les questions dans le DOM
    displayQuestions(selectedQuestions);

    // Rendre visible le bouton de soumission
    submitBtn.style.display = "inline-block";
}

/**
 * Affiche dynamiquement les questions dans le DOM.
 */
function displayQuestions(questions) {
    questionsContainer.innerHTML = "";

    questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-block');

        // Définir l'animation (alternance fade-right / fade-left)
        const aosEffect = (index % 2 === 0) ? "fade-right" : "fade-left";
        questionDiv.setAttribute("data-aos", aosEffect);
        questionDiv.setAttribute("data-aos-duration", "600");

        // Titre de la question
        const questionTitle = document.createElement('h3');
        if (q.enonceFormat && q.enonceFormat === "markdown") {
            // Utilise marked pour convertir le Markdown en HTML
            questionTitle.innerHTML = `Question ${index + 1}: ${marked.parse(q.enonce)}`;
        } else {
            questionTitle.textContent = `Question ${index + 1}: ${q.enonce}`;
        }
        questionDiv.appendChild(questionTitle);

        // Affichage des choix (boutons radio)
        q.choices.forEach((choiceText, choiceIndex) => {
            const label = document.createElement('label');
            label.classList.add('choice-label');

            const radio = document.createElement('input');
            radio.type = 'radio';
            // Le nom est basé sur questionId : que ce soit un nombre (ancien format) ou une chaîne (nouveau format)
            radio.name = `question-${q.questionId}`;
            radio.value = choiceIndex;

            label.appendChild(radio);
            label.appendChild(document.createTextNode(choiceText));
            questionDiv.appendChild(label);
            questionDiv.appendChild(document.createElement('br'));
        });

        questionsContainer.appendChild(questionDiv);
    });

    // Si AOS est utilisé, rafraîchir les animations
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
 * Affiche les résultats (score global et détail question par question)
 */
function showResults(score) {
    resultsSection.classList.remove('hidden');

    const totalQuestions = selectedQuestions.length; // Doit être 40
    const pourcentage = ((score / totalQuestions) * 100).toFixed(2);

    scorePara.textContent = `Vous avez obtenu ${score}/${totalQuestions} (${pourcentage}%).`;

    // Seuil de réussite
    const threshold = 26;
    if (score >= threshold) {
        scorePara.textContent += " Félicitations, vous avez réussi l'examen !";
        scorePara.classList.add("animate__animated", "animate__tada");
    } else {
        scorePara.textContent += " Désolé, vous avez échoué l'examen.";
        scorePara.classList.add("animate__animated", "animate__shakeX");
    }

    // Détail question par question
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

/* ================================
    GESTION DES ÉVÉNEMENTS
   ================================ */
startBtn.addEventListener('click', startExam);
submitBtn.addEventListener('click', submitExam);
retryBtn.addEventListener('click', retryExam);
