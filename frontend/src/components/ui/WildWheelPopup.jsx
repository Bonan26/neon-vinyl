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

  // Reset on show
  useEffect(() => {
    if (show) {
      setVisible(true);
      setAngle(0);
      setShowResult(false);
      setWonSegment(null);
      setSpinning(false);
      setTimeout(() => setCanSpin(true), 400);
    } else {
      setVisible(false);
      setCanSpin(false);
    }
  }, [show]);

  const handleSpin = useCallback(() => {
    if (spinning || !canSpin) return;

    setSpinning(true);
    setCanSpin(false);
    onSpinStart?.();
    audioService.playWheelSpinSound?.();

    // Find target segment
    const targetIdx = SEGMENTS.findIndex(s => s.value === targetMultiplier);
    const idx = targetIdx >= 0 ? targetIdx : 0;

    // Calculate final angle
    // Each segment = 45deg (360/8)
    // Pointer at top = 0deg
    // Segment 0 center is at 22.5deg from top
    const segmentSize = 360 / 8;
    const segmentCenter = idx * segmentSize + segmentSize / 2;
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalAngle = spins * 360 + (360 - segmentCenter);

    setAngle(finalAngle);

    // After spin ends
    setTimeout(() => {
      setSpinning(false);
      setWonSegment(SEGMENTS[idx]);
      setShowResult(true);
      audioService.playWheelResultSound?.(targetMultiplier);

      // Close popup
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          onComplete?.(targetMultiplier);
        }, 300);
      }, 2000);
    }, 4000);
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
              transition: spinning ? 'transform 4s cubic-bezier(0.2, 0.7, 0.3, 1)' : 'none'
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
          <div className="ww-spinning">Bonne chance...</div>
        )}

        {/* Result */}
        {showResult && wonSegment && (
          <div className="ww-result">
            <div className="ww-result-value">{wonSegment.label}</div>
            <div className="ww-result-text">Multiplicateur gagné !</div>
          </div>
        )}
      </div>
    </div>
  );
}
