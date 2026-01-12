/**
 * NEON VINYL: GHOST GROOVES
 * Main Application Component
 *
 * Integrates GSAP animations with the game flow.
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { GameStage } from './components/game';
import { ControlPanel } from './components/ui';
import ProvablyFairFooter from './components/ui/ProvablyFairFooter';
import BonusBuyMenu from './components/ui/BonusBuyMenu';
import BonusBuyIntro from './components/ui/BonusBuyIntro';
import FreeSpinsCounter from './components/ui/FreeSpinsCounter';
import BonusOverlay from './components/ui/BonusOverlay';
import IntroScreen from './components/ui/IntroScreen';
import WildExplosionPopup from './components/ui/WildExplosionPopup';
import WinCelebration from './components/ui/WinCelebration';
import useGameController from './hooks/useGameController';
import useEventRunner from './hooks/useEventRunner';
import useGameStore, { GameState, SPEED_MULTIPLIERS } from './stores/gameStore';
import audioService from './services/audioService';
import './App.css';

function App() {
  // Game controller for API calls
  const { spin, rotateSeed, buyBonus } = useGameController();

  // Event runner for animations
  const eventRunner = useEventRunner();
  const {
    isRunning,
    playAllEvents,
    registerSprite,
    setOnBonusTrigger,
    setOnBonusEnd,
    setOnWinPopup,
    setOnWildExplosion,
    setOnSpinWin,
  } = eventRunner;

  // Store state
  const sessionId = useGameStore((state) => state.sessionId);
  const isSpinning = useGameStore((state) => state.isSpinning);
  const isAnimating = useGameStore((state) => state.isAnimating);
  const setIsAnimating = useGameStore((state) => state.setIsAnimating);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const freeSpinTotalWin = useGameStore((state) => state.freeSpinTotalWin);
  const musicEnabled = useGameStore((state) => state.musicEnabled);
  const setMusicEnabled = useGameStore((state) => state.setMusicEnabled);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const gameState = useGameStore((state) => state.gameState);
  const startGame = useGameStore((state) => state.startGame);

  // Autospin state
  const autoSpinActive = useGameStore((state) => state.autoSpinActive);
  const autoSpinSpeed = useGameStore((state) => state.autoSpinSpeed);
  const decrementAutoSpin = useGameStore((state) => state.decrementAutoSpin);
  const stopAutoSpin = useGameStore((state) => state.stopAutoSpin);

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

  // Wild explosion popup state
  const [wildExplosion, setWildExplosion] = useState({
    show: false,
    position: null,
    multiplier: 64,
  });

  // Bonus buy intro state
  const [bonusIntro, setBonusIntro] = useState({
    show: false,
    bonusType: 'standard',
    scatterCount: 3,
    onComplete: null,
  });

  // Track if we were in free spins (to detect when they end)
  const wasInFreeSpinsRef = useRef(false);
  const bonusTotalWinRef = useRef(0);

  // Wild explosion popup resolve ref
  const wildExplosionResolveRef = useRef(null);

  // Bonus overlay resolve ref (for summary popup)
  const bonusOverlayResolveRef = useRef(null);

  // Win celebration resolve ref (for big win popup)
  const winCelebrationResolveRef = useRef(null);

  // Ref for handleSpin to use in auto-spin effect
  const handleSpinRef = useRef(null);

  // Setup event runner callbacks
  useEffect(() => {
    // Callback when free spins are triggered or retriggered
    setOnBonusTrigger(async ({ freeSpinsAwarded, scatterCount, isRetrigger = false }) => {
      return new Promise((resolve) => {
        setBonusOverlay({
          show: true,
          type: isRetrigger ? 'retrigger' : 'trigger',
          freeSpinsAwarded,
          totalWin: 0,
          scatterCount,
        });
        // Retrigger shows shorter, trigger shows longer
        const displayTime = isRetrigger ? 2000 : 3000;
        setTimeout(resolve, displayTime);
      });
    });

    // Callback when bonus ends
    setOnBonusEnd(async ({ totalWin }) => {
      return new Promise((resolve) => {
        console.log('App: Showing bonus summary with totalWin =', totalWin);
        setBonusOverlay({
          show: true,
          type: 'summary',
          freeSpinsAwarded: 0,
          totalWin,
        });
        // Store resolve - user click will call it via handleBonusOverlayComplete
        bonusOverlayResolveRef.current = resolve;
      });
    });

    // Callback for win popups
    setOnWinPopup(({ amount, symbol, size, positions }) => {
      setWinPopup({ amount, symbol, size });
      // Auto-hide after animation
      setTimeout(() => setWinPopup(null), 1500);
    });

    // Callback for wild explosion popup
    setOnWildExplosion(async ({ wildPosition, affectedCells, newMultiplier }) => {
      return new Promise((resolve) => {
        setWildExplosion({
          show: true,
          position: wildPosition,
          multiplier: newMultiplier,
        });
        // The popup component will call onComplete which resolves
        // Store the resolve function so onComplete can call it
        wildExplosionResolveRef.current = resolve;
      });
    });

    // Callback for big win celebration (tiered popup)
    setOnSpinWin(async ({ amount, betAmount }) => {
      // Only show celebration for wins that qualify (>= 2x bet)
      const multiplier = betAmount > 0 ? amount / betAmount : 0;
      if (multiplier < 2) {
        return; // Don't show celebration for small wins
      }

      return new Promise((resolve) => {
        setWinCelebration({
          show: true,
          amount,
          betAmount,
        });
        // Store resolve - component will call onComplete which resolves
        winCelebrationResolveRef.current = resolve;
      });
    });
  }, [setOnBonusTrigger, setOnBonusEnd, setOnWinPopup, setOnWildExplosion, setOnSpinWin]);

  // Handle bonus overlay complete
  const handleBonusOverlayComplete = useCallback(() => {
    setBonusOverlay({ show: false, type: null, freeSpinsAwarded: 0, totalWin: 0 });
    // Resolve the promise to continue event processing
    if (bonusOverlayResolveRef.current) {
      bonusOverlayResolveRef.current();
      bonusOverlayResolveRef.current = null;
    }
  }, []);

  // Handle wild explosion popup complete
  const handleWildExplosionComplete = useCallback(() => {
    setWildExplosion({ show: false, position: null, multiplier: 64 });
    // Resolve the promise to continue event processing
    if (wildExplosionResolveRef.current) {
      wildExplosionResolveRef.current();
      wildExplosionResolveRef.current = null;
    }
  }, []);

  // Handle win celebration popup complete
  const handleWinCelebrationComplete = useCallback(() => {
    setWinCelebration({ show: false, amount: 0, betAmount: 1 });
    // Resolve the promise to continue event processing
    if (winCelebrationResolveRef.current) {
      winCelebrationResolveRef.current();
      winCelebrationResolveRef.current = null;
    }
  }, []);

  // Handle first user interaction to enable audio
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

  // Toggle music
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

  // Handle intro screen complete
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

  // Sprite refs storage
  const spriteRefs = useRef(new Map());

  /**
   * Handle sprite registration from Grid/Cell components
   */
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

  /**
   * Handle Spin Button Click
   */
  const handleSpin = useCallback(async () => {
    if (isSpinning || isAnimating || isRunning) {
      console.warn('Spin blocked: already in progress');
      return;
    }

    try {
      console.log('App: Starting spin...');
      setIsAnimating(true);

      // Track if we're starting a free spin (using store value BEFORE spin)
      const wasFreeSpin = freeSpinsRemaining > 0;
      wasInFreeSpinsRef.current = wasFreeSpin;

      // Call backend API
      const result = await spin();

      if (!result) {
        console.error('App: Spin returned no result');
        setIsAnimating(false);
        return;
      }

      console.log('App: Spin result received', {
        freeSpinsRemaining: result.freeSpinsRemaining,
        freeSpinTotalWin: result.freeSpinTotalWin,
        isFreeSpin: result.isFreeSpin,
        wasFreeSpin: wasFreeSpin,
        payoutAmount: result.payoutAmount,
      });

      // Track bonus total win - ALWAYS update the ref when we get a free spin result
      // This ensures we capture the final total even on the last spin
      // Use explicit number check to handle 0 values correctly
      const responseFreeSpinTotal = typeof result.freeSpinTotalWin === 'number' ? result.freeSpinTotalWin : 0;
      if (result.isFreeSpin || wasFreeSpin) {
        bonusTotalWinRef.current = responseFreeSpinTotal;
        console.log('App: Updated bonusTotalWinRef to', bonusTotalWinRef.current);
      }

      // Detect if free spins just ended
      // A bonus ends when: we were in free spins (wasFreeSpin) OR this was a free spin (result.isFreeSpin)
      // AND now there are no more free spins remaining AND no retrigger happened
      const wasInBonus = wasFreeSpin || result.isFreeSpin;
      const bonusJustEnded = wasInBonus && result.freeSpinsRemaining <= 0 && !result.freeSpinsTriggered;

      // Use the total from the response directly (most accurate) or from ref as fallback
      const bonusTotalWin = bonusJustEnded ? (responseFreeSpinTotal || bonusTotalWinRef.current || 0) : 0;

      console.log('App: Bonus state', { wasInBonus, bonusJustEnded, bonusTotalWin, refValue: bonusTotalWinRef.current });

      // Play all events sequentially
      await playAllEvents(result, {
        isBonusEnd: bonusJustEnded,
        bonusTotalWin: bonusTotalWin,
      });

      // Reset bonus tracking if ended
      if (bonusJustEnded) {
        bonusTotalWinRef.current = 0;
      }

      console.log('App: Spin complete');

    } catch (error) {
      console.error('App: Spin failed:', error);
    } finally {
      setIsAnimating(false);
    }
  }, [spin, playAllEvents, isSpinning, isAnimating, isRunning, setIsAnimating, freeSpinsRemaining]);

  // Keep handleSpin ref updated for auto-spin
  useEffect(() => {
    handleSpinRef.current = handleSpin;
  }, [handleSpin]);

  // Auto-spin during free spins bonus mode
  useEffect(() => {
    // Only auto-spin if we have free spins remaining and not currently spinning
    if (freeSpinsRemaining > 0 && !isSpinning && !isAnimating && !isRunning && !bonusOverlay.show) {
      // Calculate delay based on speed
      const speedMultiplier = SPEED_MULTIPLIERS[autoSpinSpeed] || 1;
      const baseDelay = 800;
      const delay = Math.round(baseDelay * speedMultiplier);

      const autoSpinDelay = setTimeout(() => {
        console.log('Auto-spin: Triggering free spin', freeSpinsRemaining, 'remaining (speed:', autoSpinSpeed, ')');
        if (handleSpinRef.current) {
          handleSpinRef.current();
        }
      }, delay);

      return () => clearTimeout(autoSpinDelay);
    }
  }, [freeSpinsRemaining, isSpinning, isAnimating, isRunning, bonusOverlay.show, autoSpinSpeed]);

  // Auto-spin in base game mode (from autospin menu)
  useEffect(() => {
    // Only auto-spin if autospin is active, not in free spins, and not currently spinning
    if (autoSpinActive && freeSpinsRemaining <= 0 && !isSpinning && !isAnimating && !isRunning && !bonusOverlay.show) {
      // Calculate delay based on speed
      const speedMultiplier = SPEED_MULTIPLIERS[autoSpinSpeed] || 1;
      const baseDelay = 500;
      const delay = Math.round(baseDelay * speedMultiplier);

      const autoSpinDelay = setTimeout(() => {
        console.log('Auto-spin: Triggering spin (speed:', autoSpinSpeed, ')');
        if (handleSpinRef.current) {
          handleSpinRef.current();
          decrementAutoSpin();
        }
      }, delay);

      return () => clearTimeout(autoSpinDelay);
    }
  }, [autoSpinActive, autoSpinSpeed, freeSpinsRemaining, isSpinning, isAnimating, isRunning, bonusOverlay.show, decrementAutoSpin]);

  /**
   * Handle Rotate Seed for Provably Fair
   */
  const handleRotateSeed = useCallback(async () => {
    try {
      return await rotateSeed();
    } catch (error) {
      console.error('Rotate seed failed:', error);
      return null;
    }
  }, [rotateSeed]);

  /**
   * Handle Bonus Buy
   */
  const handleBuyBonus = useCallback(async (bonusId) => {
    try {
      return await buyBonus(bonusId);
    } catch (error) {
      console.error('Bonus buy failed:', error);
      throw error;
    }
  }, [buyBonus]);

  /**
   * Handle Start Bonus Intro Animation
   */
  const handleStartBonusIntro = useCallback(({ bonusType, scatterCount, onComplete }) => {
    // Reset bonus tracking for new bonus
    bonusTotalWinRef.current = 0;

    setBonusIntro({
      show: true,
      bonusType,
      scatterCount,
      onComplete,
    });
  }, []);

  /**
   * Handle Bonus Intro Complete
   */
  const handleBonusIntroComplete = useCallback(() => {
    const { onComplete } = bonusIntro;
    setBonusIntro({
      show: false,
      bonusType: 'standard',
      scatterCount: 3,
      onComplete: null,
    });
    // Execute the onComplete callback (which calls buyBonus)
    onComplete?.();
  }, [bonusIntro]);

  // Spin button should be disabled during spin or animation
  const canSpin = !isSpinning && !isAnimating && !isRunning;

  return (
    <div className="app">
      {/* Intro Screen */}
      {gameState === GameState.INTRO && (
        <IntroScreen onStart={handleIntroComplete} />
      )}

      {/* Background Effects */}
      <div className="background-effects">
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="glow glow-3" />
      </div>

      {/* Bonus Active Indicator (shows during free spins) */}
      {freeSpinsRemaining > 0 && (
        <div className="bonus-active-indicator">
          <svg className="bonus-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          BONUS ACTIVE
        </div>
      )}

      {/* Free Spins Counter (shows when active) */}
      <FreeSpinsCounter />

      {/* Main Game Container */}
      <div className="game-container">
        {/* Game Stage (PixiJS + GSAP) */}
        <div className="stage-wrapper">
          <GameStage onSpriteReady={handleSpriteReady} />
        </div>

        {/* Win Popup - centered on game */}
        {winPopup && (
          <div className="win-popup">
            <div className="win-popup-content">
              <div className="win-popup-amount">+${winPopup.amount.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <ControlPanel
          onSpin={handleSpin}
          disabled={!canSpin}
          musicEnabled={musicEnabled}
          onMusicToggle={handleToggleMusic}
          sfxEnabled={soundEnabled}
          onSfxToggle={toggleSound}
        />
      </div>

      {/* Bonus Buy Menu Modal */}
      <BonusBuyMenu
        onBuyBonus={handleBuyBonus}
        onStartBonusIntro={handleStartBonusIntro}
        disabled={isSpinning || isAnimating}
      />

      {/* Bonus Buy Intro Animation */}
      <BonusBuyIntro
        show={bonusIntro.show}
        bonusType={bonusIntro.bonusType}
        scatterCount={bonusIntro.scatterCount}
        onComplete={handleBonusIntroComplete}
      />

      {/* Bonus Overlay (Free Spins Trigger / Summary) */}
      <BonusOverlay
        show={bonusOverlay.show}
        type={bonusOverlay.type}
        freeSpinsAwarded={bonusOverlay.freeSpinsAwarded}
        totalWin={bonusOverlay.totalWin}
        onComplete={handleBonusOverlayComplete}
      />

      {/* Wild Explosion Popup */}
      <WildExplosionPopup
        show={wildExplosion.show}
        position={wildExplosion.position}
        multiplier={wildExplosion.multiplier}
        onComplete={handleWildExplosionComplete}
      />

      {/* Win Celebration (Big Win Tier Popup) */}
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
