/**
 * Utility Functions
 * Helper functions used throughout the application
 */

import { CONSTANTS } from './constants.js';

/**
 * Check if a card is red (hearts or diamonds)
 * @param {Object} card - Card object with suit property
 * @returns {boolean} True if card is red
 */
export function isRed(card) {
  return CONSTANTS.RED_SUITS.has(card.suit);
}

/**
 * Check if a card is black (spades or clubs)
 * @param {Object} card - Card object with suit property
 * @returns {boolean} True if card is black
 */
export function isBlack(card) {
  return !CONSTANTS.RED_SUITS.has(card.suit);
}

/**
 * Get rank index (0-12) for a card
 * @param {Object} card - Card object with rankIdx or rank property
 * @returns {number} Rank index (A=0, K=12)
 */
export function getRankIndex(card) {
  if (card.rankIdx !== undefined) return card.rankIdx;
  return CONSTANTS.RANKS.indexOf(card.rank);
}

/**
 * Create a new shuffled deck of 52 cards
 * @returns {Array} Array of card objects
 */
export function createDeck() {
  const deck = [];
  for (const suit of CONSTANTS.SUITS) {
    for (const rank of CONSTANTS.RANKS) {
      deck.push({
        suit,
        rank,
        rankIdx: CONSTANTS.RANKS.indexOf(rank),
        faceUp: false,
        id: `${suit}${rank}`, // Unique identifier
      });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} arr - Array to shuffle
 * @returns {Array} Shuffled array (mutated in place)
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deep clone an object using JSON serialization
 * Note: This is fast but doesn't handle functions, undefined, or special objects
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Format seconds into MM:SS format
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Get CSS variable value as integer
 * @param {string} varName - CSS variable name (e.g., '--card-w')
 * @returns {number} Integer value of the CSS variable
 */
export function getCSSVariable(varName) {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue(varName));
}

/**
 * Calculate stack offset for fanned cards
 * @returns {number} Pixel offset between stacked cards
 */
export function getStackOffset() {
  const cardH = getCSSVariable(CONSTANTS.CSS.CARD_HEIGHT_VAR);
  return Math.round(cardH * CONSTANTS.STACK_FAN_RATIO);
}

/**
 * Get card width from CSS variable
 * @returns {number} Card width in pixels
 */
export function getCardWidth() {
  return getCSSVariable(CONSTANTS.CSS.CARD_WIDTH_VAR);
}

/**
 * Get card height from CSS variable
 * @returns {number} Card height in pixels
 */
export function getCardHeight() {
  return getCSSVariable(CONSTANTS.CSS.CARD_HEIGHT_VAR);
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Save data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @returns {boolean} Success status
 */
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
    return false;
  }
}

/**
 * Load data from localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Loaded data or default value
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return defaultValue;
  }
}

/**
 * Check if element is visible in viewport
 * @param {HTMLElement} el - Element to check
 * @returns {boolean} True if element is at least partially visible
 */
export function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}
