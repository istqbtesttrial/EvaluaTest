import {
  ATTEMPT_HISTORY_KEY,
  AUTH_STORAGE_KEY,
  MAX_HISTORY_ITEMS,
} from './constants.js';

export function readStoredAuthFlag() {
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function writeStoredAuthFlag(shouldRemember) {
  if (shouldRemember) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function clearStoredAuthFlag() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAttemptHistory() {
  try {
    const raw = window.localStorage.getItem(ATTEMPT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Impossible de lire l’historique des tentatives.', error);
    return [];
  }
}

export function saveAttemptHistory(history) {
  window.localStorage.setItem(
    ATTEMPT_HISTORY_KEY,
    JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)),
  );
}
