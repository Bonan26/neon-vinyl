/**
 * NEON VINYL: GHOST GROOVES - Game Configuration
 * Frontend configuration mirroring backend settings
 */

// Grid Configuration
export const GRID_ROWS = 7;
export const GRID_COLS = 7;
export const CELL_SIZE = 80;
export const CELL_GAP = 4;

// Calculate grid dimensions
export const GRID_WIDTH = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
export const GRID_HEIGHT = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;

// Stage dimensions (with padding for UI)
export const STAGE_WIDTH = 900;
export const STAGE_HEIGHT = 700;

// Symbol mapping
export const SYMBOLS = {
  // Special symbols
  WD: { id: 'WD', name: 'Wild', tier: 'special', color: 0xffd700, isWild: true },
  SC: { id: 'SC', name: 'Scatter', tier: 'special', color: 0x00ff88, isScatter: true },
  // High tier
  DJ: { id: 'DJ', name: 'DJ Spooky', tier: 'high', color: 0xff00ff },
  GV: { id: 'GV', name: 'Gold Vinyl', tier: 'high', color: 0xffd700 },
  // Mid tier
  HP: { id: 'HP', name: 'Headphones', tier: 'mid', color: 0x00ffff },
  CS: { id: 'CS', name: 'Cassette', tier: 'mid', color: 0xff6600 },
  // Low tier
  NP: { id: 'NP', name: 'Note Pink', tier: 'low', color: 0xff69b4 },
  NB: { id: 'NB', name: 'Note Blue', tier: 'low', color: 0x00bfff },
  NU: { id: 'NU', name: 'Note Purple', tier: 'low', color: 0xbf00ff },
};

// Free spins configuration
export const FREE_SPINS_CONFIG = {
  SCATTER_COUNT_FOR_TRIGGER: 3, // 3 scatters = free spins
  FREE_SPINS_AWARDED: {
    3: 10,  // 3 scatters = 10 free spins
    4: 15,  // 4 scatters = 15 free spins
    5: 20,  // 5 scatters = 20 free spins
    6: 25,  // 6+ scatters = 25 free spins
  },
  RETRIGGER_SPINS: 5, // Additional spins on retrigger
};

// Multiplier colors (for Ghost Spots)
export const MULTIPLIER_COLORS = {
  1: null, // No glow
  2: 0x00ffff,   // Cyan
  4: 0x00ff66,   // Green
  8: 0xffff00,   // Yellow
  16: 0xff6600,  // Orange
  32: 0xff00ff,  // Magenta
  64: 0xff0066,  // Pink
  128: 0xff0000, // Red
  256: 0xffffff, // White
  512: 0xffd700, // Gold
  1024: 0xff00ff, // Neon Pink (max)
};

// Animation timing (ms)
export const ANIMATION_TIMING = {
  REVEAL_DELAY: 30,      // Delay between each symbol appearing
  REVEAL_DURATION: 400,  // Single symbol reveal animation
  WIN_FLASH: 300,        // Win flash duration
  WIN_HOLD: 500,         // Hold on win before removing
  REMOVE_DURATION: 300,  // Symbol removal animation
  TUMBLE_DURATION: 400,  // Symbols falling
  FILL_DELAY: 50,        // Delay between new symbols
  FILL_DURATION: 350,    // New symbol drop animation
  MULTIPLIER_UPGRADE: 500, // Multiplier upgrade effect
};

// Bet options
export const BET_OPTIONS = [0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00];
export const DEFAULT_BET = 1.00;

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Sound effects (placeholder paths)
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
  DEFAULT_VOLUME: -6, // dB
  FADE_DURATION: 2,   // seconds
};

// Placeholder symbol textures (colored squares until Gemini generates real ones)
export const PLACEHOLDER_SYMBOLS = true;
