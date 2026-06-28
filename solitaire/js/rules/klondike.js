/**
 * Klondike Solitaire Rules Engine
 * Implements all game rules for Klondike Solitaire
 * This module is swappable - other solitaire variants can implement the same API
 */

import { CONSTANTS } from './constants.js';
import { isRed, isBlack, getRankIndex } from '../utils/helpers.js';

/**
 * KlondikeRules object containing all game rule logic
 * @namespace
 */
export const KlondikeRules = {
  /**
   * Game name identifier
   * @type {string}
   */
  name: 'Klondike Solitaire',

  /**
   * Check if a card (or stack) can be placed on a tableau pile
   * Tableau rules: alternating colors, descending rank order, King in empty space
   * 
   * @param {Object} card - Card to place
   * @param {Array} pile - Target tableau pile
   * @returns {boolean} True if move is valid
   * 
   * @example
   * // Can place red 7 on black 8
   * canMoveToTableau({suit: '♥', rank: '7', rankIdx: 6}, [{suit: '♠', rank: '8', rankIdx: 7}])
   */
  canMoveToTableau(card, pile) {
    // Empty tableau can only accept Kings
    if (pile.length === 0) {
      return card.rank === 'K';
    }
    
    const topCard = pile[pile.length - 1];
    
    // Top card must be face-up
    if (!topCard.faceUp) {
      return false;
    }
    
    // Must be opposite color
    if (isRed(card) === isRed(topCard)) {
      return false;
    }
    
    // Must be exactly one rank lower
    return card.rankIdx === topCard.rankIdx - 1;
  },

  /**
   * Check if a card can be placed on a foundation pile
   * Foundation rules: same suit, ascending rank order, Ace starts empty pile
   * 
   * @param {Object} card - Card to place
   * @param {Array} pile - Target foundation pile
   * @returns {boolean} True if move is valid
   * 
   * @example
   * // Can place 2♥ on A♥
   * canMoveToFoundation({suit: '♥', rank: '2', rankIdx: 1}, [{suit: '♥', rank: 'A', rankIdx: 0}])
   */
  canMoveToFoundation(card, pile) {
    // Empty foundation can only accept Aces
    if (pile.length === 0) {
      return card.rank === 'A';
    }
    
    const topCard = pile[pile.length - 1];
    
    // Must be same suit
    if (topCard.suit !== card.suit) {
      return false;
    }
    
    // Must be exactly one rank higher
    return card.rankIdx === topCard.rankIdx + 1;
  },

  /**
   * Check if multiple cards can be moved as a stack
   * In Klondike, any face-up cards in sequence can be moved together
   * 
   * @type {boolean}
   */
  canPickStack: true,

  /**
   * Number of cards to draw from stock at a time
   * Can be 1 or 3 depending on game settings
   * @type {number}
   */
  drawCount: 1,

  /**
   * Score deltas for various actions
   * Used to calculate player score
   * @type {Object}
   */
  score: {
    wasteToTableau: CONSTANTS.SCORE.WASTE_TO_TABLEAU,
    wasteToFoundation: CONSTANTS.SCORE.WASTE_TO_FOUNDATION,
    tableauToFoundation: CONSTANTS.SCORE.TABLEAU_TO_FOUNDATION,
    foundationToTableau: CONSTANTS.SCORE.FOUNDATION_TO_TABLEAU,
    flipCard: CONSTANTS.SCORE.FLIP_CARD,
    recycleStock: CONSTANTS.SCORE.RECYCLE_STOCK,
  },

  /**
   * Check if the game has been won
   * Win condition: all 4 foundations have 13 cards each
   * 
   * @param {Object} state - Current game state
   * @returns {boolean} True if game is won
   */
  isWon(state) {
    return state.foundations.every(f => f.length === CONSTANTS.MAX_CARDS_PER_SUIT);
  },

  /**
   * Validate a complete move operation
   * Checks source and destination rules
   * 
   * @param {Object} move - Move object with from, to, cards properties
   * @param {Object} state - Current game state
   * @returns {boolean} True if entire move is valid
   */
  isValidMove(move, state) {
    const { from, to, cards } = move;
    
    if (!cards || cards.length === 0) return false;
    
    // Validate based on destination type
    if (to.type === 'foundation') {
      // Only single cards can go to foundation
      if (cards.length !== 1) return false;
      return this.canMoveToFoundation(cards[0], state.foundations[to.index]);
    }
    
    if (to.type === 'tableau') {
      return this.canMoveToTableau(cards[0], state.tableau[to.index]);
    }
    
    return false;
  },

  /**
   * Get all valid moves from a specific card position
   * Used for hint system
   * 
   * @param {Object} card - Card to check moves for
   * @param {string} fromType - Source pile type
   * @param {number} fromIndex - Source pile index
   * @param {Object} state - Current game state
   * @returns {Array} Array of valid move objects
   */
  getValidMovesForCard(card, fromType, fromIndex, state) {
    const moves = [];
    
    // Check foundation moves
    if (fromType !== 'foundation' || state.foundations[fromIndex].length > 1) {
      for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
        if (this.canMoveToFoundation(card, state.foundations[fi])) {
          moves.push({
            from: { type: fromType, index: fromIndex },
            to: { type: 'foundation', index: fi },
            cards: [card],
            priority: this.getMovePriority(card, fromType, 'foundation'),
          });
        }
      }
    }
    
    // Check tableau moves (only for single cards from waste/foundation)
    if (fromType === 'waste' || fromType === 'foundation') {
      for (let ti = 0; ti < CONSTANTS.TABLEAU_COLUMNS; ti++) {
        if (this.canMoveToTableau(card, state.tableau[ti])) {
          moves.push({
            from: { type: fromType, index: fromIndex },
            to: { type: 'tableau', index: ti },
            cards: [card],
            priority: this.getMovePriority(card, fromType, 'tableau'),
          });
        }
      }
    }
    
    return moves;
  },

  /**
   * Calculate move priority for hint ranking
   * Higher priority = better move to suggest
   * 
   * @param {Object} card - Card being moved
   * @param {string} fromType - Source type
   * @param {string} toType - Destination type
   * @returns {number} Priority score
   */
  getMovePriority(card, fromType, toType) {
    let priority = 0;
    
    // Moving to foundation is generally good
    if (toType === 'foundation') {
      priority += 100;
      // Aces and Kings are highest priority
      if (card.rank === 'A') priority += 50;
      if (card.rank === 'K') priority += 30;
    }
    
    // Revealing hidden cards is valuable
    if (fromType === 'tableau') {
      priority += 20;
    }
    
    // Moving from waste clears space
    if (fromType === 'waste') {
      priority += 15;
    }
    
    return priority;
  },
};

// Freeze rules object to prevent modification
Object.freeze(KlondikeRules);
Object.freeze(KlondikeRules.score);
