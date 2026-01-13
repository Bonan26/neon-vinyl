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

// Base animation timings (in milliseconds)
const BASE_TIMING = {
  REVEAL_PER_ROW: 40,       // Time between each row reveal
  REVEAL_SETTLE: 300,       // Time for reveal animation to complete
  WIN_HIGHLIGHT: 400,       // Time to show winning cells highlighted
  WIN_PULSE: 600,           // Additional pulse animation time
  WIN_REMOVE: 350,          // Time for remove animation
  TUMBLE_SETTLE: 400,       // Time for tumble animation to complete
  FILL_PER_CELL: 30,        // Time between each fill
  FILL_SETTLE: 350,         // Time for fill animation to complete
  PAUSE_BETWEEN: 100,       // Brief pause between phases
  WILD_EXPLOSION: 800,      // Time for Wild explosion animation
  WILD_EXPLOSION_CELL: 100, // Time between each affected cell
};

// Function to get timing adjusted for speed
const getTiming = (speedMultiplier = 1) => {
  const multiplier = Math.max(0.1, speedMultiplier); // Minimum 10% of normal speed
  return Object.fromEntries(
    Object.entries(BASE_TIMING).map(([key, value]) => [key, Math.round(value * multiplier)])
  );
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * useEventRunner Hook
 */
const useEventRunner = () => {
  const [isRunning, setIsRunning] = useState(false);

  // Callbacks for bonus events
  const onBonusTriggerRef = useRef(null);
  const onBonusEndRef = useRef(null);
  const onWinPopupRef = useRef(null);
  const onWildExplosionRef = useRef(null);
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
  // - During free spins (not autospin): use manualSpeedMode
  // - Otherwise: NORMAL speed
  const getSpeedMultiplier = useCallback(() => {
    let effectiveSpeed;
    if (autoSpinActive) {
      effectiveSpeed = autoSpinSpeed;
    } else if (freeSpinsRemaining > 0) {
      effectiveSpeed = manualSpeedMode;
    } else {
      effectiveSpeed = 'normal';
    }
    return SPEED_MULTIPLIERS[effectiveSpeed] || 1;
  }, [autoSpinActive, autoSpinSpeed, freeSpinsRemaining, manualSpeedMode]);

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
   * Set callback for Wild explosion animation
   */
  const setOnWildExplosion = useCallback((callback) => {
    onWildExplosionRef.current = callback;
  }, []);

  /**
   * Set callback for total spin win (for big win celebration)
   */
  const setOnSpinWin = useCallback((callback) => {
    onSpinWinRef.current = callback;
  }, []);

  /**
   * Process REVEAL event - Cascade reveal row by row with INTENSE scatter suspense
   */
  const processReveal = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing reveal (speed:', getSpeedMultiplier(), ')');
    const { positions, symbols } = event;

    // Group by rows for cascade effect
    const rowGroups = {};
    positions.forEach((pos, i) => {
      const [row] = pos;
      if (!rowGroups[row]) rowGroups[row] = [];
      rowGroups[row].push({ pos, symbol: symbols[i] });
    });

    // Reveal row by row from top to bottom
    const rows = Object.keys(rowGroups).sort((a, b) => Number(a) - Number(b));

    // Track scatter count and positions for suspense
    let scatterCount = 0;
    const SCATTER_SYMBOL = 'SC';
    let suspenseStartRow = -1; // Row where we hit 2 scatters

    // Timing constants
    const BASE_ROW_DELAY = Math.max(50, TIMING.REVEAL_PER_ROW);

    // SUSPENSE MODE TIMING - Progressive slowdown
    const SUSPENSE_BASE = 400;        // Starting delay after 2 scatters
    const SUSPENSE_INCREMENT = 250;   // Each row gets this much slower
    const SUSPENSE_CELL_DELAY = 120;  // Delay between cells in suspense mode
    const MAX_SUSPENSE_DELAY = 1200;  // Cap for row delay
    const FINAL_ROW_EXTRA = 500;      // Extra delay on final 2 rows

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const rowKey = rows[rowIndex];
      const rowData = rowGroups[rowKey];
      const isLastTwoRows = rowIndex >= rows.length - 2;
      const isLastRow = rowIndex === rows.length - 1;

      // Check if we're in suspense mode (2+ scatters already found)
      const inSuspenseMode = scatterCount >= 2;

      if (inSuspenseMode) {
        // SUSPENSE MODE: Reveal cell by cell with increasing delays
        setSuspenseMode(true);

        // Start the continuous suspense music loop (only on first entry)
        if (suspenseStartRow === rowIndex - 1 || suspenseStartRow === rowIndex) {
          audioService.startSuspenseLoop?.();
        }

        // Calculate progressive delay based on how many rows since suspense started
        const rowsSinceSuspense = rowIndex - suspenseStartRow;
        let baseRowDelay = Math.min(
          SUSPENSE_BASE + (rowsSinceSuspense * SUSPENSE_INCREMENT),
          MAX_SUSPENSE_DELAY
        );

        // Extra delay on final rows
        if (isLastTwoRows) {
          baseRowDelay += FINAL_ROW_EXTRA;
        }

        // Play suspense sound periodically
        if (rowsSinceSuspense > 0 && rowsSinceSuspense % 2 === 0) {
          audioService.playScatterSuspenseSound?.();
        }

        // Reveal cells one by one for maximum tension
        for (let cellIndex = 0; cellIndex < rowData.length; cellIndex++) {
          const { pos, symbol } = rowData[cellIndex];
          const [row, col] = pos;

          // Pause before revealing each cell (longer on last rows)
          const cellDelay = isLastTwoRows
            ? SUSPENSE_CELL_DELAY * 2
            : SUSPENSE_CELL_DELAY;

          if (cellIndex > 0) {
            await sleep(cellDelay);
          }

          // Reveal the cell
          updateCell(row, col, {
            symbol,
            isNew: true,
            isWinning: false,
            isRemoving: false,
          });

          // Check if this is a scatter!
          if (symbol === SCATTER_SYMBOL) {
            scatterCount++;
            // JACKPOT! We got the 3rd scatter - dramatic pause
            if (scatterCount === 3) {
              audioService.playScatterTriggerSound?.();
              await sleep(800); // Dramatic pause on 3rd scatter
            }
          }
        }

        // Wait after row with progressive delay
        await sleep(baseRowDelay);

      } else {
        // NORMAL MODE: Fast row reveal
        let newScatterInRow = false;

        // Reveal all cells in row at once
        for (const { pos, symbol } of rowData) {
          const [row, col] = pos;
          updateCell(row, col, {
            symbol,
            isNew: true,
            isWinning: false,
            isRemoving: false,
          });

          if (symbol === SCATTER_SYMBOL) {
            scatterCount++;
            newScatterInRow = true;

            // If we just hit 2 scatters, mark the suspense start
            if (scatterCount === 2) {
              suspenseStartRow = rowIndex;
              // Play sound when entering suspense
              audioService.playScatterSuspenseSound?.();
            }
          }
        }

        // Normal delay or slightly longer if scatter appeared
        const rowDelay = newScatterInRow ? BASE_ROW_DELAY * 2 : BASE_ROW_DELAY;
        await sleep(rowDelay);
      }
    }

    // If we ended with 3+ scatters, add celebration pause
    if (scatterCount >= 3) {
      await sleep(500);
    }

    // Wait for animations to settle
    await sleep(TIMING.REVEAL_SETTLE);

    // Clear isNew flags
    for (const pos of positions) {
      const [row, col] = pos;
      updateCell(row, col, { isNew: false });
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
   * The multiplier is determined by a spinning wheel (from backend: wheelMultiplier)
   */
  const processWildExplosion = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing WILD EXPLOSION!', event);
    const { wildPosition, affectedCells, cellDetails, wheelMultiplier, explosionFactor } = event;

    // Use wheelMultiplier from backend (new system) or fallback to explosionFactor (old system)
    const multiplier = wheelMultiplier || explosionFactor || 64;

    // Trigger wheel popup animation (awaits completion)
    if (onWildExplosionRef.current) {
      // Start the popup animation - this returns a promise that resolves when popup completes
      const popupPromise = onWildExplosionRef.current({
        wildPosition,
        affectedCells,
        wheelMultiplier: multiplier,
        cellDetails,
      });

      // Set cell multipliers during the popup animation using cellDetails
      setTimeout(async () => {
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
      }, TIMING.WILD_EXPLOSION / 3);

      // Wait for popup to complete
      await popupPromise;
    } else {
      // No popup callback - just update cells directly
      if (cellDetails && cellDetails.length > 0) {
        for (const detail of cellDetails) {
          const [row, col] = detail.position;
          setCellMultiplier(row, col, detail.newMultiplier);
          updateCell(row, col, { isExploding: true });
          await sleep(TIMING.WILD_EXPLOSION_CELL);
        }
      }

      await sleep(TIMING.WILD_EXPLOSION / 2);

      for (const [row, col] of affectedCells) {
        updateCell(row, col, { isExploding: false });
      }
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
   */
  const processFill = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing fill');
    const { fills } = event;

    if (!fills || fills.length === 0) return;

    // Sort by column, then by row (top to bottom)
    const sortedFills = [...fills].sort((a, b) => {
      if (a.position[1] !== b.position[1]) return a.position[1] - b.position[1];
      return a.position[0] - b.position[0];
    });

    // Group by column
    const columnGroups = {};
    sortedFills.forEach(fill => {
      const col = fill.position[1];
      if (!columnGroups[col]) columnGroups[col] = [];
      columnGroups[col].push(fill);
    });

    // Fill all columns in parallel
    const columnPromises = Object.entries(columnGroups).map(async ([col, colFills]) => {
      for (let i = 0; i < colFills.length; i++) {
        const { position, symbol } = colFills[i];
        const [row, colIdx] = position;

        updateCell(row, colIdx, {
          symbol,
          isNew: true,
          isWinning: false,
          isRemoving: false,
        });

        if (i < colFills.length - 1) {
          await sleep(TIMING.FILL_PER_CELL);
        }
      }
    });

    await Promise.all(columnPromises);
    await sleep(TIMING.FILL_SETTLE);

    // Clear isNew flags
    for (const { position } of fills) {
      const [row, col] = position;
      updateCell(row, col, { isNew: false });
    }

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [updateCell, getSpeedMultiplier]);

  /**
   * Process a single event
   * @param {boolean} skipWinRemoval - If true, don't remove symbols on win (handled separately)
   * @param {boolean} isBonusBuy - If true, skip bonus trigger popup
   */
  const processEvent = useCallback(async (event, skipWinRemoval = false, isBonusBuy = false) => {
    switch (event.type) {
      case 'reveal':
        await processReveal(event);
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
    setOnWildExplosion,
    setOnSpinWin,
  };
};

export default useEventRunner;
