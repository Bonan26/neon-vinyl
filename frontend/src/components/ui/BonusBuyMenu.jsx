/**
 * LES WOLFS 86 - Bonus Buy Menu
 * Premium Hacksaw Gaming inspired design
 */
import React, { useCallback, useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { BET_OPTIONS } from '../../config/gameConfig';
import './BonusBuyMenu.css';

const BonusBuyMenu = ({ onBuyBonus, onBonusTriggerSpin, onActivateFeature, disabled }) => {
  const showBonusMenu = useGameStore((state) => state.showBonusMenu);
  const toggleBonusMenu = useGameStore((state) => state.toggleBonusMenu);
  const balance = useGameStore((state) => state.balance);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const scatterBoostActive = useGameStore((state) => state.scatterBoostActive);
  const wildBoostActive = useGameStore((state) => state.wildBoostActive);

  // Check if any boost is active
  const isBoostActive = scatterBoostActive || wildBoostActive;

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
    // Block purchases during free spins or active boosts
    if (disabled || freeSpinsRemaining > 0 || isBoostActive) return;
    setSelectedBonus(bonusType);
  }, [disabled, freeSpinsRemaining, isBoostActive]);

  const handleConfirmBuy = useCallback(async () => {
    if (!selectedBonus) return;

    const bonusType = selectedBonus;
    setSelectedBonus(null);
    toggleBonusMenu();

    if (bonusType === 'standard') {
      onBonusTriggerSpin?.({ bonusId: 'free_spins_8', bonusType, scatterCount: 3 });
    } else if (bonusType === 'super') {
      onBonusTriggerSpin?.({ bonusId: 'free_spins_12', bonusType, scatterCount: 4 });
    }
  }, [selectedBonus, onBonusTriggerSpin, toggleBonusMenu]);

  const handleCancelBuy = useCallback(() => {
    setSelectedBonus(null);
  }, []);

  if (!showBonusMenu) return null;

  // Feature Modes - Activate/Deactivate toggle (cost per spin while active)
  const featureModes = [
    {
      id: 'scatter_hunt',
      name: 'SCATTER HUNT',
      subtitle: 'x3 Scatter Chance',
      description: 'Triple la chance de Scatter a chaque spin',
      multiplier: 2, // Cost = bet x2 per spin
      color: '#00ff66',
      icon: '/symbols/scatter_gold.jpg',
    },
    {
      id: 'wild_boost',
      name: 'WILD BOOST',
      subtitle: 'x5 Wild Chance',
      description: 'Quintuple la chance de Wild a chaque spin',
      multiplier: 3, // Cost = bet x3 per spin
      color: '#00ff66',
      icon: '/symbols/crown_matrix.png',
    },
    {
      id: 'wolf_burst',
      name: 'WOLF BURST',
      subtitle: '3-6 Wilds',
      description: 'Le loup souffle des WILDS sur la grille',
      multiplier: 10, // Cost = bet x10 per spin
      color: '#00ff66',
      icon: '/symbols/crown_matrix.png',
    },
  ];

  // Bonus options - One-time purchase with intro
  const bonusOptions = [
    {
      id: 'standard',
      name: 'FREE SPINS',
      subtitle: '8 Tours Gratuits',
      description: 'Declenche le bonus avec 3 Scatters',
      multiplier: 100,
      color: '#c9a855',
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

        {/* Feature Modes - Compact horizontal layout */}
        <div className="feature-section">
          <h3 className="section-title">MODES DE JEU</h3>
          <div className="feature-cards-compact">
            {featureModes.map((feature) => {
              const cost = betAmount * feature.multiplier;
              const canAfford = balance >= cost;
              const isDisabled = disabled || !canAfford || freeSpinsRemaining > 0 || isBoostActive;

              return (
                <div
                  key={feature.id}
                  className={`feature-card-compact ${isDisabled ? 'disabled' : ''}`}
                  style={{ '--accent': feature.color }}
                  onClick={() => {
                    if (!isDisabled) {
                      onActivateFeature?.({ featureId: feature.id, multiplier: feature.multiplier, name: feature.name });
                      toggleBonusMenu();
                    }
                  }}
                >
                  <div className="feature-header">
                    <span className="feature-name">{feature.name}</span>
                    <span className="feature-effect">{feature.subtitle}</span>
                  </div>
                  <div className="feature-price">
                    <span className="price-mult">x{feature.multiplier}</span>
                    <span className="price-value">{cost.toFixed(2)} €</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonus Cards Section */}
        <div className="bonus-section">
          <h3 className="section-title">ACHAT DE BONUS</h3>
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

      {/* Confirmation Modal - Premium Design */}
      {selectedBonus && (
        <div className="confirm-modal" onClick={handleCancelBuy}>
          <div className="confirm-content" onClick={(e) => e.stopPropagation()}>
            {/* Header with icon */}
            <div className="confirm-header">
              <div className="confirm-icon">
                <img
                  src={bonusOptions.find(b => b.id === selectedBonus)?.icon}
                  alt=""
                />
              </div>
              <h3>{bonusOptions.find(b => b.id === selectedBonus)?.name}</h3>
              <span className="confirm-subtitle">
                {bonusOptions.find(b => b.id === selectedBonus)?.subtitle}
              </span>
            </div>

            {/* Bonus explanation */}
            <div className="confirm-explanation">
              {selectedBonus === 'standard' && (
                <>
                  <div className="explain-row">
                    <span className="explain-icon">🎰</span>
                    <span>8 Tours Gratuits garantis</span>
                  </div>
                  <div className="explain-row">
                    <span className="explain-icon">⚡</span>
                    <span>Multiplicateurs progressifs sur chaque tumble</span>
                  </div>
                  <div className="explain-row">
                    <span className="explain-icon">🎁</span>
                    <span>+3 spins pour chaque Scatter additionnel</span>
                  </div>
                </>
              )}
              {selectedBonus === 'super' && (
                <>
                  <div className="explain-row highlight">
                    <span className="explain-icon">👑</span>
                    <span>12 Tours Gratuits PREMIUM</span>
                  </div>
                  <div className="explain-row highlight">
                    <span className="explain-icon">✨</span>
                    <span>Tous les multiplicateurs commencent a x2</span>
                  </div>
                  <div className="explain-row">
                    <span className="explain-icon">🔥</span>
                    <span>Multiplicateurs qui montent plus vite</span>
                  </div>
                  <div className="explain-row">
                    <span className="explain-icon">💎</span>
                    <span>Potentiel de gain MAXIMUM</span>
                  </div>
                </>
              )}
            </div>

            {/* Price display */}
            <div className="confirm-price">
              <span className="price-label">Cout total</span>
              <span
                className="price-amount"
                style={{ color: bonusOptions.find(b => b.id === selectedBonus)?.color }}
              >
                {(betAmount * bonusOptions.find(b => b.id === selectedBonus)?.multiplier).toFixed(2)} €
              </span>
            </div>

            {/* Actions */}
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={handleCancelBuy}>
                Annuler
              </button>
              <button
                className="confirm-ok"
                onClick={handleConfirmBuy}
                style={{
                  background: `linear-gradient(180deg, ${bonusOptions.find(b => b.id === selectedBonus)?.color} 0%, color-mix(in srgb, ${bonusOptions.find(b => b.id === selectedBonus)?.color} 70%, black) 100%)`
                }}
              >
                Acheter Maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusBuyMenu;
