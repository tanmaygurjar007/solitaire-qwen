/**
 * Game State Manager
 * Manages the complete game state including all piles and game metadata
 */

import { CONSTANTS } from './constants.js';
import { Deck, Card } from './card.js';
import { deepClone } from '../utils/helpers.js';

/**
 * GameState class managing all game data
 */
export class GameState {
  /**
   * Create a new game state
   */
  constructor() {
    this.reset();
  }

  /**
   * Reset state to initial empty values
   */
  reset() {
    // Stock pile (draw pile)
    this.stock = [];
    
    // Waste pile (drawn cards)
    this.waste = [];
    
    // Foundation piles (4 suit piles)
    this.foundations = Array.from(
      { length: CONSTANTS.FOUNDATION_PILES },
      () => []
    );
    
    // Tableau piles (7 columns)
    this.tableau = Array.from(
      { length: CONSTANTS.TABLEAU_COLUMNS },
      () => []
    );
    
    // Game metadata
    this.moves = 0;
    this.score = 0;
    this.startTime = null;
    this.elapsedTime = 0;
    this.isPaused = false;
    this.isWon = false;
    this.gameId = null;
  }

  /**
   * Initialize a new Klondike game
   * @returns {GameState} Self for chaining
   */
  newGame() {
    this.reset();
    
    const deck = new Deck(true);
    this.gameId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.startTime = Date.now();
    
    // Deal tableau: column i gets i+1 cards, last card face up
    for (let col = 0; col < CONSTANTS.TABLEAU_COLUMNS; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.draw(1)[0];
        card.faceUp = (row === col);
        this.tableau[col].push(card);
      }
    }
    
    // Remaining cards go to stock
    while (!deck.isEmpty()) {
      this.stock.push(deck.draw(1)[0]);
    }
    
    return this;
  }

  /**
   * Draw cards from stock to waste
   * @param {number} count - Number of cards to draw (1 or 3)
   * @returns {Object} Result with drawn cards and whether stock was recycled
   */
  drawStock(count = 1) {
    let recycled = false;
    let drawnCards = [];
    
    if (this.stock.length === 0) {
      // Recycle waste back to stock
      if (this.waste.length === 0) {
        return { drawn: [], recycled: false };
      }
      
      this.stock = this.waste.reverse();
      this.stock.forEach(card => card.faceUp = false);
      this.waste = [];
      recycled = true;
    }
    
    // Draw specified count
    const actualCount = Math.min(count, this.stock.length);
    for (let i = 0; i < actualCount; i++) {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
      drawnCards.push(card);
    }
    
    this.moves++;
    
    return { drawn: drawnCards, recycled };
  }

  /**
   * Move card(s) from one pile to another
   * @param {Object} from - Source location {type, index}
   * @param {Object} to - Destination location {type, index}
   * @param {Array} cards - Cards to move
   * @returns {boolean} Success status
   */
  moveCards(from, to, cards) {
    if (!cards || cards.length === 0) return false;
    
    const sourcePile = this.getPile(from.type, from.index);
    const destPile = this.getPile(to.type, to.index);
    
    if (!sourcePile || !destPile) return false;
    
    // Remove from source
    if (from.type === 'waste') {
      // Can only move top card from waste
      if (this.waste[this.waste.length - 1] !== cards[0]) return false;
      this.waste.pop();
    } else if (from.type === 'foundation') {
      // Can only move top card from foundation
      const foundationTop = this.foundations[from.index][this.foundations[from.index].length - 1];
      if (foundationTop !== cards[0]) return false;
      this.foundations[from.index].pop();
    } else if (from.type === 'tableau') {
      // Remove stack from tableau
      const tableauCol = this.tableau[from.index];
      const startIndex = tableauCol.length - cards.length;
      if (tableauCol[startIndex] !== cards[0]) return false;
      tableauCol.splice(startIndex, cards.length);
    }
    
    // Add to destination
    if (to.type === 'foundation') {
      this.foundations[to.index].push(cards[0]);
    } else if (to.type === 'tableau') {
      this.tableau[to.index].push(...cards);
    }
    
    this.moves++;
    
    // Auto-flip tableau card if needed
    this.autoFlipTableau(from.type === 'tableau' ? from.index : -1);
    
    return true;
  }

  /**
   * Auto-flip face-down cards on tableau after a move
   * @param {number} exceptCol - Column index to skip (where cards were removed from)
   */
  autoFlipTableau(exceptCol = -1) {
    for (let col = 0; col < CONSTANTS.TABLEAU_COLUMNS; col++) {
      if (col === exceptCol) continue;
      const pile = this.tableau[col];
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
      }
    }
  }

  /**
   * Get pile by type and index
   * @param {string} type - Pile type (stock, waste, foundation, tableau)
   * @param {number} index - Pile index
   * @returns {Array|null} Pile array or null
   */
  getPile(type, index) {
    switch (type) {
      case 'stock': return this.stock;
      case 'waste': return this.waste;
      case 'foundation': return this.foundations[index];
      case 'tableau': return this.tableau[index];
      default: return null;
    }
  }

  /**
   * Get top card from a pile
   * @param {string} type - Pile type
   * @param {number} index - Pile index
   * @returns {Card|null} Top card or null
   */
  getTopCard(type, index) {
    const pile = this.getPile(type, index);
    return pile && pile.length > 0 ? pile[pile.length - 1] : null;
  }

  /**
   * Check win condition
   * @returns {boolean} True if all foundations are complete
   */
  checkWin() {
    this.isWon = this.foundations.every(f => f.length === CONSTANTS.MAX_CARDS_PER_SUIT);
    return this.isWon;
  }

  /**
   * Get elapsed time in seconds
   * @returns {number} Elapsed seconds
   */
  getElapsedTime() {
    if (!this.startTime) return this.elapsedTime;
    if (this.isPaused) return this.elapsedTime;
    return this.elapsedTime + Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Pause the game timer
   */
  pause() {
    if (!this.isPaused && this.startTime) {
      this.elapsedTime += Math.floor((Date.now() - this.startTime) / 1000);
      this.isPaused = true;
    }
  }

  /**
   * Resume the game timer
   */
  resume() {
    if (this.isPaused) {
      this.startTime = Date.now();
      this.isPaused = false;
    }
  }

  /**
   * Serialize state for history/undo
   * @returns {Object} Serializable state object
   */
  serialize() {
    return {
      stock: this.stock.map(c => c.toJSON()),
      waste: this.waste.map(c => c.toJSON()),
      foundations: this.foundations.map(p => p.map(c => c.toJSON())),
      tableau: this.tableau.map(p => p.map(c => c.toJSON())),
      moves: this.moves,
      score: this.score,
      elapsedTime: this.getElapsedTime(),
      isPaused: this.isPaused,
      isWon: this.isWon,
      gameId: this.gameId,
    };
  }

  /**
   * Deserialize state from saved object
   * @param {Object} data - Saved state object
   */
  deserialize(data) {
    this.stock = data.stock.map(c => Card.fromJSON(c));
    this.waste = data.waste.map(c => Card.fromJSON(c));
    this.foundations = data.foundations.map(p => p.map(c => Card.fromJSON(c)));
    this.tableau = data.tableau.map(p => p.map(c => Card.fromJSON(c)));
    this.moves = data.moves;
    this.score = data.score;
    this.elapsedTime = data.elapsedTime;
    this.isPaused = data.isPaused;
    this.isWon = data.isWon;
    this.gameId = data.gameId;
    this.startTime = this.isPaused ? null : Date.now();
  }

  /**
   * Create a deep clone of current state
   * @returns {Object} Cloned state
   */
  clone() {
    return deepClone(this.serialize());
  }
}
