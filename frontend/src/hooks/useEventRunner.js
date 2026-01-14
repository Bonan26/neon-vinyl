/**
 * NEON VINYL: GHOST GROOVES - Event Runner Hook
 *
 * THE CONDUCTOR: Orchestrates all game animations.
 * Uses coordinated timing for smooth, fluid animations.
 */
import { useCallback, useState, useRef } from 'react';
import useGameStore, { SPEED_MULTIPLIERS } from '../stores/gameStore';
import { GRID_ROWS, GRID_COLS } from '../config/gameConfig';
import audioService from '../services/audioService';

// Base animation timings (in milliseconds) - FASTER for better gameplay
const BASE_TIMING = {
  REVEAL_PER_ROW: 25,       // Time between each row reveal (was 40)
  REVEAL_SETTLE: 200,       // Time for reveal animation to complete (was 300)
  WIN_HIGHLIGHT: 300,       // Time to show winning cells highlighted (was 400)
  WIN_PULSE: 400,           // Additional pulse animation time (was 600)
  WIN_REMOVE: 250,          // Time for remove animation (was 350)
  TUMBLE_SETTLE: 250,       // Time for tumble animation to complete (was 400)
  FILL_PER_CELL: 20,        // Time between each fill (was 30)
  FILL_SETTLE: 200,         // Time for fill animation to complete (was 350)
  PAUSE_BETWEEN: 50,        // Brief pause between phases (was 100)
  WILD_EXPLOSION: 600,      // Time for Wild explosion animation (was 800)
  WILD_EXPLOSION_CELL: 60,  // Time between each affected cell (was 100)
};

// Function to get timing adjusted for speed
const getTiming = (speedMultiplier = 1) => {
  const multiplier = Math.max(0.1, speedMultiplier); // Minimum 10% of normal speed
  return Object.fromEntries(
    Object.entries(BASE_TIMING).map(([key, value]) => [key, Math.round(value * multiplier)])
  );
};

// Sleep function that respects turbo mode
const sleep = (ms) => {
  // Check turbo mode - if active, reduce time drastically
  const turboMode = useGameStore.getState().turboMode;
  const actualMs = turboMode ? Math.min(ms * 0.1, 20) : ms; // 10% of time, max 20ms
  return new Promise(resolve => setTimeout(resolve, actualMs));
};

/**
 * useEventRunner Hook
 */
const useEventRunner = () => {
  const [isRunning, setIsRunning] = useState(false);

  // Callbacks for bonus events
  const onBonusTriggerRef = useRef(null);
  const onBonusEndRef = useRef(null);
  const onWinPopupRef = useRef(null);
  const onSpinWinRef = useRef(null); // Called at end of spin with total win

  // Store actions
  const updateCell = useGameStore((state) => state.updateCell);
  const setCellMultiplier = useGameStore((state) => state.setCellMultiplier);
  const setBalance = useGameStore((state) => state.setBalance);
  const setLastWin = useGameStore((state) => state.setLastWin);
  const addToCurrentWin = useGameStore((state) => state.addToCurrentWin);
  const resetForNewSpin = useGameStore((state) => state.resetForNewSpin);
  const setFreeSpins = useGameStore((state) => state.setFreeSpins);
  const setMultiplierGrid = useGameStore((state) => state.setMultiplierGrid);
  const setSuspenseMode = useGameStore((state) => state.setSuspenseMode);

  // Get state from store
  const betAmount = useGameStore((state) => state.betAmount);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const autoSpinActive = useGameStore((state) => state.autoSpinActive);
  const autoSpinSpeed = useGameStore((state) => state.autoSpinSpeed);
  const manualSpeedMode = useGameStore((state) => state.manualSpeedMode);

  // Calculate timing based on effective speed
  // - During autospin: use autoSpinSpeed
  // - Otherwise: always use manualSpeedMode (base game and free spins)
  const getSpeedMultiplier = useCallback(() => {
    let effectiveSpeed;
    if (autoSpinActive) {
      effectiveSpeed = autoSpinSpeed;
    } else {
      // Always use manual speed mode (x2 or x4 from settings)
      effectiveSpeed = manualSpeedMode;
    }
    return SPEED_MULTIPLIERS[effectiveSpeed] || 1;
  }, [autoSpinActive, autoSpinSpeed, manualSpeedMode]);

  /**
   * Set callback for bonus trigger event
   */
  const setOnBonusTrigger = useCallback((callback) => {
    onBonusTriggerRef.current = callback;
  }, []);

  /**
   * Set callback for bonus end event
   */
  const setOnBonusEnd = useCallback((callback) => {
    onBonusEndRef.current = callback;
  }, []);

  /**
   * Set callback for win popup
   */
  const setOnWinPopup = useCallback((callback) => {
    onWinPopupRef.current = callback;
  }, []);

  /**
   * Set callback for total spin win (for big win celebration)
   */
  const setOnSpinWin = useCallback((callback) => {
    onSpinWinRef.current = callback;
  }, []);

  /**
   * Process REVEAL event - Real slot machine effect with spinning reels
   * @param {boolean} skipSuspense - If true, skip suspense animation (for bonus buy)
   */
  const processReveal = useCallback(async (event, skipSuspense = false) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing reveal (speed:', getSpeedMultiplier(), ', skipSuspense:', skipSuspense, ')');
    const { positions, symbols } = event;

    // If skipSuspense (bonus buy), do fast reveal
    if (skipSuspense) {
      // Reveal all at once
      positions.forEach((pos, i) => {
        const [row, col] = pos;
        updateCell(row, col, {
          symbol: symbols[i],
          isNew: true,
          isWinning: false,
          isRemoving: false,
          isSpinning: false,
        });
      });
      await sleep(TIMING.REVEAL_SETTLE);
      for (const pos of positions) {
        const [row, col] = pos;
        updateCell(row, col, { isNew: false });
      }
      await sleep(TIMING.PAUSE_BETWEEN);
      return;
    }

    // Track scatter count and positions for suspense
    let scatterCount = 0;
    const SCATTER_SYMBOL = 'SC';
    let suspenseStartIndex = -1; // Cell index where we hit 2 scatters

    // Flatten all cells in column-by-column order (like a real slot machine)
    // Columns reveal from left to right, within each column from top to bottom
    const cellsInOrder = [];
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const index = positions.findIndex(p => p[0] === row && p[1] === col);
        if (index !== -1) {
          cellsInOrder.push({ pos: positions[index], symbol: symbols[index] });
        }
      }
    }

    // STEP 1: Set ALL cells to spinning mode (empty but showing cycling symbols)
    for (const { pos } of cellsInOrder) {
      const [row, col] = pos;
      updateCell(row, col, {
        symbol: null,
        isSpinning: true,
        isNew: false,
        isWinning: false,
        isRemoving: false,
        isPendingReveal: false,
      });
    }

    // Brief delay to let spinning animation start
    await sleep(300);

    // Timing constants - FASTER
    const BASE_CELL_DELAY = Math.max(15, TIMING.REVEAL_PER_ROW / 2);

    // SUSPENSE MODE TIMING - Faster but still dramatic
    const SUSPENSE_BASE = 80;         // Starting delay after 2 scatters (was 200)
    const SUSPENSE_INCREMENT = 15;    // Each cell gets this much slower (was 40)
    const MAX_SUSPENSE_DELAY = 300;   // Cap for cell delay (was 800)
    const HIGHLIGHT_DURATION = 60;    // Time cell is highlighted before reveal (was 150)

    // STEP 2: Land cells one by one (column by column)
    for (let cellIndex = 0; cellIndex < cellsInOrder.length; cellIndex++) {
      const { pos, symbol } = cellsInOrder[cellIndex];
      const [row, col] = pos;

      // Calculate how close we are to the end (last 20% of cells)
      const progressPercent = cellIndex / cellsInOrder.length;
      const isNearEnd = progressPercent > 0.8;

      // Check if we're in suspense mode (2+ scatters already found)
      const inSuspenseMode = scatterCount >= 2;

      if (inSuspenseMode) {
        // SUSPENSE MODE: Stop spinning, highlight, pause, then reveal
        setSuspenseMode(true);

        // Start the continuous suspense music loop (only on first entry)
        if (suspenseStartIndex === cellIndex - 1) {
          audioService.startSuspenseLoop?.();
        }

        // Calculate progressive delay
        const cellsSinceSuspense = cellIndex - suspenseStartIndex;
        let cellDelay = Math.min(
          SUSPENSE_BASE + (cellsSinceSuspense * SUSPENSE_INCREMENT),
          MAX_SUSPENSE_DELAY
        );

        // Extra delay near the end
        if (isNearEnd) {
          cellDelay *= 1.5;
        }

        // Stop spinning and HIGHLIGHT: Show cell is about to be revealed
        updateCell(row, col, {
          symbol: null,
          isSpinning: false,
          isPendingReveal: true,
          isWinning: false,
        });
        await sleep(HIGHLIGHT_DURATION + (isNearEnd ? 150 : 0));

        // Play suspense sound periodically
        if (cellsSinceSuspense > 0 && cellsSinceSuspense % 3 === 0) {
          audioService.playScatterSuspenseSound?.();
        }

        // REVEAL: Show the symbol with landing animation
        updateCell(row, col, {
          symbol,
          isNew: true,
          isSpinning: false,
          isPendingReveal: false,
          isWinning: false,
          isRemoving: false,
        });

        // Check if this is a scatter!
        if (symbol === SCATTER_SYMBOL) {
          scatterCount++;
          // JACKPOT! We got the 3rd scatter - brief dramatic pause
          if (scatterCount === 3) {
            audioService.playScatterTriggerSound?.();
            await sleep(400); // Dramatic pause on 3rd scatter (was 1200)
          }
        }

        // Wait after reveal
        await sleep(cellDelay);

      } else {
        // NORMAL MODE: Stop spinning and land the symbol
        updateCell(row, col, {
          symbol,
          isNew: true,
          isSpinning: false,
          isPendingReveal: false,
          isWinning: false,
          isRemoving: false,
        });

        if (symbol === SCATTER_SYMBOL) {
          scatterCount++;
          // If we just hit 2 scatters, mark the suspense start
          if (scatterCount === 2) {
            suspenseStartIndex = cellIndex;
            // Play sound when entering suspense
            audioService.playScatterSuspenseSound?.();
            await sleep(150); // Brief pause when entering suspense (was 400)
          }
        }

        // Normal delay between cells
        await sleep(BASE_CELL_DELAY);
      }
    }

    // If we ended with 3+ scatters, brief celebration pause
    if (scatterCount >= 3) {
      await sleep(200); // Was 600
    }

    // Wait for animations to settle
    await sleep(TIMING.REVEAL_SETTLE);

    // Clear isNew and isPendingReveal flags
    for (const pos of positions) {
      const [row, col] = pos;
      updateCell(row, col, { isNew: false, isPendingReveal: false, isSpinning: false });
    }

    // Reset suspense mode and stop suspense music after reveal completes
    setSuspenseMode(false);
    audioService.stopSuspenseLoop?.();

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [updateCell, getSpeedMultiplier, setSuspenseMode]);

  /**
   * Process WIN event - Highlight winning cells (removal handled separately)
   * @param {boolean} shouldRemove - If true, remove symbols after animation
   */
  const processWin = useCallback(async (event, shouldRemove = true) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing win', event.amount, 'shouldRemove:', shouldRemove);
    const { positions, amount, symbol, size } = event;

    // Play win sound
    if (amount > 0) {
      audioService.playWinSound();
    }

    // Mark cells as winning
    for (const [row, col] of positions) {
      updateCell(row, col, { isWinning: true });
    }

    // Show win popup
    if (onWinPopupRef.current && amount > 0) {
      onWinPopupRef.current({
        amount,
        symbol,
        size,
        positions,
      });
    }

    // Add to win counter DURING animation
    addToCurrentWin(amount);

    // Wait for highlight and pulse animation
    await sleep(TIMING.WIN_HIGHLIGHT + TIMING.WIN_PULSE);

    // Clear winning state
    for (const [row, col] of positions) {
      updateCell(row, col, { isWinning: false });
    }

    // Only remove if this is the last win for these positions
    if (shouldRemove) {
      // Mark as removing (triggers fade out)
      for (const [row, col] of positions) {
        updateCell(row, col, { isRemoving: true });
      }

      // Wait for remove animation
      await sleep(TIMING.WIN_REMOVE);

      // Clear the cells
      for (const [row, col] of positions) {
        updateCell(row, col, {
          symbol: null,
          isWinning: false,
          isRemoving: false,
        });
      }

      await sleep(TIMING.PAUSE_BETWEEN);
    }
  }, [updateCell, addToCurrentWin, getSpeedMultiplier]);

  /**
   * Remove cells - used after all wins in a phase are processed
   */
  const removeCells = useCallback(async (positions) => {
    const TIMING = getTiming(getSpeedMultiplier());
    // Mark as removing (triggers fade out)
    for (const [row, col] of positions) {
      updateCell(row, col, { isRemoving: true, isWinning: false });
    }

    // Wait for remove animation
    await sleep(TIMING.WIN_REMOVE);

    // Clear the cells
    for (const [row, col] of positions) {
      updateCell(row, col, {
        symbol: null,
        isWinning: false,
        isRemoving: false,
      });
    }

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [updateCell, getSpeedMultiplier]);

  /**
   * Process FREE_SPINS_TRIGGER event
   * @param {boolean} skipPopup - If true, don't show bonus trigger popup (used for bonus buy)
   */
  const processFreeSpinsTrigger = useCallback(async (event, skipPopup = false) => {
    console.log('EventRunner: FREE SPINS TRIGGERED!', event, 'skipPopup:', skipPopup);
    const { freeSpinsAwarded, positions, scatterCount, isRetrigger = false, isBonusBuy = false } = event;

    // Play appropriate sound
    if (isRetrigger) {
      audioService.playRetriggerSound();
    } else {
      audioService.playScatterTriggerSound();
    }

    // Highlight scatter positions
    for (const [row, col] of positions) {
      updateCell(row, col, { isWinning: true });
    }

    // Wait a moment for scatter highlight
    await sleep(800);

    // Trigger bonus overlay ONLY if not skipping and not a bonus buy
    if (!skipPopup && !isBonusBuy && onBonusTriggerRef.current) {
      await onBonusTriggerRef.current({
        freeSpinsAwarded,
        scatterCount,
        isRetrigger,
      });
    }

    // Clear scatter highlights
    for (const [row, col] of positions) {
      updateCell(row, col, { isWinning: false });
    }

  }, [updateCell]);

  /**
   * Process MULTIPLIER_UPGRADE event
   */
  const processMultiplierUpgrade = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing multiplier upgrade');
    const { position, value } = event;
    const [row, col] = position;
    setCellMultiplier(row, col, value);
    await sleep(Math.max(50, TIMING.PAUSE_BETWEEN));
  }, [setCellMultiplier, getSpeedMultiplier]);

  /**
   * Process WILD_EXPLOSION event - Wild explodes and multiplies adjacent cells
   * The multiplier animation happens directly on the wild cell (no popup)
   */
  const processWildExplosion = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing WILD EXPLOSION!', event);
    const { wildPosition, affectedCells, cellDetails, wheelMultiplier, explosionFactor } = event;

    // Use wheelMultiplier from backend (new system) or fallback to explosionFactor (old system)
    const targetMultiplier = wheelMultiplier || explosionFactor || 64;
    const [wildRow, wildCol] = wildPosition;

    // Start the wild multiplier spinning animation on the cell
    updateCell(wildRow, wildCol, { wildMultiplierTarget: targetMultiplier });

    // Play sound effect
    audioService.playWheelSpinSound?.();

    // Wait for animation to complete (animation takes about 2 seconds)
    await sleep(2000);

    // Clear the wild multiplier target (animation complete)
    updateCell(wildRow, wildCol, { wildMultiplierTarget: null });

    // Play result sound
    audioService.playWheelResultSound?.(targetMultiplier);

    // Now apply the multipliers to affected cells with explosion effect
    if (cellDetails && cellDetails.length > 0) {
      for (const detail of cellDetails) {
        const [row, col] = detail.position;
        setCellMultiplier(row, col, detail.newMultiplier);
        updateCell(row, col, { isExploding: true });
        await sleep(TIMING.WILD_EXPLOSION_CELL);
      }
    } else {
      // Fallback to affectedCells if no cellDetails
      for (const [row, col] of affectedCells) {
        updateCell(row, col, { isExploding: true });
        await sleep(TIMING.WILD_EXPLOSION_CELL);
      }
    }

    // Clear exploding state after a delay
    await sleep(TIMING.WILD_EXPLOSION / 2);
    for (const [row, col] of affectedCells) {
      updateCell(row, col, { isExploding: false });
    }

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [setCellMultiplier, updateCell, getSpeedMultiplier]);

  /**
   * Process TUMBLE event - Move symbols down to fill gaps
   */
  const processTumble = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing tumble');
    const { movements } = event;

    if (!movements || movements.length === 0) return;

    // Play tumble sound
    audioService.playTumbleSound();

    // Sort by column, then by destination row (process bottom-most first)
    const sortedMovements = [...movements].sort((a, b) => {
      if (a.from[1] !== b.from[1]) return a.from[1] - b.from[1];
      return b.to[0] - a.to[0];
    });

    // Apply all movements at once
    for (const { from, to, symbol } of sortedMovements) {
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;

      updateCell(fromRow, fromCol, { symbol: null, isNew: false });
      updateCell(toRow, toCol, {
        symbol,
        isNew: true,
        isWinning: false,
        isRemoving: false,
      });
    }

    // Wait for tumble animation
    await sleep(TIMING.TUMBLE_SETTLE);

    // Clear isNew flags
    for (const { to } of movements) {
      const [row, col] = to;
      updateCell(row, col, { isNew: false });
    }

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [updateCell, getSpeedMultiplier]);

  /**
   * Process FILL event - Fill empty positions with new symbols
   * Simplified: fast fill with brief highlight when scatter might complete
   */
  const processFill = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    const { fills } = event;

    if (!fills || fills.length === 0) return;

    // Get current grid to count existing scatters
    const currentGrid = useGameStore.getState().grid;
    let existingScatterCount = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (currentGrid[row]?.[col]?.symbol === 'SC') {
          existingScatterCount++;
        }
      }
    }

    // Sort fills by column for slot machine effect
    const sortedFills = [...fills].sort((a, b) => {
      if (a.position[1] !== b.position[1]) return a.position[1] - b.position[1];
      return a.position[0] - b.position[0];
    });

    const SCATTER_SYMBOL = 'SC';
    let scatterCount = existingScatterCount;
    const useSuspense = existingScatterCount >= 2;

    // Fast fill with brief suspense only when 2+ scatters exist
    for (let i = 0; i < sortedFills.length; i++) {
      const { position, symbol } = sortedFills[i];
      const [row, col] = position;

      // Brief highlight before reveal only in suspense mode
      if (useSuspense) {
        updateCell(row, col, { isPendingReveal: true });
        await sleep(30); // Very brief highlight
      }

      // Reveal symbol
      updateCell(row, col, {
        symbol,
        isNew: true,
        isSpinning: false,
        isPendingReveal: false,
        isWinning: false,
        isRemoving: false,
      });

      // Check for scatter
      if (symbol === SCATTER_SYMBOL) {
        scatterCount++;
        if (scatterCount === 3) {
          audioService.playScatterTriggerSound?.();
          await sleep(300); // Brief pause on 3rd scatter
        }
      }

      // Delay between fills (faster in suspense to keep momentum)
      await sleep(useSuspense ? 40 : TIMING.FILL_PER_CELL);
    }

    await sleep(TIMING.FILL_SETTLE);

    // Clear isNew flags
    for (const { position } of fills) {
      const [row, col] = position;
      updateCell(row, col, { isNew: false, isPendingReveal: false });
    }

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [updateCell, getSpeedMultiplier]);

  /**
   * Process a single event
   * @param {boolean} skipWinRemoval - If true, don't remove symbols on win (handled separately)
   * @param {boolean} isBonusBuy - If true, skip bonus trigger popup and suspense animation
   */
  const processEvent = useCallback(async (event, skipWinRemoval = false, isBonusBuy = false) => {
    switch (event.type) {
      case 'reveal':
        await processReveal(event, isBonusBuy); // Skip suspense for bonus buy
        break;
      case 'win':
        await processWin(event, !skipWinRemoval);
        break;
      case 'multiplier_upgrade':
        await processMultiplierUpgrade(event);
        break;
      case 'tumble':
        await processTumble(event);
        break;
      case 'fill':
        await processFill(event);
        break;
      case 'free_spins_trigger':
        await processFreeSpinsTrigger(event, isBonusBuy);
        break;
      case 'wild_explosion':
        await processWildExplosion(event);
        break;
      case 'jackpot_win':
        console.log('EventRunner: JACKPOT!', event);
        await sleep(1000);
        break;
      default:
        console.warn('EventRunner: Unknown event type', event.type);
    }
  }, [processReveal, processWin, processMultiplierUpgrade, processTumble, processFill, processFreeSpinsTrigger, processWildExplosion]);

  /**
   * PLAY ALL EVENTS - Main entry point
   */
  const playAllEvents = useCallback(async (response, options = {}) => {
    if (isRunning) {
      console.warn('EventRunner: Already running');
      return;
    }

    const { isBonusEnd = false, bonusTotalWin = 0, isBonusBuy = false } = options;

    console.log('EventRunner: Starting playback', response.events?.length, 'events', 'isBonusBuy:', isBonusBuy);
    setIsRunning(true);
    resetForNewSpin();

    try {
      const {
        events,
        balance,
        payoutMultiplier,
        finalMultipliers,
        freeSpinsTriggered = 0,
        freeSpinsRemaining: newFreeSpinsRemaining = 0,
        isFreeSpin = false,
        freeSpinTotalWin = 0,
      } = response;

      console.log('EventRunner: Response parsed', {
        freeSpinTotalWin,
        freeSpinsRemaining: newFreeSpinsRemaining,
        isFreeSpin,
        freeSpinsTriggered,
        rawResponseFreeSpinTotalWin: response.freeSpinTotalWin
      });

      // Group events into phases
      // NEW ORDER: wild_explosion -> wins -> multiplier_upgrades -> tumble/fill
      // Wild explosions happen FIRST so their multipliers apply to current round wins
      let i = 0;
      while (i < events.length) {
        const event = events[i];

        // Non-win/multiplier/wild_explosion events are processed directly
        if (event.type !== 'win' && event.type !== 'multiplier_upgrade' && event.type !== 'wild_explosion') {
          console.log(`EventRunner: Processing ${event.type}`);
          await processEvent(event, false, isBonusBuy);
          i++;
          continue;
        }

        // Collect all events in this phase (wild_explosions, wins, multiplier_upgrades)
        const phaseWildExplosions = [];
        const phaseWins = [];
        const phaseMultipliers = [];
        const allWinPositions = new Set();

        while (i < events.length) {
          const e = events[i];
          if (e.type === 'wild_explosion') {
            phaseWildExplosions.push(e);
            i++;
          } else if (e.type === 'win') {
            phaseWins.push(e);
            // Track all winning positions
            for (const pos of e.positions) {
              allWinPositions.add(`${pos[0]}-${pos[1]}`);
            }
            i++;
          } else if (e.type === 'multiplier_upgrade') {
            phaseMultipliers.push(e);
            i++;
          } else {
            // End of phase (tumble, fill, reveal, etc.)
            break;
          }
        }

        console.log(`EventRunner: Phase with ${phaseWildExplosions.length} wild explosions, ${phaseWins.length} wins, ${phaseMultipliers.length} multipliers`);

        // Step 1: Process Wild explosions FIRST (sets multipliers for current round)
        for (const explosion of phaseWildExplosions) {
          console.log(`EventRunner: Processing Wild explosion`);
          await processWildExplosion(explosion);
        }

        // Step 2: Play ALL win animations (without removal) - now with updated multipliers from Wild
        for (const win of phaseWins) {
          console.log(`EventRunner: Win animation for ${win.symbol} with multiplier ${win.multiplier}`);
          await processWin(win, false); // false = don't remove
        }

        // Step 3: Remove all winning cells at once
        if (allWinPositions.size > 0) {
          const positionsToRemove = Array.from(allWinPositions).map(key => {
            const [row, col] = key.split('-').map(Number);
            return [row, col];
          });
          console.log(`EventRunner: Removing ${positionsToRemove.length} cells`);
          await removeCells(positionsToRemove);
        }

        // Step 4: Show ghost spot multipliers AFTER cells are removed
        if (phaseMultipliers.length > 0) {
          console.log(`EventRunner: Updating ${phaseMultipliers.length} ghost spot multipliers`);
          for (const mult of phaseMultipliers) {
            const [row, col] = mult.position;
            setCellMultiplier(row, col, mult.value);
          }
          // Brief pause to let multipliers be visible
          await sleep(150);
        }
      }

      // NOW update all state AFTER animations complete
      setBalance(balance);

      // Update multiplier grid
      if (finalMultipliers) {
        setMultiplierGrid(finalMultipliers);
      }

      // Detect if bonus just ended
      // Bonus ends when: we were in free spins (isFreeSpin or freeSpinsRemaining > 0)
      // AND now there are no free spins remaining AND no new free spins triggered
      const wasInFreeSpins = isFreeSpin || freeSpinsRemaining > 0;
      const bonusEnded = wasInFreeSpins && newFreeSpinsRemaining <= 0 && freeSpinsTriggered <= 0;

      console.log('EventRunner: Bonus detection', {
        wasInFreeSpins,
        newFreeSpinsRemaining,
        freeSpinsTriggered,
        bonusEnded,
        isBonusEndFromApp: isBonusEnd,
        freeSpinTotalWin
      });

      // Set final win using betAmount from store
      const totalWin = payoutMultiplier * betAmount;
      setLastWin(totalWin);

      // Call spin win callback for big win celebration (before bonus summary)
      if (onSpinWinRef.current && totalWin > 0) {
        await onSpinWinRef.current({ amount: totalWin, betAmount });
      }

      // Use either the detected bonus end OR the flag from App.jsx
      const shouldShowBonusSummary = bonusEnded || isBonusEnd;

      // Capture the bonus total win BEFORE updating state
      // Priority: response value > passed value > 0
      // Use >= 0 check since 0 is a valid (though rare) total
      let actualBonusTotalWin = 0;
      if (typeof freeSpinTotalWin === 'number' && freeSpinTotalWin > 0) {
        actualBonusTotalWin = freeSpinTotalWin;
      } else if (typeof bonusTotalWin === 'number' && bonusTotalWin > 0) {
        actualBonusTotalWin = bonusTotalWin;
      }

      console.log('EventRunner: Complete', {
        totalWin,
        balance,
        betAmount,
        shouldShowBonusSummary,
        actualBonusTotalWin,
        'response.freeSpinTotalWin': freeSpinTotalWin,
        'options.bonusTotalWin': bonusTotalWin,
        bonusEnded,
        isBonusEnd
      });

      // If bonus just ended, show summary FIRST, then reset state
      if (shouldShowBonusSummary && onBonusEndRef.current) {
        console.log('EventRunner: Showing bonus end summary with total:', actualBonusTotalWin);
        await onBonusEndRef.current({ totalWin: actualBonusTotalWin });
        // Reset free spins state AFTER summary is dismissed
        setFreeSpins(0, 0);
      } else if (!isBonusBuy) {
        // Update free spins state normally (during bonus or when triggered)
        // BUT NOT for bonus buy - App.jsx handles that when user clicks COMMENCER
        if (freeSpinsTriggered > 0 || isFreeSpin) {
          setFreeSpins(newFreeSpinsRemaining, freeSpinTotalWin);
        } else if (newFreeSpinsRemaining <= 0 && freeSpinsRemaining > 0) {
          // Free spins just ended but no summary to show
          setFreeSpins(0, 0);
        }
      }
      // For isBonusBuy, App.jsx will call setFreeSpins when user clicks COMMENCER

    } catch (error) {
      console.error('EventRunner: Error', error);
    } finally {
      setIsRunning(false);
      // Reset turbo mode at end of spin
      useGameStore.getState().resetTurbo?.();
    }
  }, [isRunning, resetForNewSpin, processEvent, setBalance, setLastWin, betAmount, setFreeSpins, setMultiplierGrid, freeSpinsRemaining]);

  // Compatibility functions
  const registerSprite = useCallback(() => {}, []);
  const registerGridContainer = useCallback(() => {}, []);

  return {
    isRunning,
    playAllEvents,
    registerSprite,
    registerGridContainer,
    setOnBonusTrigger,
    setOnBonusEnd,
    setOnWinPopup,
    setOnSpinWin,
  };
};

export default useEventRunner;
