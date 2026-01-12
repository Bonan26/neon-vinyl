/**
 * NEON VINYL: GHOST GROOVES - Provably Fair Panel
 * Shows seed info and verification controls
 */
import React, { useState } from 'react';
import useGameStore from '../../stores/gameStore';
import './ProvablyFairPanel.css';

const ProvablyFairPanel = ({ onRotateSeed }) => {
  const serverSeedHash = useGameStore((state) => state.serverSeedHash);
  const clientSeed = useGameStore((state) => state.clientSeed);
  const setClientSeed = useGameStore((state) => state.setClientSeed);
  const nonce = useGameStore((state) => state.nonce);
  const showProvablyFair = useGameStore((state) => state.showProvablyFair);
  const toggleProvablyFair = useGameStore((state) => state.toggleProvablyFair);

  const [editingSeed, setEditingSeed] = useState(false);
  const [tempSeed, setTempSeed] = useState(clientSeed);
  const [revealedSeed, setRevealedSeed] = useState(null);

  const handleSaveSeed = () => {
    if (tempSeed.trim()) {
      setClientSeed(tempSeed.trim());
      setEditingSeed(false);
    }
  };

  const handleRotate = async () => {
    if (onRotateSeed) {
      const result = await onRotateSeed();
      if (result?.revealedServerSeed) {
        setRevealedSeed(result.revealedServerSeed);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (!showProvablyFair) {
    return (
      <button className="pf-toggle-btn" onClick={toggleProvablyFair}>
        <span className="pf-icon">&#128274;</span>
        Provably Fair
      </button>
    );
  }

  return (
    <div className="provably-fair-panel">
      <div className="pf-header">
        <h3>Provably Fair</h3>
        <button className="pf-close-btn" onClick={toggleProvablyFair}>
          &times;
        </button>
      </div>

      <div className="pf-content">
        {/* Server Seed Hash */}
        <div className="pf-section">
          <label>Server Seed Hash</label>
          <div className="pf-value-row">
            <input
              type="text"
              value={serverSeedHash || 'Not available'}
              readOnly
              className="pf-input readonly"
            />
            <button
              className="pf-copy-btn"
              onClick={() => copyToClipboard(serverSeedHash)}
              title="Copy to clipboard"
            >
              &#128203;
            </button>
          </div>
        </div>

        {/* Client Seed */}
        <div className="pf-section">
          <label>Client Seed</label>
          <div className="pf-value-row">
            {editingSeed ? (
              <>
                <input
                  type="text"
                  value={tempSeed}
                  onChange={(e) => setTempSeed(e.target.value)}
                  className="pf-input"
                  maxLength={64}
                />
                <button className="pf-save-btn" onClick={handleSaveSeed}>
                  Save
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={clientSeed}
                  readOnly
                  className="pf-input readonly"
                />
                <button
                  className="pf-edit-btn"
                  onClick={() => {
                    setTempSeed(clientSeed);
                    setEditingSeed(true);
                  }}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Nonce */}
        <div className="pf-section">
          <label>Nonce</label>
          <div className="pf-value">{nonce}</div>
        </div>

        {/* Revealed Server Seed */}
        {revealedSeed && (
          <div className="pf-section revealed">
            <label>Revealed Server Seed</label>
            <div className="pf-value-row">
              <input
                type="text"
                value={revealedSeed}
                readOnly
                className="pf-input readonly revealed"
              />
              <button
                className="pf-copy-btn"
                onClick={() => copyToClipboard(revealedSeed)}
              >
                &#128203;
              </button>
            </div>
          </div>
        )}

        {/* Rotate Seed Button */}
        <div className="pf-actions">
          <button className="pf-rotate-btn" onClick={handleRotate}>
            Rotate Server Seed
          </button>
          <p className="pf-note">
            Rotating reveals the current server seed for verification
            and generates a new one for future bets.
          </p>
        </div>

        {/* Verification Info */}
        <div className="pf-info">
          <h4>How to Verify</h4>
          <ol>
            <li>Note the Server Seed Hash before playing</li>
            <li>Use your own Client Seed (optional)</li>
            <li>After playing, rotate to reveal the Server Seed</li>
            <li>Use our verification tool to confirm results</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ProvablyFairPanel;
