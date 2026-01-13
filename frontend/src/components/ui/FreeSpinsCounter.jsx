/**
 * NEON VINYL: GHOST GROOVES - Free Spins Counter
 * Displays remaining free spins and total win with animated effects
 */
import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import useGameStore from '../../stores/gameStore';
import './FreeSpinsCounter.css';

const FreeSpinsCounter = ({ hideDuringOverlay = false }) => {
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const freeSpinTotalWin = useGameStore((state) => state.freeSpinTotalWin);
  const [displayedWin, setDisplayedWin] = useState(freeSpinTotalWin);
  const [isAnimating, setIsAnimating] = useState(false);
  const counterRef = useRef(null);
  const numberRef = useRef(null);
  const prevWinRef = useRef(freeSpinTotalWin);

  // Animate win value changes
  useEffect(() => {
    if (freeSpinTotalWin !== prevWinRef.current && freeSpinTotalWin > prevWinRef.current) {
      setIsAnimating(true);
      const startVal = prevWinRef.current;
      const counter = { val: startVal };

      gsap.to(counter, {
        val: freeSpinTotalWin,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => setDisplayedWin(counter.val),
        onComplete: () => {
          setDisplayedWin(freeSpinTotalWin);
          setIsAnimating(false);
        },
      });

      // Pulse animation on counter
      if (counterRef.current) {
        gsap.fromTo(counterRef.current,
          { scale: 1 },
          { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }
        );
      }
    }
    prevWinRef.current = freeSpinTotalWin;
  }, [freeSpinTotalWin]);

  // Animate number changes
  useEffect(() => {
    if (numberRef.current) {
      gsap.fromTo(numberRef.current,
        { scale: 1.3, color: '#00ffff' },
        { scale: 1, color: '#ffffff', duration: 0.4, ease: 'back.out(2)' }
      );
    }
  }, [freeSpinsRemaining]);

  // Hide when no free spins or during overlay
  if (freeSpinsRemaining <= 0 || hideDuringOverlay) return null;

  return (
    <div className={`free-spins-counter ${isAnimating ? 'animating' : ''}`} ref={counterRef}>
      <div className="fs-glow" />
      <div className="fs-content">
        <div className="fs-header">
          <span className="fs-icon">🎰</span>
          FREE SPINS
        </div>
        <div className="fs-remaining">
          <span className="fs-number" ref={numberRef}>{freeSpinsRemaining}</span>
          <span className="fs-label">restants</span>
        </div>
        <div className="fs-divider" />
        <div className="fs-total-win">
          <span className="fs-win-label">GAINS</span>
          <span className={`fs-win-value ${isAnimating ? 'counting' : ''}`}>
            ${displayedWin.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FreeSpinsCounter;
