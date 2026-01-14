/**
 * LES WOLFS 86 - Game Configuration
 * Frontend configuration mirroring backend settings
 * Compact rectangular layout inspired by "Le Bandit" (Hacksaw Gaming)
 */

// Grid Configuration - RECTANGULAR like Hacksaw (wider than tall)
export const GRID_ROWS = 5;    // 5 rows (shorter)
export const GRID_COLS = 6;    // 6 columns (wider)
export const CELL_SIZE = 100;  // Larger size for better visibility
export const CELL_GAP = 3;     // Subtle gap between cells

// Calculate grid dimensions
export const GRID_WIDTH = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
export const GRID_HEIGHT = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;

// Stage dimensions - Rectangular format (wider)
export const STAGE_WIDTH = GRID_WIDTH + 12;
export const STAGE_HEIGHT = GRID_HEIGHT + 12;

// Symbol mapping - Les Wolfs 86 Theme
export const SYMBOLS = {
  // Special symbols
  WD: { id: 'WD', name: 'Wild', tier: 'special', color: 0x00ff00, isWild: true },
  SC: { id: 'SC', name: 'Scatter', tier: 'special', color: 0xf5d742, isScatter: true },
  // High tier - Wolves
  WR: { id: 'WR', name: 'Red Wolf', tier: 'high', color: 0xcc3333 },
  WB: { id: 'WB', name: 'Black Wolf', tier: 'high', color: 0x333333 },
  WP: { id: 'WP', name: 'Purple Wolf', tier: 'high', color: 0x9966cc },
  // Mid tier - Wolves
  WG: { id: 'WG', name: 'Gray Wolf', tier: 'mid', color: 0x888888 },
  W6: { id: 'W6', name: 'Green Wolf', tier: 'mid', color: 0x339933 },
  WS: { id: 'WS', name: 'Spirit Wolf', tier: 'mid', color: 0x334466 },
  // Low tier - Hats
  HC: { id: 'HC', name: 'Cap W86', tier: 'low', color: 0x224422 },
  HS: { id: 'HS', name: 'Steampunk Hat', tier: 'low', color: 0x996633 },
  HW: { id: 'HW', name: 'Straw Hat', tier: 'low', color: 0xccaa33 },
  HK: { id: 'HK', name: 'Peacock Hat', tier: 'low', color: 0x339999 },
};

// Free spins configuration
export const FREE_SPINS_CONFIG = {
  SCATTER_COUNT_FOR_TRIGGER: 3,
  FREE_SPINS_AWARDED: {
    3: 10,
    4: 15,
    5: 20,
    6: 25,
  },
  RETRIGGER_SPINS: 5,
};

// Multiplier colors (for Ghost Spots) - Golden/Premium Theme
export const MULTIPLIER_COLORS = {
  1: null,
  2: 0xd4a84a,     // Light gold
  4: 0xc9a855,     // Gold
  8: 0xffd700,     // Bright gold
  16: 0xffb000,    // Orange gold
  32: 0xff8c00,    // Dark orange
  64: 0xff6600,    // Orange
  128: 0xff4500,   // Red orange
  256: 0xff0066,   // Hot pink
  512: 0xffffff,   // White (max glow)
  1024: 0xffd700,  // Pure gold (legendary)
};

// Animation timing (ms)
export const ANIMATION_TIMING = {
  REVEAL_DELAY: 25,
  REVEAL_DURATION: 350,
  WIN_FLASH: 250,
  WIN_HOLD: 400,
  REMOVE_DURATION: 250,
  TUMBLE_DURATION: 350,
  FILL_DELAY: 40,
  FILL_DURATION: 300,
  MULTIPLIER_UPGRADE: 400,
};

// Bet options
export const BET_OPTIONS = [0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00];
export const DEFAULT_BET = 1.00;

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Sound effects
export const SOUNDS = {
  SPIN: '/sounds/spin.mp3',
  WIN: '/sounds/win.mp3',
  BIG_WIN: '/sounds/big_win.mp3',
  TUMBLE: '/sounds/tumble.mp3',
  MULTIPLIER: '/sounds/multiplier.mp3',
  CLICK: '/sounds/click.mp3',
};

// Background music configuration
export const MUSIC_CONFIG = {
  ENABLED_BY_DEFAULT: true,
  DEFAULT_VOLUME: -6,
  FADE_DURATION: 2,
};

// Placeholder symbol textures
export const PLACEHOLDER_SYMBOLS = true;
