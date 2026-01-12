/**
 * NEON VINYL: GHOST GROOVES - Provably Fair Footer
 *
 * Displays current spin seed information below the game.
 * Shows Server Seed Hash, Client Seed, and Nonce.
 */
import React, { useState } from 'react';
import useGameStore from '../../stores/gameStore';
import './ProvablyFairFooter.css';

const ProvablyFairFooter = ({ onRotateSeed }) => {
  const [expanded, setExpanded] = useState(false);
  const [revealedSeed, setRevealedSeed] = useState(null);
  const [copied, setCopied] = useState(null);

  // Store state
  const serverSeedHash = useGameStore((state) => state.serverSeedHash);
  const clientSeed = useGameStore((state) => state.clientSeed);
  const setClientSeed = useGameStore((state) => state.setClientSeed);
  const nonce = useGameStore((state) => state.nonce);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /**
   * Handle seed rotation
   */
  const handleRotate = async () => {
    if (onRotateSeed) {
      const result = await onRotateSeed();
      if (result?.revealedServerSeed) {
        setRevealedSeed(result.revealedServerSeed);
      }
    }
  };

  /**
   * Truncate hash for display
   */
  const truncate = (str, len = 16) => {
    if (!str) return '---';
    if (str.length <= len) return str;
    return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`;
  };

  return (
    <div className={`pf-footer ${expanded ? 'expanded' : ''}`}>
      {/* Toggle Bar */}
      <button
        className="pf-footer-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="pf-lock-icon">&#128274;</span>
        <span className="pf-toggle-label">Provably Fair</span>
        <span className="pf-toggle-arrow">{expanded ? '▼' : '▲'}</span>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="pf-footer-content">
          {/* Server Seed Hash */}
          <div className="pf-row">
            <div className="pf-label">Server Seed Hash</div>
            <div className="pf-value-container">
              <code className="pf-hash" title={serverSeedHash || ''}>
                {truncate(serverSeedHash, 32)}
              </code>
              <button
                className={`pf-copy-btn ${copied === 'hash' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(serverSeedHash, 'hash')}
                title="Copy to clipboard"
              >
                {copied === 'hash' ? '✓' : '⧉'}
              </button>
            </div>
          </div>

          {/* Client Seed */}
          <div className="pf-row">
            <div className="pf-label">Client Seed</div>
            <div className="pf-value-container">
              <input
                type="text"
                className="pf-input"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                maxLength={64}
                placeholder="Enter your seed..."
              />
              <button
                className={`pf-copy-btn ${copied === 'client' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(clientSeed, 'client')}
                title="Copy to clipboard"
              >
                {copied === 'client' ? '✓' : '⧉'}
              </button>
            </div>
          </div>

          {/* Nonce */}
          <div className="pf-row">
            <div className="pf-label">Nonce</div>
            <div className="pf-value-container">
              <span className="pf-nonce">{nonce}</span>
            </div>
          </div>

          {/* Revealed Seed (after rotation) */}
          {revealedSeed && (
            <div className="pf-row pf-revealed">
              <div className="pf-label">Revealed Server Seed</div>
              <div className="pf-value-container">
                <code className="pf-hash revealed" title={revealedSeed}>
                  {truncate(revealedSeed, 32)}
                </code>
                <button
                  className={`pf-copy-btn ${copied === 'revealed' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(revealedSeed, 'revealed')}
                  title="Copy to clipboard"
                >
                  {copied === 'revealed' ? '✓' : '⧉'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pf-actions">
            <button className="pf-rotate-btn" onClick={handleRotate}>
              Rotate Seed & Reveal
            </button>
            <a
              href="#verify"
              className="pf-verify-link"
              onClick={(e) => {
                e.preventDefault();
                alert('Verification tool coming soon!');
              }}
            >
              Verify Results
            </a>
          </div>

          {/* Info */}
          <div className="pf-info">
            <p>
              Your results are determined by combining the server seed, your client seed,
              and the nonce. Rotate to reveal the current server seed for verification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvablyFairFooter;
