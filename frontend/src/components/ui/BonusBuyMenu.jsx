/**
 * LES WOLFS 86 - Bonus Buy Menu
 * Premium Hacksaw Gaming inspired design
 */
import React, { useCallback, useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import './BonusBuyMenu.css';

const BonusBuyMenu = ({ onBuyBonus, onBonusTriggerSpin, onWolfBurst, disabled }) => {
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

  const handleBuyClick = useCallback((bonusType) => {
    if (disabled || freeSpinsRemaining > 0) return;
    setSelectedBonus(bonusType);
  }, [disabled, freeSpinsRemaining]);

  const handleConfirmBuy = useCallback(async () => {
    if (!selectedBonus) return;

    const bonusType = selectedBonus;
    setSelectedBonus(null);
    toggleBonusMenu();

    if (bonusType === 'standard') {
      onBonusTriggerSpin?.({ bonusId: 'free_spins_8', bonusType, scatterCount: 3 });
    } else if (bonusType === 'super') {
      onBonusTriggerSpin?.({ bonusId: 'free_spins_12', bonusType, scatterCount: 4 });
    } else if (bonusType === 'wolf_burst') {
      // Wolf Burst uses regular bonus buy (single spin with forced wilds)
      onWolfBurst?.({ bonusId: 'wolf_burst', bonusType });
    }
  }, [selectedBonus, onBonusTriggerSpin, onWolfBurst, toggleBonusMenu]);

  const handleCancelBuy = useCallback(() => {
    setSelectedBonus(null);
  }, []);

  if (!showBonusMenu) return null;

  // Boost options (multiplier-based cost, multiple spins)
  const boostOptions = [
    {
      id: 'scatter_boost',
      name: 'SCATTER HUNT',
      subtitle: '10 Spins',
      description: 'Chance de Scatter x3 pendant 10 spins',
      multiplier: 2,
      color: '#ff00ff',
      icon: '/symbols/scatter_gold.jpg',
      isBoost: true,
    },
    {
      id: 'wild_boost',
      name: 'WILD BOOST',
      subtitle: '5 Spins',
      description: 'Chance de Wild x5 pendant 5 spins',
      multiplier: 5,
      color: '#00ff66',
      icon: '/symbols/crown_matrix.png',
      isBoost: true,
    },
  ];

  // Bonus options with costs
  const bonusOptions = [
    {
      id: 'wolf_burst',
      name: 'WOLF BURST',
      subtitle: 'Wilds Attack',
      description: 'Le loup souffle 3-6 WILDS sur la grille',
      multiplier: 25,
      color: '#00ff66',
      icon: '/symbols/crown_matrix.png',
      featured: false,
    },
    {
      id: 'standard',
      name: 'FREE SPINS',
      subtitle: '8 Tours Gratuits',
      description: 'Declenche le bonus avec 3 Scatters',
      multiplier: 100,
      color: '#ff00ff',
      icon: '/symbols/scatter_gold.jpg',
      featured: true,
    },
    {
      id: 'super',
      name: 'SUPER BONUS',
      subtitle: '12 Tours + x2 Multi',
      description: 'Bonus premium avec multiplicateurs x2',
      multiplier: 200,
      color: '#ffd700',
      icon: '/symbols/scatter_gold.jpg',
      featured: true,
    },
  ];

  return (
    <div className="bonus-overlay" onClick={toggleBonusMenu}>
      <div className="bonus-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="bonus-close" onClick={toggleBonusMenu}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        {/* Header */}
        <div className="bonus-header">
          <h2>BONUS</h2>
        </div>

        {/* Warning during free spins */}
        {freeSpinsRemaining > 0 && (
          <div className="bonus-locked">
            Bonus indisponible pendant les tours gratuits
          </div>
        )}

        {/* Bet Selector */}
        <div className="bonus-bet-row">
          <span className="bet-label">MISE</span>
          <div className="bet-selector">
            <button
              className="bet-arrow"
              onClick={() => handleBetChange('down')}
              disabled={betAmount === BET_OPTIONS[0]}
            >
              ‹
            </button>
            <span className="bet-amount">{betAmount.toFixed(2)} €</span>
            <button
              className="bet-arrow"
              onClick={() => handleBetChange('up')}
              disabled={betAmount === BET_OPTIONS[BET_OPTIONS.length - 1]}
            >
              ›
            </button>
          </div>
        </div>

        {/* Boost Options - Multiple Spins */}
        <div className="boost-section">
          <h3 className="section-title">BOOSTS</h3>
          <div className="boost-cards">
            {boostOptions.map((boost) => {
              const cost = betAmount * boost.multiplier;
              const canAfford = balance >= cost;
              const isDisabled = disabled || !canAfford || freeSpinsRemaining > 0;

              return (
                <div
                  key={boost.id}
                  className={`boost-card ${isDisabled ? 'disabled' : ''}`}
                  style={{ '--accent': boost.color }}
                  onClick={() => {
                    if (!isDisabled) {
                      onBuyBonus?.({ boostType: boost.id });
                      toggleBonusMenu();
                    }
                  }}
                >
                  <div className="boost-icon">
                    <img src={boost.icon} alt="" />
                  </div>
                  <div className="boost-info">
                    <h4>{boost.name}</h4>
                    <span className="boost-subtitle">{boost.subtitle}</span>
                    <p>{boost.description}</p>
                  </div>
                  <div className="boost-cost">
                    <span className="boost-mult">x{boost.multiplier}</span>
                    <span>{cost.toFixed(2)} €</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonus Cards Section */}
        <div className="bonus-section">
          <h3 className="section-title">ACHAT INSTANT</h3>
        </div>
        <div className="bonus-cards">
          {bonusOptions.map((bonus) => {
            const cost = betAmount * bonus.multiplier;
            const canAfford = balance >= cost;
            const isDisabled = disabled || !canAfford || freeSpinsRemaining > 0;

            return (
              <div
                key={bonus.id}
                className={`bonus-card ${bonus.featured ? 'featured' : ''} ${isDisabled ? 'disabled' : ''}`}
                style={{ '--accent': bonus.color }}
                onClick={() => !isDisabled && handleBuyClick(bonus.id)}
              >
                {/* Card glow */}
                <div className="card-glow" />

                {/* Icon */}
                <div className="card-icon">
                  <img src={bonus.icon} alt="" />
                </div>

                {/* Info */}
                <div className="card-info">
                  <h3>{bonus.name}</h3>
                  <span className="card-subtitle">{bonus.subtitle}</span>
                  <p className="card-desc">{bonus.description}</p>
                </div>

                {/* Price */}
                <div className="card-price">
                  <span className="price-mult">x{bonus.multiplier}</span>
                  <span className="price-value">{cost.toFixed(2)} €</span>
                </div>

                {/* Buy button */}
                <button className="card-buy-btn" disabled={isDisabled}>
                  {canAfford ? 'ACHETER' : 'SOLDE INSUFFISANT'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Balance */}
        <div className="bonus-balance">
          <span>Solde disponible</span>
          <span className="balance-amount">{balance.toFixed(2)} €</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedBonus && (
        <div className="confirm-modal" onClick={handleCancelBuy}>
          <div className="confirm-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer l'achat ?</h3>
            <p>
              {bonusOptions.find(b => b.id === selectedBonus)?.name} pour{' '}
              <strong style={{ color: bonusOptions.find(b => b.id === selectedBonus)?.color }}>
                {(betAmount * bonusOptions.find(b => b.id === selectedBonus)?.multiplier).toFixed(2)} €
              </strong>
            </p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={handleCancelBuy}>
                Annuler
              </button>
              <button className="confirm-ok" onClick={handleConfirmBuy}>
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
