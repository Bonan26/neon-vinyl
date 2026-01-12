/**
 * NEON VINYL: GHOST GROOVES - Bonus Buy Menu
 * Dynamic bonus purchase popup with integrated bet selector
 */
import React, { useCallback, useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import './BonusBuyMenu.css';

// Bonus multipliers (cost = bet * multiplier)
const BONUS_OPTIONS = [
  {
    id: 'standard',
    name: 'Spins Gratuits',
    scatters: 3,
    multiplier: 100,
    description: 'Garantit 3 Scatters au prochain spin',
    color: '#ff00ff',
    icon: '3x',
  },
  {
    id: 'super',
    name: 'Super Spins Gratuits',
    scatters: 4,
    multiplier: 200,
    description: 'Garantit 4 Scatters + Multiplicateurs boostés',
    color: '#ffd700',
    icon: '4x',
  },
];

const BonusBuyMenu = ({ onBuyBonus, onStartBonusIntro, disabled }) => {
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
    const scatterCount = selectedBonus.scatters;

    setSelectedBonus(null);
    toggleBonusMenu();

    // Start the intro animation sequence
    onStartBonusIntro?.({
      bonusType,
      scatterCount,
      onComplete: async () => {
        try {
          const backendId = scatterCount === 3 ? 'free_spins_8' : 'free_spins_12';
          await onBuyBonus(backendId);
        } catch (error) {
          alert('Échec de l\'achat: ' + error.message);
        }
      },
    });
  }, [selectedBonus, onBuyBonus, onStartBonusIntro, toggleBonusMenu]);

  const handleCancelBuy = useCallback(() => {
    setSelectedBonus(null);
  }, []);

  if (!showBonusMenu) return null;

  return (
    <div className="bonus-popup-overlay" onClick={toggleBonusMenu}>
      <div className="bonus-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bonus-popup-header">
          <h2>ACHETER UN BONUS</h2>
          <button className="bonus-close-btn" onClick={toggleBonusMenu}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Warning during free spins */}
        {freeSpinsRemaining > 0 && (
          <div className="bonus-warning">
            Impossible d'acheter un bonus pendant les Free Spins!
          </div>
        )}

        {/* Bet Selector */}
        <div className="bonus-bet-selector">
          <span className="bet-label">MISE</span>
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
                    {bonus.multiplier}x la mise
                  </div>
                </div>

                {/* Price Display */}
                <div className="bonus-price-display">
                  <span className="price-label">PRIX</span>
                  <span className="price-value">${cost.toFixed(2)}</span>
                </div>

                {/* Status indicator */}
                {!canAfford && (
                  <div className="bonus-status insufficient">
                    Solde insuffisant
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Balance Footer */}
        <div className="bonus-footer">
          <span className="balance-label">Votre solde:</span>
          <span className="balance-value">${balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Confirmation Popup */}
      {selectedBonus && (
        <div className="confirm-overlay" onClick={handleCancelBuy}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer l'achat</h3>
            <p>
              Voulez-vous acheter le <strong>{selectedBonus.name}</strong> pour{' '}
              <span className="confirm-price" style={{ color: selectedBonus.color }}>
                ${(betAmount * selectedBonus.multiplier).toFixed(2)}
              </span> ?
            </p>
            <div className="confirm-buttons">
              <button className="confirm-btn cancel" onClick={handleCancelBuy}>
                Annuler
              </button>
              <button
                className="confirm-btn confirm"
                onClick={handleConfirmBuy}
                style={{ '--accent-color': selectedBonus.color }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusBuyMenu;
