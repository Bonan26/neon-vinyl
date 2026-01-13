/**
 * NEON VINYL: GHOST GROOVES - Bonus Buy Menu
 * Dynamic bonus purchase popup with integrated bet selector
 */
import React, { useCallback, useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import './BonusBuyMenu.css';

// Bonus multipliers (cost = bet * multiplier)
// Must match backend BONUS_BUY_OPTIONS in game_config.py
const BONUS_OPTIONS = [
  {
    id: 'scatter_hunt',
    name: 'Scatter Hunt',
    scatters: 0,
    multiplier: 2,
    description: '3x scatter chance for 10 spins',
    color: '#00ff88',
    icon: 'SC',
    feature: 'scatter_boost',
  },
  {
    id: 'wild_boost',
    name: 'Wild Boost',
    scatters: 0,
    multiplier: 5,
    description: '5x wild chance for 5 spins',
    color: '#ff6600',
    icon: 'WD',
    feature: 'wild_boost',
  },
  {
    id: 'standard',
    name: 'Free Spins',
    scatters: 3,
    multiplier: 24,
    description: '8 guaranteed free spins',
    color: '#ff00ff',
    icon: '3x',
    feature: 'free_spins',
  },
  {
    id: 'super',
    name: 'Super Spins',
    scatters: 4,
    multiplier: 36,
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

  const [selectedBonus, setSelectedBonus] = useState(null);

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

    // Handle different bonus types
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
    } else if (feature === 'scatter_boost' || feature === 'wild_boost') {
      // Scatter Hunt or Wild Boost - activate boost mode
      console.log('[BonusBuyMenu] Activating boost:', feature);
      const boostData = {
        bonusId: bonusType,
        feature,
        cost: betAmount * selectedBonus.multiplier,
        boostType: feature,
      };
      console.log('[BonusBuyMenu] Calling onBuyBonus with:', boostData);
      try {
        const result = await onBuyBonus?.(boostData);
        console.log('[BonusBuyMenu] onBuyBonus result:', result);
      } catch (err) {
        console.error('[BonusBuyMenu] onBuyBonus error:', err);
      }
    }
  }, [selectedBonus, onBonusTriggerSpin, onBuyBonus, toggleBonusMenu, betAmount]);

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

        {/* Bonus Options */}
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
                  <div className="bonus-multiplier">
                    {bonus.multiplier}x bet
                  </div>
                </div>

                {/* Price Display */}
                <div className="bonus-price-display">
                  <span className="price-label">PRICE</span>
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
