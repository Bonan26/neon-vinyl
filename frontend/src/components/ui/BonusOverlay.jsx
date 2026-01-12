/**
 * NEON VINYL: GHOST GROOVES - Bonus Overlay
 * Handles Free Spins trigger animation and bonus end summary
 */
import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import './BonusOverlay.css';

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
  const isDismissingRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [displayedWin, setDisplayedWin] = useState(0);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      isDismissingRef.current = false;

      // Animate in
      if (overlayRef.current && contentRef.current) {
        // Flash effect for trigger and retrigger
        if ((type === 'trigger' || type === 'retrigger') && flashRef.current) {
          gsap.fromTo(flashRef.current,
            { scale: 0.5, opacity: 1 },
            { scale: 3, opacity: 0, duration: 0.8, ease: 'power2.out' }
          );
        }

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

        // For summary, animate the win counter
        if (type === 'summary') {
          console.log('BonusOverlay: Summary showing, totalWin =', totalWin);
          // Always reset displayedWin first
          setDisplayedWin(0);

          if (totalWin > 0) {
            const counter = { val: 0 };
            gsap.to(counter, {
              val: totalWin,
              duration: 2,
              delay: 0.7,
              ease: 'power2.out',
              onUpdate: () => setDisplayedWin(counter.val),
              onComplete: () => setDisplayedWin(totalWin), // Ensure final value is set
            });
          }
          // Summary does NOT auto-dismiss - user must click
          return;
        }

        // Auto-dismiss for trigger (2.5s) and retrigger (1.5s shorter)
        const dismissTime = type === 'retrigger' ? 1500 : 2500;
        timeoutRef.current = setTimeout(() => {
          handleDismiss();
        }, dismissTime);

        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };
      }
    }
  }, [show, type, totalWin]);

  const handleDismiss = () => {
    // Prevent double dismiss
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    // Clear any pending auto-dismiss timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

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
          setIsVisible(false);
          setDisplayedWin(0);
          onComplete?.();
        },
      });
    }
  };

  if (!isVisible) return null;

  // Determine if it's a big or mega win for summary
  const isMegaWin = totalWin >= 50;
  const isBigWin = totalWin >= 20 && totalWin < 50;

  return (
    <div className="bonus-overlay" ref={overlayRef} onClick={handleDismiss}>
      {/* Flash effect for trigger and retrigger */}
      {(type === 'trigger' || type === 'retrigger') && (
        <img
          ref={flashRef}
          src={IMAGES.bonusTriggerFlash}
          alt=""
          className="bonus-flash-image"
        />
      )}

      <div className="bonus-content" ref={contentRef}>
        {type === 'trigger' && (
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

        {type === 'retrigger' && (
          <div className="retrigger-container">
            {/* Retrigger title */}
            <div className="retrigger-title">RETRIGGER!</div>

            {/* Number of spins added */}
            <div className="retrigger-spins">+{freeSpinsAwarded}</div>
            <div className="retrigger-subtitle">EXTRA SPINS!</div>

            {/* Scatter icons (dynamic based on count) */}
            <div className="scatter-icons retrigger">
              {Array.from({ length: Math.min(scatterCount, 4) }).map((_, i) => (
                <div key={i} className="scatter-icon-wrapper">
                  <img src={IMAGES.scatterHighlight} alt="" className="scatter-highlight" />
                  <span className="scatter-text">SC</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'summary' && (
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
