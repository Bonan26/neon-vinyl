/**
 * LES WOLFS 86 - Control Panel (Hacksaw Gaming Style)
 * Clean, minimalist bottom bar
 */
import React, { useState, useCallback } from 'react';
import useGameStore, { AutoSpinSpeed } from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import SettingsMenu from './SettingsMenu';
import InfoModal from './InfoModal';
import './ControlPanel.css';

const AUTO_SPIN_OPTIONS = [10, 25, 50, 100, 500, 1000, Infinity];

const SPEED_OPTIONS = [
  { id: AutoSpinSpeed.NORMAL, label: 'TURBO', icon: '▶' },
  { id: AutoSpinSpeed.BOOSTER, label: 'SUPER TURBO', icon: '▶▶' },
  { id: AutoSpinSpeed.SUPER_BOOSTER, label: 'LIGHTNING', icon: '⚡' },
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
  const scatterBoostActive = useGameStore((state) => state.scatterBoostActive);
  const wildBoostActive = useGameStore((state) => state.wildBoostActive);
  const getEffectiveBet = useGameStore((state) => state.getEffectiveBet);
  const toggleBonusMenu = useGameStore((state) => state.toggleBonusMenu);

  // Speed control
  const manualSpeedMode = useGameStore((state) => state.manualSpeedMode);
  const setManualSpeedMode = useGameStore((state) => state.setManualSpeedMode);

  const effectiveBet = getEffectiveBet();
  const hasActiveBoost = scatterBoostActive || wildBoostActive;
  const isBonusActive = freeSpinsRemaining > 0;

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
  const [autoSpinPending, setAutoSpinPending] = useState(null);

  const canSpin = !disabled && !isSpinning && !isAnimating && balance >= effectiveBet;

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

  const handleCancelPendingAutoSpin = useCallback(() => {
    setAutoSpinPending(null);
  }, []);

  const handleSpeedSelect = useCallback((speed) => {
    setSelectedSpeed(speed);
    if (autoSpinPending) {
      setAutoSpinPending({ ...autoSpinPending, speed });
    }
  }, [autoSpinPending]);

  const handleSpinClick = useCallback(() => {
    if (autoSpinPending) {
      startAutoSpin(autoSpinPending.count, autoSpinPending.speed);
      setAutoSpinPending(null);
    }
    onSpin();
  }, [autoSpinPending, startAutoSpin, onSpin]);

  const toggleMute = useCallback(() => {
    if (onMusicToggle) onMusicToggle();
    if (onSfxToggle) onSfxToggle();
  }, [onMusicToggle, onSfxToggle]);

  const isMuted = !musicEnabled && !sfxEnabled;

  return (
    <>
      <div className="control-panel wolfs-hud">
        {/* Left: Balance */}
        <div className="hud-block balance-block">
          <span className="hud-label">SOLDE</span>
          <span className="hud-value">{balance.toFixed(2)} €</span>
        </div>

        {/* Center Left: Win Display */}
        <div className={`hud-block win-block ${lastWin > 0 ? 'has-win' : ''}`}>
          <span className="hud-label">GAIN</span>
          <span className="hud-value">{lastWin.toFixed(2)} €</span>
        </div>

        {/* Center: Bet Selector */}
        <div className={`hud-block bet-block ${hasActiveBoost ? 'boosted' : ''}`}>
          <span className="hud-label">{hasActiveBoost ? 'COUT' : 'MISE'}</span>
          <div className="bet-controls">
            <button
              className="bet-btn minus"
              onClick={() => handleBetChange('down')}
              disabled={isSpinning || betAmount === BET_OPTIONS[0]}
            >
              −
            </button>
            <span className="hud-value bet-value">
              {hasActiveBoost ? effectiveBet.toFixed(2) : betAmount.toFixed(2)} €
            </span>
            <button
              className="bet-btn plus"
              onClick={() => handleBetChange('up')}
              disabled={isSpinning || betAmount === BET_OPTIONS[BET_OPTIONS.length - 1]}
            >
              +
            </button>
          </div>
        </div>

        {/* Speed Controls - Always visible */}
        <div className="speed-controls">
          <button
            className={`speed-btn ${manualSpeedMode === AutoSpinSpeed.NORMAL ? 'active' : ''}`}
            onClick={() => setManualSpeedMode(AutoSpinSpeed.NORMAL)}
          >
            x1
          </button>
          <button
            className={`speed-btn ${manualSpeedMode === AutoSpinSpeed.BOOSTER ? 'active' : ''}`}
            onClick={() => setManualSpeedMode(AutoSpinSpeed.BOOSTER)}
          >
            x2
          </button>
          <button
            className={`speed-btn ${manualSpeedMode === AutoSpinSpeed.SUPER_BOOSTER ? 'active' : ''}`}
            onClick={() => setManualSpeedMode(AutoSpinSpeed.SUPER_BOOSTER)}
          >
            x4
          </button>
        </div>

        {/* Right Side Controls */}
        <div className="hud-actions">
          {/* Bonus Buy Button */}
          <button
            className="bonus-buy-btn"
            onClick={toggleBonusMenu}
            disabled={isSpinning || isBonusActive}
          >
            BONUS
          </button>

          {/* Auto-Spin Button */}
          <div className="action-wrapper">
            <button
              className={`action-btn auto-btn ${autoSpinActive ? 'active' : ''} ${autoSpinPending ? 'pending' : ''}`}
              onClick={() => {
                if (autoSpinActive) {
                  handleStopAutoSpin();
                } else if (autoSpinPending) {
                  handleCancelPendingAutoSpin();
                } else {
                  setShowAutoSpinMenu(!showAutoSpinMenu);
                }
              }}
              disabled={isSpinning || isBonusActive}
            >
              {autoSpinActive ? (
                <span className="auto-count">
                  {autoSpinRemaining === Infinity ? '∞' : autoSpinRemaining}
                </span>
              ) : autoSpinPending ? (
                <span className="auto-count pending">
                  {autoSpinPending.count === Infinity ? '∞' : autoSpinPending.count}
                </span>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
              )}
            </button>

            {/* Auto-Spin Menu Popup */}
            {showAutoSpinMenu && (
              <div className="auto-menu">
                <div className="auto-menu-section">
                  <div className="auto-menu-label">VITESSE</div>
                  <div className="speed-pills">
                    {SPEED_OPTIONS.map((speed) => (
                      <button
                        key={speed.id}
                        className={`speed-pill ${selectedSpeed === speed.id ? 'selected' : ''}`}
                        onClick={() => handleSpeedSelect(speed.id)}
                      >
                        {speed.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="auto-menu-section">
                  <div className="auto-menu-label">NOMBRE DE TOURS</div>
                  <div className="spin-pills">
                    {AUTO_SPIN_OPTIONS.map((count) => (
                      <button
                        key={count}
                        className="spin-pill"
                        onClick={() => handleAutoSpinSelect(count)}
                      >
                        {count === Infinity ? '∞' : count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <div className="action-wrapper">
            <button
              className="action-btn settings-btn"
              onClick={() => setShowSettings(!showSettings)}
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

          {/* Spin Button */}
          <button
            className={`spin-btn ${isSpinning ? 'spinning' : ''} ${!canSpin ? 'disabled' : ''}`}
            onClick={handleSpinClick}
            disabled={!canSpin}
          >
            {isSpinning ? (
              <svg className="spin-icon rotating" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              </svg>
            ) : (
              <svg className="spin-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
};

export default ControlPanel;
