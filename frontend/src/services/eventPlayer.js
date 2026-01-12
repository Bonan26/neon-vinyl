/**
 * NEON VINYL: GHOST GROOVES - Event Player Engine
 *
 * This is the CORE animation engine that bridges backend events to PixiJS animations.
 * It processes events sequentially and triggers the appropriate visual effects.
 */
import { ANIMATION_TIMING, GRID_ROWS, GRID_COLS } from '../config/gameConfig';

/**
 * Sleep utility for async animations
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Event Player Class
 * Processes backend events and triggers animations
 */
class EventPlayer {
  constructor() {
    this.isPlaying = false;
    this.callbacks = {
      onReveal: null,
      onWin: null,
      onMultiplierUpgrade: null,
      onTumble: null,
      onFill: null,
      onWinAmountUpdate: null,
      onComplete: null,
      onError: null,
    };
  }

  /**
   * Register callback functions for each event type
   * @param {Object} callbacks - Callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Main function to play all spin events
   * @param {Array} events - Array of events from backend
   * @returns {Promise<void>}
   */
  async playSpinEvents(events) {
    if (this.isPlaying) {
      console.warn('EventPlayer: Already playing events');
      return;
    }

    this.isPlaying = true;

    try {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        await this.processEvent(event, i);
      }

      // All events processed
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete();
      }
    } catch (error) {
      console.error('EventPlayer: Error processing events', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Process a single event
   * @param {Object} event - Event object from backend
   * @param {number} index - Event index
   */
  async processEvent(event, index) {
    console.log(`EventPlayer: Processing event ${index + 1}:`, event.type);

    switch (event.type) {
      case 'reveal':
        await this.handleReveal(event);
        break;
      case 'win':
        await this.handleWin(event);
        break;
      case 'multiplier_upgrade':
        await this.handleMultiplierUpgrade(event);
        break;
      case 'tumble':
        await this.handleTumble(event);
        break;
      case 'fill':
        await this.handleFill(event);
        break;
      default:
        console.warn(`EventPlayer: Unknown event type: ${event.type}`);
    }
  }

  /**
   * Handle REVEAL event - Initial grid reveal
   * Drops symbols from top with staggered animation
   */
  async handleReveal(event) {
    const { positions, symbols } = event;

    if (this.callbacks.onReveal) {
      // Create grid data from positions and symbols
      const gridData = this.createGridFromReveal(positions, symbols);

      // Trigger reveal animation with stagger
      for (let col = 0; col < GRID_COLS; col++) {
        for (let row = 0; row < GRID_ROWS; row++) {
          const index = row * GRID_COLS + col;
          const symbol = symbols[index];

          // Call reveal callback for each cell with delay
          setTimeout(() => {
            this.callbacks.onReveal(row, col, symbol);
          }, (col * GRID_ROWS + row) * ANIMATION_TIMING.REVEAL_DELAY);
        }
      }

      // Wait for all reveals to complete
      const totalDelay =
        GRID_COLS * GRID_ROWS * ANIMATION_TIMING.REVEAL_DELAY +
        ANIMATION_TIMING.REVEAL_DURATION;
      await sleep(totalDelay);
    }
  }

  /**
   * Handle WIN event - Flash winning symbols
   */
  async handleWin(event) {
    const { clusterId, symbol, positions, size, basePayout, multiplier, amount } = event;

    if (this.callbacks.onWin) {
      // Trigger win animation
      this.callbacks.onWin({
        clusterId,
        symbol,
        positions,
        size,
        basePayout,
        multiplier,
        amount,
      });
    }

    // Update win amount
    if (this.callbacks.onWinAmountUpdate) {
      this.callbacks.onWinAmountUpdate(amount);
    }

    // Wait for win animation
    await sleep(ANIMATION_TIMING.WIN_FLASH * 3 + ANIMATION_TIMING.WIN_HOLD);
  }

  /**
   * Handle MULTIPLIER_UPGRADE event - Ghost Spot power-up
   */
  async handleMultiplierUpgrade(event) {
    const { position, value } = event;
    const [row, col] = position;

    if (this.callbacks.onMultiplierUpgrade) {
      this.callbacks.onMultiplierUpgrade(row, col, value);
    }

    // Small delay between upgrades for visual effect
    await sleep(50);
  }

  /**
   * Handle TUMBLE event - Symbols falling down
   */
  async handleTumble(event) {
    const { movements } = event;

    if (this.callbacks.onTumble && movements.length > 0) {
      this.callbacks.onTumble(movements);
    }

    // Wait for tumble animation
    await sleep(ANIMATION_TIMING.TUMBLE_DURATION);
  }

  /**
   * Handle FILL event - New symbols dropping in
   */
  async handleFill(event) {
    const { fills } = event;

    if (this.callbacks.onFill) {
      // Stagger the fills for visual effect
      for (let i = 0; i < fills.length; i++) {
        const { position, symbol } = fills[i];
        const [row, col] = position;

        setTimeout(() => {
          this.callbacks.onFill(row, col, symbol);
        }, i * ANIMATION_TIMING.FILL_DELAY);
      }

      // Wait for all fills
      const totalDelay =
        fills.length * ANIMATION_TIMING.FILL_DELAY +
        ANIMATION_TIMING.FILL_DURATION;
      await sleep(totalDelay);
    }
  }

  /**
   * Create grid structure from reveal event
   */
  createGridFromReveal(positions, symbols) {
    const grid = Array(GRID_ROWS)
      .fill(null)
      .map(() => Array(GRID_COLS).fill(null));

    positions.forEach((pos, index) => {
      const [row, col] = pos;
      grid[row][col] = symbols[index];
    });

    return grid;
  }

  /**
   * Stop current playback
   */
  stop() {
    this.isPlaying = false;
  }
}

// Singleton instance
const eventPlayer = new EventPlayer();

export default eventPlayer;

/**
 * Hook-friendly function to play events
 * @param {Array} events - Events from backend
 * @param {Object} callbacks - Animation callbacks
 */
export async function playSpinEvents(events, callbacks) {
  eventPlayer.setCallbacks(callbacks);
  await eventPlayer.playSpinEvents(events);
}
