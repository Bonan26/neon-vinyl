/**
 * NEON VINYL: GHOST GROOVES - Event Runner Hook
 *
 * THE CONDUCTOR: Orchestrates all game animations.
 * Uses coordinated timing for smooth, fluid animations.
 */
import { useCallback, useState, useRef } from 'react';
import useGameStore, { SPEED_MULTIPLIERS } from '../stores/gameStore';
import { GRID_ROWS, GRID_COLS } from '../config/gameConfig';

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

  // Get state from store
  const betAmount = useGameStore((state) => state.betAmount);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const autoSpinSpeed = useGameStore((state) => state.autoSpinSpeed);

  // Calculate timing based on speed
  const getSpeedMultiplier = useCallback(() => {
    return SPEED_MULTIPLIERS[autoSpinSpeed] || 1;
  }, [autoSpinSpeed]);

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
   * Process REVEAL event - Cascade reveal row by row
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

    for (const rowKey of rows) {
      const rowData = rowGroups[rowKey];

      // Update all cells in this row simultaneously
      for (const { pos, symbol } of rowData) {
        const [row, col] = pos;
        updateCell(row, col, {
          symbol,
          isNew: true,
          isWinning: false,
          isRemoving: false,
        });
      }

      // Small delay between rows
      await sleep(TIMING.REVEAL_PER_ROW);
    }

    // Wait for animations to settle
    await sleep(TIMING.REVEAL_SETTLE);

    // Clear isNew flags
    for (const pos of positions) {
      const [row, col] = pos;
      updateCell(row, col, { isNew: false });
    }

    await sleep(TIMING.PAUSE_BETWEEN);
  }, [updateCell, getSpeedMultiplier]);

  /**
   * Process WIN event - Highlight winning cells (removal handled separately)
   * @param {boolean} shouldRemove - If true, remove symbols after animation
   */
  const processWin = useCallback(async (event, shouldRemove = true) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing win', event.amount, 'shouldRemove:', shouldRemove);
    const { positions, amount, symbol, size } = event;

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
   */
  const processFreeSpinsTrigger = useCallback(async (event) => {
    console.log('EventRunner: FREE SPINS TRIGGERED!', event);
    const { freeSpinsAwarded, positions, scatterCount, isRetrigger = false } = event;

    // Highlight scatter positions
    for (const [row, col] of positions) {
      updateCell(row, col, { isWinning: true });
    }

    // Wait a moment for scatter highlight
    await sleep(500);

    // Trigger bonus overlay (pass isRetrigger flag for different handling)
    if (onBonusTriggerRef.current) {
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
   * Process WILD_EXPLOSION event - Wild explodes and multiplies adjacent cells by 64
   */
  const processWildExplosion = useCallback(async (event) => {
    const TIMING = getTiming(getSpeedMultiplier());
    console.log('EventRunner: Processing WILD EXPLOSION!', event);
    const { wildPosition, affectedCells, cellDetails, explosionFactor } = event;

    // Trigger explosion animation popup (awaits completion)
    if (onWildExplosionRef.current) {
      // Start the popup animation - this returns a promise that resolves when popup completes
      const popupPromise = onWildExplosionRef.current({
        wildPosition,
        affectedCells,
        explosionFactor: explosionFactor || 64,
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
   */
  const processEvent = useCallback(async (event, skipWinRemoval = false) => {
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
        await processFreeSpinsTrigger(event);
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

    const { isBonusEnd = false, bonusTotalWin = 0 } = options;

    console.log('EventRunner: Starting playback', response.events?.length, 'events');
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

      // Group events into phases
      // A phase contains: multiplier_upgrades + wins, ending at tumble/fill/reveal
      // Order within phase: 1) ALL multipliers, 2) ALL wins (no removal), 3) remove all winning cells
      let i = 0;
      while (i < events.length) {
        const event = events[i];

        // Non-win/multiplier events are processed directly
        if (event.type !== 'win' && event.type !== 'multiplier_upgrade') {
          console.log(`EventRunner: Processing ${event.type}`);
          await processEvent(event);
          i++;
          continue;
        }

        // Collect all wins and multiplier_upgrades in this phase
        const phaseMultipliers = [];
        const phaseWins = [];
        const allWinPositions = new Set();

        while (i < events.length) {
          const e = events[i];
          if (e.type === 'multiplier_upgrade') {
            phaseMultipliers.push(e);
            i++;
          } else if (e.type === 'win') {
            phaseWins.push(e);
            // Track all winning positions
            for (const pos of e.positions) {
              allWinPositions.add(`${pos[0]}-${pos[1]}`);
            }
            i++;
          } else {
            // End of win/multiplier phase
            break;
          }
        }

        console.log(`EventRunner: Phase with ${phaseMultipliers.length} multipliers and ${phaseWins.length} wins`);

        // Step 1: Show ALL multipliers first
        for (const mult of phaseMultipliers) {
          console.log(`EventRunner: Multiplier upgrade at [${mult.position}] to x${mult.value}`);
          await processMultiplierUpgrade(mult);
        }

        // Small pause after multipliers to let them be visible
        if (phaseMultipliers.length > 0) {
          await sleep(200);
        }

        // Step 2: Play ALL win animations (without removal)
        for (const win of phaseWins) {
          console.log(`EventRunner: Win animation for ${win.symbol}`);
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

      // Update free spins state AFTER animations
      if (freeSpinsTriggered > 0 || isFreeSpin) {
        setFreeSpins(newFreeSpinsRemaining, freeSpinTotalWin);
      } else if (newFreeSpinsRemaining <= 0 && freeSpinsRemaining > 0) {
        // Free spins just ended
        setFreeSpins(0, 0);
      }

      // Set final win using betAmount from store
      const totalWin = payoutMultiplier * betAmount;
      setLastWin(totalWin);

      // Call spin win callback for big win celebration (before bonus summary)
      if (onSpinWinRef.current && totalWin > 0) {
        await onSpinWinRef.current({ amount: totalWin, betAmount });
      }

      // Use either the detected bonus end OR the flag from App.jsx
      // Use freeSpinTotalWin from response directly (most reliable)
      const shouldShowBonusSummary = bonusEnded || isBonusEnd;
      // Use explicit number check - freeSpinTotalWin can be 0 which is falsy
      const actualBonusTotalWin = typeof freeSpinTotalWin === 'number' && freeSpinTotalWin > 0
        ? freeSpinTotalWin
        : (typeof bonusTotalWin === 'number' && bonusTotalWin > 0 ? bonusTotalWin : 0);

      console.log('EventRunner: Complete', {
        totalWin,
        balance,
        betAmount,
        shouldShowBonusSummary,
        actualBonusTotalWin,
        freeSpinTotalWin,
        bonusTotalWin
      });

      // If bonus just ended, show summary
      if (shouldShowBonusSummary && onBonusEndRef.current) {
        console.log('EventRunner: Showing bonus end summary with total:', actualBonusTotalWin);
        await onBonusEndRef.current({ totalWin: actualBonusTotalWin });
      }

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
