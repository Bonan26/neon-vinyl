/**
 * NEON VINYL: GHOST GROOVES - Game State Store
 * Zustand store for managing game state
 */
import { create } from 'zustand';
import { GRID_ROWS, GRID_COLS, DEFAULT_BET } from '../config/gameConfig';

// Available symbols for random generation (excluding special symbols)
const RANDOM_SYMBOLS = ['DJ', 'GV', 'HP', 'CS', 'NP', 'NB', 'NU'];

// Initial empty grid
const createEmptyGrid = () =>
  Array(GRID_ROWS).fill(null).map(() =>
    Array(GRID_COLS).fill(null).map(() => ({
      symbol: null,
      multiplier: 1,
      isWinning: false,
      isRemoving: false,
      isNew: false,
      isExploding: false,
    }))
  );

// Initial filled grid with random symbols
const createFilledGrid = () =>
  Array(GRID_ROWS).fill(null).map(() =>
    Array(GRID_COLS).fill(null).map(() => ({
      symbol: RANDOM_SYMBOLS[Math.floor(Math.random() * RANDOM_SYMBOLS.length)],
      multiplier: 1,
      isWinning: false,
      isRemoving: false,
      isNew: false,
      isExploding: false,
    }))
  );

// Default demo balance when backend is unavailable
const DEFAULT_DEMO_BALANCE = 10000;

// Game states for state machine
export const GameState = {
  INTRO: 'INTRO',
  BASE_GAME: 'BASE_GAME',
  BONUS_BUY_SEQUENCE: 'BONUS_BUY_SEQUENCE',
  BONUS_GAME: 'BONUS_GAME',
};

// Autospin speed modes
export const AutoSpinSpeed = {
  NORMAL: 'normal',
  BOOSTER: 'booster',
  SUPER_BOOSTER: 'super_booster',
};

// Speed multipliers for animations (lower = faster)
export const SPEED_MULTIPLIERS = {
  [AutoSpinSpeed.NORMAL]: 1.0,
  [AutoSpinSpeed.BOOSTER]: 0.5,
  [AutoSpinSpeed.SUPER_BOOSTER]: 0.2,
};

const useGameStore = create((set, get) => ({
  // Session state
  sessionId: null,
  balance: DEFAULT_DEMO_BALANCE,
  serverSeedHash: null,
  nonce: 0,

  // Game state machine
  gameState: GameState.INTRO,

  // Game state
  grid: createFilledGrid(),
  multiplierGrid: Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(1)),
  isSpinning: false,
  isAnimating: false,

  // Bet state
  betAmount: DEFAULT_BET,
  clientSeed: 'default_client_seed',

  // Win tracking
  currentWin: 0,
  lastWin: 0,
  tumbleCount: 0,
  maxMultiplier: 1,

  // Free Spins state
  freeSpinsRemaining: 0,
  freeSpinTotalWin: 0,
  isFreeSpin: false,

  // Boost state (Scatter Hunt / Wild Boost)
  scatterBoostSpins: 0,
  wildBoostSpins: 0,

  // Bonus state
  bonusBuyOptions: [],
  showBonusMenu: false,

  // Jackpot state
  jackpotTiers: {},
  lastJackpotWon: null,

  // Events queue for animation
  eventsQueue: [],
  currentEventIndex: 0,

  // Autospin state
  autoSpinActive: false,
  autoSpinCount: 0,           // Total spins to do (Infinity for unlimited)
  autoSpinRemaining: 0,       // Spins left
  autoSpinSpeed: AutoSpinSpeed.NORMAL,

  // Manual speed mode for bonus/free spins (when not in autospin)
  manualSpeedMode: AutoSpinSpeed.NORMAL,

  // UI state
  showProvablyFair: false,
  soundEnabled: true,
  musicEnabled: true,

  // Suspense mode for scatter reveal animation
  suspenseMode: false,

  // Actions
  setSession: (sessionData) => set({
    sessionId: sessionData.sessionID,
    balance: sessionData.balance,
    serverSeedHash: sessionData.serverSeedHash,
    nonce: sessionData.nonce,
  }),

  setBetAmount: (amount) => set({ betAmount: amount }),

  setClientSeed: (seed) => set({ clientSeed: seed }),

  setBalance: (balance) => set({ balance }),

  setIsSpinning: (spinning) => set({ isSpinning: spinning }),

  setIsAnimating: (animating) => set({ isAnimating: animating }),

  // Grid manipulation
  setGrid: (grid) => set({ grid }),

  updateCell: (row, col, updates) => set((state) => {
    const newGrid = state.grid.map((r, ri) =>
      r.map((c, ci) =>
        ri === row && ci === col ? { ...c, ...updates } : c
      )
    );
    return { grid: newGrid };
  }),

  setCellSymbol: (row, col, symbol) => {
    get().updateCell(row, col, { symbol });
  },

  setCellMultiplier: (row, col, multiplier) => set((state) => {
    const newMultiplierGrid = state.multiplierGrid.map((r, ri) =>
      r.map((m, ci) => (ri === row && ci === col ? multiplier : m))
    );
    return { multiplierGrid: newMultiplierGrid };
  }),

  setMultiplierGrid: (multiplierGrid) => set({ multiplierGrid }),

  markCellsWinning: (positions, isWinning = true) => set((state) => {
    const newGrid = state.grid.map((row, ri) =>
      row.map((cell, ci) => ({
        ...cell,
        isWinning: positions.some(([r, c]) => r === ri && c === ci) ? isWinning : cell.isWinning,
      }))
    );
    return { grid: newGrid };
  }),

  markCellsRemoving: (positions, isRemoving = true) => set((state) => {
    const newGrid = state.grid.map((row, ri) =>
      row.map((cell, ci) => ({
        ...cell,
        isRemoving: positions.some(([r, c]) => r === ri && c === ci) ? isRemoving : cell.isRemoving,
      }))
    );
    return { grid: newGrid };
  }),

  clearCells: (positions) => set((state) => {
    const newGrid = state.grid.map((row, ri) =>
      row.map((cell, ci) => {
        if (positions.some(([r, c]) => r === ri && c === ci)) {
          return { ...cell, symbol: null, isWinning: false, isRemoving: false };
        }
        return cell;
      })
    );
    return { grid: newGrid };
  }),

  // Win tracking
  addToCurrentWin: (amount) => set((state) => ({
    currentWin: state.currentWin + amount,
  })),

  resetCurrentWin: () => set({ currentWin: 0 }),

  setLastWin: (win) => set({ lastWin: win }),

  setTumbleCount: (count) => set({ tumbleCount: count }),

  setMaxMultiplier: (mult) => set({ maxMultiplier: mult }),

  // Events handling
  setEventsQueue: (events) => set({ eventsQueue: events, currentEventIndex: 0 }),

  nextEvent: () => set((state) => ({
    currentEventIndex: state.currentEventIndex + 1,
  })),

  clearEventsQueue: () => set({ eventsQueue: [], currentEventIndex: 0 }),

  // UI toggles
  toggleProvablyFair: () => set((state) => ({
    showProvablyFair: !state.showProvablyFair,
  })),

  toggleSound: () => set((state) => ({
    soundEnabled: !state.soundEnabled,
  })),

  toggleMusic: () => set((state) => ({
    musicEnabled: !state.musicEnabled,
  })),

  setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),

  setSuspenseMode: (mode) => set({ suspenseMode: mode }),

  toggleBonusMenu: () => set((state) => ({
    showBonusMenu: !state.showBonusMenu,
  })),

  // Free Spins actions
  setFreeSpins: (remaining, totalWin = 0) => set({
    freeSpinsRemaining: remaining,
    freeSpinTotalWin: totalWin,
    isFreeSpin: remaining > 0,
  }),

  updateFreeSpinWin: (amount) => set((state) => ({
    freeSpinTotalWin: state.freeSpinTotalWin + amount,
  })),

  clearFreeSpins: () => set({
    freeSpinsRemaining: 0,
    freeSpinTotalWin: 0,
    isFreeSpin: false,
  }),

  // Boost actions (Scatter Hunt / Wild Boost)
  setScatterBoostSpins: (spins) => set({ scatterBoostSpins: spins }),
  setWildBoostSpins: (spins) => set({ wildBoostSpins: spins }),
  updateBoostSpins: (scatterSpins, wildSpins) => set({
    scatterBoostSpins: scatterSpins,
    wildBoostSpins: wildSpins,
  }),

  // Bonus options
  setBonusBuyOptions: (options) => set({ bonusBuyOptions: options }),

  // Jackpot
  setJackpotTiers: (tiers) => set({ jackpotTiers: tiers }),
  setLastJackpotWon: (jackpot) => set({ lastJackpotWon: jackpot }),

  // Autospin actions
  startAutoSpin: (count, speed = AutoSpinSpeed.NORMAL) => set({
    autoSpinActive: true,
    autoSpinCount: count,
    autoSpinRemaining: count,
    autoSpinSpeed: speed,
  }),

  decrementAutoSpin: () => set((state) => {
    const newRemaining = state.autoSpinRemaining === Infinity
      ? Infinity
      : state.autoSpinRemaining - 1;
    const shouldStop = newRemaining <= 0 && newRemaining !== Infinity;
    return {
      autoSpinRemaining: newRemaining,
      autoSpinActive: !shouldStop,
      // Reset speed to NORMAL when autospin stops
      autoSpinSpeed: shouldStop ? AutoSpinSpeed.NORMAL : state.autoSpinSpeed,
    };
  }),

  stopAutoSpin: () => set({
    autoSpinActive: false,
    autoSpinCount: 0,
    autoSpinRemaining: 0,
    autoSpinSpeed: AutoSpinSpeed.NORMAL, // Reset speed when stopping
  }),

  setAutoSpinSpeed: (speed) => set({ autoSpinSpeed: speed }),

  // Manual speed mode for bonus/free spins
  setManualSpeedMode: (speed) => set({ manualSpeedMode: speed }),

  // Get effective speed: autospin speed if autospin active, otherwise manual speed mode
  getEffectiveSpeed: () => {
    const state = get();
    if (state.autoSpinActive) {
      return state.autoSpinSpeed;
    }
    // Use manual speed during free spins when not in autospin
    if (state.freeSpinsRemaining > 0) {
      return state.manualSpeedMode;
    }
    return AutoSpinSpeed.NORMAL;
  },

  // Game state machine
  setGameState: (state) => set({ gameState: state }),

  startGame: () => set({ gameState: GameState.BASE_GAME }),

  enterBonusBuySequence: () => set({ gameState: GameState.BONUS_BUY_SEQUENCE }),

  enterBonusGame: () => set({ gameState: GameState.BONUS_GAME }),

  exitBonusGame: () => set({ gameState: GameState.BASE_GAME }),

  // Reset for new spin (keep multipliers during free spins)
  resetForNewSpin: () => {
    const state = get();
    const keepMultipliers = state.freeSpinsRemaining > 0;

    set({
      currentWin: 0,
      tumbleCount: 0,
      maxMultiplier: 1,
      eventsQueue: [],
      currentEventIndex: 0,
      // Only reset multipliers if NOT in free spins
      multiplierGrid: keepMultipliers
        ? state.multiplierGrid
        : Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(1)),
      grid: state.grid.map(row =>
        row.map(cell => ({
          ...cell,
          isWinning: false,
          isRemoving: false,
          isNew: false,
          isExploding: false,
        }))
      ),
    });
  },

  // Complete reset
  resetGame: () => set({
    grid: createFilledGrid(),
    multiplierGrid: Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(1)),
    isSpinning: false,
    isAnimating: false,
    currentWin: 0,
    lastWin: 0,
    tumbleCount: 0,
    maxMultiplier: 1,
    eventsQueue: [],
    currentEventIndex: 0,
  }),
}));

export default useGameStore;
