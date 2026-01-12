/**
 * NEON VINYL: GHOST GROOVES - Bonus Buy Intro Animation
 * Animated sequence when purchasing a bonus
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import './BonusBuyIntro.css';

const SCATTER_POSITIONS_3 = [
  { row: 1, col: 2 },
  { row: 3, col: 4 },
  { row: 5, col: 1 },
];

const SCATTER_POSITIONS_4 = [
  { row: 1, col: 1 },
  { row: 2, col: 5 },
  { row: 4, col: 3 },
  { row: 6, col: 6 },
];

const BONUS_RULES = {
  standard: {
    title: 'SPINS GRATUITS',
    spins: 8,
    rules: [
      'Vous avez gagné 8 Free Spins!',
      'Les multiplicateurs Ghost s\'accumulent',
      'Chaque tumble augmente les multiplicateurs',
      'Les gains sont calculés avec votre mise actuelle',
    ],
  },
  super: {
    title: 'SUPER SPINS GRATUITS',
    spins: 12,
    rules: [
      'Vous avez gagné 12 Free Spins!',
      'Multiplicateurs de départ x2',
      'Progression des multiplicateurs accélérée',
      'Potentiel de gains maximal!',
    ],
  },
};

const BonusBuyIntro = ({ show, bonusType, scatterCount, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle, spinning, scatters, rules
  const overlayRef = useRef(null);
  const gridRef = useRef(null);
  const scattersRef = useRef([]);
  const rulesRef = useRef(null);

  const scatterPositions = scatterCount === 4 ? SCATTER_POSITIONS_4 : SCATTER_POSITIONS_3;
  const bonusInfo = BONUS_RULES[bonusType] || BONUS_RULES.standard;

  // Reset when show changes
  useEffect(() => {
    if (show) {
      setPhase('spinning');
      scattersRef.current = [];
    } else {
      setPhase('idle');
    }
  }, [show]);

  // Animation sequence
  useEffect(() => {
    if (!show || phase === 'idle') return;

    const tl = gsap.timeline();

    if (phase === 'spinning') {
      // Fade in overlay
      tl.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );

      // Spin the grid cells
      if (gridRef.current) {
        const cells = gridRef.current.querySelectorAll('.intro-cell');
        cells.forEach((cell, index) => {
          const symbols = cell.querySelector('.cell-symbols');
          if (symbols) {
            // Random spin duration per column
            const duration = 1.2 + Math.random() * 0.8;
            const delay = (index % 7) * 0.06;

            // Animate using yPercent (percentage of element's own height)
            // Since .cell-symbols is 1000% of parent, -100% yPercent = scroll through all symbols
            gsap.fromTo(symbols,
              { yPercent: 0 },
              {
                yPercent: -90, // Scroll through 90% of the 1000% height (9 symbols worth)
                duration: duration,
                delay: delay,
                ease: 'power1.inOut',
                repeat: 2,
              }
            );
          }
        });
      }

      // After spinning, show scatters
      setTimeout(() => setPhase('scatters'), 2500);
    }

    if (phase === 'scatters') {
      // Reveal scatters one by one
      scattersRef.current.forEach((scatter, index) => {
        if (scatter) {
          tl.fromTo(scatter,
            { scale: 0, opacity: 0, rotation: -180 },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.5,
              ease: 'back.out(2)',
              delay: index * 0.3,
            },
            index * 0.3
          );
        }
      });

      // Flash effect
      tl.to(overlayRef.current, {
        backgroundColor: 'rgba(255, 0, 255, 0.3)',
        duration: 0.1,
        yoyo: true,
        repeat: 3,
      }, '+=0.2');

      // After scatters, show rules
      setTimeout(() => setPhase('rules'), scatterCount * 300 + 1000);
    }

    if (phase === 'rules') {
      if (rulesRef.current) {
        gsap.fromTo(rulesRef.current,
          { scale: 0.5, opacity: 0, y: 50 },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'back.out(1.5)',
          }
        );
      }
    }

    return () => tl.kill();
  }, [phase, show, scatterCount]);

  const handleStart = useCallback(() => {
    // Animate out
    const tl = gsap.timeline({
      onComplete: () => {
        setPhase('idle');
        onComplete?.();
      }
    });

    if (rulesRef.current) {
      tl.to(rulesRef.current, {
        scale: 0.8,
        opacity: 0,
        y: -30,
        duration: 0.3,
      });
    }

    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
    });
  }, [onComplete]);

  if (!show && phase === 'idle') return null;

  // Generate grid with random symbols
  const generateGrid = () => {
    const symbols = ['DJ', 'GV', 'HP', 'CS', 'NP', 'NB', 'NU'];
    const grid = [];

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const isScatterPos = scatterPositions.some(
          pos => pos.row === row && pos.col === col
        );

        grid.push({
          row,
          col,
          isScatter: isScatterPos,
          symbols: Array(10).fill(null).map(() =>
            symbols[Math.floor(Math.random() * symbols.length)]
          ),
        });
      }
    }
    return grid;
  };

  const gridCells = generateGrid();

  return (
    <div className="bonus-intro-overlay" ref={overlayRef}>
      {/* Mini Grid */}
      <div className="intro-grid-container">
        <div className="intro-grid" ref={gridRef}>
          {gridCells.map((cell, index) => (
            <div
              key={`${cell.row}-${cell.col}`}
              className={`intro-cell ${cell.isScatter ? 'scatter-cell' : ''}`}
            >
              {phase === 'spinning' && (
                <div className="cell-symbols">
                  {cell.symbols.map((sym, i) => (
                    <div key={i} className={`cell-symbol symbol-${sym}`}>
                      {sym}
                    </div>
                  ))}
                </div>
              )}

              {(phase === 'scatters' || phase === 'rules') && cell.isScatter && (
                <div
                  className="scatter-reveal"
                  ref={el => {
                    const idx = scatterPositions.findIndex(
                      p => p.row === cell.row && p.col === cell.col
                    );
                    if (idx !== -1) scattersRef.current[idx] = el;
                  }}
                >
                  <div className="scatter-symbol">SC</div>
                  <div className="scatter-glow" />
                </div>
              )}

              {(phase === 'scatters' || phase === 'rules') && !cell.isScatter && (
                <div className="cell-symbol-static">
                  {cell.symbols[0]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bonus name indicator */}
        {(phase === 'scatters' || phase === 'rules') && (
          <div className="scatter-count-display">
            <span className="scatter-count-label">{bonusInfo.title}</span>
          </div>
        )}
      </div>

      {/* Rules Popup */}
      {phase === 'rules' && (
        <div className="rules-popup" ref={rulesRef}>
          <div className="rules-header">
            <h2>{bonusInfo.title}</h2>
            <div className="spins-badge">
              <span className="spins-value">{bonusInfo.spins}</span>
              <span className="spins-label">FREE SPINS</span>
            </div>
          </div>

          <div className="rules-content">
            <ul className="rules-list">
              {bonusInfo.rules.map((rule, index) => (
                <li key={index}>
                  <span className="rule-icon">&#x2605;</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <button className="start-bonus-btn" onClick={handleStart}>
            <span className="btn-text">COMMENCER</span>
            <span className="btn-glow" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BonusBuyIntro;
