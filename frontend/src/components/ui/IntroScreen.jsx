/**
 * WOLFIE GROOVE - Intro Screen
 * Page d'accueil moderne et animée
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import './IntroScreen.css';

const STORAGE_KEY = 'neonvinyl_skip_intro';

const IntroScreen = ({ onStart }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const badgeRef = useRef(null);
  const infoRef = useRef(null);
  const featuresRef = useRef(null);
  const buttonRef = useRef(null);

  // Check localStorage on mount
  useEffect(() => {
    const skipIntro = localStorage.getItem(STORAGE_KEY) === 'true';
    if (skipIntro) {
      setShowIntro(false);
      onStart?.();
    } else {
      // Trigger entrance animations
      setTimeout(() => setIsReady(true), 100);
    }
  }, [onStart]);

  // Entrance animations
  useEffect(() => {
    if (!isReady || isExiting) return;

    const tl = gsap.timeline();

    // Title entrance
    tl.fromTo(titleRef.current,
      { y: -100, opacity: 0, scale: 0.5 },
      { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'elastic.out(1, 0.5)' }
    );

    // Subtitle
    tl.fromTo(subtitleRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
      '-=0.5'
    );

    // Badge
    tl.fromTo(badgeRef.current,
      { scale: 0, rotation: -20 },
      { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)' },
      '-=0.3'
    );

    // Info cards
    tl.fromTo('.intro-card',
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
      '-=0.3'
    );

    // Features
    tl.fromTo('.intro-feature',
      { x: -30, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' },
      '-=0.2'
    );

    // Button with pulse
    tl.fromTo(buttonRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' },
      '-=0.2'
    );

    // Continuous animations
    tl.to(titleRef.current, {
      textShadow: '0 0 60px #00ffff, 0 0 120px #00ffff',
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    }, '-=0.5');

    tl.to(badgeRef.current, {
      y: -10,
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    }, '<');

    return () => tl.kill();
  }, [isReady, isExiting]);

  const handleStart = useCallback(() => {
    if (skipNextTime) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }

    setIsExiting(true);

    // Exit animation
    const tl = gsap.timeline({
      onComplete: () => {
        setShowIntro(false);
        onStart?.();
      }
    });

    tl.to('.intro-content', {
      scale: 1.1,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
    });

    tl.to('.intro-screen', {
      opacity: 0,
      duration: 0.3,
    }, '-=0.2');
  }, [skipNextTime, onStart]);

  const handleCheckboxChange = useCallback((e) => {
    setSkipNextTime(e.target.checked);
  }, []);

  if (!showIntro) return null;

  return (
    <div className="intro-screen">
      {/* Animated background */}
      <div className="intro-bg">
        {/* Floating particles */}
        <div className="intro-particles">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="intro-particle"
              style={{
                '--x': `${Math.random() * 100}%`,
                '--delay': `${Math.random() * 5}s`,
                '--duration': `${4 + Math.random() * 6}s`,
                '--size': `${3 + Math.random() * 6}px`,
              }}
            />
          ))}
        </div>

        {/* Light rays */}
        <div className="intro-rays">
          <div className="intro-ray intro-ray-1" />
          <div className="intro-ray intro-ray-2" />
          <div className="intro-ray intro-ray-3" />
          <div className="intro-ray intro-ray-4" />
        </div>

        {/* Glow orbs */}
        <div className="intro-glow intro-glow-1" />
        <div className="intro-glow intro-glow-2" />
        <div className="intro-glow intro-glow-3" />

        {/* Grid lines */}
        <div className="intro-grid" />
      </div>

      {/* Main content */}
      <div className="intro-content">
        {/* Logo Section */}
        <div className="intro-logo-section">
          <h1 className="intro-title" ref={titleRef}>WOLFIE</h1>
          <h2 className="intro-subtitle" ref={subtitleRef}>GROOVE</h2>
        </div>

        {/* Max Win Badge */}
        <div className="intro-max-badge" ref={badgeRef}>
          <span className="badge-label">MAX WIN</span>
          <span className="badge-value">5,000x</span>
          <div className="badge-shine" />
        </div>

        {/* Info Cards */}
        <div className="intro-info-grid" ref={infoRef}>
          <div className="intro-card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="card-content">
              <span className="card-label">GRILLE</span>
              <span className="card-value">7x7</span>
            </div>
          </div>

          <div className="intro-card">
            <div className="card-icon volatility-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
            </div>
            <div className="card-content">
              <span className="card-label">VOLATILITE</span>
              <span className="card-value high">HAUTE</span>
            </div>
          </div>

          <div className="intro-card">
            <div className="card-icon rtp-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
            </div>
            <div className="card-content">
              <span className="card-label">RTP</span>
              <span className="card-value">96.0%</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="intro-features" ref={featuresRef}>
          <div className="intro-feature">
            <div className="feature-icon wild-icon">W</div>
            <div className="feature-text">
              <span className="feature-name">WILD EXPLOSIF</span>
              <span className="feature-desc">Multiplie les cellules adjacentes</span>
            </div>
          </div>

          <div className="intro-feature">
            <div className="feature-icon scatter-icon">SC</div>
            <div className="feature-text">
              <span className="feature-name">FREE SPINS</span>
              <span className="feature-desc">3+ scatters = 8-20 tours gratuits</span>
            </div>
          </div>

          <div className="intro-feature">
            <div className="feature-icon mult-icon">x256</div>
            <div className="feature-text">
              <span className="feature-name">MULTIPLICATEURS</span>
              <span className="feature-desc">S'accumulent pendant les tumbles</span>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button className="intro-start-btn" ref={buttonRef} onClick={handleStart}>
          <span className="btn-bg" />
          <span className="btn-text">JOUER</span>
          <span className="btn-shine" />
        </button>

        {/* Skip Option */}
        <label className="intro-skip-option">
          <input
            type="checkbox"
            checked={skipNextTime}
            onChange={handleCheckboxChange}
          />
          <span className="checkmark" />
          <span>Ne plus afficher</span>
        </label>
      </div>
    </div>
  );
};

export default IntroScreen;
