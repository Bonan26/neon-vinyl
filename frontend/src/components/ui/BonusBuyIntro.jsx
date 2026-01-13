/**
 * WOLFIE GROOVE - Bonus Buy Intro
 * Animated popup with rules and START button
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import './BonusBuyIntro.css';

const BONUS_RULES = {
  standard: {
    title: 'FREE SPINS',
    subtitle: 'BONUS ROUND',
    spins: 8,
    rules: [
      'Ghost multipliers accumulate',
      'Each tumble increases multipliers',
      'WILD symbols explode and multiply adjacent cells',
      'Good luck!',
    ],
  },
  super: {
    title: 'SUPER FREE SPINS',
    subtitle: 'MEGA BONUS',
    spins: 12,
    rules: [
      'Starting x2 multipliers on entire grid',
      'Accelerated multiplier progression',
      'WILD symbols explode with more power',
      'Maximum win potential!',
    ],
  },
};

const BonusBuyIntro = ({ show, bonusType, scatterCount, onComplete }) => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState('hidden');
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const spinsBadgeRef = useRef(null);
  const rulesRef = useRef(null);
  const buttonRef = useRef(null);
  const ruleItemsRef = useRef([]);

  const bonusInfo = BONUS_RULES[bonusType] || BONUS_RULES.standard;

  // Show/hide logic
  useEffect(() => {
    if (show) {
      setVisible(true);
      setPhase('intro');
    }
  }, [show]);

  // Animation sequence
  useEffect(() => {
    if (!visible || phase === 'hidden') return;

    const tl = gsap.timeline();

    if (phase === 'intro') {
      // Fade in overlay with scale
      tl.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );

      // Animate title - big dramatic entrance
      if (titleRef.current) {
        tl.fromTo(titleRef.current,
          { scale: 0, opacity: 0, rotationX: -90 },
          {
            scale: 1,
            opacity: 1,
            rotationX: 0,
            duration: 0.8,
            ease: 'back.out(2)'
          },
          '-=0.3'
        );
      }

      // Animate subtitle
      if (subtitleRef.current) {
        tl.fromTo(subtitleRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
          '-=0.4'
        );
      }

      // Animate spins badge with bounce
      if (spinsBadgeRef.current) {
        tl.fromTo(spinsBadgeRef.current,
          { scale: 0, rotation: -15 },
          {
            scale: 1,
            rotation: 0,
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)'
          },
          '-=0.2'
        );
      }

      // Animate rules panel
      if (rulesRef.current) {
        tl.fromTo(rulesRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          '-=0.3'
        );
      }

      // Animate each rule item with stagger
      if (ruleItemsRef.current.length > 0) {
        tl.fromTo(ruleItemsRef.current,
          { x: -30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            stagger: 0.1,
            ease: 'power2.out'
          },
          '-=0.3'
        );
      }

      // Animate button with pulse
      if (buttonRef.current) {
        tl.fromTo(buttonRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' },
          '-=0.2'
        );

        // Add continuous pulse to button
        tl.to(buttonRef.current, {
          scale: 1.05,
          duration: 0.8,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }

      // Switch to ready phase
      tl.call(() => setPhase('ready'), null, '-=0.8');
    }

    return () => tl.kill();
  }, [visible, phase]);

  const handleStart = useCallback(() => {
    // Kill any running animations on button
    gsap.killTweensOf(buttonRef.current);

    // Animate out
    const tl = gsap.timeline({
      onComplete: () => {
        setVisible(false);
        setPhase('hidden');
        onComplete?.();
      }
    });

    // Zoom out effect
    tl.to(contentRef.current, {
      scale: 1.2,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
    });

    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
    }, '-=0.2');
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="bbi-overlay" ref={overlayRef}>
      {/* Animated background particles */}
      <div className="bbi-particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="bbi-particle" style={{
            '--delay': `${Math.random() * 3}s`,
            '--x': `${Math.random() * 100}%`,
            '--duration': `${2 + Math.random() * 3}s`,
            '--size': `${4 + Math.random() * 8}px`,
          }} />
        ))}
      </div>

      {/* Moving light rays */}
      <div className="bbi-rays">
        <div className="bbi-ray bbi-ray-1" />
        <div className="bbi-ray bbi-ray-2" />
        <div className="bbi-ray bbi-ray-3" />
      </div>

      {/* Glow effects */}
      <div className="bbi-glow bbi-glow-1" />
      <div className="bbi-glow bbi-glow-2" />
      <div className="bbi-glow bbi-glow-3" />

      {/* Main content */}
      <div className="bbi-content" ref={contentRef}>

        {/* Title Section - Big and dramatic */}
        <div className="bbi-title-section">
          <h1 className="bbi-main-title" ref={titleRef}>{bonusInfo.title}</h1>
          <div className="bbi-subtitle" ref={subtitleRef}>{bonusInfo.subtitle}</div>
        </div>

        {/* Spins Badge - Prominent display */}
        <div className="bbi-spins-badge" ref={spinsBadgeRef}>
          <span className="bbi-spins-value">{bonusInfo.spins}</span>
          <span className="bbi-spins-label">FREE SPINS</span>
        </div>

        {/* Rules Panel */}
        <div className="bbi-rules-panel" ref={rulesRef}>
          <div className="bbi-rules-list">
            {bonusInfo.rules.map((rule, index) => (
              <div
                key={index}
                className="bbi-rule-item"
                ref={el => ruleItemsRef.current[index] = el}
              >
                <span className="bbi-rule-icon">✦</span>
                <span className="bbi-rule-text">{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button className="bbi-start-btn" ref={buttonRef} onClick={handleStart}>
          <span className="bbi-btn-text">START</span>
          <div className="bbi-btn-shine" />
        </button>
      </div>
    </div>
  );
};

export default BonusBuyIntro;
