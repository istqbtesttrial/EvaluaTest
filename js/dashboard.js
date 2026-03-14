import {
  dashboardAttempts,
  dashboardAverageTime,
  dashboardBestScore,
  dashboardLastScore,
  historyList,
  historyPanel,
} from './dom.js';
import { getAttemptHistory, saveAttemptHistory } from './storage.js';

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '-';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds.toString().padStart(2, '0')}s`;
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



export { formatDuration, recordAttempt, renderDashboard };
