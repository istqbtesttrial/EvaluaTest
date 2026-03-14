let examState = 'idle';
let isLoadingQuestions = false;
let progressObserver = null;
let isProgressInView = true;
let isTransitioning = false;
let timeRemaining = 0;
let timerInterval = null;
let allQuestions = [];
let selectedQuestions = [];
let isUserAuthenticated = false;
let latestResultItems = [];

export function getExamState() { return examState; }
export function setExamStateValue(value) { examState = value; }
export function isLoading() { return isLoadingQuestions; }
export function setIsLoading(value) { isLoadingQuestions = value; }
export function getProgressObserver() { return progressObserver; }
export function setProgressObserver(value) { progressObserver = value; }
export function getIsProgressInView() { return isProgressInView; }
export function setIsProgressInView(value) { isProgressInView = value; }
export function getIsTransitioning() { return isTransitioning; }
export function setIsTransitioning(value) { isTransitioning = value; }
export function getTimeRemaining() { return timeRemaining; }
export function setTimeRemaining(value) { timeRemaining = value; }
export function getTimerInterval() { return timerInterval; }
export function setTimerInterval(value) { timerInterval = value; }
export function getAllQuestions() { return allQuestions; }
export function setAllQuestions(value) { allQuestions = value; }
export function getSelectedQuestions() { return selectedQuestions; }
export function setSelectedQuestions(value) { selectedQuestions = value; }
export function isAuthenticatedState() { return isUserAuthenticated; }
export function setAuthenticatedState(value) { isUserAuthenticated = value; }
export function getLatestResultItems() { return latestResultItems; }
export function setLatestResultItems(value) { latestResultItems = value; }
