/**
 * LES WOLFS 86 - Game Info Modal
 * Professional paytable and rules modal
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './GameInfoModal.css';

const GameInfoModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('symbols');

  if (!isOpen) return null;

  // Paytable data matching backend game_config.py
  const symbols = [
    { id: 'WR', name: 'Loup Rouge', img: '/symbols/wolf_red.png', tier: 'premium', pays: { 4: '0.40x', 8: '2.89x', 10: '6.55x', 15: '65x' } },
    { id: 'WB', name: 'Loup Noir', img: '/symbols/wolf_black.png', tier: 'premium', pays: { 4: '0.30x', 8: '2.50x', 10: '5.80x', 15: '58x' } },
    { id: 'WP', name: 'Loup Violet', img: '/symbols/wolf_purple.png', tier: 'premium', pays: { 4: '0.26x', 8: '2.17x', 10: '5.23x', 15: '52x' } },
    { id: 'WG', name: 'Loup Gris', img: '/symbols/wolf_gray.png', tier: 'medium', pays: { 4: '0.18x', 8: '1.40x', 10: '3.50x', 15: '38x' } },
    { id: 'W6', name: 'Loup Vert', img: '/symbols/wolf_green.png', tier: 'medium', pays: { 4: '0.16x', 8: '1.24x', 10: '3.03x', 15: '33x' } },
    { id: 'WS', name: 'Loup Spirit', img: '/symbols/wolf_spirit.png', tier: 'medium', pays: { 4: '0.13x', 8: '1.05x', 10: '2.60x', 15: '28x' } },
    { id: 'HC', name: 'Loup Blanc', img: '/symbols/wolf_white.png', tier: 'low', pays: { 4: '0.06x', 8: '0.50x', 10: '1.20x', 15: '13x' } },
    { id: 'HS', name: 'Loup Serpent', img: '/symbols/wolf_snake.png', tier: 'low', pays: { 4: '0.05x', 8: '0.40x', 10: '1.00x', 15: '10.5x' } },
    { id: 'HW', name: 'Loup Street', img: '/symbols/wolf_street.png', tier: 'low', pays: { 4: '0.04x', 8: '0.30x', 10: '0.72x', 15: '7.9x' } },
    { id: 'HK', name: 'Loup Bleu', img: '/symbols/wolf_blue.png', tier: 'low', pays: { 4: '0.04x', 8: '0.30x', 10: '0.72x', 15: '7.9x' } },
  ];

  const modalContent = (
    <div className="gim-overlay" onClick={onClose}>
      <div className="gim-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gim-header">
          <div className="gim-logo">
            <img src="/logo.png?v14" alt="Les Wolfs 86" className="gim-main-logo" />
          </div>
          <button className="gim-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="gim-tabs">
          <button className={activeTab === 'symbols' ? 'active' : ''} onClick={() => setActiveTab('symbols')}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Symboles
          </button>
          <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
            Regles
          </button>
          <button className={activeTab === 'bonus' ? 'active' : ''} onClick={() => setActiveTab('bonus')}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            Bonus
          </button>
          <button className={activeTab === 'features' ? 'active' : ''} onClick={() => setActiveTab('features')}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            Fonctions
          </button>
        </div>

        {/* Content */}
        <div className="gim-content">
          {/* SYMBOLS TAB */}
          {activeTab === 'symbols' && (
            <div className="gim-symbols">
              {/* Special Symbols */}
              <div className="gim-section">
                <h3>Symboles Speciaux</h3>
                <div className="gim-special-grid">
                  <div className="gim-special-card wild">
                    <div className="gim-special-img">
                      <img src="/symbols/crown_matrix.png" alt="Wild" />
                    </div>
                    <div className="gim-special-info">
                      <h4>WILD</h4>
                      <p>Remplace tous les symboles sauf le Scatter. Peut avoir des multiplicateurs pendant les Free Spins.</p>
                    </div>
                  </div>
                  <div className="gim-special-card scatter">
                    <div className="gim-special-img">
                      <img src="/symbols/scatter_gold.jpg" alt="Scatter" />
                    </div>
                    <div className="gim-special-info">
                      <h4>SCATTER</h4>
                      <p>3+ Scatters declenchent les Free Spins. Plus il y en a, plus vous gagnez de tours!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paytable */}
              <div className="gim-section">
                <h3>Table des Gains</h3>
                <p className="gim-subtitle">Gains en multiplicateur de mise pour clusters connectes</p>
                <div className="gim-paytable">
                  <div className="gim-pay-header">
                    <span></span>
                    <span>4+</span>
                    <span>8+</span>
                    <span>10+</span>
                    <span>15+</span>
                  </div>
                  {symbols.map((sym) => (
                    <div key={sym.id} className={`gim-pay-row ${sym.tier}`}>
                      <div className="gim-pay-symbol">
                        <img src={sym.img} alt={sym.name} />
                        <span>{sym.name}</span>
                      </div>
                      <span>{sym.pays[4]}</span>
                      <span>{sym.pays[8]}</span>
                      <span>{sym.pays[10]}</span>
                      <span className="highlight">{sym.pays[15]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RULES TAB */}
          {activeTab === 'rules' && (
            <div className="gim-rules">
              <div className="gim-section">
                <h3>Comment Gagner</h3>
                <div className="gim-rule-cards">
                  <div className="gim-rule-card">
                    <div className="gim-rule-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                    </div>
                    <h4>Clusters</h4>
                    <p>Connectez 4+ symboles identiques horizontalement ou verticalement pour gagner.</p>
                  </div>
                  <div className="gim-rule-card">
                    <div className="gim-rule-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1z"/></svg>
                    </div>
                    <h4>Tumble</h4>
                    <p>Les symboles gagnants disparaissent et de nouveaux tombent. Ca continue tant qu'il y a des gains!</p>
                  </div>
                  <div className="gim-rule-card">
                    <div className="gim-rule-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/></svg>
                    </div>
                    <h4>Multiplicateurs</h4>
                    <p>Les multiplicateurs sur la grille s'appliquent aux gains et augmentent pendant les Free Spins.</p>
                  </div>
                </div>
              </div>

              <div className="gim-section">
                <h3>Grille de Jeu</h3>
                <div className="gim-grid-info">
                  <div className="gim-grid-stat">
                    <span className="gim-stat-value">5x6</span>
                    <span className="gim-stat-label">Grille</span>
                  </div>
                  <div className="gim-grid-stat">
                    <span className="gim-stat-value">4+</span>
                    <span className="gim-stat-label">Min. Cluster</span>
                  </div>
                  <div className="gim-grid-stat">
                    <span className="gim-stat-value">96%</span>
                    <span className="gim-stat-label">RTP</span>
                  </div>
                  <div className="gim-grid-stat">
                    <span className="gim-stat-value">40,000x</span>
                    <span className="gim-stat-label">Gain Max</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BONUS TAB */}
          {activeTab === 'bonus' && (
            <div className="gim-bonus">
              <div className="gim-section">
                <h3>Free Spins</h3>
                <div className="gim-fs-cards">
                  <div className="gim-fs-card">
                    <div className="gim-fs-scatter">
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                    </div>
                    <div className="gim-fs-info">
                      <span className="gim-fs-count">3 Scatters</span>
                      <span className="gim-fs-reward">10 Free Spins</span>
                    </div>
                  </div>
                  <div className="gim-fs-card featured">
                    <div className="gim-fs-scatter">
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                    </div>
                    <div className="gim-fs-info">
                      <span className="gim-fs-count">4 Scatters</span>
                      <span className="gim-fs-reward">15 Free Spins</span>
                    </div>
                  </div>
                  <div className="gim-fs-card super">
                    <div className="gim-fs-scatter">
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                    </div>
                    <div className="gim-fs-info">
                      <span className="gim-fs-count">5+ Scatters</span>
                      <span className="gim-fs-reward">20 Free Spins + STICKY</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gim-section">
                <h3>Achat Bonus</h3>
                <div className="gim-buy-cards">
                  <div className="gim-buy-card">
                    <img src="/symbols/crown_matrix.png" alt="" />
                    <h4>Wolf Burst</h4>
                    <p>3-6 Wilds sur la grille</p>
                    <span className="gim-buy-cost">25x mise</span>
                  </div>
                  <div className="gim-buy-card">
                    <img src="/symbols/scatter_gold.jpg" alt="" />
                    <h4>Free Spins</h4>
                    <p>8 tours gratuits</p>
                    <span className="gim-buy-cost">100x mise</span>
                  </div>
                  <div className="gim-buy-card premium">
                    <img src="/symbols/scatter_gold.jpg" alt="" />
                    <h4>Super Bonus</h4>
                    <p>12 tours + multi x2</p>
                    <span className="gim-buy-cost">200x mise</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FEATURES TAB */}
          {activeTab === 'features' && (
            <div className="gim-features">
              <div className="gim-section">
                <h3>Multiplicateurs</h3>
                <div className="gim-multi-display">
                  {['x2', 'x4', 'x8', 'x16', 'x32', 'x64', 'x128', 'x256'].map((m, i) => (
                    <span key={m} className="gim-multi-badge" style={{ '--hue': 45 + i * 15 }}>{m}</span>
                  ))}
                </div>
                <p className="gim-feature-desc">Pendant les Free Spins, chaque tumble augmente les multiplicateurs sur les positions gagnantes. Les multiplicateurs se cumulent!</p>
              </div>

              <div className="gim-section">
                <h3>Boosts</h3>
                <div className="gim-boost-cards">
                  <div className="gim-boost-card scatter">
                    <div className="gim-boost-icon">
                      <img src="/symbols/scatter_gold.jpg" alt="" />
                    </div>
                    <div className="gim-boost-info">
                      <h4>Scatter Hunt</h4>
                      <p>Chance de Scatter x3 pendant 10 spins</p>
                      <span className="gim-boost-price">2x mise</span>
                    </div>
                  </div>
                  <div className="gim-boost-card wild">
                    <div className="gim-boost-icon">
                      <img src="/symbols/crown_matrix.png" alt="" />
                    </div>
                    <div className="gim-boost-info">
                      <h4>Wild Boost</h4>
                      <p>Chance de Wild x5 pendant 5 spins</p>
                      <span className="gim-boost-price">5x mise</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gim-section">
                <h3>Volatilite</h3>
                <div className="gim-volatility">
                  <div className="gim-vol-bars">
                    <span className="active"></span>
                    <span className="active"></span>
                    <span className="active"></span>
                    <span className="active"></span>
                    <span></span>
                  </div>
                  <span className="gim-vol-label">HAUTE</span>
                </div>
                <p className="gim-feature-desc">Ce jeu a une volatilite haute. Les gains sont moins frequents mais potentiellement plus importants.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gim-footer">
          <span>Les Wolfs 86 - Jeu de demonstration</span>
        </div>
      </div>
    </div>
  );

  // Use Portal to render modal at document body level
  return ReactDOM.createPortal(modalContent, document.body);
};

export default GameInfoModal;
