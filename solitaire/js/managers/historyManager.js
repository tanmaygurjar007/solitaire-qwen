/**
 * Undo/Redo Manager
 * Manages game history for undo and redo functionality
 * Uses move-based history for efficiency with state snapshots
 */

import { CONSTANTS } from './constants.js';
import { deepClone } from '../utils/helpers.js';

/**
 * HistoryManager class for undo/redo operations
 */
export class HistoryManager {
  /**
   * Create a new history manager
   * @param {number} maxSize - Maximum history size
   */
  constructor(maxSize = CONSTANTS.MAX_HISTORY_SIZE) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
    this.currentMove = null;
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentMove = null;
  }

  /**
   * Save a snapshot of the current state before a move
   * Called BEFORE making a change
   * 
   * @param {Object} state - Current game state object
   * @param {string} moveType - Type of move being made
   */
  saveSnapshot(state, moveType = 'unknown') {
    // Clear redo stack when new action is taken
    this.redoStack = [];
    
    const snapshot = {
      state: deepClone(state),
      moveType,
      timestamp: Date.now(),
    };
    
    this.undoStack.push(snapshot);
    
    // Trim if exceeds max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Perform undo operation
   * @param {GameState} gameState - Game state to restore to
   * @returns {Object|null} Previous state or null if nothing to undo
   */
  undo(gameState) {
    if (this.undoStack.length === 0) {
      return null;
    }
    
    // Save current state for redo
    this.redoStack.push({
      state: gameState.serialize(),
      moveType: this.currentMove || 'unknown',
      timestamp: Date.now(),
    });
    
    // Get previous state
    const snapshot = this.undoStack.pop();
    this.currentMove = snapshot.moveType;
    
    return snapshot.state;
  }

  /**
   * Perform redo operation
   * @param {GameState} gameState - Game state to restore to
   * @returns {Object|null} Next state or null if nothing to redo
   */
  redo(gameState) {
    if (this.redoStack.length === 0) {
      return null;
    }
    
    // Save current state for undo
    const currentState = gameState.serialize();
    this.undoStack.push({
      state: currentState,
      moveType: this.currentMove || 'unknown',
      timestamp: Date.now(),
    });
    
    // Get next state
    const snapshot = this.redoStack.pop();
    this.currentMove = snapshot.moveType;
    
    return snapshot.state;
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get count of undoable moves
   * @returns {number}
   */
  undoCount() {
    return this.undoStack.length;
  }

  /**
   * Get count of redoable moves
   * @returns {number}
   */
  redoCount() {
    return this.redoStack.length;
  }

  /**
   * Get last move type
   * @returns {string}
   */
  getLastMoveType() {
    if (this.undoStack.length === 0) return 'none';
    return this.undoStack[this.undoStack.length - 1].moveType;
  }

  /**
   * Record a move for statistics
   * @param {Object} move - Move details
   */
  recordMove(move) {
    this.currentMove = move.type;
  }
}
