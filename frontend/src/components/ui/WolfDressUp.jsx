/**
 * LES WOLFS 86 - Wolf Dress Up Component
 * Wolf mascot that gets dressed with accessories during Free Spins
 * When fully dressed (5 accessories), gives a random multiplier (x2-x10)
 */
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { gsap } from 'gsap';
import './WolfDressUp.css';

// Accessories in order of dress-up (1 to 5)
const ACCESSORIES = [
  { id: 'tshirt', name: 'T-Shirt Skull', src: '/accessories/tshirt.png' },
  { id: 'veste', name: 'Veste Perfecto', src: '/accessories/veste.png' },
  { id: 'collier', name: 'Collier de Dents', src: '/accessories/collier.png' },
  { id: 'lunette', name: 'Lunettes Ski', src: '/accessories/lunette.png' },
  { id: 'chapeau', name: 'Chapeau Plumes', src: '/accessories/chapeau.png' },
];

const MULTIPLIER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const WolfDressUp = forwardRef(({
  accessoryCount = 0,
  isVisible = false,
  spinWin = 0, // Current spin win before multiplier
}, ref) => {
  const containerRef = useRef(null);
  const wolfRef = useRef(null);
  const [displayedAccessories, setDisplayedAccessories] = useState([]);
  const [isFullyDressed, setIsFullyDressed] = useState(false);
  const [awardedMultiplier, setAwardedMultiplier] = useState(null);
  const [showMultiplierSpin, setShowMultiplierSpin] = useState(false);
  const [spinningMultiplier, setSpinningMultiplier] = useState(null);
  const [showWinCalculation, setShowWinCalculation] = useState(false);
  const [calculatedWin, setCalculatedWin] = useState(0);
  const prevAccessoryCount = useRef(0);
  const multiplierResolveRef = useRef(null);

  // Expose method to trigger multiplier animation from parent
  useImperativeHandle(ref, () => ({
    // Call this when spin is complete and wolf is fully dressed
    triggerMultiplierAnimation: (currentSpinWin) => {
      return new Promise((resolve) => {
        multiplierResolveRef.current = { resolve, spinWin: currentSpinWin };
        startMultiplierSpin(currentSpinWin);
      });
    },
    isFullyDressed: () => accessoryCount >= 5,
  }));

  // Handle accessory count changes - just display, don't trigger multiplier
  useEffect(() => {
    if (accessoryCount > prevAccessoryCount.current && accessoryCount <= 5) {
      const newAccessoryIndex = accessoryCount - 1;
      const newAccessory = ACCESSORIES[newAccessoryIndex];

      // Add accessory with animation
      setDisplayedAccessories(prev => {
        if (prev.find(a => a.id === newAccessory.id)) return prev;
        return [...prev, newAccessory];
      });

      // Check if fully dressed (but don't trigger multiplier yet)
      if (accessoryCount === 5) {
        setIsFullyDressed(true);
      }
    }

    prevAccessoryCount.current = accessoryCount;
  }, [accessoryCount]);

  // Reset when accessoryCount goes back to 0
  useEffect(() => {
    if (accessoryCount === 0 && displayedAccessories.length > 0) {
      // Animate undressing
      undressWolf();
    } else if (accessoryCount === 0) {
      setDisplayedAccessories([]);
      setIsFullyDressed(false);
      setAwardedMultiplier(null);
      setShowMultiplierSpin(false);
      setShowWinCalculation(false);
      prevAccessoryCount.current = 0;
    }
  }, [accessoryCount]);

  // Multiplier spin animation
  const startMultiplierSpin = (currentSpinWin) => {
    setShowMultiplierSpin(true);
    let spinCount = 0;
    const maxSpins = 15 + Math.floor(Math.random() * 8);
    let currentIndex = 0;

    const spin = () => {
      spinCount++;
      currentIndex = (currentIndex + 1) % MULTIPLIER_OPTIONS.length;
      setSpinningMultiplier(MULTIPLIER_OPTIONS[currentIndex]);

      if (spinCount < maxSpins) {
        const progress = spinCount / maxSpins;
        const delay = 60 + Math.pow(progress, 2) * 180;
        setTimeout(spin, delay);
      } else {
        // Final multiplier
        const finalMultiplier = MULTIPLIER_OPTIONS[Math.floor(Math.random() * MULTIPLIER_OPTIONS.length)];
        setSpinningMultiplier(finalMultiplier);
        setAwardedMultiplier(finalMultiplier);

        // Show win calculation after a short delay
        setTimeout(() => {
          const finalWin = currentSpinWin * finalMultiplier;
          setCalculatedWin(finalWin);
          setShowWinCalculation(true);

          // Resolve after showing calculation
          setTimeout(() => {
            if (multiplierResolveRef.current) {
              multiplierResolveRef.current.resolve({
                multiplier: finalMultiplier,
                originalWin: currentSpinWin,
                multipliedWin: finalWin,
              });
              multiplierResolveRef.current = null;
            }

            // Start undressing after a delay
            setTimeout(() => {
              undressWolf();
            }, 1500);
          }, 2000);
        }, 800);
      }
    };

    setTimeout(spin, 200);
  };

  // Undress wolf animation
  const undressWolf = () => {
    const removeOrder = [...displayedAccessories].reverse();
    let index = 0;

    const removeNext = () => {
      if (index >= removeOrder.length) {
        // All removed
        setDisplayedAccessories([]);
        setIsFullyDressed(false);
        setShowMultiplierSpin(false);
        setShowWinCalculation(false);
        setAwardedMultiplier(null);
        prevAccessoryCount.current = 0;
        return;
      }

      const accessory = removeOrder[index];
      setDisplayedAccessories(prev => prev.filter(a => a.id !== accessory.id));
      index++;
      setTimeout(removeNext, 120);
    };

    setTimeout(removeNext, 100);
  };

  // Wolf idle animation
  useEffect(() => {
    if (wolfRef.current && isVisible) {
      gsap.to(wolfRef.current, {
        y: -4,
        duration: 1.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    return () => {
      if (wolfRef.current) {
        gsap.killTweensOf(wolfRef.current);
      }
    };
  }, [isVisible]);

  // Only render multiplier overlay (positioned centrally on screen)
  // The wolf base is rendered in App.jsx
  // Always render an empty container so the ref stays attached
  if (!showMultiplierSpin && !showWinCalculation) {
    return <div ref={containerRef} style={{ display: 'none' }} />;
  }

  return (
    <div className="wolf-multiplier-overlay" ref={containerRef}>
      {/* Multiplier spinning display - centered on screen */}
      {showMultiplierSpin && (
        <div className="wolf-multiplier-popup">
          <div className="multiplier-title">LOUP HABILLÉ!</div>
          <div className="wolf-multiplier-badge">
            <span className="multiplier-value">x{spinningMultiplier || '?'}</span>
          </div>
        </div>
      )}

      {/* Win calculation display */}
      {showWinCalculation && awardedMultiplier && (
        <div className="wolf-win-calculation-popup">
          <div className="calculation-text">
            {(multiplierResolveRef.current?.spinWin || spinWin).toFixed(2)} x {awardedMultiplier}
          </div>
          <div className="calculation-result">
            = {calculatedWin.toFixed(2)} EUR
          </div>
        </div>
      )}
    </div>
  );
});

WolfDressUp.displayName = 'WolfDressUp';

export default WolfDressUp;
