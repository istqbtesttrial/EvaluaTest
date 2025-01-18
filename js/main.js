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

/*
   On ne définit plus de tableau en dur.
   On prépare "allQuestions" pour charger le JSON.
*/
let allQuestions = [];

/* Variable pour stocker la sélection finale (ici 40 questions) */
let selectedQuestions = [];

/**
 * Fonction pour charger TOUTES les questions
 * depuis le fichier questions.json
 */
async function loadQuestionsFromJson() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();

        // data.chapters : tableau [{ id, title, questions: [...] }, ...]
        let all = [];
        data.chapters.forEach(chapter => {
            all = all.concat(chapter.questions);
        });
        return all; // Retourne un grand tableau de toutes les questions
    } catch (error) {
        console.error("Erreur lors du chargement du JSON :", error);
        return [];
    }
}

/* ================================
    FONCTIONS PRINCIPALES
   ================================ */

/**
 * Lance l'examen
 *  (rendu asynchrone pour pouvoir 'await' le chargement JSON)
 */
async function startExam() {
    // Masquer la section d'intro
    introSection.classList.add('hidden');
    // Afficher la section d'examen
    examSection.classList.remove('hidden');

    // Réinitialiser le temps restant
    timeRemaining = 75 * 60;
    // Démarrer le timer
    startTimer();

    // CHARGER LES QUESTIONS SI CE N'EST PAS DEJA FAIT
    if (allQuestions.length === 0) {
        allQuestions = await loadQuestionsFromJson();
    }

    // Sélection aléatoire de 40 questions
    // (Assurez-vous que votre questions.json en contient au moins 40)
    selectedQuestions = getRandomQuestions(allQuestions, 40);

    // Afficher les questions dans le DOM
    displayQuestions(selectedQuestions);

    // Rendre le bouton "Valider mes réponses" visible
    submitBtn.style.display = "inline-block";
}

/**
 * Affiche dynamiquement les questions dans le DOM
 */
function displayQuestions(questions) {
    questionsContainer.innerHTML = "";

    questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-block');

        // Animations AOS (alternance fade-right / fade-left)
        const aosEffect = (index % 2 === 0) ? "fade-right" : "fade-left";
        questionDiv.setAttribute("data-aos", aosEffect);
        questionDiv.setAttribute("data-aos-duration", "600");

        const questionTitle = document.createElement('h3');
        questionTitle.textContent = `Question ${index + 1}: ${q.enonce}`;
        questionDiv.appendChild(questionTitle);

        q.choices.forEach((choiceText, choiceIndex) => {
            const label = document.createElement('label');
            label.classList.add('choice-label');

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question-${q.questionId}`;
            radio.value = choiceIndex;

            label.appendChild(radio);
            label.appendChild(document.createTextNode(choiceText));
            questionDiv.appendChild(label);
            questionDiv.appendChild(document.createElement('br'));
        });

        questionsContainer.appendChild(questionDiv);
    });

    // Rafraîchir AOS si présent
    if (window.AOS) {
        AOS.refresh();
    }
}

/**
 * Soumission de l'examen (calcul du score, affichage)
 */
function submitExam() {
    // Arrêter le timer
    clearInterval(timerInterval);

    // Calcul du score
    const score = calculateScore(selectedQuestions);

    // Afficher les résultats
    showResults(score);

    // Masquer la section exam
    examSection.classList.add('hidden');
}

/**
 * Affiche les résultats (score, détails)
 */
function showResults(score) {
    resultsSection.classList.remove('hidden');

    const totalQuestions = selectedQuestions.length; // 40
    const pourcentage = ((score / totalQuestions) * 100).toFixed(2);

    scorePara.textContent = `Vous avez obtenu ${score}/${totalQuestions} (${pourcentage}%).`;

    // Seuil de réussite (26/40)
    const threshold = 26;
    if (score >= threshold) {
        scorePara.textContent += " Félicitations, vous avez réussi l'examen !";
        // Effet Animate.css (tada) sur le #score si réussite
        scorePara.classList.add("animate__animated", "animate__tada");
    } else {
        scorePara.textContent += " Désolé, vous avez échoué l'examen.";
        // Effet Animate.css (shakeX) sur le #score si échec
        scorePara.classList.add("animate__animated", "animate__shakeX");
    }

    // Afficher un détail question par question
    correctionDiv.innerHTML = "";
    selectedQuestions.forEach(q => {
        const userAnswer = getUserAnswer(q.questionId);
        const isCorrect = (userAnswer === q.correctIndex);
        const resultLine = document.createElement('p');
        resultLine.innerHTML = `
          <strong>${q.enonce}</strong> <br>
          Votre réponse : <em>${ q.choices[userAnswer] || "Aucune sélectionnée" }</em> <br>
          Réponse correcte : <em>${q.choices[q.correctIndex]}</em> <br>
          <span style="color:${isCorrect ? 'green' : 'red'};">
            ${isCorrect ? '✔ Bonne réponse' : '✖ Mauvaise réponse'}
          </span>
        `;
        correctionDiv.appendChild(resultLine);
        correctionDiv.appendChild(document.createElement('hr'));
    });

    // Afficher le bouton "Recommencer"
    retryBtn.style.display = "inline-block";
}

/**
 * Recommencer le test
 */
function retryExam() {
    // Cacher la section résultats
    resultsSection.classList.add('hidden');
    // Retirer les classes d'animation sur #score
    scorePara.classList.remove("animate__animated", "animate__tada", "animate__shakeX");

    // Réafficher l'intro
    introSection.classList.remove('hidden');

    // Nettoyer
    correctionDiv.innerHTML = "";
    questionsContainer.innerHTML = "";
    scorePara.textContent = "";

    // Cacher les boutons
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
            submitExam(); // Forcer la soumission
        }
    }, 1000);
}

/**
 * Met à jour l'affichage du chrono (HH:MM:SS)
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
