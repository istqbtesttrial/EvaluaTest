import {
  EXIT_CARD_DURATION_MAX,
  EXIT_CARD_DURATION_MIN,
  EXIT_FINAL_SCROLL_MS,
  EXIT_TOTAL_DURATION_MS,
} from './constants.js';
import { questionsContainer, submitBtn } from './dom.js';

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function setTransitionLock(isLocked) {
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
        { opacity: 0, transform: `translateY(${translateY / 2}px) scale(0.75) rotate(${rotate}deg)` },
      ],
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    },
    {
      keyframes: [
        { opacity: 1, transform: 'translateX(0) rotate(0deg)' },
        { opacity: 0, transform: `translateX(${translateX}px) rotate(${rotate}deg)` },
      ],
      easing: 'cubic-bezier(0.3, 0.8, 0.35, 1)',
    },
    {
      keyframes: [
        { opacity: 1, transform: 'scale(1) rotate(0deg)', offset: 0 },
        { opacity: 1, transform: `scale(1.08) rotate(${rotate / 2}deg)`, offset: 0.4 },
        { opacity: 0, transform: `scale(0.6) rotate(${rotate}deg)`, offset: 1 },
      ],
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    {
      keyframes: [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: `translateY(${translateY}px) scale(0.92) rotate(${rotate}deg)` },
      ],
      easing: 'cubic-bezier(0.25, 0.7, 0.35, 1)',
    },
    {
      keyframes: [
        { opacity: 1, transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)' },
        { opacity: 0, transform: `perspective(800px) rotate${flipAxis}(${flipAngle}deg) scale(0.9)` },
      ],
      easing: 'cubic-bezier(0.2, 0.85, 0.35, 1)',
    },
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
      fill: 'forwards',
    });
    animation.pause();

    return {
      card,
      animation,
      startTime: index * cardStagger,
      done: false,
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

export async function completeExamSubmission({ score, userAnswers, showResults, setExamState }) {
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
    questionsContainer.innerHTML = '';
    questionsContainer.style.minHeight = '';
    return;
  }

  await runQuestionExitTransition(cards);
  setExamState('results');
  showResults(score, userAnswers);
  await finalizeScrollToTop();

  questionsContainer.innerHTML = '';
  questionsContainer.style.minHeight = '';
}
