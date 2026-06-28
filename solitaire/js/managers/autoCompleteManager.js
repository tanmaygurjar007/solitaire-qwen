/**
 * Auto Complete Manager
 * Automatically moves eligible cards to foundations when game is deterministic
 */

import { CONSTANTS } from './constants.js';
import { KlondikeRules } from '../rules/klondike.js';

/**
 * AutoCompleteManager class for handling automatic card completion
 */
export class AutoCompleteManager {
  /**
   * Create a new auto-complete manager
   * @param {GameState} gameState - Reference to game state
   * @param {Function} onMoveCallback - Callback when auto-move happens
   */
  constructor(gameState, onMoveCallback = null) {
    this.gameState = gameState;
    this.onMoveCallback = onMoveCallback;
    this.isRunning = false;
    this.isEnabled = true;
  }

  /**
   * Enable or disable auto-complete
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Check if auto-complete should run
   * @returns {boolean}
   */
  shouldRun() {
    return this.isEnabled && !this.isRunning;
  }

  /**
   * Try to auto-complete all possible moves
   * Runs iteratively until no more moves are possible
   * @returns {number} Number of cards moved
   */
  run() {
    if (!this.shouldRun()) return 0;

    this.isRunning = true;
    let totalMoved = 0;
    let moved = true;

    while (moved) {
      moved = false;

      // Try waste pile first
      if (this.tryAutoMoveFromWaste()) {
        moved = true;
        totalMoved++;
      }

      // Then try tableau piles
      for (let col = 0; col < CONSTANTS.TABLEAU_COLUMNS; col++) {
        if (this.tryAutoMoveFromTableau(col)) {
          moved = true;
          totalMoved++;
        }
      }

      // Small delay between iterations for animation
      if (moved && this.onMoveCallback) {
        // Let the UI update before continuing
        break;
      }
    }

    this.isRunning = false;
    return totalMoved;
  }

  /**
   * Try to auto-move top card from waste to foundation
   * @returns {boolean} True if move was made
   */
  tryAutoMoveFromWaste() {
    if (this.gameState.waste.length === 0) return false;

    const card = this.gameState.waste[this.gameState.waste.length - 1];

    for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
      if (KlondikeRules.canMoveToFoundation(card, this.gameState.foundations[fi])) {
        this.executeMove(
          { type: 'waste', index: -1 },
          { type: 'foundation', index: fi },
          [card]
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Try to auto-move top card from tableau to foundation
   * @param {number} col - Tableau column index
   * @returns {boolean} True if move was made
   */
  tryAutoMoveFromTableau(col) {
    const pile = this.gameState.tableau[col];
    if (pile.length === 0) return false;

    const card = pile[pile.length - 1];
    if (!card.faceUp) return false;

    for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
      if (KlondikeRules.canMoveToFoundation(card, this.gameState.foundations[fi])) {
        this.executeMove(
          { type: 'tableau', index: col },
          { type: 'foundation', index: fi },
          [card]
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Execute an auto-move
   * @param {Object} from - Source location
   * @param {Object} to - Destination location
   * @param {Array} cards - Cards to move
   */
  executeMove(from, to, cards) {
    if (this.onMoveCallback) {
      this.onMoveCallback(from, to, cards);
    } else {
      // Direct state manipulation if no callback
      this.gameState.moveCards(from, to, cards);
    }
  }

  /**
   * Run auto-complete with animation delays
   * @param {number} delay - Delay between moves in ms
   * @returns {Promise<number>} Total cards moved
   */
  async runAnimated(delay = CONSTANTS.AUTO_COMPLETE_DELAY) {
    if (!this.shouldRun()) return 0;

    this.isRunning = true;
    let totalMoved = 0;

    // Waste pile
    while (this.gameState.waste.length > 0) {
      const card = this.gameState.waste[this.gameState.waste.length - 1];
      let found = false;

      for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
        if (KlondikeRules.canMoveToFoundation(card, this.gameState.foundations[fi])) {
          this.executeMove(
            { type: 'waste', index: -1 },
            { type: 'foundation', index: fi },
            [card]
          );
          totalMoved++;
          found = true;
          await this.wait(delay);
          break;
        }
      }

      if (!found) break;
    }

    // Tableau piles
    let changed = true;
    while (changed) {
      changed = false;

      for (let col = 0; col < CONSTANTS.TABLEAU_COLUMNS; col++) {
        const pile = this.gameState.tableau[col];
        if (pile.length === 0) continue;

        const card = pile[pile.length - 1];
        if (!card.faceUp) continue;

        for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
          if (KlondikeRules.canMoveToFoundation(card, this.gameState.foundations[fi])) {
            this.executeMove(
              { type: 'tableau', index: col },
              { type: 'foundation', index: fi },
              [card]
            );
            totalMoved++;
            changed = true;
            await this.wait(delay);
            break;
          }
        }

        if (changed) break;
      }
    }

    this.isRunning = false;
    return totalMoved;
  }

  /**
   * Wait helper for async operations
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise}
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop any running auto-complete
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Check if auto-complete is currently running
   * @returns {boolean}
   */
  isAutoCompleting() {
    return this.isRunning;
  }
}
