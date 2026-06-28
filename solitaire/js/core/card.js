/**
 * Card Model
 * Represents individual playing cards with rendering capabilities
 */

import { CONSTANTS } from './constants.js';
import { isRed, getRankIndex } from '../utils/helpers.js';

/**
 * Card class representing a single playing card
 */
export class Card {
  /**
   * Create a card
   * @param {string} suit - Card suit (♠, ♥, ♦, ♣)
   * @param {string} rank - Card rank (A, 2-10, J, Q, K)
   * @param {boolean} faceUp - Whether card is face up
   */
  constructor(suit, rank, faceUp = false) {
    this.suit = suit;
    this.rank = rank;
    this.rankIdx = CONSTANTS.RANKS.indexOf(rank);
    this.faceUp = faceUp;
    this.id = `${suit}${rank}${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if card is red
   * @returns {boolean}
   */
  isRed() {
    return isRed(this);
  }

  /**
   * Check if card is black
   * @returns {boolean}
   */
  isBlack() {
    return !isRed(this);
  }

  /**
   * Flip the card
   * @returns {Card} Self for chaining
   */
  flip() {
    this.faceUp = !this.faceUp;
    return this;
  }

  /**
   * Create a DOM element for this card
   * @param {Object} options - Rendering options
   * @returns {HTMLElement} Card DOM element
   */
  createDOM(options = {}) {
    const { selected = false, draggable = true } = options;
    
    const el = document.createElement('div');
    el.className = `card ${this.faceUp ? 'face-up' : 'face-down'}${selected ? ' selected' : ''}`;
    el.dataset.cardId = this.id;
    el.dataset.suit = this.suit;
    el.dataset.rank = this.rank;
    
    if (!this.faceUp) {
      return el;
    }

    const colorClass = this.isRed() ? 'red' : 'black';
    
    el.innerHTML = `
      <div class="card-inner">
        <div>
          <div class="card-rank ${colorClass}">${this.rank}</div>
          <div class="card-suit ${colorClass}">${this.suit}</div>
        </div>
        <div class="card-center ${colorClass}">${this.suit}</div>
        <div class="card-bottom">
          <div class="card-rank ${colorClass}">${this.rank}</div>
          <div class="card-suit ${colorClass}">${this.suit}</div>
        </div>
      </div>
    `;

    if (draggable && this.faceUp) {
      el.setAttribute('draggable', 'true');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${this.rank} of ${this.getSuitName()}`);
    }

    return el;
  }

  /**
   * Get human-readable suit name for accessibility
   * @returns {string} Suit name
   */
  getSuitName() {
    const names = {
      '♠': 'Spades',
      '♥': 'Hearts',
      '♦': 'Diamonds',
      '♣': 'Clubs',
    };
    return names[this.suit] || this.suit;
  }

  /**
   * Serialize card to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      suit: this.suit,
      rank: this.rank,
      rankIdx: this.rankIdx,
      faceUp: this.faceUp,
      id: this.id,
    };
  }

  /**
   * Create card from plain object
   * @param {Object} data - Plain object with card properties
   * @returns {Card} New Card instance
   */
  static fromJSON(data) {
    const card = new Card(data.suit, data.rank, data.faceUp);
    card.rankIdx = data.rankIdx;
    card.id = data.id;
    return card;
  }
}

/**
 * Deck class for managing a full deck of cards
 */
export class Deck {
  /**
   * Create a new deck
   * @param {boolean} shuffle - Whether to shuffle the deck
   */
  constructor(shuffle = true) {
    this.cards = [];
    this.reset(shuffle);
  }

  /**
   * Reset deck to full 52 cards
   * @param {boolean} shuffle - Whether to shuffle after reset
   * @returns {Deck} Self for chaining
   */
  reset(shuffle = true) {
    this.cards = [];
    for (const suit of CONSTANTS.SUITS) {
      for (const rank of CONSTANTS.RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
    if (shuffle) {
      this.shuffle();
    }
    return this;
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   * @returns {Deck} Self for chaining
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  /**
   * Draw cards from the deck
   * @param {number} count - Number of cards to draw
   * @returns {Array} Array of drawn cards
   */
  draw(count = 1) {
    const drawn = [];
    for (let i = 0; i < count && this.cards.length > 0; i++) {
      drawn.push(this.cards.pop());
    }
    return drawn;
  }

  /**
   * Check if deck is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.cards.length === 0;
  }

  /**
   * Get remaining card count
   * @returns {number}
   */
  remaining() {
    return this.cards.length;
  }
}
