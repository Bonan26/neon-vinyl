/**
 * LES WOLFS 86
 * Main Application Component
 * Compact rectangular design inspired by "Le Bandit" (Hacksaw Gaming)
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { GameStage } from './components/game';
import ProvablyFairFooter from './components/ui/ProvablyFairFooter';
import BonusBuyMenu from './components/ui/BonusBuyMenu';
import BonusBuyIntro from './components/ui/BonusBuyIntro';
import FreeSpinsCounter from './components/ui/FreeSpinsCounter';
import BonusOverlay from './components/ui/BonusOverlay';
import IntroScreen from './components/ui/IntroScreen';
import WinCelebration from './components/ui/WinCelebration';
import SettingsMenu from './components/ui/SettingsMenu';
import WolfDressUp from './components/ui/WolfDressUp';
import useGameController from './hooks/useGameController';
import useEventRunner from './hooks/useEventRunner';
import useGameStore, { GameState, SPEED_MULTIPLIERS, AutoSpinSpeed } from './stores/gameStore';
import audioService from './services/audioService';
import { BET_OPTIONS } from './config/gameConfig';
import './App.css';

const AUTO_SPIN_OPTIONS = [10, 25, 50, 100, 500, 1000, Infinity];

// Game dimensions from config (6*100 + 5*3 + 12 = 627px, 5*100 + 4*3 + 12 = 524px)
const GAME_BASE_WIDTH = 627 + 24; // Including frame padding
const GAME_BASE_HEIGHT = 524 + 24 + 125 + 80; // Including frame, logo, and controls

// Custom hook for responsive scaling
const useResponsiveScale = () => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Calculate scale based on viewport
      const scaleX = (vw - 20) / GAME_BASE_WIDTH;
      const scaleY = (vh - 40) / GAME_BASE_HEIGHT;

      // Use the smaller scale to fit both dimensions
      let newScale = Math.min(scaleX, scaleY, 1); // Max scale is 1

      // Clamp minimum scale for readability
      newScale = Math.max(newScale, 0.45);

      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    window.addEventListener('orientationchange', () => {
      setTimeout(calculateScale, 100); // Delay for orientation change
    });

    return () => {
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', calculateScale);
    };
  }, []);

  return scale;
};

function App() {
  // Responsive scaling
  const gameScale = useResponsiveScale();

  // Game controller for API calls
  const { spin, rotateSeed, buyBonus, bonusTriggerSpin, activateBoost } = useGameController();

  // Event runner for animations
  const eventRunner = useEventRunner();
  const {
    isRunning,
    playAllEvents,
    registerSprite,
    setOnBonusTrigger,
    setOnBonusEnd,
    setOnWinPopup,
    setOnSpinWin,
  } = eventRunner;

  // Store state
  const sessionId = useGameStore((state) => state.sessionId);
  const isSpinning = useGameStore((state) => state.isSpinning);
  const isAnimating = useGameStore((state) => state.isAnimating);
  const setIsAnimating = useGameStore((state) => state.setIsAnimating);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const freeSpinTotalWin = useGameStore((state) => state.freeSpinTotalWin);
  const scatterBoostSpinsRemaining = useGameStore((state) => state.scatterBoostSpinsRemaining);
  const wildBoostSpinsRemaining = useGameStore((state) => state.wildBoostSpinsRemaining);
  const setScatterBoost = useGameStore((state) => state.setScatterBoost);
  const setWildBoost = useGameStore((state) => state.setWildBoost);
  const decrementBoostSpin = useGameStore((state) => state.decrementBoostSpin);
  const balance = useGameStore((state) => state.balance);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const lastWin = useGameStore((state) => state.lastWin);
  const scatterBoostActive = useGameStore((state) => state.scatterBoostActive);
  const wildBoostActive = useGameStore((state) => state.wildBoostActive);
  const getEffectiveBet = useGameStore((state) => state.getEffectiveBet);
  const toggleBonusMenu = useGameStore((state) => state.toggleBonusMenu);

  const musicEnabled = useGameStore((state) => state.musicEnabled);
  const setMusicEnabled = useGameStore((state) => state.setMusicEnabled);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const gameState = useGameStore((state) => state.gameState);
  const startGame = useGameStore((state) => state.startGame);

  // Autospin state
  const autoSpinActive = useGameStore((state) => state.autoSpinActive);
  const autoSpinRemaining = useGameStore((state) => state.autoSpinRemaining);
  const autoSpinSpeed = useGameStore((state) => state.autoSpinSpeed);
  const startAutoSpin = useGameStore((state) => state.startAutoSpin);
  const stopAutoSpin = useGameStore((state) => state.stopAutoSpin);
  const decrementAutoSpin = useGameStore((state) => state.decrementAutoSpin);

  // Audio state
  const [audioReady, setAudioReady] = useState(false);

  // Bonus overlay state
  const [bonusOverlay, setBonusOverlay] = useState({
    show: false,
    type: null,
    freeSpinsAwarded: 0,
    totalWin: 0,
  });

  // Win popup state (small wins)
  const [winPopup, setWinPopup] = useState(null);

  // Win celebration state (big wins with tier animation)
  const [winCelebration, setWinCelebration] = useState({
    show: false,
    amount: 0,
    betAmount: 1,
  });

  // Bonus buy intro state
  const [bonusIntro, setBonusIntro] = useState({
    show: false,
    bonusType: 'standard',
    scatterCount: 3,
    freeSpinsToActivate: 0,
    pendingWolfBurst: null, // Store wolf burst data if pending
    pendingBoost: null, // Store boost data if pending (scatter_hunt or wild_boost)
    naturalTriggerResolve: null, // Resolve function for natural scatter triggers
  });

  // Settings menu state
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoSpinMenu, setShowAutoSpinMenu] = useState(false);
  const [showBetMenu, setShowBetMenu] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState(AutoSpinSpeed.NORMAL);
  const [autoSpinPending, setAutoSpinPending] = useState(null);

  // Wolf Burst animation state
  const [wolfBurstActive, setWolfBurstActive] = useState(false);

  // Active Feature Mode from store (scatter_hunt, wild_boost, or null)
  const activeFeatureMode = useGameStore((state) => state.activeFeatureMode);
  const setActiveFeatureMode = useGameStore((state) => state.setActiveFeatureMode);
  const clearActiveFeatureMode = useGameStore((state) => state.clearActiveFeatureMode);
  const getTotalSpinCost = useGameStore((state) => state.getTotalSpinCost);

  // Wolf Dress-Up state
  const wolfAccessoryCount = useGameStore((state) => state.wolfAccessoryCount);
  const resetWolfDressUp = useGameStore((state) => state.resetWolfDressUp);
  const isFreeSpin = useGameStore((state) => state.isFreeSpin);
  const wolfDressUpRef = useRef(null);

  // Win animation state (auto-resets after 2 seconds)
  const [winAnimationActive, setWinAnimationActive] = useState(false);
  const winAnimationTimeoutRef = useRef(null);

  // Track if we were in free spins (to detect when they end)
  const wasInFreeSpinsRef = useRef(false);
  const bonusTotalWinRef = useRef(0);
  const bonusOverlayResolveRef = useRef(null);
  const winCelebrationResolveRef = useRef(null);
  const handleSpinRef = useRef(null);
  const spriteRefs = useRef(new Map());

  // Get manual speed mode for global GSAP speed control
  const manualSpeedMode = useGameStore((state) => state.manualSpeedMode);

  // Derived values
  const effectiveBet = getEffectiveBet();
  const hasActiveBoost = scatterBoostActive || wildBoostActive;
  const hasActiveFeatureMode = activeFeatureMode !== null;
  // Feature mode cost is bet × multiplier (NOT bet + bet×multiplier)
  const totalSpinCost = activeFeatureMode ? betAmount * activeFeatureMode.multiplier : betAmount;
  const isBonusActive = freeSpinsRemaining > 0;
  const canSpin = !isSpinning && !isAnimating && !isRunning && balance >= totalSpinCost;

  // Update GSAP global timeline speed when speed mode changes
  // This makes speed changes take effect IMMEDIATELY on all running animations
  useEffect(() => {
    const effectiveSpeed = autoSpinActive ? autoSpinSpeed : manualSpeedMode;
    const speedMultiplier = SPEED_MULTIPLIERS[effectiveSpeed] || 1;
    // TimeScale is inverse: lower multiplier = faster, so we use 1/multiplier
    // But our multiplier is already inverted (0.5 = 2x speed), so we use 1/multiplier
    const timeScale = 1 / speedMultiplier;
    gsap.globalTimeline.timeScale(timeScale);
    console.log('GSAP timeScale updated:', timeScale, '(speed mode:', effectiveSpeed, ')');
  }, [autoSpinActive, autoSpinSpeed, manualSpeedMode]);

  // Setup event runner callbacks
  useEffect(() => {
    setOnBonusTrigger(async ({ freeSpinsAwarded, scatterCount, isRetrigger = false }) => {
      return new Promise((resolve) => {
        if (isRetrigger) {
          // Retrigger during bonus - use simple overlay
          setBonusOverlay({
            show: true,
            type: 'retrigger',
            freeSpinsAwarded,
            totalWin: 0,
            scatterCount,
          });
          setTimeout(resolve, 2000);
        } else {
          // Natural trigger in base game - use fancy BonusBuyIntro
          // 3 scatters = standard (Free Spins), 4+ = super (Super Bonus)
          const bonusType = scatterCount >= 4 ? 'super' : 'standard';
          setBonusIntro({
            show: true,
            bonusType,
            scatterCount,
            freeSpinsToActivate: freeSpinsAwarded,
            pendingWolfBurst: null,
            pendingBoost: null,
            naturalTriggerResolve: resolve, // Store resolve for when user clicks JOUER
          });
        }
      });
    });

    setOnBonusEnd(async ({ totalWin }) => {
      return new Promise((resolve) => {
        setBonusOverlay({
          show: true,
          type: 'summary',
          freeSpinsAwarded: 0,
          totalWin,
        });
        bonusOverlayResolveRef.current = resolve;
      });
    });

    setOnWinPopup(({ amount }) => {
      setWinPopup({ amount });
      setTimeout(() => setWinPopup(null), 1500);
    });

    setOnSpinWin(async ({ amount, betAmount }) => {
      const multiplier = betAmount > 0 ? amount / betAmount : 0;
      if (multiplier < 2) return;

      return new Promise((resolve) => {
        setWinCelebration({ show: true, amount, betAmount });
        winCelebrationResolveRef.current = resolve;
      });
    });
  }, [setOnBonusTrigger, setOnBonusEnd, setOnWinPopup, setOnSpinWin]);

  const handleBonusOverlayComplete = useCallback(() => {
    setBonusOverlay({ show: false, type: null, freeSpinsAwarded: 0, totalWin: 0 });
    if (bonusOverlayResolveRef.current) {
      bonusOverlayResolveRef.current();
      bonusOverlayResolveRef.current = null;
    }
  }, []);

  const handleWinCelebrationComplete = useCallback(() => {
    setWinCelebration({ show: false, amount: 0, betAmount: 1 });
    if (winCelebrationResolveRef.current) {
      winCelebrationResolveRef.current();
      winCelebrationResolveRef.current = null;
    }
  }, []);

  const handleFirstInteraction = useCallback(async () => {
    if (!audioReady) {
      try {
        await audioService.init();
        setAudioReady(true);
        if (musicEnabled) {
          await audioService.fadeIn(1);
        }
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  }, [audioReady, musicEnabled]);

  const handleToggleMusic = useCallback(async () => {
    if (!audioReady) {
      await handleFirstInteraction();
    }
    const newState = !musicEnabled;
    setMusicEnabled(newState);
    if (newState) {
      await audioService.play();
    } else {
      audioService.stop();
    }
  }, [audioReady, musicEnabled, setMusicEnabled, handleFirstInteraction]);

  const handleIntroComplete = useCallback(async () => {
    startGame();
    await handleFirstInteraction();
  }, [startGame, handleFirstInteraction]);

  // Sync music state with store
  useEffect(() => {
    if (audioReady) {
      if (musicEnabled && !audioService.isPlaying) {
        audioService.play();
      } else if (!musicEnabled && audioService.isPlaying) {
        audioService.stop();
      }
    }
  }, [musicEnabled, audioReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioService.dispose();
    };
  }, []);

  // Trigger win animation for 2 seconds when there's a win
  useEffect(() => {
    if (lastWin > 0) {
      // Clear any existing timeout
      if (winAnimationTimeoutRef.current) {
        clearTimeout(winAnimationTimeoutRef.current);
      }
      // Start animation
      setWinAnimationActive(true);
      // Stop after 2 seconds
      winAnimationTimeoutRef.current = setTimeout(() => {
        setWinAnimationActive(false);
      }, 2000);
    }
    return () => {
      if (winAnimationTimeoutRef.current) {
        clearTimeout(winAnimationTimeoutRef.current);
      }
    };
  }, [lastWin]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isAnimating || isRunning) {
          useGameStore.getState().triggerTurbo?.();
          return;
        }
        if (!isSpinning && !isAnimating && !isRunning && gameState === GameState.BASE_GAME) {
          if (handleSpinRef.current) {
            handleSpinRef.current();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, isAnimating, isRunning, gameState]);

  const handleSpriteReady = useCallback((row, col, sprite) => {
    const key = `${row}-${col}`;
    if (sprite) {
      spriteRefs.current.set(key, sprite);
      registerSprite(row, col, sprite);
    } else {
      spriteRefs.current.delete(key);
      registerSprite(row, col, null);
    }
  }, [registerSprite]);

  const handleSpin = useCallback(async () => {
    if (isSpinning || isAnimating || isRunning) return;

    // Check if Wolf Burst mode is active
    const currentFeatureMode = useGameStore.getState().activeFeatureMode;
    if (currentFeatureMode?.id === 'wolf_burst') {
      // DO NOT clear the mode - it stays active until user clicks DISABLE
      // Execute wolf burst for this spin
      try {
        setIsAnimating(true);
        const buyResult = await buyBonus('wolf_burst');

        if (buyResult?.success) {
          // Play wolf burst animation (2.5 seconds) with sound
          setWolfBurstActive(true);
          audioService.playWolfBurstSound();
          await new Promise(resolve => setTimeout(resolve, 2500));
          setWolfBurstActive(false);

          // Now trigger the actual spin (which will use wolf_burst_positions from session)
          const spinResult = await spin();
          if (spinResult) {
            await playAllEvents(spinResult, { isWolfBurst: true, wolfDressUpRef });
          }
        }
      } catch (error) {
        console.error('Wolf burst error:', error);
        alert('Achat échoué: ' + error.message);
        setWolfBurstActive(false);
      } finally {
        setIsAnimating(false);
      }
      return;
    }

    try {
      setIsAnimating(true);
      const wasFreeSpin = freeSpinsRemaining > 0;
      wasInFreeSpinsRef.current = wasFreeSpin;

      const result = await spin();
      if (!result) {
        setIsAnimating(false);
        return;
      }

      const responseFreeSpinTotal = typeof result.freeSpinTotalWin === 'number' ? result.freeSpinTotalWin : 0;
      if (result.isFreeSpin || wasFreeSpin) {
        bonusTotalWinRef.current = responseFreeSpinTotal;
      }

      const wasInBonus = wasFreeSpin || result.isFreeSpin;
      const bonusJustEnded = wasInBonus && result.freeSpinsRemaining <= 0 && !result.freeSpinsTriggered;
      const bonusTotalWin = bonusJustEnded ? (responseFreeSpinTotal || bonusTotalWinRef.current || 0) : 0;

      await playAllEvents(result, {
        isBonusEnd: bonusJustEnded,
        bonusTotalWin,
        wolfDressUpRef,
      });

      if (bonusJustEnded) {
        bonusTotalWinRef.current = 0;
      }
    } catch (error) {
      console.error('Spin failed:', error);
    } finally {
      setIsAnimating(false);
    }
  }, [spin, playAllEvents, isSpinning, isAnimating, isRunning, setIsAnimating, freeSpinsRemaining, buyBonus]);

  useEffect(() => {
    handleSpinRef.current = handleSpin;
  }, [handleSpin]);

  // Auto-spin during free spins
  useEffect(() => {
    if (freeSpinsRemaining > 0 && !isSpinning && !isAnimating && !isRunning && !bonusOverlay.show) {
      const speedMultiplier = SPEED_MULTIPLIERS[autoSpinSpeed] || 1;
      const delay = Math.round(800 * speedMultiplier);
      const autoSpinDelay = setTimeout(() => {
        if (handleSpinRef.current) handleSpinRef.current();
      }, delay);
      return () => clearTimeout(autoSpinDelay);
    }
  }, [freeSpinsRemaining, isSpinning, isAnimating, isRunning, bonusOverlay.show, autoSpinSpeed]);

  // Auto-spin in base game mode
  useEffect(() => {
    if (autoSpinActive && freeSpinsRemaining <= 0 && !isSpinning && !isAnimating && !isRunning && !bonusOverlay.show) {
      const speedMultiplier = SPEED_MULTIPLIERS[autoSpinSpeed] || 1;
      const delay = Math.round(500 * speedMultiplier);
      const autoSpinDelay = setTimeout(() => {
        if (handleSpinRef.current) {
          handleSpinRef.current();
          decrementAutoSpin();
        }
      }, delay);
      return () => clearTimeout(autoSpinDelay);
    }
  }, [autoSpinActive, autoSpinSpeed, freeSpinsRemaining, isSpinning, isAnimating, isRunning, bonusOverlay.show, decrementAutoSpin]);

  // Auto-spin during boost (Scatter Hunt / Wild Boost)
  useEffect(() => {
    const boostActive = scatterBoostSpinsRemaining > 0 || wildBoostSpinsRemaining > 0;
    if (boostActive && !isSpinning && !isAnimating && !isRunning && !bonusOverlay.show && !bonusIntro.show) {
      const speedMultiplier = SPEED_MULTIPLIERS[autoSpinSpeed] || 1;
      const delay = Math.round(800 * speedMultiplier);
      const boostSpinDelay = setTimeout(async () => {
        if (handleSpinRef.current) {
          handleSpinRef.current();
          // Decrement boost spin after the spin starts
          decrementBoostSpin();
        }
      }, delay);
      return () => clearTimeout(boostSpinDelay);
    }
  }, [scatterBoostSpinsRemaining, wildBoostSpinsRemaining, isSpinning, isAnimating, isRunning, bonusOverlay.show, bonusIntro.show, autoSpinSpeed, decrementBoostSpin]);

  const handleRotateSeed = useCallback(async () => {
    try {
      return await rotateSeed();
    } catch (error) {
      console.error('Rotate seed failed:', error);
      return null;
    }
  }, [rotateSeed]);

  const handleBuyBonus = useCallback(async (bonusData) => {
    try {
      if (bonusData.boostType) {
        const result = await activateBoost(bonusData.boostType);
        setIsAnimating(false);
        return result;
      }
      return await buyBonus(bonusData);
    } catch (error) {
      console.error('Bonus buy failed:', error);
      setIsAnimating(false);
      throw error;
    }
  }, [buyBonus, activateBoost, setIsAnimating]);

  const handleBonusTriggerSpin = useCallback(async ({ bonusId, bonusType, scatterCount }) => {
    bonusTotalWinRef.current = 0;
    try {
      setIsAnimating(true);
      const result = await bonusTriggerSpin(bonusId);
      if (!result) {
        setIsAnimating(false);
        return;
      }
      await playAllEvents(result, { isBonusBuy: true, wolfDressUpRef });
      setBonusIntro({
        show: true,
        bonusType,
        scatterCount,
        freeSpinsToActivate: result.freeSpinsTriggered,
      });
    } catch (error) {
      console.error('Bonus trigger spin error', error);
      alert('Purchase failed: ' + error.message);
    } finally {
      setIsAnimating(false);
    }
  }, [bonusTriggerSpin, playAllEvents, setIsAnimating]);

  const setFreeSpins = useGameStore((state) => state.setFreeSpins);
  const setMultiplierGrid = useGameStore((state) => state.setMultiplierGrid);

  // Execute the actual wolf burst (must be defined before handleBonusIntroComplete)
  const executeWolfBurst = useCallback(async (bonusId) => {
    try {
      setIsAnimating(true);
      const buyResult = await buyBonus(bonusId);

      if (buyResult?.success) {
        // Play wolf burst animation (2.5 seconds) with sound
        setWolfBurstActive(true);
        audioService.playWolfBurstSound();
        await new Promise(resolve => setTimeout(resolve, 2500));
        setWolfBurstActive(false);

        // Now trigger the actual spin (which will use wolf_burst_positions from session)
        const spinResult = await spin();
        if (spinResult) {
          await playAllEvents(spinResult, { isWolfBurst: true, wolfDressUpRef });
        }
      }
    } catch (error) {
      console.error('Wolf burst error:', error);
      alert('Achat échoué: ' + error.message);
      setWolfBurstActive(false);
    } finally {
      setIsAnimating(false);
    }
  }, [buyBonus, spin, playAllEvents, setIsAnimating]);

  const handleBonusIntroComplete = useCallback(async () => {
    const { freeSpinsToActivate, scatterCount, pendingWolfBurst, pendingBoost, bonusType, naturalTriggerResolve } = bonusIntro;

    // Handle Wolf Burst
    if (bonusType === 'wolf_burst' && pendingWolfBurst) {
      setBonusIntro({ show: false, bonusType: 'standard', scatterCount: 3, freeSpinsToActivate: 0, pendingWolfBurst: null, pendingBoost: null, naturalTriggerResolve: null });
      executeWolfBurst(pendingWolfBurst.bonusId);
      return;
    }

    // Handle Scatter Hunt or Wild Boost
    if (pendingBoost) {
      const { boostType, spins } = pendingBoost;
      setBonusIntro({ show: false, bonusType: 'standard', scatterCount: 3, freeSpinsToActivate: 0, pendingWolfBurst: null, pendingBoost: null, naturalTriggerResolve: null });

      // Map frontend boostType to backend API boostType
      const apiBoostType = boostType === 'scatter_hunt' ? 'scatter_boost' : boostType;

      try {
        // Call API to activate boost and deduct cost
        const result = await activateBoost(apiBoostType);
        if (result?.success) {
          // Activate the boost in the store (after successful payment)
          if (boostType === 'scatter_hunt') {
            setScatterBoost(spins);
          } else if (boostType === 'wild_boost') {
            setWildBoost(spins);
          }
        }
      } catch (error) {
        console.error('Boost activation failed:', error);
        alert('Activation échouée: ' + error.message);
      }
      // Auto-spin will be triggered by the useEffect below
      return;
    }

    // Handle Natural Scatter Trigger (from base game)
    if (naturalTriggerResolve) {
      // For 4+ scatters (Super Bonus), start with x2 multipliers
      if (scatterCount >= 4) {
        const x2Grid = Array(5).fill(null).map(() => Array(6).fill(2));
        setMultiplierGrid(x2Grid);
      }
      setBonusIntro({ show: false, bonusType: 'standard', scatterCount: 3, freeSpinsToActivate: 0, pendingWolfBurst: null, pendingBoost: null, naturalTriggerResolve: null });
      // Resolve the promise so the event runner can continue
      naturalTriggerResolve();
      return;
    }

    // Handle Free Spins (from bought bonus)
    if (freeSpinsToActivate > 0) {
      setFreeSpins(freeSpinsToActivate, 0);
      if (scatterCount === 4) {
        const x2Grid = Array(5).fill(null).map(() => Array(6).fill(2));
        setMultiplierGrid(x2Grid);
      }
    }
    setBonusIntro({ show: false, bonusType: 'standard', scatterCount: 3, freeSpinsToActivate: 0, pendingWolfBurst: null, pendingBoost: null, naturalTriggerResolve: null });
  }, [bonusIntro, setFreeSpins, setMultiplierGrid, executeWolfBurst, setScatterBoost, setWildBoost, activateBoost]);

  // Wolf Burst handler - shows intro first, then executes on confirmation
  const handleWolfBurst = useCallback(async ({ bonusId }) => {
    // Show the intro screen first
    setBonusIntro({
      show: true,
      bonusType: 'wolf_burst',
      scatterCount: 0,
      freeSpinsToActivate: 0,
      pendingWolfBurst: { bonusId },
      pendingBoost: null,
    });
  }, []);

  // Boost handler (Scatter Hunt / Wild Boost) - shows intro first
  const handleBoostBuy = useCallback(async ({ boostType, spins }) => {
    // boostType is 'scatter_hunt' or 'wild_boost'
    setBonusIntro({
      show: true,
      bonusType: boostType,
      scatterCount: 0,
      freeSpinsToActivate: 0,
      pendingWolfBurst: null,
      pendingBoost: { boostType, spins },
    });
  }, []);

  // Feature Mode Activation handler - no intro, just toggle on/off
  const handleActivateFeature = useCallback(async ({ featureId, multiplier, name }) => {
    // All feature modes show banner and execute on spin
    setActiveFeatureMode({
      id: featureId,
      multiplier,
      name,
    });
  }, [setActiveFeatureMode]);

  // Disable feature mode handler
  const handleDisableFeature = useCallback(() => {
    clearActiveFeatureMode();
  }, [clearActiveFeatureMode]);

  // Bet control handlers
  const handleBetChange = useCallback((direction) => {
    const currentIndex = BET_OPTIONS.indexOf(betAmount);
    let newIndex;
    if (direction === 'up') {
      newIndex = Math.min(currentIndex + 1, BET_OPTIONS.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    setBetAmount(BET_OPTIONS[newIndex]);
  }, [betAmount, setBetAmount]);

  const handleAutoSpinSelect = useCallback((count) => {
    setAutoSpinPending({ count, speed: selectedSpeed });
    setShowAutoSpinMenu(false);
  }, [selectedSpeed]);

  const handleStopAutoSpin = useCallback(() => {
    stopAutoSpin();
    setAutoSpinPending(null);
  }, [stopAutoSpin]);

  const handleSpinClick = useCallback(() => {
    if (autoSpinPending) {
      startAutoSpin(autoSpinPending.count, autoSpinPending.speed);
      setAutoSpinPending(null);
    }
    setShowAutoSpinMenu(false);
    handleSpin();
  }, [autoSpinPending, startAutoSpin, handleSpin]);

  return (
    <div className="app">
      {/* Intro Screen */}
      {gameState === GameState.INTRO && (
        <IntroScreen onStart={handleIntroComplete} />
      )}

      {/* Illustrated Background - Le Bandit Style */}
      <div className="illustrated-bg">
        <div className="bg-base" />
        <div className="bg-left-structure" />
        <div className="bg-right-structure" />
        <div className="bg-light" />
        <div className="bg-ground" />
        <img src="/symbols/wolf_spirit.png" alt="" className="bg-wolf bg-wolf-left" />
        <img src="/symbols/wolf_spirit.png" alt="" className="bg-wolf bg-wolf-right" />
      </div>

      {/* Bonus Active Indicator */}
      {freeSpinsRemaining > 0 && (
        <div className="bonus-active-indicator">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          BONUS
        </div>
      )}

      {/* Boost Indicators */}
      {(scatterBoostSpinsRemaining > 0 || wildBoostSpinsRemaining > 0) && (
        <div className="boost-indicators">
          {scatterBoostSpinsRemaining > 0 && (
            <div className="boost-indicator scatter-boost">
              <span>SCATTER HUNT x{scatterBoostSpinsRemaining}</span>
            </div>
          )}
          {wildBoostSpinsRemaining > 0 && (
            <div className="boost-indicator wild-boost">
              <span>WILD BOOST x{wildBoostSpinsRemaining}</span>
            </div>
          )}
        </div>
      )}


      {/* MAIN GAME AREA - Le Bandit style */}
      <div
        className="game-area"
        style={{
          transform: `scale(${gameScale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Machine Frame with integrated title */}
        <div className="machine-frame">
          {/* Title in decorative header - Logo */}
          <div className="machine-top">
            <img src="/logo.png?v14" alt="Les Wolfs 86" className="machine-logo" />
          </div>

          {/* Game Container - Grid */}
          <div className="game-container">
            {/* Stage Wrapper */}
            <div className="stage-wrapper">
              {/* FreeSpinsCounter is now integrated in bonus control bar */}
              <GameStage onSpriteReady={handleSpriteReady} />

              {/* Win Popup */}
              {winPopup && (
                <div className="win-popup">
                  <div className="win-popup-content">
                    <div className="win-popup-amount">+{winPopup.amount.toFixed(2)} EUR</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mascot wolf on right side */}
          <div
            className={`mascot-character ${wolfBurstActive ? 'wolf-burst' : ''} ${winAnimationActive ? 'excited' : ''} ${isSpinning ? 'breathing' : ''} ${wolfAccessoryCount >= 5 ? 'fully-dressed' : ''}`}
            id="mascot-wolf"
          >
            {/* Wolf and accessories wrapper - animated together */}
            <div className="wolf-animated-wrapper">
              <img src="/mascotte.png" alt="Wolf Mascot" className="wolf-image" />

              {/* Wolf Dress-Up Accessories - appear during Free Spins */}
              {isFreeSpin && wolfAccessoryCount >= 1 && (
                <img src="/accessories/tshirt.png" alt="" className="wolf-accessory" />
              )}
              {isFreeSpin && wolfAccessoryCount >= 2 && (
                <img src="/accessories/veste.png" alt="" className="wolf-accessory" />
              )}
              {isFreeSpin && wolfAccessoryCount >= 3 && (
                <img src="/accessories/collier.png" alt="" className="wolf-accessory" />
              )}
              {isFreeSpin && wolfAccessoryCount >= 4 && (
                <img src="/accessories/lunette.png" alt="" className="wolf-accessory" />
              )}
              {isFreeSpin && wolfAccessoryCount >= 5 && (
                <img src="/accessories/chapeau.png" alt="" className="wolf-accessory" />
              )}
            </div>

            {/* Glow effect when fully dressed */}
            {isFreeSpin && wolfAccessoryCount >= 5 && (
              <div className="wolf-fully-dressed-glow" />
            )}
          </div>

          {/* Wolf Dress-Up Multiplier Component (for animation only) */}
          <WolfDressUp
            ref={wolfDressUpRef}
            accessoryCount={wolfAccessoryCount}
            isVisible={false}
            spinWin={lastWin}
          />
        </div>

        {/* Control Bar - Bottom (Le Bandit Style) */}
        {/* Normal control bar - hidden during Free Spins */}
        <div className={`control-bar ${isBonusActive ? 'hidden' : ''}`}>
          {/* BUY BONUS Button (circular yellow) */}
          <button
            className="bonus-btn-circle"
            onClick={toggleBonusMenu}
            disabled={isSpinning || isBonusActive}
          >
            <span>BUY</span>
            <span>BONUS</span>
          </button>

          {/* Menu Button */}
          <div className="menu-wrapper">
            <button className="menu-btn" onClick={() => setShowSettings(!showSettings)}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
            <SettingsMenu
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              musicEnabled={musicEnabled}
              onMusicToggle={handleToggleMusic}
              sfxEnabled={soundEnabled}
              onSfxToggle={toggleSound}
            />
          </div>

          {/* Balance Display */}
          <div className="info-display-new">
            <span className="label">SOLDE</span>
            <span className="value">€{balance.toFixed(2)}</span>
          </div>

          {/* Win Display */}
          <div className={`info-display-new win-display ${lastWin > 0 ? 'has-win' : ''}`}>
            <span className="label">GAIN</span>
            <span className="value">€{lastWin > 0 ? lastWin.toFixed(2) : '0.00'}</span>
          </div>

          {/* Bet Control with Arrows */}
          <div className="bet-control-new">
            <div className="bet-display">
              <span className="label">{(hasActiveBoost || hasActiveFeatureMode) ? 'COUT' : 'MISE'}</span>
              <span className="value">€{hasActiveFeatureMode ? totalSpinCost.toFixed(2) : (hasActiveBoost ? effectiveBet.toFixed(2) : betAmount.toFixed(2))}</span>
            </div>
            <div className="bet-arrows">
              <button
                className="bet-arrow up"
                onClick={() => handleBetChange('up')}
                disabled={isSpinning || betAmount === BET_OPTIONS[BET_OPTIONS.length - 1]}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14l5-5 5 5z" />
                </svg>
              </button>
              <button
                className="bet-arrow down"
                onClick={() => handleBetChange('down')}
                disabled={isSpinning || betAmount === BET_OPTIONS[0]}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Large Autoplay/Spin Button */}
          <button
            className={`main-spin-btn ${autoSpinActive ? 'autoplay-active' : ''} ${isSpinning ? 'spinning' : ''}`}
            onClick={() => {
              if (autoSpinActive) {
                handleStopAutoSpin();
              } else {
                handleSpinClick();
              }
            }}
            disabled={!canSpin && !autoSpinActive}
          >
            {autoSpinActive ? (
              <div className="autoplay-counter">
                <span>{autoSpinRemaining === Infinity ? '∞' : autoSpinRemaining}</span>
              </div>
            ) : (
              <svg className="spin-arrows" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            )}
          </button>

          {/* Autoplay Menu Button */}
          <button
            className={`autoplay-menu-btn ${showAutoSpinMenu ? 'active' : ''}`}
            onClick={() => setShowAutoSpinMenu(!showAutoSpinMenu)}
            disabled={isSpinning || isBonusActive}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
            </svg>
          </button>
        </div>

        {/* Feature Mode Active Indicator - Above control bar */}
        {activeFeatureMode && !isBonusActive && (
          <div className="feature-mode-indicator">
            <div className="feature-mode-label">
              <span className="mode-name">{activeFeatureMode.name}</span>
              <span className="mode-cost">{totalSpinCost.toFixed(2)} €</span>
            </div>
            <button
              className="mode-disable-btn"
              onClick={handleDisableFeature}
              disabled={isSpinning || isAnimating}
            >
              DISABLE
            </button>
          </div>
        )}

        {/* Autoplay Menu Popup */}
        {showAutoSpinMenu && (
          <div className="autoplay-menu">
            <div className="autoplay-header">
              <span className="title">AUTOPLAY</span>
              <button className="close-btn" onClick={() => { setShowAutoSpinMenu(false); setAutoSpinPending(null); }}>×</button>
            </div>
            <div className="autoplay-content">
              <span className="section-title">NOMBRE DE TOURS</span>
              <div className="rounds-grid">
                {[10, 25, 50, 75, 100, 500, 1000].map((count) => (
                  <button
                    key={count}
                    className={`round-btn ${autoSpinPending?.count === count ? 'selected' : ''}`}
                    onClick={() => {
                      setAutoSpinPending({ count, speed: selectedSpeed });
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bonus Control Bar - Only during Free Spins */}
        {isBonusActive && (
          <div className="control-bar bonus-mode">
            {/* Menu Button */}
            <div className="menu-wrapper">
              <button className="menu-btn" onClick={() => setShowSettings(!showSettings)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                </svg>
              </button>
              <SettingsMenu
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                musicEnabled={musicEnabled}
                onMusicToggle={handleToggleMusic}
                sfxEnabled={soundEnabled}
                onSfxToggle={toggleSound}
              />
            </div>

            {/* Balance Display */}
            <div className="info-display-new">
              <span className="label">SOLDE</span>
              <span className="value">€{balance.toFixed(2)}</span>
            </div>

            {/* Bet Display */}
            <div className="info-display-new">
              <span className="label">MISE</span>
              <span className="value">€{betAmount.toFixed(2)}</span>
            </div>

            {/* Spacer */}
            <div className="bonus-bar-spacer" />

            {/* Total Win Display */}
            <div className="bonus-total-win">
              <span className="label">TOTAL WIN</span>
              <span className="value">€{(freeSpinTotalWin || 0).toFixed(2)}</span>
            </div>

            {/* Free Spins Counter */}
            <div className="bonus-spins-counter">
              <span className="label">FREE SPINS</span>
              <span className="value">{freeSpinsRemaining}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bonus Buy Menu Modal */}
      <BonusBuyMenu
        onBuyBonus={handleBuyBonus}
        onBonusTriggerSpin={handleBonusTriggerSpin}
        onActivateFeature={handleActivateFeature}
        disabled={isSpinning || isAnimating}
      />

      {/* Bonus Buy Intro Animation */}
      <BonusBuyIntro
        show={bonusIntro.show}
        bonusType={bonusIntro.bonusType}
        scatterCount={bonusIntro.scatterCount}
        freeSpinsToActivate={bonusIntro.freeSpinsToActivate}
        onComplete={handleBonusIntroComplete}
      />

      {/* Bonus Overlay */}
      <BonusOverlay
        show={bonusOverlay.show}
        type={bonusOverlay.type}
        freeSpinsAwarded={bonusOverlay.freeSpinsAwarded}
        totalWin={bonusOverlay.totalWin}
        onComplete={handleBonusOverlayComplete}
      />

      {/* Win Celebration */}
      <WinCelebration
        show={winCelebration.show}
        amount={winCelebration.amount}
        betAmount={winCelebration.betAmount}
        onComplete={handleWinCelebrationComplete}
      />

      {/* Provably Fair Footer */}
      <ProvablyFairFooter onRotateSeed={handleRotateSeed} />

      {/* Session Info (Dev) */}
      {sessionId && (
        <div className="session-info">
          Session: {sessionId.slice(0, 8)}...
        </div>
      )}
    </div>
  );
}

export default App;
