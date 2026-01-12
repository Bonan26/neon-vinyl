/**
 * NEON VINYL: GHOST GROOVES - Free Spins Counter
 * Displays remaining free spins and total win
 */
import React from 'react';
import useGameStore from '../../stores/gameStore';
import './FreeSpinsCounter.css';

const FreeSpinsCounter = () => {
  const freeSpinsRemaining = useGameStore((state) => state.freeSpinsRemaining);
  const freeSpinTotalWin = useGameStore((state) => state.freeSpinTotalWin);

  if (freeSpinsRemaining <= 0) return null;

  return (
    <div className="free-spins-counter">
      <div className="fs-header">FREE SPINS</div>
      <div className="fs-remaining">
        <span className="fs-number">{freeSpinsRemaining}</span>
        <span className="fs-label">left</span>
      </div>
      <div className="fs-divider" />
      <div className="fs-total-win">
        <span className="fs-win-label">WIN</span>
        <span className="fs-win-value">${freeSpinTotalWin.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default FreeSpinsCounter;
