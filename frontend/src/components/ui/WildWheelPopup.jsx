/**
 * WOLFIE GROOVE - Wild Wheel
 * Simple CSS wheel that works
 */
import React, { useEffect, useState, useCallback } from 'react';
import audioService from '../../services/audioService';
import './WildWheelPopup.css';

const SEGMENTS = [
  { value: 2, label: 'x2' },
  { value: 4, label: 'x4' },
  { value: 8, label: 'x8' },
  { value: 16, label: 'x16' },
  { value: 32, label: 'x32' },
  { value: 64, label: 'x64' },
  { value: 128, label: 'x128' },
  { value: 256, label: 'x256' },
];

export default function WildWheelPopup({ show, targetMultiplier = 64, onComplete, onSpinStart }) {
  const [visible, setVisible] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonSegment, setWonSegment] = useState(null);

  // Reset on show and auto-spin
  useEffect(() => {
    if (show) {
      setVisible(true);
      setAngle(0);
      setShowResult(false);
      setWonSegment(null);
      setSpinning(false);
      setCanSpin(true);
      // Auto-spin after brief appearance
      const autoSpinTimer = setTimeout(() => {
        handleSpinAuto();
      }, 600);
      return () => clearTimeout(autoSpinTimer);
    } else {
      setVisible(false);
      setCanSpin(false);
    }
  }, [show]);

  // Auto-spin function (called from useEffect)
  const handleSpinAuto = () => {
    setSpinning(true);
    setCanSpin(false);
    onSpinStart?.();
    audioService.playWheelSpinSound?.();

    // Find target segment
    const targetIdx = SEGMENTS.findIndex(s => s.value === targetMultiplier);
    const idx = targetIdx >= 0 ? targetIdx : 0;

    // Calculate final angle - faster spin (3 rotations instead of 5-7)
    const segmentSize = 360 / 8;
    const segmentCenter = idx * segmentSize + segmentSize / 2;
    const spins = 3 + Math.floor(Math.random() * 2);
    const finalAngle = spins * 360 + (360 - segmentCenter);

    setAngle(finalAngle);

    // After spin ends (1.8s instead of 4s)
    setTimeout(() => {
      setSpinning(false);
      setWonSegment(SEGMENTS[idx]);
      setShowResult(true);
      audioService.playWheelResultSound?.(targetMultiplier);

      // Close popup faster (1s instead of 2s)
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          onComplete?.(targetMultiplier);
        }, 200);
      }, 1000);
    }, 1800);
  };

  const handleSpin = useCallback(() => {
    if (spinning || !canSpin) return;
    handleSpinAuto();
  }, [spinning, canSpin, targetMultiplier, onComplete, onSpinStart]);

  if (!visible && !show) return null;

  return (
    <div className={`ww-overlay ${visible ? 'show' : ''}`}>
      <div className="ww-modal">

        <div className="ww-title">WILD WHEEL</div>

        <div className="ww-wheel-area">
          {/* Pointer */}
          <div className="ww-pointer" />

          {/* Wheel */}
          <div
            className="ww-wheel"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning ? 'transform 1.8s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none'
            }}
          >
            {/* Segment labels */}
            {SEGMENTS.map((seg, i) => (
              <div
                key={i}
                className="ww-label"
                style={{ '--i': i }}
              >
                {seg.label}
              </div>
            ))}

            {/* Center */}
            <div className="ww-center">WILD</div>
          </div>
        </div>

        {/* Spin button */}
        {canSpin && !spinning && !showResult && (
          <button className="ww-spin-btn" onClick={handleSpin}>
            SPIN
          </button>
        )}

        {/* Spinning text */}
        {spinning && (
          <div className="ww-spinning">Good luck...</div>
        )}

        {/* Result */}
        {showResult && wonSegment && (
          <div className="ww-result">
            <div className="ww-result-value">{wonSegment.label}</div>
            <div className="ww-result-text">Multiplier won!</div>
          </div>
        )}
      </div>
    </div>
  );
}
