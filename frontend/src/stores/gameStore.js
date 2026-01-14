/**
 * LES WOLFS 86 - Game State Store
 * Zustand store for managing game state
 * Stake Engine (Carrot) Standard compatible
 */
import { create } from 'zustand';
import { GRID_ROWS, GRID_COLS, DEFAULT_BET } from '../config/gameConfig';

// Stake Engine monetary precision (6 decimals)
const MONETARY_MULTIPLIER = 1_000_000;
const fromStakeAmount = (value) => value / MONETARY_MULTIPLIER;

// Available symbols for random generation (excluding special symbols)
// Wolves (high/mid) and Hats (low)
const RANDOM_SYMBOLS = ['WR', 'WB', 'WP', 'WG', 'W6', 'WS', 'HC', 'HS', 'HW', 'HK'];

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
      isSpinning: false,
      isPendingReveal: false,
      wildMultiplierTarget: null, // For wild multiplier spinning animation
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
      isSpinning: false,
      isPendingReveal: false,
      wildMultiplierTarget: null, // For wild multiplier spinning animation
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
  // These are toggles - when active, each spin costs more (multiplier applied per spin)
  scatterBoostActive: false,  // 2x cost per spin when active
  wildBoostActive: false,     // 5x cost per spin when active

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

  // Turbo mode - skip animations when user spams space/click
  turboMode: false,
  turboCounter: 0,  // Counts rapid inputs to trigger turbo

  // Stake Engine config (from /wallet/authenticate)
  stakeConfig: null,

  // Actions
  setSession: (sessionData) => {
    // Handle both legacy format (balance as float) and Stake Engine format (balance as object)
    let balance = sessionData.balance;
    if (typeof balance === 'object' && balance.amount !== undefined) {
      balance = fromStakeAmount(balance.amount);
    }
    set({
      sessionId: sessionData.sessionID,
      balance: balance,
      serverSeedHash: sessionData.serverSeedHash,
      nonce: sessionData.nonce,
      stakeConfig: sessionData.config || null,
    });
  },

  setBetAmount: (amount) => set({ betAmount: amount }),

  setClientSeed: (seed) => set({ clientSeed: seed }),

  setBalance: (balance) => {
    // Handle both legacy format (balance as float) and Stake Engine format (balance as object)
    let balanceValue = balance;
    if (typeof balance === 'object' && balance.amount !== undefined) {
      balanceValue = fromStakeAmount(balance.amount);
    }
    set({ balance: balanceValue });
  },

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

  // Turbo mode actions - triggered by rapid space/click inputs
  triggerTurbo: () => set((state) => {
    // Increment counter and enable turbo after 2 rapid inputs
    const newCounter = state.turboCounter + 1;
    return {
      turboCounter: newCounter,
      turboMode: newCounter >= 2,  // Enable after 2 rapid taps
    };
  }),

  resetTurbo: () => set({ turboMode: false, turboCounter: 0 }),

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

  // Boost actions (Scatter Hunt / Wild Boost) - toggles that affect spin cost
  setScatterBoostActive: (active) => set({ scatterBoostActive: active }),
  setWildBoostActive: (active) => set({ wildBoostActive: active }),
  toggleScatterBoost: () => set((state) => ({ scatterBoostActive: !state.scatterBoostActive })),
  toggleWildBoost: () => set((state) => ({ wildBoostActive: !state.wildBoostActive })),
  // Calculate effective bet amount (with boost multipliers)
  getEffectiveBet: () => {
    const state = get();
    let multiplier = 1;
    if (state.scatterBoostActive) multiplier *= 2;  // Scatter Hunt: 2x
    if (state.wildBoostActive) multiplier *= 5;    // Wild Boost: 5x
    return state.betAmount * multiplier;
  },

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
    // Always use manual speed mode when set (base game and free spins)
    return state.manualSpeedMode;
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
          isSpinning: false,
          isPendingReveal: false,
          wildMultiplierTarget: null,
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
