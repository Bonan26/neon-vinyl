/**
 * LES WOLFS 86
 * Main Application Component
 * Compact rectangular design inspired by "Le Bandit" (Hacksaw Gaming)
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { GameStage } from './components/game';
import ProvablyFairFooter from './components/ui/ProvablyFairFooter';
import BonusBuyMenu from './components/ui/BonusBuyMenu';
import BonusBuyIntro from './components/ui/BonusBuyIntro';
import FreeSpinsCounter from './components/ui/FreeSpinsCounter';
import BonusOverlay from './components/ui/BonusOverlay';
import IntroScreen from './components/ui/IntroScreen';
import WinCelebration from './components/ui/WinCelebration';
import SettingsMenu from './components/ui/SettingsMenu';
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
  const scatterBoostSpins = useGameStore((state) => state.scatterBoostSpins);
  const wildBoostSpins = useGameStore((state) => state.wildBoostSpins);
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
  });

  // Settings menu state
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoSpinMenu, setShowAutoSpinMenu] = useState(false);
  const [showBetMenu, setShowBetMenu] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState(AutoSpinSpeed.NORMAL);
  const [autoSpinPending, setAutoSpinPending] = useState(null);

  // Wolf Burst animation state
  const [wolfBurstActive, setWolfBurstActive] = useState(false);

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

  // Derived values
  const effectiveBet = getEffectiveBet();
  const hasActiveBoost = scatterBoostActive || wildBoostActive;
  const isBonusActive = freeSpinsRemaining > 0;
  const canSpin = !isSpinning && !isAnimating && !isRunning && balance >= effectiveBet;

  // Setup event runner callbacks
  useEffect(() => {
    setOnBonusTrigger(async ({ freeSpinsAwarded, scatterCount, isRetrigger = false }) => {
      return new Promise((resolve) => {
        setBonusOverlay({
          show: true,
          type: isRetrigger ? 'retrigger' : 'trigger',
          freeSpinsAwarded,
          totalWin: 0,
          scatterCount,
        });
        const displayTime = isRetrigger ? 2000 : 3000;
        setTimeout(resolve, displayTime);
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
      });

      if (bonusJustEnded) {
        bonusTotalWinRef.current = 0;
      }
    } catch (error) {
      console.error('Spin failed:', error);
    } finally {
      setIsAnimating(false);
    }
  }, [spin, playAllEvents, isSpinning, isAnimating, isRunning, setIsAnimating, freeSpinsRemaining]);

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
      await playAllEvents(result, { isBonusBuy: true });
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

  const handleBonusIntroComplete = useCallback(() => {
    const { freeSpinsToActivate, scatterCount } = bonusIntro;
    if (freeSpinsToActivate > 0) {
      setFreeSpins(freeSpinsToActivate, 0);
      if (scatterCount === 4) {
        const x2Grid = Array(5).fill(null).map(() => Array(6).fill(2));
        setMultiplierGrid(x2Grid);
      }
    }
    setBonusIntro({ show: false, bonusType: 'standard', scatterCount: 3, freeSpinsToActivate: 0 });
  }, [bonusIntro, setFreeSpins, setMultiplierGrid]);

  // Wolf Burst handler - buys the wolf burst bonus (single spin with forced wilds)
  const handleWolfBurst = useCallback(async ({ bonusId }) => {
    try {
      setIsAnimating(true);
      const result = await buyBonus(bonusId);
      if (result?.initialResult) {
        // Play wolf burst animation (2.5 seconds) with sound
        setWolfBurstActive(true);
        audioService.playWolfBurstSound();
        await new Promise(resolve => setTimeout(resolve, 2500));
        setWolfBurstActive(false);

        // Then play the spin result
        await playAllEvents(result.initialResult, { isWolfBurst: true });
      }
    } catch (error) {
      console.error('Wolf burst error:', error);
      alert('Achat échoué: ' + error.message);
      setWolfBurstActive(false);
    } finally {
      setIsAnimating(false);
    }
  }, [buyBonus, playAllEvents, setIsAnimating]);

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
      {(scatterBoostSpins > 0 || wildBoostSpins > 0) && (
        <div className="boost-indicators">
          {scatterBoostSpins > 0 && (
            <div className="boost-indicator scatter-boost">
              <span>SC x{scatterBoostSpins}</span>
            </div>
          )}
          {wildBoostSpins > 0 && (
            <div className="boost-indicator wild-boost">
              <span>WD x{wildBoostSpins}</span>
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
              <FreeSpinsCounter hideDuringOverlay={bonusOverlay.type === 'summary'} />
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

          {/* Mascot wolf on right side with animated image */}
          <div className={`mascot-character ${wolfBurstActive ? 'wolf-burst' : ''} ${winAnimationActive ? 'excited' : ''} ${isSpinning ? 'breathing' : ''}`} id="mascot-wolf">
            <img src="/mascotte.png" alt="Wolf Mascot" className="wolf-image" />
          </div>
        </div>

        {/* Control Bar - Bottom */}
        <div className="control-bar">
          {/* BONUS Button (orange round) */}
          <button
            className="bonus-btn-round"
            onClick={toggleBonusMenu}
            disabled={isSpinning || isBonusActive}
          >
            BONUS
          </button>

          {/* Sound Toggle */}
          <button
            className={`icon-btn ${musicEnabled ? 'active' : ''}`}
            onClick={handleToggleMusic}
            style={musicEnabled ? { borderColor: '#c9a855', color: '#c9a855' } : {}}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              {musicEnabled ? (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              ) : (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              )}
            </svg>
          </button>

          {/* Menu Button */}
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
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
          <div className="info-display">
            <span className="label">SOLDE</span>
            <span className="value">{balance.toFixed(2)}</span>
          </div>

          {/* Win Display */}
          <div className={`info-display win-display ${lastWin > 0 ? 'has-win' : ''}`}>
            <span className="label">GAIN</span>
            <span className="value win-value">{lastWin > 0 ? lastWin.toFixed(2) : '0.00'}</span>
          </div>

          {/* Bet Control with Popup */}
          <div className="bet-control" style={{ position: 'relative' }}>
            <button
              className="bet-btn"
              onClick={() => handleBetChange('down')}
              disabled={isSpinning || betAmount === BET_OPTIONS[0]}
            >
              -
            </button>
            <div
              className="info-display bet-clickable"
              onClick={() => !isSpinning && setShowBetMenu(!showBetMenu)}
              style={{ cursor: isSpinning ? 'not-allowed' : 'pointer' }}
            >
              <span className="label">{hasActiveBoost ? 'COUT' : 'MISE'}</span>
              <span className="value">{hasActiveBoost ? effectiveBet.toFixed(2) : betAmount.toFixed(2)}</span>
            </div>
            <button
              className="bet-btn"
              onClick={() => handleBetChange('up')}
              disabled={isSpinning || betAmount === BET_OPTIONS[BET_OPTIONS.length - 1]}
            >
              +
            </button>

            {/* Bet Selector Popup */}
            {showBetMenu && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '200px',
                background: '#1a1510',
                border: '2px solid #4a4540',
                borderRadius: '12px',
                padding: '10px',
                zIndex: 1000,
              }}>
                <div style={{ color: '#c4a060', fontSize: '10px', marginBottom: '8px', letterSpacing: '1px', textAlign: 'center', fontWeight: 'bold' }}>
                  MISE RAPIDE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {BET_OPTIONS.map((bet) => (
                    <button
                      key={bet}
                      onClick={() => {
                        setBetAmount(bet);
                        setShowBetMenu(false);
                      }}
                      style={{
                        padding: '10px 8px',
                        border: betAmount === bet ? '2px solid #c9a855' : '2px solid #3a3530',
                        borderRadius: '8px',
                        background: betAmount === bet ? 'rgba(201, 168, 85, 0.2)' : 'transparent',
                        color: betAmount === bet ? '#f5d742' : '#8b8070',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {bet.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto-Spin Button */}
          <div style={{ position: 'relative' }}>
            <button
              className={`icon-btn ${autoSpinActive || autoSpinPending ? 'active' : ''}`}
              onClick={() => {
                if (autoSpinActive) {
                  handleStopAutoSpin();
                } else if (autoSpinPending) {
                  setAutoSpinPending(null);
                } else {
                  setShowAutoSpinMenu(!showAutoSpinMenu);
                }
              }}
              disabled={isSpinning || isBonusActive}
              style={autoSpinActive || autoSpinPending ? { borderColor: '#c9a855', color: '#c9a855' } : {}}
            >
              {autoSpinActive ? (
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  {autoSpinRemaining === Infinity ? '∞' : autoSpinRemaining}
                </span>
              ) : autoSpinPending ? (
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  {autoSpinPending.count === Infinity ? '∞' : autoSpinPending.count}
                </span>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
              )}
            </button>

            {/* Auto-Spin Menu */}
            {showAutoSpinMenu && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                right: 0,
                width: '160px',
                background: '#1a1510',
                border: '2px solid #4a4540',
                borderRadius: '10px',
                padding: '8px',
                zIndex: 100,
              }}>
                <div style={{ color: '#6a6050', fontSize: '9px', marginBottom: '6px', letterSpacing: '1px' }}>
                  TOURS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {AUTO_SPIN_OPTIONS.map((count) => (
                    <button
                      key={count}
                      onClick={() => handleAutoSpinSelect(count)}
                      style={{
                        flex: '1 0 28%',
                        padding: '6px',
                        border: '1px solid #3a3530',
                        borderRadius: '8px',
                        background: 'transparent',
                        color: '#8b8070',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {count === Infinity ? '∞' : count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Spin Button */}
          <button
            className={`spin-btn ${isSpinning ? 'spinning' : ''}`}
            onClick={handleSpinClick}
            disabled={!canSpin}
          >
            <svg className={`spin-icon ${isSpinning ? 'rotating' : ''}`} viewBox="0 0 24 24" fill="currentColor">
              {isSpinning ? (
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              ) : (
                <path d="M8 5v14l11-7z" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Bonus Buy Menu Modal */}
      <BonusBuyMenu
        onBuyBonus={handleBuyBonus}
        onBonusTriggerSpin={handleBonusTriggerSpin}
        onWolfBurst={handleWolfBurst}
        disabled={isSpinning || isAnimating}
      />

      {/* Bonus Buy Intro Animation */}
      <BonusBuyIntro
        show={bonusIntro.show}
        bonusType={bonusIntro.bonusType}
        scatterCount={bonusIntro.scatterCount}
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
