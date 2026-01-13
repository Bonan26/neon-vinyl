/**
 * NEON VINYL: GHOST GROOVES - Bonus Buy Menu
 * Dynamic bonus purchase popup with integrated bet selector
 * Includes boost toggles (Scatter Hunt / Wild Boost) and free spins purchase
 */
import React, { useCallback, useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import './BonusBuyMenu.css';

// Boost toggles - these multiply cost per spin while active
const BOOST_OPTIONS = [
  {
    id: 'scatter_hunt',
    name: 'Scatter Hunt',
    multiplier: 2,
    description: '3x scatter chance',
    costLabel: '2x bet/spin',
    color: '#00ff88',
    icon: 'SC',
    storeKey: 'scatterBoostActive',
    toggleAction: 'toggleScatterBoost',
  },
  {
    id: 'wild_boost',
    name: 'Wild Boost',
    multiplier: 5,
    description: '5x wild chance',
    costLabel: '5x bet/spin',
    color: '#ff6600',
    icon: 'WD',
    storeKey: 'wildBoostActive',
    toggleAction: 'toggleWildBoost',
  },
];

// Bonus buy options - one-time purchase for free spins
const BONUS_OPTIONS = [
  {
    id: 'standard',
    name: 'Free Spins',
    scatters: 3,
    multiplier: 100,  // x100 bet cost
    description: '8 guaranteed free spins',
    color: '#ff00ff',
    icon: '3x',
    feature: 'free_spins',
  },
  {
    id: 'super',
    name: 'Super Spins',
    scatters: 4,
    multiplier: 200,  // x200 bet cost
    description: '12 spins + x2 multiplier start',
    color: '#ffd700',
    icon: '4x',
    feature: 'super_free_spins',
  },
];

const BonusBuyMenu = ({ onBuyBonus, onBonusTriggerSpin, disabled }) => {
  const showBonusMenu = useGameStore((state) => state.showBonusMenu);
  const toggleBonusMenu = useGameStore((state) => state.toggleBonusMenu);
  const balance = useGameStore((state) => state.balance);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);

  // Boost toggle states
  const scatterBoostActive = useGameStore((state) => state.scatterBoostActive);
  const wildBoostActive = useGameStore((state) => state.wildBoostActive);
  const toggleScatterBoost = useGameStore((state) => state.toggleScatterBoost);
  const toggleWildBoost = useGameStore((state) => state.toggleWildBoost);
  const getEffectiveBet = useGameStore((state) => state.getEffectiveBet);

  const [selectedBonus, setSelectedBonus] = useState(null);

  // Get boost active state by ID
  const isBoostActive = useCallback((boostId) => {
    if (boostId === 'scatter_hunt') return scatterBoostActive;
    if (boostId === 'wild_boost') return wildBoostActive;
    return false;
  }, [scatterBoostActive, wildBoostActive]);

  // Handle boost toggle
  const handleBoostToggle = useCallback((boostId) => {
    if (disabled || freeSpinsRemaining > 0) return;
    if (boostId === 'scatter_hunt') toggleScatterBoost();
    if (boostId === 'wild_boost') toggleWildBoost();
  }, [disabled, freeSpinsRemaining, toggleScatterBoost, toggleWildBoost]);

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

  const handleCardClick = useCallback((bonus, canAfford, isDisabled) => {
    if (isDisabled || !canAfford) return;
    setSelectedBonus(bonus);
  }, []);

  const handleConfirmBuy = useCallback(async () => {
    if (!selectedBonus) return;

    const bonusType = selectedBonus.id;
    const feature = selectedBonus.feature;

    console.log('[BonusBuyMenu] Confirming purchase:', { bonusType, feature, betAmount });

    setSelectedBonus(null);
    toggleBonusMenu();

    // Handle free spins purchase (boost toggles are handled separately)
    if (feature === 'free_spins') {
      // Standard free spins - trigger with 3 scatters
      console.log('[BonusBuyMenu] Triggering free spins');
      onBonusTriggerSpin?.({
        bonusId: 'free_spins_8',
        bonusType,
        scatterCount: 3,
      });
    } else if (feature === 'super_free_spins') {
      // Super free spins - trigger with 4 scatters
      console.log('[BonusBuyMenu] Triggering super free spins');
      onBonusTriggerSpin?.({
        bonusId: 'free_spins_12',
        bonusType,
        scatterCount: 4,
      });
    }
  }, [selectedBonus, onBonusTriggerSpin, toggleBonusMenu, betAmount]);

  const handleCancelBuy = useCallback(() => {
    setSelectedBonus(null);
  }, []);

  if (!showBonusMenu) return null;

  return (
    <div className="bonus-popup-overlay" onClick={toggleBonusMenu}>
      <div className="bonus-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bonus-popup-header">
          <h2>BUY BONUS</h2>
          <button className="bonus-close-btn" onClick={toggleBonusMenu}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Warning during free spins */}
        {freeSpinsRemaining > 0 && (
          <div className="bonus-warning">
            Cannot buy bonus during Free Spins!
          </div>
        )}

        {/* Bet Selector */}
        <div className="bonus-bet-selector">
          <span className="bet-label">BET</span>
          <div className="bet-controls">
            <button
              className="bet-btn"
              onClick={() => handleBetChange('down')}
              disabled={betAmount === BET_OPTIONS[0]}
            >
              −
            </button>
            <span className="bet-value">${betAmount.toFixed(2)}</span>
            <button
              className="bet-btn"
              onClick={() => handleBetChange('up')}
              disabled={betAmount === BET_OPTIONS[BET_OPTIONS.length - 1]}
            >
              +
            </button>
          </div>
        </div>

        {/* Boost Toggles Section */}
        <div className="boost-section">
          <h3 className="section-title">BOOST MODE</h3>
          <p className="section-subtitle">Toggle ON to boost your next spins (cost per spin)</p>
          <div className="boost-toggles">
            {BOOST_OPTIONS.map((boost) => {
              const active = isBoostActive(boost.id);
              const isDisabled = disabled || freeSpinsRemaining > 0;
              const perSpinCost = betAmount * boost.multiplier;

              return (
                <div
                  key={boost.id}
                  className={`boost-toggle-card ${active ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  style={{ '--accent-color': boost.color }}
                  onClick={() => handleBoostToggle(boost.id)}
                >
                  <div className="boost-toggle-info">
                    <span className="boost-name">{boost.name}</span>
                    <span className="boost-desc">{boost.description}</span>
                  </div>
                  <div className="boost-toggle-cost">
                    <span className="cost-label">{boost.costLabel}</span>
                    <span className="cost-value">${perSpinCost.toFixed(2)}/spin</span>
                  </div>
                  <div className={`boost-switch ${active ? 'on' : 'off'}`}>
                    <span className="switch-label">{active ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Show effective spin cost when boosts are active */}
          {(scatterBoostActive || wildBoostActive) && (
            <div className="effective-cost-display">
              <span className="effective-label">Effective spin cost:</span>
              <span className="effective-value">${getEffectiveBet().toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="section-divider" />

        {/* Free Spins Purchase Section */}
        <div className="freespins-section">
          <h3 className="section-title">BUY FREE SPINS</h3>
          <div className="bonus-options">
            {BONUS_OPTIONS.map((bonus) => {
              const cost = betAmount * bonus.multiplier;
              const canAfford = balance >= cost;
              const isDisabled = disabled || !canAfford || freeSpinsRemaining > 0;

              return (
                <div
                  key={bonus.id}
                  className={`bonus-card ${isDisabled ? 'disabled' : ''} ${!isDisabled && canAfford ? 'clickable' : ''}`}
                  style={{ '--accent-color': bonus.color }}
                  onClick={() => handleCardClick(bonus, canAfford, isDisabled)}
                >
                  {/* Info */}
                  <div className="bonus-info">
                    <h3>{bonus.name}</h3>
                    <div className="bonus-description">{bonus.description}</div>
                  </div>

                  {/* Price Display */}
                  <div className="bonus-price-display">
                    <span className="price-label">{bonus.multiplier}x bet</span>
                    <span className="price-value">${cost.toFixed(2)}</span>
                  </div>

                  {/* Status indicator */}
                  {!canAfford && (
                    <div className="bonus-status insufficient">
                      Insufficient balance
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Balance Footer */}
        <div className="bonus-footer">
          <span className="balance-label">Your balance:</span>
          <span className="balance-value">${balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Confirmation Popup */}
      {selectedBonus && (
        <div className="confirm-overlay" onClick={handleCancelBuy}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Purchase</h3>
            <p>
              Buy <strong>{selectedBonus.name}</strong> for{' '}
              <span className="confirm-price" style={{ color: selectedBonus.color }}>
                ${(betAmount * selectedBonus.multiplier).toFixed(2)}
              </span>?
            </p>
            <div className="confirm-buttons">
              <button className="confirm-btn cancel" onClick={handleCancelBuy}>
                Cancel
              </button>
              <button
                className="confirm-btn confirm"
                onClick={handleConfirmBuy}
                style={{ '--accent-color': selectedBonus.color }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusBuyMenu;
