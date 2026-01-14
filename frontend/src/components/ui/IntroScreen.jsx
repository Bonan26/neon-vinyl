/**
 * LES WOLFS 86 - Intro Screen with Loading
 * Clean design inspired by "Le Bandit" (Hacksaw Gaming)
 */
import React, { useState, useEffect, useCallback } from 'react';
import './IntroScreen.css';

const STORAGE_KEY = 'wolfs86_skip_intro';

// All images to preload (with cache buster)
const CACHE_VERSION = 'v14';
const PRELOAD_IMAGES = [
  `/logo.png?${CACHE_VERSION}`,
  `/symbols/wolf_red.png?${CACHE_VERSION}`,
  `/symbols/wolf_black.png?${CACHE_VERSION}`,
  `/symbols/wolf_purple.png?${CACHE_VERSION}`,
  `/symbols/wolf_gray.png?${CACHE_VERSION}`,
  `/symbols/wolf_green.png?${CACHE_VERSION}`,
  `/symbols/wolf_spirit.png?${CACHE_VERSION}`,
  `/symbols/hat_cap.png?${CACHE_VERSION}`,
  `/symbols/hat_steam.png?${CACHE_VERSION}`,
  `/symbols/hat_straw.png?${CACHE_VERSION}`,
  `/symbols/hat_peacock.png?${CACHE_VERSION}`,
  `/symbols/scatter_gold.jpg?${CACHE_VERSION}`,
  `/symbols/crown_matrix.png?${CACHE_VERSION}`,
];

const IntroScreen = ({ onStart }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState(0);

  // Preload all images
  useEffect(() => {
    let loaded = 0;
    const totalImages = PRELOAD_IMAGES.length;

    const preloadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          setLoadedImages(loaded);
          setLoadProgress(Math.round((loaded / totalImages) * 100));
          resolve();
        };
        img.onerror = () => {
          loaded++;
          setLoadedImages(loaded);
          setLoadProgress(Math.round((loaded / totalImages) * 100));
          resolve(); // Continue even if image fails
        };
        img.src = src;
      });
    };

    // Load all images
    Promise.all(PRELOAD_IMAGES.map(preloadImage)).then(() => {
      // Add minimum loading time for smooth UX
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const skipIntro = localStorage.getItem(STORAGE_KEY) === 'true';
      if (skipIntro) {
        setShowIntro(false);
        onStart?.();
      }
    }
  }, [isLoading, onStart]);

  const handleStart = useCallback(() => {
    if (skipNextTime) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setShowIntro(false);
    onStart?.();
  }, [skipNextTime, onStart]);

  if (!showIntro) return null;

  // Show loading screen while images load
  if (isLoading) {
    return (
      <div className="intro-screen loading-screen">
        <div className="loading-content">
          {/* Logo */}
          <div className="loading-logo">
            <img src={`/logo.png?v14`} alt="Les Wolfs 86" className="main-logo-img" />
          </div>

          {/* Loading bar */}
          <div className="loading-bar-container">
            <div className="loading-bar">
              <div
                className="loading-bar-fill"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="loading-text">CHARGEMENT... {loadProgress}%</span>
          </div>

          {/* Loading spinner */}
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intro-screen">
      {/* Background illustration */}
      <div className="intro-bg">
        <div className="intro-bg-gradient" />
        <img
          src="/symbols/wolf_gray.png"
          alt=""
          className="intro-bg-wolf intro-bg-wolf-1"
        />
        <img
          src="/symbols/wolf_black.png"
          alt=""
          className="intro-bg-wolf intro-bg-wolf-2"
        />
      </div>

      {/* Content */}
      <div className="intro-content">
        {/* Title - Main Logo */}
        <div className="intro-header">
          <img src={`/logo.png?v14`} alt="Les Wolfs 86" className="intro-main-logo" />
        </div>

        {/* Volatility indicator */}
        <div className="intro-volatility">
          <span>VOLATILITE</span>
          <div className="volatility-bars">
            <span className="bar active"></span>
            <span className="bar active"></span>
            <span className="bar active"></span>
            <span className="bar active"></span>
          </div>
        </div>

        {/* Feature cards */}
        <div className="intro-features">
          <div className="feature-card">
            <div className="feature-icon">
              <img src="/symbols/wolf_red.png" alt="" />
            </div>
            <h3>LOUPS SAUVAGES</h3>
            <p>Les loups sont les symboles premium. Connectez 5+ loups identiques pour gagner gros!</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon scatter">
              <img src="/symbols/scatter_gold.jpg" alt="" />
            </div>
            <h3>FREE SPINS</h3>
            <p>3+ Loups Dorés declenchent les tours gratuits avec multiplicateurs croissants!</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon crown">
              <img src="/symbols/crown_matrix.png" alt="" />
            </div>
            <h3>GAIN MAX</h3>
            <p>Gagnez jusqu'a 40,000x votre mise grace aux multiplicateurs qui s'accumulent!</p>
          </div>
        </div>

        {/* Start button */}
        <button className="intro-start-btn" onClick={handleStart}>
          CLIQUEZ POUR JOUER
        </button>

        {/* Skip option */}
        <label className="intro-skip">
          <input
            type="checkbox"
            checked={skipNextTime}
            onChange={(e) => setSkipNextTime(e.target.checked)}
          />
          <span className="checkmark"></span>
          Ne plus afficher
        </label>
      </div>

      {/* Corner logo */}
      <div className="intro-corner-logo">
        <img src={`/logo.png?v14`} alt="Les Wolfs 86" />
      </div>
    </div>
  );
};

export default IntroScreen;
