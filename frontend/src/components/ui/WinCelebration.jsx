/**
 * NEON VINYL: GHOST GROOVES - Win Celebration Popup
 * Animated win display with tiers based on win/bet ratio
 */
import React, { useEffect, useState, useRef } from 'react';
import './WinCelebration.css';

// Win tiers based on multiplier (win / bet)
const WIN_TIERS = [
  { minMult: 100, name: 'LEGENDARY', color: '#ff0000', bgColor: 'rgba(255, 0, 0, 0.3)' },
  { minMult: 50, name: 'INSANE', color: '#ff00ff', bgColor: 'rgba(255, 0, 255, 0.3)' },
  { minMult: 25, name: 'SUPER MEGA', color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.3)' },
  { minMult: 15, name: 'MEGA', color: '#ff8c00', bgColor: 'rgba(255, 140, 0, 0.3)' },
  { minMult: 10, name: 'SUPER', color: '#00ffff', bgColor: 'rgba(0, 255, 255, 0.3)' },
  { minMult: 5, name: 'BIG', color: '#00ff00', bgColor: 'rgba(0, 255, 0, 0.3)' },
  { minMult: 2, name: 'NICE', color: '#ffffff', bgColor: 'rgba(255, 255, 255, 0.2)' },
];

const WinCelebration = ({ show, amount, betAmount, onComplete }) => {
  const [phase, setPhase] = useState('hidden');
  const [displayedAmount, setDisplayedAmount] = useState(0);
  const [currentTierIndex, setCurrentTierIndex] = useState(-1);
  const [particles, setParticles] = useState([]);
  const exitTimeoutRef = useRef(null);
  const completeTimeoutRef = useRef(null);
  const countIntervalRef = useRef(null);
  const isSkippingRef = useRef(false);

  // Calculate win multiplier and tier
  const winMultiplier = betAmount > 0 ? amount / betAmount : 0;
  const tier = WIN_TIERS.find(t => winMultiplier >= t.minMult) || null;

  // Handle skip on click
  const handleSkip = () => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;

    // Clear all timers
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    if (countIntervalRef.current) clearInterval(countIntervalRef.current);

    // Show final values immediately
    setDisplayedAmount(amount);
    const tierIndex = WIN_TIERS.findIndex(t => t.name === tier?.name);
    setCurrentTierIndex(tierIndex);

    // Quick exit animation
    setPhase('exit');
    setTimeout(() => {
      setPhase('hidden');
      isSkippingRef.current = false;
      onComplete?.();
    }, 300);
  };

  useEffect(() => {
    if (show && amount > 0 && tier) {
      // Reset skip flag for new animation
      isSkippingRef.current = false;

      // Generate particles
      const newParticles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 1,
        duration: 1 + Math.random() * 2,
        color: tier.color,
      }));
      setParticles(newParticles);
      setDisplayedAmount(0);
      setCurrentTierIndex(-1);

      // Start animation
      setPhase('enter');

      // Count up animation with tier progression
      const tierIndex = WIN_TIERS.findIndex(t => t.name === tier.name);
      const tiersToShow = WIN_TIERS.slice(tierIndex).reverse();

      let currentAmount = 0;
      const countDuration = 2000; // 2 seconds to count up
      const steps = 60;
      const increment = amount / steps;
      const stepTime = countDuration / steps;

      let step = 0;
      countIntervalRef.current = setInterval(() => {
        step++;
        currentAmount = Math.min(amount, increment * step);
        setDisplayedAmount(currentAmount);

        // Update tier as we count up
        const currentMult = betAmount > 0 ? currentAmount / betAmount : 0;
        const showTierIndex = tiersToShow.findIndex(t => currentMult >= t.minMult);
        if (showTierIndex !== -1) {
          setCurrentTierIndex(WIN_TIERS.length - 1 - showTierIndex);
        }

        if (step >= steps) {
          clearInterval(countIntervalRef.current);
          setDisplayedAmount(amount);
          setCurrentTierIndex(tierIndex);
        }
      }, stepTime);

      // Auto-dismiss after counting + display time
      const displayTime = Math.min(3000 + winMultiplier * 50, 6000);
      exitTimeoutRef.current = setTimeout(() => {
        setPhase('exit');
      }, countDuration + displayTime);

      completeTimeoutRef.current = setTimeout(() => {
        setPhase('hidden');
        onComplete?.();
      }, countDuration + displayTime + 500);
    }

    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    };
  }, [show, amount, betAmount, tier, onComplete]);

  if (phase === 'hidden' || !tier) return null;

  const currentTier = currentTierIndex >= 0 ? WIN_TIERS[currentTierIndex] : tier;

  return (
    <div
      className={`win-celebration ${phase}`}
      style={{ '--tier-color': currentTier.color, '--tier-bg': currentTier.bgColor }}
      onClick={handleSkip}
    >
      {/* Background overlay */}
      <div className="win-overlay" />

      {/* Rays */}
      <div className="win-rays" />

      {/* Particles */}
      <div className="win-particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="win-particle"
            style={{
              '--p-x': `${p.x}%`,
              '--p-y': `${p.y}%`,
              '--p-size': `${p.size}px`,
              '--p-delay': `${p.delay}s`,
              '--p-duration': `${p.duration}s`,
              '--p-color': p.color,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="win-content">
        {/* Tier text */}
        <div className="win-tier-container">
          <div className="win-tier-text" key={currentTier.name}>
            {currentTier.name}
          </div>
          <div className="win-tier-subtitle">WIN!</div>
        </div>

        {/* Amount */}
        <div className="win-amount-container">
          <span className="win-currency">$</span>
          <span className="win-amount">{displayedAmount.toFixed(2)}</span>
        </div>

        {/* Multiplier badge */}
        <div className="win-multiplier-badge">
          x{winMultiplier.toFixed(1)}
        </div>
      </div>

      {/* Coin shower */}
      <div className="coin-shower">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="falling-coin"
            style={{
              '--coin-x': `${Math.random() * 100}%`,
              '--coin-delay': `${Math.random() * 2}s`,
              '--coin-duration': `${1 + Math.random() * 1.5}s`,
            }}
          >
            💰
          </div>
        ))}
      </div>
    </div>
  );
};

export default WinCelebration;
