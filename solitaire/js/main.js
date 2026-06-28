/**
 * Solitaire - Main Application Entry Point
 * Production-quality Klondike Solitaire game
 * 
 * @module Solitaire
 */

import { CONSTANTS } from './core/constants.js';
import { GameState } from './core/gameState.js';
import { KlondikeRules } from './rules/klondike.js';
import { HistoryManager } from './managers/historyManager.js';
import { HintSystem } from './managers/hintManager.js';
import { AutoCompleteManager } from './managers/autoCompleteManager.js';
import { AnimationManager } from './managers/animationManager.js';
import { formatTime, saveToStorage, loadFromStorage } from './utils/helpers.js';

/**
 * Main Solitaire Game Controller
 * Coordinates all game systems and handles user interactions
 */
class SolitaireGame {
  constructor() {
    // Core game state
    this.gameState = new GameState();
    this.history = new HistoryManager();
    
    // Managers
    this.animations = new AnimationManager();
    this.hints = new HintSystem(this.gameState);
    this.autoComplete = new AutoCompleteManager(this.gameState, (from, to, cards) => {
      this.executeMove(from, to, cards, false);
    });
    
    // Settings
    this.settings = { ...CONSTANTS.DEFAULT_SETTINGS };
    
    // UI state
    this.dragState = null;
    this.selectedCard = null;
    this.currentHint = null;
    
    // DOM cache
    this.dom = {};
    
    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the game
   */
  init() {
    this.loadSettings();
    this.cacheDOM();
    this.bindEvents();
    this.applySettings();
    this.newGame();
    
    // Announce to screen readers
    this.announce('Solitaire game loaded. Press Tab to navigate.');
  }

  /**
   * Cache DOM element references for performance
   */
  cacheDOM() {
    this.dom = {
      header: document.getElementById('header'),
      scoreDisplay: document.getElementById('score-display'),
      movesDisplay: document.getElementById('moves-display'),
      timeDisplay: document.getElementById('time-display'),
      
      stock: document.getElementById('stock'),
      waste: document.getElementById('waste'),
      foundations: [
        document.getElementById('foundation-0'),
        document.getElementById('foundation-1'),
        document.getElementById('foundation-2'),
        document.getElementById('foundation-3'),
      ],
      tableau: [
        document.getElementById('tableau-0'),
        document.getElementById('tableau-1'),
        document.getElementById('tableau-2'),
        document.getElementById('tableau-3'),
        document.getElementById('tableau-4'),
        document.getElementById('tableau-5'),
        document.getElementById('tableau-6'),
      ],
      
      btnUndo: document.getElementById('btn-undo'),
      btnRedo: document.getElementById('btn-redo'),
      btnHint: document.getElementById('btn-hint'),
      btnPause: document.getElementById('btn-pause'),
      btnSettings: document.getElementById('btn-settings'),
      btnNew: document.getElementById('btn-new'),
      
      winOverlay: document.getElementById('win-overlay'),
      winStats: document.getElementById('win-stats'),
      btnWinNew: document.getElementById('btn-win-new'),
      
      pauseOverlay: document.getElementById('pause-overlay'),
      btnResume: document.getElementById('btn-resume'),
      
      settingsModal: document.getElementById('settings-modal'),
      btnSettingsSave: document.getElementById('btn-settings-save'),
      btnSettingsCancel: document.getElementById('btn-settings-cancel'),
      
      liveRegion: document.getElementById('live-region'),
    };
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Button clicks
    this.dom.btnNew.addEventListener('click', () => this.confirmNewGame());
    this.dom.btnWinNew.addEventListener('click', () => {
      this.hideWinOverlay();
      this.newGame();
    });
    this.dom.btnUndo.addEventListener('click', () => this.undo());
    this.dom.btnRedo.addEventListener('click', () => this.redo());
    this.dom.btnHint.addEventListener('click', () => this.showHint());
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnResume.addEventListener('click', () => this.togglePause());
    this.dom.btnSettings.addEventListener('click', () => this.showSettings());
    this.dom.btnSettingsSave.addEventListener('click', () => this.saveSettings());
    this.dom.btnSettingsCancel.addEventListener('click', () => this.hideSettings());
    
    // Stock click/draw
    this.dom.stock.addEventListener('click', (e) => this.handleStockClick(e));
    this.dom.stock.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleStockClick(e);
      }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Window events
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Drag and drop events (global)
    document.addEventListener('pointermove', (e) => this.handleDragMove(e));
    document.addEventListener('pointerup', (e) => this.handleDragEnd(e));
  }

  /**
   * Start a new game
   */
  newGame() {
    this.gameState.newGame();
    this.history.clear();
    this.selectedCard = null;
    this.currentHint = null;
    
    this.updateUI();
    this.render();
    this.startTimer();
    
    this.announce('New game started');
  }

  /**
   * Confirm before starting new game
   */
  confirmNewGame() {
    if (this.gameState.moves > 0 && !this.gameState.isWon) {
      const confirmed = confirm('Start a new game? Current progress will be lost.');
      if (!confirmed) return;
    }
    this.newGame();
  }

  /**
   * Render the entire game board
   * Uses partial updates where possible for performance
   */
  render() {
    this.renderStock();
    this.renderWaste();
    this.renderFoundations();
    this.renderTableau();
    this.updateButtonStates();
  }

  /**
   * Render stock pile
   */
  renderStock() {
    const stockEl = this.dom.stock;
    stockEl.innerHTML = '<div class="pile-label">↺</div>';
    
    if (this.gameState.stock.length > 0) {
      const cardEl = document.createElement('div');
      cardEl.className = 'card face-down';
      cardEl.style.position = 'absolute';
      cardEl.setAttribute('aria-label', `${this.gameState.stock.length} cards remaining in stock`);
      stockEl.appendChild(cardEl);
    } else if (this.gameState.waste.length > 0) {
      // Show recycle indicator
      stockEl.setAttribute('aria-label', 'Click to recycle waste pile');
    }
  }

  /**
   * Render waste pile with fanned cards
   */
  renderWaste() {
    const wasteEl = this.dom.waste;
    wasteEl.innerHTML = '';
    
    if (this.gameState.waste.length === 0) return;
    
    const showCount = Math.min(3, this.gameState.waste.length);
    const fanWidth = Math.min(16, this.getCardWidth() * CONSTANTS.WASTE_FAN_RATIO);
    
    for (let i = 0; i < showCount; i++) {
      const cardIndex = this.gameState.waste.length - showCount + i;
      const card = this.gameState.waste[cardIndex];
      const cardEl = this.createCardElement(card);
      
      cardEl.style.position = 'absolute';
      cardEl.style.left = (i * fanWidth) + 'px';
      
      // Only top card is interactive
      if (i === showCount - 1) {
        this.attachCardInteractions(cardEl, card, 'waste', -1);
        
        // Double-click to auto-move to foundation
        cardEl.addEventListener('dblclick', () => {
          this.tryAutoMoveToFoundation(card, 'waste', -1);
        });
      }
      
      wasteEl.appendChild(cardEl);
    }
    
    // Adjust width for fanned cards
    wasteEl.style.minWidth = (this.getCardWidth() + (showCount - 1) * fanWidth) + 'px';
  }

  /**
   * Render foundation piles
   */
  renderFoundations() {
    const suitIcons = ['♠', '♥', '♦', '♣'];
    
    this.dom.foundations.forEach((foundationEl, index) => {
      // Keep label, remove cards
      const label = foundationEl.querySelector('.pile-label');
      foundationEl.innerHTML = '';
      if (label) foundationEl.appendChild(label);
      else foundationEl.innerHTML = `<div class="pile-label">${suitIcons[index]}</div>`;
      
      const pile = this.gameState.foundations[index];
      if (pile.length === 0) return;
      
      const topCard = pile[pile.length - 1];
      const cardEl = this.createCardElement(topCard);
      
      this.attachCardInteractions(cardEl, topCard, 'foundation', index);
      
      foundationEl.appendChild(cardEl);
    });
  }

  /**
   * Render tableau columns
   */
  renderTableau() {
    const stackOffset = this.getStackOffset();
    
    this.dom.tableau.forEach((columnEl, colIndex) => {
      columnEl.innerHTML = '';
      const pile = this.gameState.tableau[colIndex];
      
      // Calculate total height needed
      const totalHeight = pile.length === 0 
        ? this.getCardHeight() 
        : (pile.length - 1) * stackOffset + this.getCardHeight();
      columnEl.style.minHeight = totalHeight + 'px';
      
      pile.forEach((card, cardIndex) => {
        const cardEl = this.createCardElement(card);
        cardEl.style.top = (cardIndex * stackOffset) + 'px';
        
        if (card.faceUp) {
          // Allow dragging from this card down
          this.attachCardInteractions(cardEl, card, 'tableau', colIndex, cardIndex);
          
          // Double-click to auto-move to foundation
          cardEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (cardIndex === pile.length - 1) {
              this.tryAutoMoveToFoundation(card, 'tableau', colIndex);
            }
          });
        } else if (cardIndex === pile.length - 1) {
          // Face-down top card - click to flip
          cardEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.flipTopCard(colIndex);
          });
          cardEl.setAttribute('role', 'button');
          cardEl.setAttribute('tabindex', '0');
          cardEl.setAttribute('aria-label', 'Face down card - click to flip');
          cardEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.flipTopCard(colIndex);
            }
          });
        }
        
        columnEl.appendChild(cardEl);
      });
    });
  }

  /**
   * Create a card DOM element
   * @param {Object} card - Card data
   * @returns {HTMLElement} Card element
   */
  createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? 'face-up' : 'face-down'}`;
    el.dataset.cardId = card.id;
    
    if (!card.faceUp) return el;
    
    const colorClass = card.isRed() ? 'red' : 'black';
    
    el.innerHTML = `
      <div class="card-inner">
        <div>
          <div class="card-rank ${colorClass}">${card.rank}</div>
          <div class="card-suit ${colorClass}">${card.suit}</div>
        </div>
        <div class="card-center ${colorClass}">${card.suit}</div>
        <div class="card-bottom">
          <div class="card-rank ${colorClass}">${card.rank}</div>
          <div class="card-suit ${colorClass}">${card.suit}</div>
        </div>
      </div>
    `;
    
    // Accessibility
    if (card.faceUp) {
      el.setAttribute('draggable', 'true');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${card.rank} of ${card.getSuitName()}`);
    }
    
    return el;
  }

  /**
   * Attach interaction handlers to a card element
   */
  attachCardInteractions(cardEl, card, pileType, pileIndex, cardIndex = -1) {
    // Pointer down for drag start
    cardEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleDragStart(e, card, pileType, pileIndex, cardIndex, cardEl);
    });
    
    // Click for selection/keyboard
    cardEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleCardClick(card, pileType, pileIndex, cardIndex);
    });
    
    // Keyboard support
    cardEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleCardClick(card, pileType, pileIndex, cardIndex);
      }
    });
  }

  /**
   * Handle stock click to draw cards
   */
  handleStockClick(e) {
    if (e.target !== this.dom.stock && !this.dom.stock.contains(e.target)) return;
    
    this.saveHistory('draw');
    const result = this.gameState.drawStock(this.settings.drawCount);
    
    if (result.recycled) {
      this.gameState.score += KlondikeRules.score.recycleStock;
      this.announce('Recycled waste pile');
    } else if (result.drawn.length > 0) {
      this.announce(`Drew ${result.drawn.length} card${result.drawn.length > 1 ? 's' : ''}`);
    }
    
    this.updateUI();
    this.render();
    
    // Check for auto-complete opportunities
    if (this.settings.autoCompleteEnabled) {
      setTimeout(() => this.autoComplete.run(), 100);
    }
  }

  /**
   * Flip the top face-down card in a tableau column
   */
  flipTopCard(colIndex) {
    const pile = this.gameState.tableau[colIndex];
    if (pile.length === 0 || pile[pile.length - 1].faceUp) return;
    
    this.saveHistory('flip');
    pile[pile.length - 1].faceUp = true;
    this.gameState.score += KlondikeRules.score.flipCard;
    
    this.updateUI();
    this.render();
    this.announce('Card flipped');
  }

  /**
   * Try to automatically move a card to foundation
   */
  tryAutoMoveToFoundation(card, fromType, fromIndex) {
    for (let fi = 0; fi < CONSTANTS.FOUNDATION_PILES; fi++) {
      if (KlondikeRules.canMoveToFoundation(card, this.gameState.foundations[fi])) {
        this.executeMove(
          { type: fromType, index: fromIndex },
          { type: 'foundation', index: fi },
          [card]
        );
        return true;
      }
    }
    return false;
  }

  /**
   * Execute a card move
   */
  executeMove(from, to, cards, saveHistoryFlag = true) {
    if (saveHistoryFlag) {
      this.saveHistory('move');
    }
    
    const success = this.gameState.moveCards(from, to, cards);
    
    if (success) {
      // Update score based on move type
      if (to.type === 'foundation') {
        if (from.type === 'waste') {
          this.gameState.score += KlondikeRules.score.wasteToFoundation;
        } else if (from.type === 'tableau') {
          this.gameState.score += KlondikeRules.score.tableauToFoundation;
        }
      } else if (to.type === 'tableau' && from.type === 'foundation') {
        this.gameState.score += KlondikeRules.score.foundationToTableau;
      }
      
      this.updateUI();
      this.render();
      
      // Check win condition
      if (this.gameState.checkWin()) {
        this.handleWin();
      }
      
      // Auto-complete after move
      if (this.settings.autoCompleteEnabled && to.type === 'tableau') {
        setTimeout(() => this.autoComplete.run(), 200);
      }
    }
    
    return success;
  }

  /**
   * Save current state to history
   */
  saveHistory(moveType) {
    this.history.saveSnapshot(this.gameState.serialize(), moveType);
    this.updateButtonStates();
  }

  /**
   * Undo last move
   */
  undo() {
    const previousState = this.history.undo(this.gameState);
    if (previousState) {
      this.gameState.deserialize(previousState);
      this.updateUI();
      this.render();
      this.announce('Move undone');
    }
  }

  /**
   * Redo previously undone move
   */
  redo() {
    const nextState = this.history.redo(this.gameState);
    if (nextState) {
      this.gameState.deserialize(nextState);
      this.updateUI();
      this.render();
      this.announce('Move redone');
    }
  }

  /**
   * Show hint for best move
   */
  showHint() {
    if (!this.settings.hintsEnabled) return;
    
    // Clear previous hint
    this.clearHint();
    
    const hint = this.hints.getBestHint();
    if (hint) {
      this.currentHint = hint;
      this.highlightHint(hint);
      this.announce(`Hint: ${hint.description || 'Try moving cards to foundation'}`);
    } else {
      this.announce('No hints available. Try drawing from stock.');
    }
  }

  /**
   * Highlight the hinted move
   */
  highlightHint(hint) {
    // Highlight source card
    const sourcePile = this.getSourceElement(hint.from);
    if (sourcePile) {
      sourcePile.classList.add('hint-highlight');
    }
    
    // Highlight destination pile
    const destPile = this.getDestinationElement(hint.to);
    if (destPile) {
      destPile.classList.add('hint-highlight');
    }
  }

  /**
   * Clear hint highlighting
   */
  clearHint() {
    document.querySelectorAll('.hint-highlight').forEach(el => {
      el.classList.remove('hint-highlight');
    });
  }

  /**
   * Get source DOM element for a hint
   */
  getSourceElement(from) {
    if (from.type === 'waste') {
      return this.dom.waste.lastElementChild;
    } else if (from.type === 'foundation') {
      return this.dom.foundations[from.index]?.lastElementChild;
    } else if (from.type === 'tableau') {
      return this.dom.tableau[from.index]?.lastElementChild;
    }
    return null;
  }

  /**
   * Get destination DOM element for a hint
   */
  getDestinationElement(to) {
    if (to.type === 'foundation') {
      return this.dom.foundations[to.index];
    } else if (to.type === 'tableau') {
      return this.dom.tableau[to.index];
    }
    return null;
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.gameState.isPaused) {
      this.gameState.resume();
      this.dom.pauseOverlay.classList.remove('show');
      this.startTimer();
      this.announce('Game resumed');
    } else {
      this.gameState.pause();
      this.dom.pauseOverlay.classList.add('show');
      this.stopTimer();
      this.announce('Game paused');
    }
  }

  /**
   * Show settings modal
   */
  showSettings() {
    this.loadSettingsForm();
    this.dom.settingsModal.classList.add('show');
  }

  /**
   * Hide settings modal
   */
  hideSettings() {
    this.dom.settingsModal.classList.remove('show');
  }

  /**
   * Load current settings into form
   */
  loadSettingsForm() {
    document.getElementById('setting-draw-count').value = this.settings.drawCount;
    document.getElementById('setting-animation-speed').value = this.settings.animationSpeed;
    document.getElementById('setting-sound').checked = this.settings.soundEnabled;
    document.getElementById('setting-autocomplete').checked = this.settings.autoCompleteEnabled;
    document.getElementById('setting-hints').checked = this.settings.hintsEnabled;
    document.getElementById('setting-theme').value = this.settings.theme;
  }

  /**
   * Save settings from form
   */
  saveSettings() {
    this.settings.drawCount = parseInt(document.getElementById('setting-draw-count').value);
    this.settings.animationSpeed = parseFloat(document.getElementById('setting-animation-speed').value);
    this.settings.soundEnabled = document.getElementById('setting-sound').checked;
    this.settings.autoCompleteEnabled = document.getElementById('setting-autocomplete').checked;
    this.settings.hintsEnabled = document.getElementById('setting-hints').checked;
    this.settings.theme = document.getElementById('setting-theme').value;
    
    this.saveSettingsToStorage();
    this.applySettings();
    this.hideSettings();
    this.announce('Settings saved');
  }

  /**
   * Apply current settings
   */
  applySettings() {
    this.animations.setSpeed(this.settings.animationSpeed);
    this.autoComplete.setEnabled(this.settings.autoCompleteEnabled);
    
    // Apply theme
    document.body.className = `theme-${this.settings.theme}`;
  }

  /**
   * Load settings from storage
   */
  loadSettings() {
    const saved = loadFromStorage(CONSTANTS.STORAGE.SETTINGS);
    if (saved) {
      this.settings = { ...CONSTANTS.DEFAULT_SETTINGS, ...saved };
    }
  }

  /**
   * Save settings to storage
   */
  saveSettingsToStorage() {
    saveToStorage(CONSTANTS.STORAGE.SETTINGS, this.settings);
  }

  /**
   * Handle drag start
   */
  handleDragStart(e, card, pileType, pileIndex, cardIndex, cardEl) {
    if (e.button !== 0) return; // Only left click
    
    const rect = cardEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Get stack if dragging from tableau
    let cards = [card];
    if (pileType === 'tableau' && cardIndex >= 0) {
      const pile = this.gameState.tableau[pileIndex];
      cards = pile.slice(cardIndex);
    }
    
    // Create drag ghost
    const ghostEl = this.createDragGhost(cards, rect);
    
    this.dragState = {
      cards,
      fromType: pileType,
      fromIndex: pileIndex,
      cardIndex,
      ghostEl,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
    
    cardEl.classList.add('dragging');
    this.clearHint();
  }

  /**
   * Create drag ghost element
   */
  createDragGhost(cards, rect) {
    const ghostEl = document.createElement('div');
    ghostEl.style.cssText = `position:fixed;z-index:${CONSTANTS.DRAG_Z_INDEX};pointer-events:none;`;
    
    const stackOffset = this.getStackOffset();
    
    cards.forEach((card, i) => {
      const cardEl = this.createCardElement(card);
      cardEl.style.position = 'absolute';
      cardEl.style.top = (i * stackOffset) + 'px';
      cardEl.style.left = '0';
      ghostEl.appendChild(cardEl);
    });
    
    ghostEl.style.width = this.getCardWidth() + 'px';
    ghostEl.style.height = (this.getCardHeight() + (cards.length - 1) * stackOffset) + 'px';
    
    document.body.appendChild(ghostEl);
    return ghostEl;
  }

  /**
   * Handle drag move
   */
  handleDragMove(e) {
    if (!this.dragState) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    this.dragState.ghostEl.style.left = (clientX - this.dragState.offsetX) + 'px';
    this.dragState.ghostEl.style.top = (clientY - this.dragState.offsetY) + 'px';
    
    // Highlight potential drop targets
    this.updateDropHighlights(clientX, clientY);
  }

  /**
   * Update drop target highlights during drag
   */
  updateDropHighlights(x, y) {
    // Clear previous highlights
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    // Find element under cursor
    const elements = document.elementsFromPoint(x, y);
    
    for (const el of elements) {
      if (el.classList.contains('pile') || el.closest('.pile')) {
        const pile = el.closest('.pile') || el;
        pile.classList.add('drag-over');
        break;
      }
    }
  }

  /**
   * Handle drag end
   */
  handleDragEnd(e) {
    if (!this.dragState) return;
    
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    // Clean up ghost
    if (this.dragState.ghostEl) {
      this.dragState.ghostEl.remove();
    }
    
    // Remove drag-over highlights
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    // Find drop target
    const target = this.findDropTarget(clientX, clientY);
    
    if (target) {
      this.attemptDrop(target);
    }
    
    // Reset drag state
    this.dragState = null;
  }

  /**
   * Find drop target at coordinates
   */
  findDropTarget(x, y) {
    const elements = document.elementsFromPoint(x, y);
    
    for (const el of elements) {
      // Check foundation
      if (el.classList.contains('foundation')) {
        const match = el.id.match(/foundation-(\d+)/);
        if (match) {
          return { type: 'foundation', index: parseInt(match[1]), element: el };
        }
      }
      
      // Check tableau
      if (el.classList.contains('tableau-pile')) {
        const match = el.id.match(/tableau-(\d+)/);
        if (match) {
          return { type: 'tableau', index: parseInt(match[1]), element: el };
        }
      }
    }
    
    return null;
  }

  /**
   * Attempt to drop cards on target
   */
  attemptDrop(target) {
    const { cards, fromType, fromIndex } = this.dragState;
    
    // Can't drop on same location
    if (target.type === fromType && target.index === fromIndex) return;
    
    // Validate move
    if (!KlondikeRules.isValidMove({ from: { type: fromType, index: fromIndex }, to: target, cards }, this.gameState)) {
      return;
    }
    
    // Execute move
    this.executeMove(
      { type: fromType, index: fromIndex },
      target,
      cards
    );
  }

  /**
   * Handle card click (for keyboard/non-drag interaction)
   */
  handleCardClick(card, pileType, pileIndex, cardIndex) {
    if (this.selectedCard) {
      // Try to move selected card to clicked location
      this.tryMoveSelectedCard(pileType, pileIndex);
    } else {
      // Select this card
      this.selectCard(card, pileType, pileIndex, cardIndex);
    }
  }

  /**
   * Select a card for movement
   */
  selectCard(card, pileType, pileIndex, cardIndex) {
    this.selectedCard = { card, pileType, pileIndex, cardIndex };
    
    // Visual feedback
    document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
    
    // Find and highlight the card element
    const cardEl = this.findCardElement(card);
    if (cardEl) {
      cardEl.classList.add('selected');
    }
    
    this.announce(`Selected ${card.rank} of ${card.getSuitName()}`);
  }

  /**
   * Try to move selected card to target
   */
  tryMoveSelectedCard(targetType, targetIndex) {
    if (!this.selectedCard) return;
    
    const { card, pileType: fromType, pileIndex: fromIndex, cardIndex } = this.selectedCard;
    
    // Get cards to move
    let cards = [card];
    if (fromType === 'tableau' && cardIndex >= 0) {
      cards = this.gameState.tableau[fromIndex].slice(cardIndex);
    }
    
    // Validate and execute
    const isValid = KlondikeRules.isValidMove({
      from: { type: fromType, index: fromIndex },
      to: { type: targetType, index: targetIndex },
      cards
    }, this.gameState);
    
    if (isValid) {
      this.executeMove(
        { type: fromType, index: fromIndex },
        { type: targetType, index: targetIndex },
        cards
      );
    }
    
    // Clear selection
    this.clearSelection();
  }

  /**
   * Clear card selection
   */
  clearSelection() {
    this.selectedCard = null;
    document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
  }

  /**
   * Find card element by card object
   */
  findCardElement(card) {
    return document.querySelector(`[data-card-id="${card.id}"]`);
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(e) {
    // Pause on Escape
    if (e.key === 'Escape') {
      if (this.dom.settingsModal.classList.contains('show')) {
        this.hideSettings();
      } else if (this.gameState.isPaused) {
        this.togglePause();
      } else {
        this.togglePause();
      }
      return;
    }
    
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }
    
    // Ctrl+Y for redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
    
    // Space or Enter for hint
    if (e.key === 'h' || e.key === 'H') {
      this.showHint();
      return;
    }
    
    // Delete to clear selection
    if (e.key === 'Delete' || e.key === 'Escape') {
      this.clearSelection();
      return;
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Re-render to adjust card positions
    this.render();
  }

  /**
   * Handle page visibility change (auto-pause on tab switch)
   */
  handleVisibilityChange() {
    if (document.hidden && !this.gameState.isPaused) {
      this.togglePause();
    }
  }

  /**
   * Handle win condition
   */
  handleWin() {
    this.stopTimer();
    
    const elapsed = this.gameState.getElapsedTime();
    const timeStr = formatTime(elapsed);
    
    this.dom.winStats.textContent = `Score: ${this.gameState.score} · Moves: ${this.gameState.moves} · Time: ${timeStr}`;
    this.dom.winOverlay.classList.add('show');
    
    // Launch confetti
    this.animations.createConfetti();
    
    this.announce(`You win! Score: ${this.gameState.score}, Time: ${timeStr}`);
    
    // Save statistics
    this.saveStatistics();
  }

  /**
   * Hide win overlay
   */
  hideWinOverlay() {
    this.dom.winOverlay.classList.remove('show');
  }

  /**
   * Start game timer
   */
  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (!this.gameState.isPaused) {
        this.updateTimeDisplay();
      }
    }, CONSTANTS.TIMER_UPDATE_INTERVAL);
  }

  /**
   * Stop game timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update time display
   */
  updateTimeDisplay() {
    const elapsed = this.gameState.getElapsedTime();
    this.dom.timeDisplay.textContent = formatTime(elapsed);
  }

  /**
   * Update all UI elements
   */
  updateUI() {
    this.dom.scoreDisplay.textContent = Math.max(0, this.gameState.score);
    this.dom.movesDisplay.textContent = this.gameState.moves;
    this.updateTimeDisplay();
  }

  /**
   * Update button states based on game state
   */
  updateButtonStates() {
    this.dom.btnUndo.disabled = !this.history.canUndo();
    this.dom.btnRedo.disabled = !this.history.canRedo();
  }

  /**
   * Get card width from CSS
   */
  getCardWidth() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue(CONSTANTS.CSS.CARD_WIDTH_VAR));
  }

  /**
   * Get card height from CSS
   */
  getCardHeight() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue(CONSTANTS.CSS.CARD_HEIGHT_VAR));
  }

  /**
   * Get stack offset for fanned cards
   */
  getStackOffset() {
    return Math.round(this.getCardHeight() * CONSTANTS.STACK_FAN_RATIO);
  }

  /**
   * Announce message to screen readers
   */
  announce(message) {
    if (this.dom.liveRegion) {
      this.dom.liveRegion.textContent = message;
      setTimeout(() => {
        this.dom.liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Save game statistics
   */
  saveStatistics() {
    const stats = loadFromStorage(CONSTANTS.STORAGE.STATISTICS, {
      gamesPlayed: 0,
      gamesWon: 0,
      bestScore: 0,
      fastestTime: null,
    });
    
    stats.gamesPlayed++;
    stats.gamesWon++;
    
    if (this.gameState.score > stats.bestScore) {
      stats.bestScore = this.gameState.score;
    }
    
    const elapsed = this.gameState.getElapsedTime();
    if (!stats.fastestTime || elapsed < stats.fastestTime) {
      stats.fastestTime = elapsed;
    }
    
    saveToStorage(CONSTANTS.STORAGE.STATISTICS, stats);
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.solitaireGame = new SolitaireGame();
  window.solitaireGame.init();
});
