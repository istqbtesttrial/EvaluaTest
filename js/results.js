import { EXAM_DURATION } from './constants.js';
import {
  correctionDiv,
  resultsBadge,
  resultsCorrectCount,
  resultsFilter,
  resultsHeading,
  resultsIncorrectCount,
  resultsInsight,
  resultsSection,
  resultsUnansweredCount,
  retryBtn,
  scorePara,
  timeUsedPara,
} from './dom.js';
import { recordAttempt } from './dashboard.js';
import { getLatestResultItems, getSelectedQuestions, getTimeRemaining, setLatestResultItems } from './state.js';

function showResults(score, userAnswers = {}, getUserAnswer) {
    resultsSection.classList.remove('hidden');

    const totalQuestions = getSelectedQuestions().length;
    const pourcentage = totalQuestions > 0 ? ((score / totalQuestions) * 100) : 0;
    const timeUsedSec = EXAM_DURATION - getTimeRemaining();
    const minutesUsed = Math.floor(timeUsedSec / 60);
    const secondsUsed = timeUsedSec % 60;
    const percentUsed = ((timeUsedSec / EXAM_DURATION) * 100).toFixed(2);
    const baseText = `Vous avez obtenu ${score}/${totalQuestions} (${pourcentage.toFixed(2)}%).`;
    const timeText = `Temps utilisé : ${minutesUsed}m${secondsUsed.toString().padStart(2, '0')}s (${percentUsed}% du temps).`;
    scorePara.textContent = baseText;
    timeUsedPara.textContent = timeText;
    scorePara.classList.remove("animate__animated", "animate__tada", "animate__shakeX");

    const threshold = 26;
    const resultItems = getSelectedQuestions().map((q, index) => {
        const userAnswer = userAnswers.hasOwnProperty(q.questionId)
            ? userAnswers[q.questionId]
            : getUserAnswer(q.questionId);
        const isUnanswered = userAnswer === -1;
        const isCorrect = userAnswer === q.correctIndex;
        return { q, index, userAnswer, isUnanswered, isCorrect };
    });
    setLatestResultItems(resultItems);

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

    renderCorrections('all', getUserAnswer);
    if (resultsFilter) {
        resultsFilter.value = 'all';
    }

    retryBtn.style.display = "inline-block";

    if (resultsHeading) {
        resultsHeading.focus();
    }
}

function renderCorrections(filter = 'all', getUserAnswer = null) {
    if (!correctionDiv) {
        return;
    }

    const filteredItems = getLatestResultItems().filter((item) => {
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

export { showResults, renderCorrections };
