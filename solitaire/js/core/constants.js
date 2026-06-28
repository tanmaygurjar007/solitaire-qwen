/**
 * Solitaire Game Constants
 * Centralized configuration for the entire application
 */

export const CONSTANTS = {
  // Card configuration
  SUITS: ['♠', '♥', '♦', '♣'],
  RANKS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
  RED_SUITS: new Set(['♥', '♦']),
  
  // Game layout
  TABLEAU_COLUMNS: 7,
  FOUNDATION_PILES: 4,
  MAX_CARDS_PER_SUIT: 13,
  
  // Scoring (Klondike standard)
  SCORE: {
    WASTE_TO_TABLEAU: 5,
    WASTE_TO_FOUNDATION: 10,
    TABLEAU_TO_FOUNDATION: 10,
    FOUNDATION_TO_TABLEAU: -15,
    FLIP_CARD: 5,
    RECYCLE_STOCK: -100,
  },
  
  // Timing
  TIMER_UPDATE_INTERVAL: 1000,
  AUTO_COMPLETE_DELAY: 150,
  
  // History limits
  MAX_HISTORY_SIZE: 100,
  
  // Drag settings
  DRAG_Z_INDEX: 1000,
  STACK_FAN_RATIO: 0.28,
  WASTE_FAN_RATIO: 0.22,
  WASTE_MAX_FAN: 16,
  
  // Animation durations (ms)
  ANIMATION: {
    CARD_MOVE: 200,
    CARD_FLIP: 150,
    FOUNDATION_PLACE: 180,
    UNDO_REDO: 200,
    WIN_CONFETTI: 2500,
  },
  
  // CSS variables
  CSS: {
    CARD_WIDTH_VAR: '--card-w',
    CARD_HEIGHT_VAR: '--card-h',
  },
  
  // Local storage keys
  STORAGE: {
    SETTINGS: 'solitaire_settings',
    STATISTICS: 'solitaire_statistics',
  },
  
  // Default settings
  DEFAULT_SETTINGS: {
    drawCount: 1,
    animationSpeed: 1.0,
    soundEnabled: true,
    theme: 'classic',
    autoCompleteEnabled: true,
    hintsEnabled: true,
    showMoveSuggestions: true,
    cardAnimationsEnabled: true,
  },
};

// Freeze to prevent accidental modification
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.SUITS);
Object.freeze(CONSTANTS.RANKS);
Object.freeze(CONSTANTS.SCORE);
Object.freeze(CONSTANTS.DEFAULT_SETTINGS);
