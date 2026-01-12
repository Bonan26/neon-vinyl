/**
 * NEON VINYL: GHOST GROOVES - Intro Screen
 * Animated splash screen before game start
 */
import React, { useState, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import './IntroScreen.css';

const STORAGE_KEY = 'neonvinyl_skip_intro';

const IntroScreen = ({ onStart }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const skipIntro = localStorage.getItem(STORAGE_KEY) === 'true';
    if (skipIntro) {
      setShowIntro(false);
      onStart?.();
    }
  }, [onStart]);

  // Breathing animation for logo
  useEffect(() => {
    if (showIntro && !isExiting) {
      gsap.to('.intro-logo', {
        scale: 1.05,
        duration: 2,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
      });

      // Neon flicker effect
      gsap.to('.intro-title', {
        textShadow: '0 0 30px #ff00ff, 0 0 60px #ff00ff, 0 0 90px #ff00ff',
        duration: 0.1,
        ease: 'steps(1)',
        yoyo: true,
        repeat: -1,
        repeatDelay: 3,
      });

      // Lightning bolts animation
      gsap.to('.volatility-bolt', {
        opacity: 0.3,
        duration: 0.2,
        stagger: { each: 0.1, repeat: -1, yoyo: true },
      });
    }
  }, [showIntro, isExiting]);

  const handleStart = useCallback(() => {
    // Save preference
    if (skipNextTime) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }

    setIsExiting(true);

    // Exit animation
    gsap.to('.intro-screen', {
      opacity: 0,
      scale: 1.1,
      duration: 0.8,
      ease: 'power2.in',
      onComplete: () => {
        setShowIntro(false);
        onStart?.();
      },
    });
  }, [skipNextTime, onStart]);

  const handleCheckboxChange = useCallback((e) => {
    setSkipNextTime(e.target.checked);
  }, []);

  if (!showIntro) return null;

  return (
    <div className="intro-screen">
      {/* Background with effects */}
      <div className="intro-background">
        <div className="intro-glow intro-glow-1" />
        <div className="intro-glow intro-glow-2" />
        <div className="intro-scanlines" />
      </div>

      {/* Main content */}
      <div className="intro-content">
        {/* Logo/Title */}
        <div className="intro-logo">
          <h1 className="intro-title">NEON VINYL</h1>
          <h2 className="intro-subtitle">GHOST GROOVES</h2>
        </div>

        {/* Game Preview Image */}
        <div className="intro-preview">
          <div className="intro-preview-glow" />
        </div>

        {/* Game Info */}
        <div className="intro-info">
          <div className="intro-info-item">
            <span className="intro-label">MAX GAIN</span>
            <span className="intro-value neon-chrome">5000x</span>
          </div>

          <div className="intro-info-item">
            <span className="intro-label">VOLATILITY</span>
            <div className="intro-volatility">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg
                  key={i}
                  className="volatility-bolt"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
              ))}
              <span className="volatility-text">HIGH</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="intro-features">
          <div className="intro-feature">
            <span className="feature-icon">W</span>
            <span>WILD SYMBOLS</span>
          </div>
          <div className="intro-feature">
            <span className="feature-icon">SC</span>
            <span>FREE SPINS</span>
          </div>
          <div className="intro-feature">
            <span className="feature-icon">x8</span>
            <span>MULTIPLIERS</span>
          </div>
        </div>

        {/* Start Button */}
        <button className="intro-start-btn" onClick={handleStart}>
          <span className="btn-text">START</span>
          <span className="btn-glow" />
        </button>

        {/* Skip Option */}
        <label className="intro-skip-option">
          <input
            type="checkbox"
            checked={skipNextTime}
            onChange={handleCheckboxChange}
          />
          <span className="checkmark" />
          <span>Don't show this again</span>
        </label>
      </div>
    </div>
  );
};

export default IntroScreen;
