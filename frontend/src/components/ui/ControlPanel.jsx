/**
 * NEON VINYL: GHOST GROOVES - Professional Control Panel (HUD)
 * Menu, Info, Auto-Spin, Balance, Bet, Spin
 */
import React, { useState, useCallback } from 'react';
import useGameStore, { AutoSpinSpeed } from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import SettingsMenu from './SettingsMenu';
import InfoModal from './InfoModal';
import './ControlPanel.css';

const AUTO_SPIN_OPTIONS = [10, 25, 50, 100, Infinity];

const SPEED_OPTIONS = [
  { id: AutoSpinSpeed.NORMAL, label: 'Normal', icon: '▶', color: '#00ff88' },
  { id: AutoSpinSpeed.BOOSTER, label: 'Booster', icon: '▶▶', color: '#ffff00' },
  { id: AutoSpinSpeed.SUPER_BOOSTER, label: 'Super Booster', icon: '▶▶▶', color: '#ff00ff' },
];

const ControlPanel = ({
  onSpin,
  disabled = false,
  musicEnabled = true,
  onMusicToggle,
  sfxEnabled = true,
  onSfxToggle,
}) => {
  const balance = useGameStore((state) => state.balance);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const isSpinning = useGameStore((state) => state.isSpinning);
  const isAnimating = useGameStore((state) => state.isAnimating);
  const lastWin = useGameStore((state) => state.lastWin);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const toggleBonusMenu = useGameStore((state) => state.toggleBonusMenu);

  // Autospin state from store
  const autoSpinActive = useGameStore((state) => state.autoSpinActive);
  const autoSpinRemaining = useGameStore((state) => state.autoSpinRemaining);
  const autoSpinSpeed = useGameStore((state) => state.autoSpinSpeed);
  const startAutoSpin = useGameStore((state) => state.startAutoSpin);
  const stopAutoSpin = useGameStore((state) => state.stopAutoSpin);

  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAutoSpinMenu, setShowAutoSpinMenu] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState(AutoSpinSpeed.NORMAL);

  // Autospin pending state (ready but not started)
  const [autoSpinPending, setAutoSpinPending] = useState(null); // { count, speed }

  // Button disabled if: explicitly disabled, spinning, animating, or insufficient balance
  const canSpin = !disabled && !isSpinning && !isAnimating && balance >= betAmount;

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
    // Don't start immediately - set as pending
    setAutoSpinPending({ count, speed: selectedSpeed });
    setShowAutoSpinMenu(false);
  }, [selectedSpeed]);

  const handleStopAutoSpin = useCallback(() => {
    stopAutoSpin();
    setAutoSpinPending(null);
  }, [stopAutoSpin]);

  const handleCancelPendingAutoSpin = useCallback(() => {
    setAutoSpinPending(null);
  }, []);

  const handleSpeedSelect = useCallback((speed) => {
    setSelectedSpeed(speed);
    // Update pending if exists
    if (autoSpinPending) {
      setAutoSpinPending({ ...autoSpinPending, speed });
    }
  }, [autoSpinPending]);

  // Handle spin button click - starts autospin if pending
  const handleSpinClick = useCallback(() => {
    if (autoSpinPending) {
      // Start autospin with pending settings
      startAutoSpin(autoSpinPending.count, autoSpinPending.speed);
      setAutoSpinPending(null);
    }
    // Always call onSpin to do the actual spin
    onSpin();
  }, [autoSpinPending, startAutoSpin, onSpin]);

  // Get pending speed color for animation
  const pendingSpeedColor = autoSpinPending
    ? SPEED_OPTIONS.find(s => s.id === autoSpinPending.speed)?.color || '#ff00ff'
    : null;

  const toggleMute = useCallback(() => {
    if (onMusicToggle) {
      onMusicToggle();
    }
    if (onSfxToggle) {
      onSfxToggle();
    }
  }, [onMusicToggle, onSfxToggle]);

  const isMuted = !musicEnabled && !sfxEnabled;

  return (
    <>
      <div className="control-panel hud-professional">
        {/* Left Section: Menu & Quick Actions */}
        <div className="hud-section hud-left">
          {/* Menu Button */}
          <div className="hud-btn-wrapper">
            <button
              className="hud-btn menu-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
            <SettingsMenu
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              musicEnabled={musicEnabled}
              onMusicToggle={onMusicToggle}
              sfxEnabled={sfxEnabled}
              onSfxToggle={onSfxToggle}
            />
          </div>

          {/* Mute Button */}
          <button
            className={`hud-btn mute-btn ${isMuted ? 'muted' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute All'}
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          {/* Info Button */}
          <button
            className="hud-btn info-btn"
            onClick={() => setShowInfo(true)}
            title="Game Info"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </button>

          {/* Bonus Buy Button */}
          <button
            className="hud-btn bonus-btn"
            onClick={toggleBonusMenu}
            disabled={isSpinning || freeSpinsRemaining > 0}
            title="Buy Bonus"
          >
            <span className="bonus-btn-text">BONUS</span>
          </button>
        </div>

        {/* Center Section: Balance, Win, Bet */}
        <div className="hud-section hud-center">
          {/* Balance Display */}
          <div className="hud-display balance-display">
            <span className="display-label">CREDITS</span>
            <span className="display-value">${balance.toFixed(2)}</span>
          </div>

          {/* Win Display */}
          <div className={`hud-display win-display ${lastWin > 0 ? 'has-win' : ''}`}>
            <span className="display-label">WIN</span>
            <span className="display-value">${lastWin.toFixed(2)}</span>
          </div>

          {/* Bet Selector */}
          <div className="hud-display bet-display">
            <span className="display-label">BET</span>
            <div className="bet-selector-inline">
              <button
                className="bet-btn-sm"
                onClick={() => handleBetChange('down')}
                disabled={isSpinning || betAmount === BET_OPTIONS[0]}
              >
                −
              </button>
              <span className="display-value">${betAmount.toFixed(2)}</span>
              <button
                className="bet-btn-sm"
                onClick={() => handleBetChange('up')}
                disabled={isSpinning || betAmount === BET_OPTIONS[BET_OPTIONS.length - 1]}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: Auto-Spin & Spin */}
        <div className="hud-section hud-right">
          {/* Auto-Spin Button */}
          <div className="hud-btn-wrapper">
            <button
              className={`hud-btn auto-spin-btn ${autoSpinActive ? 'active' : ''} ${autoSpinPending ? 'pending' : ''}`}
              onClick={() => {
                if (autoSpinActive) {
                  handleStopAutoSpin();
                } else if (autoSpinPending) {
                  handleCancelPendingAutoSpin();
                } else {
                  setShowAutoSpinMenu(!showAutoSpinMenu);
                }
              }}
              disabled={isSpinning || freeSpinsRemaining > 0}
              title={autoSpinPending ? "Cancel Auto Spin" : "Auto Spin"}
              style={autoSpinPending ? { '--pending-color': pendingSpeedColor } : {}}
            >
              {autoSpinActive ? (
                <span className="auto-count" style={{ color: SPEED_OPTIONS.find(s => s.id === autoSpinSpeed)?.color }}>
                  {autoSpinRemaining === Infinity ? '∞' : autoSpinRemaining}
                </span>
              ) : autoSpinPending ? (
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: pendingSpeedColor }}>
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
              )}
            </button>

            {/* Auto-Spin Menu */}
            {showAutoSpinMenu && (
              <div className="auto-spin-menu">
                <div className="auto-spin-header">Vitesse</div>
                <div className="speed-options">
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed.id}
                      className={`speed-option ${selectedSpeed === speed.id ? 'selected' : ''}`}
                      onClick={() => handleSpeedSelect(speed.id)}
                      style={{ '--speed-color': speed.color }}
                    >
                      <span className="speed-icon">{speed.icon}</span>
                      <span className="speed-label">{speed.label}</span>
                    </button>
                  ))}
                </div>
                <div className="auto-spin-header">Nombre de spins</div>
                <div className="spin-count-options">
                  {AUTO_SPIN_OPTIONS.map((count) => (
                    <button
                      key={count}
                      className="auto-spin-option"
                      onClick={() => handleAutoSpinSelect(count)}
                    >
                      {count === Infinity ? '∞' : count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Spin Button */}
          <div className="spin-button-wrapper">
            {/* Pending autospin animation ring */}
            {autoSpinPending && (
              <div
                className="spin-pending-ring"
                style={{ '--pending-color': pendingSpeedColor }}
              >
                <div className="pending-ring-inner" />
                <div className="pending-ring-outer" />
                <span className="pending-count">
                  {autoSpinPending.count === Infinity ? '∞' : autoSpinPending.count}
                </span>
              </div>
            )}
            <button
              className={`spin-button ${isSpinning ? 'spinning' : ''} ${!canSpin ? 'disabled' : ''} ${autoSpinPending ? 'has-pending' : ''}`}
              onClick={handleSpinClick}
              disabled={!canSpin}
              style={autoSpinPending ? { '--pending-color': pendingSpeedColor } : {}}
            >
              <span className="spin-inner">
                {isSpinning ? (
                  <svg className="spin-icon rotating" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  </svg>
                ) : (
                  <svg className="spin-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
};

export default ControlPanel;
