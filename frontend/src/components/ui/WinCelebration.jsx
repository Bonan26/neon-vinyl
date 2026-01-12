/**
 * NEON VINYL: GHOST GROOVES - Win Celebration Popup
 * Animated win display with tiers based on win/bet ratio
 */
import React, { useEffect, useState, useRef } from 'react';
import './WinCelebration.css';
import audioService from '../../services/audioService';

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

      // Play appropriate sound based on tier
      if (winMultiplier >= 25) {
        // Super Mega, Insane, Legendary
        audioService.playSuperMegaWinSound();
      } else if (winMultiplier >= 10) {
        // Mega, Super
        audioService.playMegaWinSound();
      } else if (winMultiplier >= 5) {
        // Big
        audioService.playBigWinSound();
      }
      // Nice tier (2x-5x) doesn't need extra fanfare, just the regular win sound

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

      // SLOW tier progression - each tier gets significant screen time
      const tierIndex = WIN_TIERS.findIndex(t => t.name === tier.name);
      const tiersToShow = WIN_TIERS.slice(tierIndex).reverse(); // From lowest to highest
      const numTiersToShow = tiersToShow.length;

      console.log('WinCelebration: Starting with', numTiersToShow, 'tiers to show, final tier:', tier.name);

      // Each tier gets 1.5 seconds of display time minimum
      const timePerTier = 1500;
      const countDuration = numTiersToShow * timePerTier;

      // Amount thresholds for each tier
      const tierThresholds = tiersToShow.map(t => t.minMult * betAmount);

      let currentTierShowIndex = 0;
      let tierStartTime = Date.now();

      // Start with first tier
      setCurrentTierIndex(WIN_TIERS.findIndex(t => t.name === tiersToShow[0].name));
      setDisplayedAmount(tierThresholds[0] || 0);

      countIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - tierStartTime;
        const currentTierTime = elapsed % timePerTier;
        const tiersSoFar = Math.floor(elapsed / timePerTier);

        // Move to next tier if enough time passed
        if (tiersSoFar > currentTierShowIndex && tiersSoFar < numTiersToShow) {
          currentTierShowIndex = tiersSoFar;
          const newTier = tiersToShow[currentTierShowIndex];
          setCurrentTierIndex(WIN_TIERS.findIndex(t => t.name === newTier.name));
          console.log('WinCelebration: Moving to tier', newTier.name);
        }

        // Animate amount within current tier
        const currentThreshold = tierThresholds[currentTierShowIndex] || 0;
        const nextThreshold = tierThresholds[currentTierShowIndex + 1] || amount;
        const tierProgress = currentTierTime / timePerTier;

        // Smoothly interpolate between thresholds
        const displayAmount = currentThreshold + (nextThreshold - currentThreshold) * Math.min(tierProgress, 1);
        setDisplayedAmount(Math.min(displayAmount, amount));

        // Check if we're done
        if (tiersSoFar >= numTiersToShow) {
          clearInterval(countIntervalRef.current);
          setDisplayedAmount(amount);
          setCurrentTierIndex(tierIndex);
        }
      }, 50); // Update frequently for smooth animation

      // Auto-dismiss after all tiers shown + extra display time
      const totalTime = countDuration + 2000; // 2 extra seconds to admire final tier
      exitTimeoutRef.current = setTimeout(() => {
        setPhase('exit');
      }, totalTime);

      completeTimeoutRef.current = setTimeout(() => {
        setPhase('hidden');
        onComplete?.();
      }, totalTime + 500);
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
