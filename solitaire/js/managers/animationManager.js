/**
 * Animation Manager
 * Handles all card animations and visual effects
 */

import { CONSTANTS } from './constants.js';

/**
 * AnimationManager class for handling game animations
 */
export class AnimationManager {
  /**
   * Create a new animation manager
   */
  constructor() {
    this.speedMultiplier = 1.0;
    this.enabled = true;
    this.activeAnimations = new Map();
  }

  /**
   * Set animation speed multiplier
   * @param {number} speed - Speed multiplier (0.5 = half speed, 2 = double)
   */
  setSpeed(speed) {
    this.speedMultiplier = Math.max(0.1, Math.min(3.0, speed));
  }

  /**
   * Enable or disable animations
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get actual duration with speed adjustment
   * @param {number} baseDuration - Base duration in ms
   * @returns {number} Adjusted duration
   */
  getDuration(baseDuration) {
    if (!this.enabled) return 0;
    return baseDuration / this.speedMultiplier;
  }

  /**
   * Animate card movement from one position to another
   * @param {HTMLElement} cardEl - Card element to animate
   * @param {Object} from - Starting position {x, y}
   * @param {Object} to - Ending position {x, y}
   * @param {Function} onComplete - Callback when animation completes
   */
  moveCard(cardEl, from, to, onComplete = null) {
    if (!cardEl) return;

    const duration = this.getDuration(CONSTANTS.ANIMATION.CARD_MOVE);

    if (duration <= 0) {
      // Instant move
      cardEl.style.transform = `translate(${to.x}px, ${to.y}px)`;
      if (onComplete) onComplete();
      return;
    }

    // Use Web Animations API for better performance
    const animation = cardEl.animate([
      { transform: `translate(${from.x}px, ${from.y}px)` },
      { transform: `translate(${to.x}px, ${to.y}px)` }
    ], {
      duration,
      easing: 'ease-out',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      cardEl.style.transform = `translate(${to.x}px, ${to.y}px)`;
      if (onComplete) onComplete();
    };

    this.activeAnimations.set(cardEl, animation);
  }

  /**
   * Animate card flip
   * @param {HTMLElement} cardEl - Card element to flip
   * @param {boolean} faceUp - Target face state
   * @param {Function} onComplete - Callback when animation completes
   */
  flipCard(cardEl, faceUp, onComplete = null) {
    if (!cardEl) return;

    const duration = this.getDuration(CONSTANTS.ANIMATION.CARD_FLIP);

    if (duration <= 0) {
      cardEl.classList.toggle('face-up', faceUp);
      cardEl.classList.toggle('face-down', !faceUp);
      if (onComplete) onComplete();
      return;
    }

    // Scale-based flip animation
    const animation = cardEl.animate([
      { transform: 'scaleX(1)' },
      { transform: 'scaleX(0)', offset: 0.5 },
      { transform: 'scaleX(1)' }
    ], {
      duration,
      easing: 'ease-in-out',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      cardEl.classList.toggle('face-up', faceUp);
      cardEl.classList.toggle('face-down', !faceUp);
      cardEl.style.transform = '';
      if (onComplete) onComplete();
    };

    this.activeAnimations.set(cardEl, animation);
  }

  /**
   * Animate card placement on foundation
   * @param {HTMLElement} cardEl - Card element
   * @param {HTMLElement} targetEl - Foundation pile element
   * @param {Function} onComplete - Callback when animation completes
   */
  placeOnFoundation(cardEl, targetEl, onComplete = null) {
    if (!cardEl || !targetEl) {
      if (onComplete) onComplete();
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();

    const toX = rect.left - cardRect.left;
    const toY = rect.top - cardRect.top;

    const duration = this.getDuration(CONSTANTS.ANIMATION.FOUNDATION_PLACE);

    if (duration <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const animation = cardEl.animate([
      { 
        transform: 'translate(0, 0) scale(1)',
        opacity: 1
      },
      { 
        transform: `translate(${toX}px, ${toY}px) scale(0.9)`,
        opacity: 0.8,
        offset: 0.7
      },
      { 
        transform: `translate(${toX}px, ${toY}px) scale(1)`,
        opacity: 1
      }
    ], {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      if (onComplete) onComplete();
    };

    this.activeAnimations.set(cardEl, animation);
  }

  /**
   * Create win celebration confetti
   * @param {number} count - Number of confetti pieces
   * @returns {Array} Array of confetti elements
   */
  createConfetti(count = 120) {
    const colors = ['#c9a84c', '#1a6b3c', '#c0392b', '#1a4a8a', '#fff', '#f39c12'];
    const confettiElements = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetto';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      
      const duration = 1.5 + Math.random() * 2;
      const delay = Math.random() * 1.5;
      
      el.style.animationDuration = `${duration}s`;
      el.style.animationDelay = `${delay}s`;
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      el.style.width = el.style.height = (6 + Math.random() * 8) + 'px';
      
      document.body.appendChild(el);
      confettiElements.push(el);

      // Auto-remove after animation
      el.addEventListener('animationend', () => {
        el.remove();
        this.activeAnimations.delete(el);
      });
    }

    return confettiElements;
  }

  /**
   * Animate undo/redo transition
   * @param {HTMLElement} containerEl - Container element
   * @param {Function} stateChangeFn - Function that changes state
   * @param {Function} onComplete - Callback when done
   */
  animateStateChange(containerEl, stateChangeFn, onComplete = null) {
    if (!containerEl) {
      stateChangeFn();
      if (onComplete) onComplete();
      return;
    }

    const duration = this.getDuration(CONSTANTS.ANIMATION.UNDO_REDO);

    if (duration <= 0) {
      stateChangeFn();
      if (onComplete) onComplete();
      return;
    }

    // Fade out, change state, fade in
    containerEl.style.transition = `opacity ${duration}ms ease`;
    containerEl.style.opacity = '0';

    setTimeout(() => {
      stateChangeFn();
      containerEl.offsetHeight; // Force reflow
      
      containerEl.style.opacity = '1';
      
      setTimeout(() => {
        containerEl.style.transition = '';
        if (onComplete) onComplete();
      }, duration);
    }, duration);
  }

  /**
   * Cancel all active animations
   */
  cancelAll() {
    this.activeAnimations.forEach((anim, el) => {
      anim.cancel();
    });
    this.activeAnimations.clear();
  }

  /**
   * Cancel specific animation
   * @param {HTMLElement} cardEl - Element whose animation to cancel
   */
  cancelAnimation(cardEl) {
    const anim = this.activeAnimations.get(cardEl);
    if (anim) {
      anim.cancel();
      this.activeAnimations.delete(cardEl);
    }
  }

  /**
   * Check if any animations are running
   * @returns {boolean}
   */
  hasActiveAnimations() {
    return this.activeAnimations.size > 0;
  }

  /**
   * Wait for all animations to complete
   * @returns {Promise}
   */
  async waitForAll() {
    const promises = [];
    this.activeAnimations.forEach((anim) => {
      promises.push(anim.finished);
    });
    await Promise.all(promises);
  }
}
