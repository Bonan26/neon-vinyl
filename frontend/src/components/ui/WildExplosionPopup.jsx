/**
 * NEON VINYL: GHOST GROOVES - Wild Explosion Popup
 * Dramatic animation when Wild explodes and multiplies adjacent cells by x64
 */
import React, { useEffect, useState, useRef } from 'react';
import './WildExplosionPopup.css';

const WildExplosionPopup = ({ show, position, multiplier, onComplete }) => {
  const [phase, setPhase] = useState('hidden');
  const [particles, setParticles] = useState([]);
  const [countUp, setCountUp] = useState(1);
  const timeoutsRef = useRef([]);
  const countIntervalRef = useRef(null);
  const isSkippingRef = useRef(false);

  // Clear all timers
  const clearAllTimers = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    if (countIntervalRef.current) {
      clearInterval(countIntervalRef.current);
      countIntervalRef.current = null;
    }
  };

  // Handle skip on click
  const handleSkip = () => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;

    clearAllTimers();

    // Show final state immediately
    setCountUp(64);
    setPhase('exit');

    setTimeout(() => {
      setPhase('hidden');
      isSkippingRef.current = false;
      onComplete?.();
    }, 300);
  };

  useEffect(() => {
    if (show) {
      // Reset skip flag for new animation
      isSkippingRef.current = false;

      // Generate random particles for explosion effect
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        angle: (360 / 30) * i + Math.random() * 15,
        distance: 120 + Math.random() * 200,
        size: 6 + Math.random() * 14,
        delay: Math.random() * 0.3,
        duration: 0.8 + Math.random() * 0.5,
        color: ['#ff00ff', '#ffff00', '#00ffff', '#ff6600', '#ff0066', '#00ff00'][Math.floor(Math.random() * 6)],
      }));
      setParticles(newParticles);
      setCountUp(1);

      // Start animation sequence
      setPhase('enter');

      timeoutsRef.current.push(setTimeout(() => {
        setPhase('pulse');
      }, 700));

      timeoutsRef.current.push(setTimeout(() => {
        setPhase('explode');
        // Start counting up to 64
        let count = 1;
        countIntervalRef.current = setInterval(() => {
          count = Math.min(count * 2, 64);
          setCountUp(count);
          if (count >= 64) {
            clearInterval(countIntervalRef.current);
          }
        }, 150);
      }, 1500));

      timeoutsRef.current.push(setTimeout(() => {
        setPhase('exit');
      }, 4000));

      timeoutsRef.current.push(setTimeout(() => {
        setPhase('hidden');
        onComplete?.();
      }, 4800));
    }

    return () => {
      clearAllTimers();
    };
  }, [show, onComplete]);

  if (phase === 'hidden' && !show) return null;

  return (
    <div className={`wild-explosion-popup ${phase}`} onClick={handleSkip}>
      {/* Background flash */}
      <div className="explosion-flash" />

      {/* Rare event indicator */}
      <div className="rare-event-badge">
        <span className="rare-star">⭐</span>
        <span className="rare-text">ÉVÉNEMENT RARE!</span>
        <span className="rare-star">⭐</span>
      </div>

      {/* Shockwave rings */}
      <div className="shockwave-container">
        <div className="shockwave ring-1" />
        <div className="shockwave ring-2" />
        <div className="shockwave ring-3" />
        <div className="shockwave ring-4" />
      </div>

      {/* Central burst */}
      <div className="explosion-center">
        <div className="wild-icon">
          <span className="wild-text">WILD</span>
          <div className="wild-glow" />
        </div>

        {/* Multiplier display with animation */}
        <div className="multiplier-burst">
          <span className="multiplier-prefix">×</span>
          <span className="multiplier-value">{countUp}</span>
        </div>
      </div>

      {/* Explosion text */}
      <div className="explosion-title">
        <span className="title-line-1">WILD</span>
        <span className="title-line-2">EXPLOSION</span>
      </div>

      {/* Info boxes */}
      <div className="explosion-info">
        <div className="info-box">
          <span className="info-icon">💎</span>
          <span className="info-text">9 CASES AFFECTÉES</span>
        </div>
        <div className="info-box highlight">
          <span className="info-icon">🔥</span>
          <span className="info-text">MULTIPLICATEURS ×64</span>
        </div>
      </div>

      {/* Subtitle */}
      <div className="explosion-subtitle">
        TOUS LES MULTIPLICATEURS × 64 !
      </div>

      {/* Particles */}
      <div className="particles-container">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="explosion-particle"
            style={{
              '--angle': `${particle.angle}deg`,
              '--distance': `${particle.distance}px`,
              '--size': `${particle.size}px`,
              '--delay': `${particle.delay}s`,
              '--duration': `${particle.duration}s`,
              '--color': particle.color,
            }}
          />
        ))}
      </div>

      {/* Lightning bolts */}
      <div className="lightning-container">
        <div className="lightning bolt-1" />
        <div className="lightning bolt-2" />
        <div className="lightning bolt-3" />
        <div className="lightning bolt-4" />
        <div className="lightning bolt-5" />
        <div className="lightning bolt-6" />
      </div>

      {/* Sparkles */}
      <div className="sparkles-container">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="sparkle"
            style={{
              '--sparkle-delay': `${i * 0.08}s`,
              '--sparkle-angle': `${(360 / 16) * i}deg`,
            }}
          />
        ))}
      </div>

      {/* Floating x64 badges */}
      <div className="floating-multipliers">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="floating-mult"
            style={{
              '--float-delay': `${0.5 + i * 0.15}s`,
              '--float-angle': `${(360 / 9) * i}deg`,
            }}
          >
            ×64
          </div>
        ))}
      </div>
    </div>
  );
};

export default WildExplosionPopup;
