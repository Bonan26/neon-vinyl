/**
 * NEON VINYL: GHOST GROOVES - Bonus Overlay
 * Handles Free Spins trigger animation and bonus end summary
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import './BonusOverlay.css';
import audioService from '../../services/audioService';

// Image paths
const IMAGES = {
  freeSpinsBanner: '/assets/effects/free_spins_banner.png',
  bonusTriggerFlash: '/assets/effects/bonus_trigger_flash.png',
  scatterHighlight: '/assets/effects/scatter_highlight.png',
  bonusSummaryFrame: '/assets/effects/bonus_summary_frame.png',
  bigWinText: '/assets/effects/big_win_text.png',
  megaWinText: '/assets/effects/mega_win_text.png',
  totalWinBanner: '/assets/effects/total_win_banner.png',
};

// Generate unique instance ID
let instanceCounter = 0;
const generateInstanceId = () => ++instanceCounter;

const BonusOverlay = ({
  show,
  type, // 'trigger' | 'retrigger' | 'summary'
  freeSpinsAwarded = 0,
  totalWin = 0,
  scatterCount = 3,
  onComplete,
}) => {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const flashRef = useRef(null);
  const timeoutRef = useRef(null);
  const instanceIdRef = useRef(null); // Track current instance to prevent stale callbacks
  const counterTweenRef = useRef(null); // Track counter animation
  const [isVisible, setIsVisible] = useState(false);
  const [displayedWin, setDisplayedWin] = useState(0);
  const [currentType, setCurrentType] = useState(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (counterTweenRef.current) {
      counterTweenRef.current.kill();
      counterTweenRef.current = null;
    }
    // Kill all GSAP animations on our refs
    gsap.killTweensOf([overlayRef.current, contentRef.current, flashRef.current].filter(Boolean));
  }, []);

  useEffect(() => {
    console.log('BonusOverlay useEffect:', { show, type, totalWin });

    // Always cleanup first when props change
    cleanup();

    if (!show) {
      // When hiding, reset state
      setIsVisible(false);
      setDisplayedWin(0);
      setCurrentType(null);
      instanceIdRef.current = null;
      return;
    }

    // Generate new instance ID for this show
    const myInstanceId = generateInstanceId();
    instanceIdRef.current = myInstanceId;

    console.log('BonusOverlay: New instance', myInstanceId, 'type:', type);

    setCurrentType(type);
    setIsVisible(true);

    // For summary, set displayedWin IMMEDIATELY (synchronously) so it shows right away
    if (type === 'summary') {
      const finalWin = typeof totalWin === 'number' ? totalWin : 0;
      console.log('BonusOverlay: Setting displayedWin immediately to', finalWin);
      setDisplayedWin(finalWin);

      // Play bonus complete sound
      audioService.playBonusCompleteSound();
    }

    // Wait for refs to be available for animations
    requestAnimationFrame(() => {
      // Verify we're still the current instance
      if (instanceIdRef.current !== myInstanceId) {
        console.log('BonusOverlay: Instance', myInstanceId, 'aborted - superseded');
        return;
      }

      if (!overlayRef.current || !contentRef.current) {
        console.warn('BonusOverlay: Refs not available');
        return;
      }

      // Flash effect for trigger and retrigger
      if ((type === 'trigger' || type === 'retrigger') && flashRef.current) {
        gsap.fromTo(flashRef.current,
          { scale: 0.5, opacity: 1 },
          { scale: 3, opacity: 0, duration: 0.8, ease: 'power2.out' }
        );
      }

      // Animate in
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );

      gsap.fromTo(contentRef.current,
        { scale: 0.5, opacity: 0, y: 50 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'back.out(1.5)',
          delay: 0.2
        }
      );

      // Type-specific animations
      if (type === 'summary') {
        console.log('BonusOverlay: Summary instance', myInstanceId, 'starting counter animation, totalWin =', totalWin);

        // Optional: count up animation for visual appeal (value already shows final amount)
        const finalWin = typeof totalWin === 'number' ? totalWin : 0;
        if (finalWin > 0) {
          // Brief "dramatic" count-up from 80% to 100%
          const startVal = finalWin * 0.8;
          const counter = { val: startVal };
          counterTweenRef.current = gsap.to(counter, {
            val: finalWin,
            duration: 1.5,
            delay: 0.3,
            ease: 'power2.out',
            onUpdate: () => {
              if (instanceIdRef.current === myInstanceId) {
                setDisplayedWin(counter.val);
              }
            },
            onComplete: () => {
              if (instanceIdRef.current === myInstanceId) {
                setDisplayedWin(finalWin);
              }
              counterTweenRef.current = null;
            },
          });
        }

        // Summary does NOT auto-dismiss - user must click
        // No timeout set here!

      } else {
        // Auto-dismiss for trigger (2.5s) and retrigger (1.5s)
        const dismissTime = type === 'retrigger' ? 1500 : 2500;

        timeoutRef.current = setTimeout(() => {
          // Verify we're still the current instance before dismissing
          if (instanceIdRef.current !== myInstanceId) {
            console.log('BonusOverlay: Auto-dismiss aborted for instance', myInstanceId, '- superseded');
            return;
          }
          console.log('BonusOverlay: Auto-dismiss for instance', myInstanceId, 'type:', type);
          performDismiss(myInstanceId);
        }, dismissTime);
      }
    });

    return cleanup;
  }, [show, type, totalWin, cleanup]);

  // Dismiss animation function
  const performDismiss = useCallback((expectedInstanceId) => {
    // Verify this dismiss is for the current instance
    if (instanceIdRef.current !== expectedInstanceId) {
      console.log('BonusOverlay: performDismiss rejected - instance mismatch', expectedInstanceId, '!=', instanceIdRef.current);
      return;
    }

    console.log('BonusOverlay: performDismiss for instance', expectedInstanceId, 'type:', currentType);

    // Clear timeout if any
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Capture instance ID for the animation callback
    const dismissInstanceId = expectedInstanceId;

    if (overlayRef.current && contentRef.current) {
      gsap.to(contentRef.current, {
        scale: 0.8,
        opacity: 0,
        y: -30,
        duration: 0.3,
        ease: 'power2.in',
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        delay: 0.1,
        onComplete: () => {
          // CRITICAL: Verify we're still the same instance
          if (instanceIdRef.current !== dismissInstanceId) {
            console.log('BonusOverlay: Dismiss animation complete but instance changed', dismissInstanceId, '->', instanceIdRef.current);
            return;
          }
          console.log('BonusOverlay: Dismiss complete for instance', dismissInstanceId);
          setIsVisible(false);
          setDisplayedWin(0);
          setCurrentType(null);
          instanceIdRef.current = null;
          onComplete?.();
        },
      });
    } else {
      // No refs, just complete immediately
      setIsVisible(false);
      setDisplayedWin(0);
      setCurrentType(null);
      instanceIdRef.current = null;
      onComplete?.();
    }
  }, [currentType, onComplete]);

  // Click handler - explicitly requires user interaction
  const handleClick = useCallback((event) => {
    // Verify it's a real click event
    if (!event.isTrusted) {
      console.log('BonusOverlay: Ignoring untrusted click event');
      return;
    }

    const myInstanceId = instanceIdRef.current;
    if (!myInstanceId) {
      console.log('BonusOverlay: Click ignored - no current instance');
      return;
    }

    console.log('BonusOverlay: User clicked, instance', myInstanceId, 'type:', currentType);
    performDismiss(myInstanceId);
  }, [currentType, performDismiss]);

  if (!isVisible) return null;

  // Debug log to see what's being rendered
  console.log('BonusOverlay RENDER:', { type: currentType, totalWin, displayedWin, isVisible, instanceId: instanceIdRef.current });

  // Determine if it's a big or mega win for summary
  const isMegaWin = totalWin >= 50;
  const isBigWin = totalWin >= 20 && totalWin < 50;

  return (
    <div className="bonus-overlay" ref={overlayRef} onClick={handleClick}>
      {/* Flash effect for trigger and retrigger */}
      {(currentType === 'trigger' || currentType === 'retrigger') && (
        <img
          ref={flashRef}
          src={IMAGES.bonusTriggerFlash}
          alt=""
          className="bonus-flash-image"
        />
      )}

      <div className="bonus-content" ref={contentRef}>
        {currentType === 'trigger' && (
          <>
            {/* Free Spins Banner */}
            <img
              src={IMAGES.freeSpinsBanner}
              alt="Free Spins"
              className="free-spins-banner"
            />

            {/* Number of spins awarded */}
            <div className="bonus-spins-value">{freeSpinsAwarded}</div>
            <div className="bonus-subtitle">SPINS AWARDED!</div>

            {/* Scatter icons */}
            <div className="scatter-icons">
              <div className="scatter-icon-wrapper">
                <img src={IMAGES.scatterHighlight} alt="" className="scatter-highlight" />
                <span className="scatter-text">SC</span>
              </div>
              <div className="scatter-icon-wrapper">
                <img src={IMAGES.scatterHighlight} alt="" className="scatter-highlight" />
                <span className="scatter-text">SC</span>
              </div>
              <div className="scatter-icon-wrapper">
                <img src={IMAGES.scatterHighlight} alt="" className="scatter-highlight" />
                <span className="scatter-text">SC</span>
              </div>
            </div>
          </>
        )}

        {currentType === 'retrigger' && (
          <div className="retrigger-container">
            <div className="retrigger-title">+{freeSpinsAwarded}</div>
            <div className="retrigger-subtitle">EXTRA SPINS!</div>
          </div>
        )}

        {currentType === 'summary' && (
          <div className="summary-container">
            {/* Animated background rays */}
            <div className="summary-rays" />

            {/* Sparkles */}
            <div className="summary-sparkles">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="summary-sparkle"
                  style={{
                    '--sparkle-x': `${Math.random() * 100}%`,
                    '--sparkle-y': `${Math.random() * 100}%`,
                    '--sparkle-delay': `${Math.random() * 2}s`,
                    '--sparkle-size': `${4 + Math.random() * 8}px`,
                  }}
                />
              ))}
            </div>

            {/* Win type banner */}
            {isMegaWin ? (
              <div className="win-type-text mega">MEGA WIN!</div>
            ) : isBigWin ? (
              <div className="win-type-text big">BIG WIN!</div>
            ) : (
              <div className="win-type-text normal">BONUS COMPLETE!</div>
            )}

            {/* Total Win label */}
            <div className="total-win-label">TOTAL WIN</div>

            {/* Win amount with coin animation */}
            <div className="summary-value-container">
              <div className="coin-icon left">💰</div>
              <div className="summary-value">${displayedWin.toFixed(2)}</div>
              <div className="coin-icon right">💰</div>
            </div>

            {/* Click prompt */}
            <div className="summary-subtitle">
              <span className="click-icon">👆</span>
              TAP TO CONTINUE
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BonusOverlay;
