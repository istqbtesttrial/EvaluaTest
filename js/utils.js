/********************************************
 * utils.js
 * Fonctions utilitaires pour EvaluaTest
 * (Examens blancs ISTQB v4 Foundation Level)
 ********************************************/

/**
 * Mélange le contenu d'un tableau (in place),
 * en utilisant l'algorithme de Fisher-Yates.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Sélectionne aléatoirement n éléments d'un tableau (sans répétition).
 */
function getRandomQuestions(questions, n) {
    let copiedArray = questions.slice();
    shuffleArray(copiedArray);
    return copiedArray.slice(0, n);
}

/**
 * Calcule le score de l'utilisateur (nombre de réponses justes).
 */
function calculateScore(selectedQuestions) {
    let score = 0;
    selectedQuestions.forEach(q => {
        const userAnswer = getUserAnswer(q.questionId);
        if (userAnswer === q.correctIndex) {
            score++;
        }
    });
    return score;
}

/**
 * Extrait la réponse choisie par l'utilisateur (index)
 * pour une question donnée, en scrutant le DOM (radio).
 */
function getUserAnswer(questionId) {
    const radios = document.getElementsByName(`question-${questionId}`);
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return parseInt(radios[i].value, 10);
        }
    }
    return -1;
}

/**
 * Sélectionne aléatoirement un certain nombre de questions
 * par chapitre (si vous avez besoin d'une répartition).
 * (Facultatif si vous n'utilisez plus de distribution via un tableau 'chapters'.)
 */
function selectQuestionsByChapter(chapters, distribution) {
    let selected = [];
    chapters.forEach(chap => {
        const numToSelect = distribution[chap.title] || 0;
        shuffleArray(chap.questions);
        const chosen = chap.questions.slice(0, numToSelect);
        selected = selected.concat(chosen);
    });
    return selected;
}
