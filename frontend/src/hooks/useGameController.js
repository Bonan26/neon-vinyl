/**
 * NEON VINYL: GHOST GROOVES - Game Controller Hook
 *
 * Handles API communication with the backend.
 * Animation playback is delegated to useEventRunner.
 */
import { useCallback, useEffect, useRef } from 'react';
import useGameStore from '../stores/gameStore';
import apiService from '../services/apiService';

const useGameController = () => {
  const initialized = useRef(false);

  // Store actions
  const setSession = useGameStore((state) => state.setSession);
  const setBalance = useGameStore((state) => state.setBalance);
  const setIsSpinning = useGameStore((state) => state.setIsSpinning);
  const setMultiplierGrid = useGameStore((state) => state.setMultiplierGrid);
  const setTumbleCount = useGameStore((state) => state.setTumbleCount);
  const setMaxMultiplier = useGameStore((state) => state.setMaxMultiplier);
  const setFreeSpins = useGameStore((state) => state.setFreeSpins);
  const setScatterBoostSpins = useGameStore((state) => state.setScatterBoostSpins);
  const setWildBoostSpins = useGameStore((state) => state.setWildBoostSpins);
  const setBonusBuyOptions = useGameStore((state) => state.setBonusBuyOptions);
  const setJackpotTiers = useGameStore((state) => state.setJackpotTiers);
  const setLastJackpotWon = useGameStore((state) => state.setLastJackpotWon);

  // Store state
  const sessionId = useGameStore((state) => state.sessionId);
  const betAmount = useGameStore((state) => state.betAmount);
  const clientSeed = useGameStore((state) => state.clientSeed);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);

  /**
   * Initialize game session
   */
  const initSession = useCallback(async () => {
    try {
      console.log('GameController: Creating session...');
      const session = await apiService.createSession();
      setSession(session);
      console.log('GameController: Session created', session.sessionID);

      // Fetch bonus options
      try {
        const bonusOptions = await apiService.getBonusOptions();
        setBonusBuyOptions(bonusOptions.options || []);
      } catch (e) {
        console.warn('GameController: Could not fetch bonus options', e);
      }

      // Fetch jackpot info
      try {
        const jackpotInfo = await apiService.getJackpotInfo();
        setJackpotTiers(jackpotInfo.jackpots || {});
      } catch (e) {
        console.warn('GameController: Could not fetch jackpot info', e);
      }

      return session;
    } catch (error) {
      console.error('GameController: Failed to create session', error);
      throw error;
    }
  }, [setSession, setBonusBuyOptions, setJackpotTiers]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initSession().catch((err) => {
        console.warn('GameController: Running in demo mode (backend unavailable)', err.message);
        // Set a demo session ID so the game is playable
        setSession({
          sessionID: 'demo-' + Date.now(),
          balance: 10000,
          serverSeedHash: 'demo-hash',
          nonce: 0,
        });
      });
    }
  }, [initSession, setSession]);

  /**
   * Execute a spin (API call only)
   * Returns the result for useEventRunner to animate
   */
  const spin = useCallback(async () => {
    if (!sessionId) {
      console.error('GameController: No session');
      return null;
    }

    try {
      console.log('GameController: Calling API...');
      setIsSpinning(true);

      // Call backend API
      const result = await apiService.play({
        sessionID: sessionId,
        betAmount,
        clientSeed,
      });

      console.log('GameController: API response', {
        payout: result.payoutMultiplier,
        tumbles: result.tumbleCount,
        events: result.events.length,
        freeSpins: result.freeSpinsRemaining,
        isFreeSpin: result.isFreeSpin,
        scatterBoost: result.scatterBoostSpins,
        wildBoost: result.wildBoostSpins,
      });

      // NOTE: Don't update win-related state here!
      // All win updates happen in useEventRunner AFTER animations play
      // This prevents showing wins before the player sees them

      // Only update non-visual tracking stats
      setTumbleCount(result.tumbleCount);
      setMaxMultiplier(result.maxMultiplier);

      // Update boost spins remaining
      setScatterBoostSpins(result.scatterBoostSpins || 0);
      setWildBoostSpins(result.wildBoostSpins || 0);

      // Stop spinning indicator
      setIsSpinning(false);

      // Return full result - App.jsx will pass this to useEventRunner
      return result;

    } catch (error) {
      console.error('GameController: Spin error', error);
      setIsSpinning(false);
      throw error;
    }
  }, [
    sessionId,
    betAmount,
    clientSeed,
    freeSpinsRemaining,
    setIsSpinning,
    setTumbleCount,
    setMaxMultiplier,
    setMultiplierGrid,
    setFreeSpins,
    setLastJackpotWon,
    setScatterBoostSpins,
    setWildBoostSpins,
  ]);

  /**
   * Buy a bonus feature
   */
  const buyBonus = useCallback(async (bonusId) => {
    if (!sessionId) {
      console.error('GameController: No session');
      return null;
    }

    try {
      console.log('GameController: Buying bonus', bonusId, 'at bet', betAmount);
      const result = await apiService.buyBonus({
        sessionID: sessionId,
        bonusId,
        clientSeed,
        betAmount,
      });

      console.log('GameController: Bonus bought', result);

      // Update balance
      setBalance(result.balance);

      // If free spins were purchased, update the store so we know we're in free spins mode
      if (result.featureActivated === 'free_spins') {
        setFreeSpins(8, 0); // 8 free spins, 0 total win initially
      } else if (result.featureActivated === 'free_spins_enhanced') {
        setFreeSpins(12, 0); // 12 enhanced free spins, 0 total win initially
        // Set all multipliers to x2 immediately for Super Spins
        const x2Grid = Array(7).fill(null).map(() => Array(7).fill(2));
        setMultiplierGrid(x2Grid);
      }

      return result;
    } catch (error) {
      console.error('GameController: Bonus buy error', error);
      throw error;
    }
  }, [sessionId, clientSeed, betAmount, setBalance, setFreeSpins, setMultiplierGrid]);

  /**
   * Rotate server seed (reveals old seed for verification)
   */
  const rotateSeed = useCallback(async () => {
    if (!sessionId) return null;

    try {
      const result = await apiService.rotateSeed(sessionId);
      // Update session with new hash
      const session = await apiService.getSession(sessionId);
      setSession(session);
      return result;
    } catch (error) {
      console.error('GameController: Failed to rotate seed', error);
      throw error;
    }
  }, [sessionId, setSession]);

  /**
   * Bonus trigger spin - spins the grid and lands on scatters
   * Returns result that can be animated with useEventRunner
   * NOTE: Does NOT activate free spins - that happens when player clicks COMMENCER
   */
  const bonusTriggerSpin = useCallback(async (bonusId) => {
    if (!sessionId) {
      console.error('GameController: No session');
      return null;
    }

    try {
      console.log('GameController: Bonus trigger spin', bonusId);
      setIsSpinning(true);

      const result = await apiService.bonusTriggerSpin({
        sessionID: sessionId,
        bonusId,
        clientSeed,
        betAmount,
      });

      console.log('GameController: Bonus trigger result', {
        scatterCount: result.scatterCount,
        freeSpins: result.freeSpinsTriggered,
        cost: result.cost,
      });

      // Update balance only - don't set free spins yet!
      // Free spins will be activated when player clicks COMMENCER
      setBalance(result.balance);

      setIsSpinning(false);

      // Return result for animation (includes freeSpinsTriggered for later use)
      return result;

    } catch (error) {
      console.error('GameController: Bonus trigger spin error', error);
      setIsSpinning(false);
      throw error;
    }
  }, [sessionId, clientSeed, betAmount, setIsSpinning, setBalance]);

  /**
   * Activate a boost feature (Scatter Hunt or Wild Boost)
   * These increase scatter/wild probability for a number of spins
   */
  const activateBoost = useCallback(async (boostType) => {
    if (!sessionId) {
      console.error('GameController: No session');
      return null;
    }

    // Get current balance BEFORE API call
    const balanceBefore = useGameStore.getState().balance;
    console.log('[GameController] Balance BEFORE boost:', balanceBefore);

    try {
      console.log('GameController: Activating boost', boostType, 'at bet', betAmount);
      const result = await apiService.activateBoost({
        sessionID: sessionId,
        boostType,
        betAmount,
      });

      console.log('[GameController] Boost API response:', JSON.stringify(result));

      // Verify balance is a valid number
      if (typeof result.balance !== 'number' || isNaN(result.balance)) {
        console.error('[GameController] Invalid balance in response:', result.balance);
        return result;
      }

      // Update balance
      console.log('[GameController] Setting balance from', balanceBefore, 'to', result.balance);
      setBalance(result.balance);

      // Verify balance was updated
      setTimeout(() => {
        const balanceAfter = useGameStore.getState().balance;
        console.log('[GameController] Balance AFTER setBalance:', balanceAfter);
      }, 100);

      // Update boost spins in store
      console.log('[GameController] boostType:', result.boostType, 'spinsRemaining:', result.boostSpinsRemaining);
      if (result.boostType === 'scatter_boost') {
        console.log('[GameController] Setting scatterBoostSpins to:', result.boostSpinsRemaining);
        setScatterBoostSpins(result.boostSpinsRemaining);
      } else if (result.boostType === 'wild_boost') {
        console.log('[GameController] Setting wildBoostSpins to:', result.boostSpinsRemaining);
        setWildBoostSpins(result.boostSpinsRemaining);
      }

      return result;
    } catch (error) {
      console.error('GameController: Boost activation error', error);
      throw error;
    }
  }, [sessionId, betAmount, setBalance, setScatterBoostSpins, setWildBoostSpins]);

  return {
    spin,
    rotateSeed,
    initSession,
    buyBonus,
    bonusTriggerSpin,
    activateBoost,
  };
};

export default useGameController;
