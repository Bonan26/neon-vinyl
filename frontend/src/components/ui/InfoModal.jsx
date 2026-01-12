/**
 * NEON VINYL: GHOST GROOVES - Info Modal
 * Multi-page information modal (Paytable, Specials, Rules)
 */
import React, { useState, useCallback } from 'react';
import { gsap } from 'gsap';
import './InfoModal.css';

// Symbol data for paytable
const PAYTABLE_DATA = {
  high: [
    {
      id: 'DJ',
      name: 'DJ Spooky',
      color: '#ff00ff',
      payouts: { 5: '2.8x', 6: '4.6x', 7: '7.4x', 8: '12x', 9: '18.5x', '10+': '27.8x+' },
    },
    {
      id: 'GV',
      name: 'Gold Vinyl',
      color: '#ffd700',
      payouts: { 5: '1.85x', 6: '3.3x', 7: '5.6x', 8: '9.3x', 9: '14.8x', '10+': '22.2x+' },
    },
  ],
  mid: [
    {
      id: 'HP',
      name: 'Headphones',
      color: '#00ffff',
      payouts: { 5: '1.13x', 6: '1.85x', 7: '3x', 8: '5.15x', 9: '8.3x', '10+': '13x+' },
    },
    {
      id: 'CS',
      name: 'Cassette',
      color: '#ff8800',
      payouts: { 5: '0.74x', 6: '1.3x', 7: '2.22x', 8: '3.7x', 9: '5.93x', '10+': '9.3x+' },
    },
  ],
  low: [
    {
      id: 'NP',
      name: 'Pink Note',
      color: '#ff69b4',
      payouts: { 5: '0.28x', 6: '0.46x', 7: '0.74x', 8: '1.3x', 9: '2.04x', '10+': '3.34x+' },
    },
    {
      id: 'NB',
      name: 'Blue Note',
      color: '#4169e1',
      payouts: { 5: '0.28x', 6: '0.46x', 7: '0.74x', 8: '1.3x', 9: '2.04x', '10+': '3.34x+' },
    },
    {
      id: 'NU',
      name: 'Purple Note',
      color: '#9932cc',
      payouts: { 5: '0.28x', 6: '0.46x', 7: '0.74x', 8: '1.3x', 9: '2.04x', '10+': '3.34x+' },
    },
  ],
};

const PAGES = [
  { id: 'paytable', label: 'Paytable' },
  { id: 'specials', label: 'Specials' },
  { id: 'rules', label: 'Rules' },
];

const InfoModal = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const handleClose = useCallback(() => {
    gsap.to('.info-modal-overlay', {
      opacity: 0,
      duration: 0.3,
      onComplete: onClose,
    });
  }, [onClose]);

  const handlePageChange = useCallback((index) => {
    gsap.to('.info-modal-content', {
      opacity: 0,
      x: index > currentPage ? -20 : 20,
      duration: 0.2,
      onComplete: () => {
        setCurrentPage(index);
        gsap.fromTo(
          '.info-modal-content',
          { opacity: 0, x: index > currentPage ? 20 : -20 },
          { opacity: 1, x: 0, duration: 0.2 }
        );
      },
    });
  }, [currentPage]);

  const handlePrev = useCallback(() => {
    if (currentPage > 0) handlePageChange(currentPage - 1);
  }, [currentPage, handlePageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < PAGES.length - 1) handlePageChange(currentPage + 1);
  }, [currentPage, handlePageChange]);

  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={handleClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="info-modal-header">
          <h2>Game Information</h2>
          <button className="info-close-btn" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Page Tabs */}
        <div className="info-modal-tabs">
          {PAGES.map((page, index) => (
            <button
              key={page.id}
              className={`info-tab ${currentPage === index ? 'active' : ''}`}
              onClick={() => handlePageChange(index)}
            >
              {page.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="info-modal-content">
          {currentPage === 0 && <PaytablePage />}
          {currentPage === 1 && <SpecialsPage />}
          {currentPage === 2 && <RulesPage />}
        </div>

        {/* Navigation */}
        <div className="info-modal-nav">
          <button
            className="info-nav-btn"
            onClick={handlePrev}
            disabled={currentPage === 0}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            Prev
          </button>
          <div className="info-page-dots">
            {PAGES.map((_, index) => (
              <span
                key={index}
                className={`page-dot ${currentPage === index ? 'active' : ''}`}
              />
            ))}
          </div>
          <button
            className="info-nav-btn"
            onClick={handleNext}
            disabled={currentPage === PAGES.length - 1}
          >
            Next
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Paytable Page
const PaytablePage = () => (
  <div className="paytable-page">
    <h3 className="section-title">High Tier Symbols</h3>
    <div className="symbol-grid">
      {PAYTABLE_DATA.high.map((symbol) => (
        <SymbolCard key={symbol.id} symbol={symbol} />
      ))}
    </div>

    <h3 className="section-title">Mid Tier Symbols</h3>
    <div className="symbol-grid">
      {PAYTABLE_DATA.mid.map((symbol) => (
        <SymbolCard key={symbol.id} symbol={symbol} />
      ))}
    </div>

    <h3 className="section-title">Low Tier Symbols</h3>
    <div className="symbol-grid">
      {PAYTABLE_DATA.low.map((symbol) => (
        <SymbolCard key={symbol.id} symbol={symbol} />
      ))}
    </div>
  </div>
);

const SymbolCard = ({ symbol }) => (
  <div className="symbol-card">
    <div
      className="symbol-icon"
      style={{
        background: `linear-gradient(135deg, ${symbol.color}, ${symbol.color}88)`,
        boxShadow: `0 0 15px ${symbol.color}66`,
      }}
    >
      {symbol.id}
    </div>
    <div className="symbol-name">{symbol.name}</div>
    <div className="symbol-payouts">
      {Object.entries(symbol.payouts).map(([count, payout]) => (
        <div key={count} className="payout-row">
          <span className="payout-count">{count}</span>
          <span className="payout-value">{payout}</span>
        </div>
      ))}
    </div>
  </div>
);

// Specials Page
const SpecialsPage = () => (
  <div className="specials-page">
    <div className="special-card">
      <div className="special-icon wild">W</div>
      <div className="special-info">
        <h3>WILD Symbol</h3>
        <p>
          The Wild symbol substitutes for all regular symbols in cluster wins.
          It helps create larger clusters and bigger payouts!
        </p>
        <ul>
          <li>Appears on all reels</li>
          <li>Does not substitute for Scatter</li>
          <li>Pays same as DJ Spooky (highest)</li>
        </ul>
      </div>
    </div>

    <div className="special-card">
      <div className="special-icon scatter">SC</div>
      <div className="special-info">
        <h3>SCATTER Symbol (Vinyl)</h3>
        <p>
          Land 3 or more Scatter symbols anywhere on the grid to trigger
          Free Spins bonus!
        </p>
        <div className="scatter-rewards">
          <div className="reward">
            <span className="reward-count">3</span>
            <span className="reward-spins">8 Free Spins</span>
          </div>
          <div className="reward">
            <span className="reward-count">4</span>
            <span className="reward-spins">12 Free Spins</span>
          </div>
          <div className="reward">
            <span className="reward-count">5+</span>
            <span className="reward-spins">15 Free Spins</span>
          </div>
        </div>
      </div>
    </div>

    <div className="special-card">
      <div className="special-icon multiplier">x8</div>
      <div className="special-info">
        <h3>Ghost Spot Multipliers</h3>
        <p>
          Winning positions become "Ghost Spots" with multipliers that
          increase with each consecutive win!
        </p>
        <div className="multiplier-progression">
          <span>x1</span>
          <span className="arrow">→</span>
          <span>x2</span>
          <span className="arrow">→</span>
          <span>x4</span>
          <span className="arrow">→</span>
          <span>x8</span>
        </div>
      </div>
    </div>
  </div>
);

// Rules Page
const RulesPage = () => (
  <div className="rules-page">
    <div className="rule-section">
      <h3>Cluster Pays</h3>
      <p>
        Win by landing <strong>5 or more</strong> matching symbols connected
        horizontally or vertically. The more symbols in a cluster, the higher
        the payout!
      </p>
    </div>

    <div className="rule-section">
      <h3>Tumble Feature</h3>
      <p>
        After each winning cluster, winning symbols are removed and new symbols
        fall into place. This continues until no new wins are formed.
      </p>
      <div className="tumble-diagram">
        <div className="tumble-step">
          <span className="step-num">1</span>
          <span>Win detected</span>
        </div>
        <span className="tumble-arrow">→</span>
        <div className="tumble-step">
          <span className="step-num">2</span>
          <span>Symbols removed</span>
        </div>
        <span className="tumble-arrow">→</span>
        <div className="tumble-step">
          <span className="step-num">3</span>
          <span>New symbols fall</span>
        </div>
        <span className="tumble-arrow">→</span>
        <div className="tumble-step">
          <span className="step-num">4</span>
          <span>Repeat if win</span>
        </div>
      </div>
    </div>

    <div className="rule-section">
      <h3>Free Spins Bonus</h3>
      <p>
        During Free Spins, Ghost Spot multipliers <strong>persist</strong> between
        spins instead of resetting. This can lead to massive multipliers!
      </p>
    </div>

    <div className="rule-section">
      <h3>Return To Player (RTP)</h3>
      <p>
        This game has a theoretical RTP of <strong>95.08%</strong> and high volatility.
      </p>
    </div>
  </div>
);

export default InfoModal;
