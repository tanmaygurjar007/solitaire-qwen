/**
 * Hint System
 * Analyzes the game state to suggest optimal moves
 */

import { CONSTANTS } from './constants.js';
import { KlondikeRules } from '../rules/klondike.js';

/**
 * HintSystem class for providing move suggestions
 */
export class HintSystem {
  /**
   * Create a new hint system
   * @param {GameState} gameState - Reference to game state
   */
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Get all possible valid moves in current state
   * @returns {Array} Array of move objects sorted by priority
   */
  getAllValidMoves() {
    const moves = [];

    // Check waste pile top card
    if (this.gameState.waste.length > 0) {
      const card = this.gameState.waste[this.gameState.waste.length - 1];
      moves.push(...this.getMovesForCard(card, 'waste', -1));
    }

    // Check foundation piles (can move back to tableau)
    for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
      const pile = this.gameState.foundations[fi];
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        // Only consider moving from foundation if it helps reveal cards
        moves.push(...this.getMovesForCard(card, 'foundation', fi));
      }
    }

    // Check tableau piles
    for (let col = 0; col < CONSTANTS.TABLEAU_COLUMNS; col++) {
      const pile = this.gameState.tableau[col];
      if (pile.length === 0) continue;

      // Find all face-up cards that can start a valid stack move
      let faceUpStart = -1;
      for (let i = 0; i < pile.length; i++) {
        if (pile[i].faceUp) {
          faceUpStart = i;
          break;
        }
      }

      if (faceUpStart >= 0) {
        // Try moving each sub-stack starting from face-up cards
        for (let i = faceUpStart; i < pile.length; i++) {
          const card = pile[i];
          const stack = pile.slice(i);
          
          // Validate stack sequence
          if (this.isValidStack(stack)) {
            moves.push(...this.getMovesForCard(card, 'tableau', col, stack));
          }
        }
      }
    }

    // Sort by priority (highest first)
    moves.sort((a, b) => b.priority - a.priority);

    return moves;
  }

  /**
   * Get valid moves for a specific card
   * @param {Card} card - Card to check
   * @param {string} fromType - Source pile type
   * @param {number} fromIndex - Source pile index
   * @param {Array} stack - Optional stack of cards being moved
   * @returns {Array} Valid moves for this card
   */
  getMovesForCard(card, fromType, fromIndex, stack = [card]) {
    const moves = [];

    // Foundation moves (only single cards)
    if (stack.length === 1 && fromType !== 'foundation') {
      for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
        if (KlondikeRules.canMoveToFoundation(card, this.gameState.foundations[fi])) {
          moves.push({
            from: { type: fromType, index: fromIndex },
            to: { type: 'foundation', index: fi },
            cards: [card],
            priority: this.calculatePriority(card, fromType, 'foundation'),
            description: this.getMoveDescription(card, fromType, 'foundation'),
          });
        }
      }
    }

    // Tableau moves
    for (let ti = 0; ti < CONSTANTS.TABLEAU_COLUMNS; ti++) {
      // Skip same column
      if (fromType === 'tableau' && fromIndex === ti) continue;

      if (KlondikeRules.canMoveToTableau(card, this.gameState.tableau[ti])) {
        moves.push({
          from: { type: fromType, index: fromIndex },
          to: { type: 'tableau', index: ti },
          cards: stack,
          priority: this.calculatePriority(card, fromType, 'tableau'),
          description: this.getMoveDescription(card, fromType, 'tableau'),
        });
      }
    }

    // Empty tableau - only Kings
    if (card.rank === 'K') {
      for (let ti = 0; ti < CONSTANTS.TABLEAU_COLUMNS; ti++) {
        if (fromType === 'tableau' && fromIndex === ti) continue;
        if (this.gameState.tableau[ti].length === 0) {
          moves.push({
            from: { type: fromType, index: fromIndex },
            to: { type: 'tableau', index: ti },
            cards: stack,
            priority: this.calculatePriority(card, fromType, 'tableau') + 25,
            description: 'Move King to empty column',
          });
        }
      }
    }

    return moves;
  }

  /**
   * Check if a stack of cards forms a valid sequence
   * @param {Array} stack - Array of cards
   * @returns {boolean} True if valid descending alternating sequence
   */
  isValidStack(stack) {
    if (stack.length <= 1) return true;

    for (let i = 1; i < stack.length; i++) {
      const prev = stack[i - 1];
      const curr = stack[i];

      // Must be opposite color
      if ((prev.suit === '♥' || prev.suit === '♦') === 
          (curr.suit === '♥' || curr.suit === '♦')) {
        return false;
      }

      // Must be exactly one rank lower
      if (curr.rankIdx !== prev.rankIdx - 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate move priority for ranking hints
   * @param {Card} card - Card being moved
   * @param {string} fromType - Source type
   * @param {string} toType - Destination type
   * @returns {number} Priority score
   */
  calculatePriority(card, fromType, toType) {
    let priority = 0;

    // Moving to foundation is generally best
    if (toType === 'foundation') {
      priority += 100;
      
      // Aces are highest priority
      if (card.rank === 'A') priority += 50;
      
      // Low cards are good to bank early
      if (card.rankIdx < 4) priority += 30;
    }

    // Revealing hidden cards is very valuable
    if (fromType === 'tableau') {
      priority += 40;
    }

    // Moving from waste clears access to other cards
    if (fromType === 'waste') {
      priority += 20;
    }

    // Emptying a column is strategic
    if (toType === 'tableau' && this.gameState.tableau[toType.index]?.length === 0) {
      priority += 25;
    }

    // Kings to empty columns
    if (card.rank === 'K' && toType === 'tableau') {
      priority += 15;
    }

    return priority;
  }

  /**
   * Get human-readable description for a move
   * @param {Card} card - Card being moved
   * @param {string} fromType - Source type
   * @param {string} toType - Destination type
   * @returns {string} Move description
   */
  getMoveDescription(card, fromType, toType) {
    const descriptions = [];

    if (toType === 'foundation') {
      descriptions.push(`Move ${card.rank}${card.suit} to foundation`);
    }

    if (fromType === 'tableau') {
      descriptions.push('Reveals hidden card');
    }

    if (toType === 'tableau' && this.gameState.tableau.some(t => t.length === 0)) {
      descriptions.push('Frees up a column');
    }

    return descriptions.join(' • ');
  }

  /**
   * Get the best hint
   * @returns {Object|null} Best move or null if no moves
   */
  getBestHint() {
    const moves = this.getAllValidMoves();
    return moves.length > 0 ? moves[0] : null;
  }

  /**
   * Check if there are any valid moves
   * @returns {boolean}
   */
  hasValidMoves() {
    return this.getAllValidMoves().length > 0;
  }

  /**
   * Highlight the best move on the UI
   * @param {Function} highlightCallback - Callback to handle highlighting
   */
  highlightBestMove(highlightCallback) {
    const hint = this.getBestHint();
    if (hint && highlightCallback) {
      highlightCallback(hint);
    }
    return hint;
  }
}
