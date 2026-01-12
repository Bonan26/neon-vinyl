/**
 * NEON VINYL: GHOST GROOVES - Settings Menu
 * Popup menu with toggles for music, SFX, intro screen
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './SettingsMenu.css';

const INTRO_STORAGE_KEY = 'neonvinyl_skip_intro';

const SettingsMenu = ({
  isOpen,
  onClose,
  musicEnabled,
  onMusicToggle,
  sfxEnabled,
  onSfxToggle,
}) => {
  const menuRef = useRef(null);

  // Get intro screen preference
  const [showIntro, setShowIntro] = React.useState(() => {
    return localStorage.getItem(INTRO_STORAGE_KEY) !== 'true';
  });

  // Animation on open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (menuRef.current) {
      gsap.to(menuRef.current, {
        opacity: 0,
        scale: 0.9,
        y: 10,
        duration: 0.15,
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  }, [onClose]);

  const handleIntroToggle = useCallback(() => {
    const newValue = !showIntro;
    setShowIntro(newValue);
    localStorage.setItem(INTRO_STORAGE_KEY, newValue ? 'false' : 'true');
  }, [showIntro]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        handleClose();
      }
    };

    // Delay to prevent immediate close
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-menu" ref={menuRef}>
      <div className="settings-header">
        <h3>Settings</h3>
        <button className="settings-close" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className="settings-content">
        {/* Music Toggle */}
        <div className="setting-row">
          <div className="setting-info">
            <svg className="setting-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span>Background Music</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={musicEnabled}
              onChange={onMusicToggle}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* SFX Toggle */}
        <div className="setting-row">
          <div className="setting-info">
            <svg className="setting-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            <span>Sound Effects</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={sfxEnabled}
              onChange={onSfxToggle}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Intro Screen Toggle */}
        <div className="setting-row">
          <div className="setting-info">
            <svg className="setting-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2v-4h4v-2h-4V7h-2v4H8v2h4z" />
            </svg>
            <span>Show Intro Screen</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showIntro}
              onChange={handleIntroToggle}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-footer">
        <span className="version">v1.0.0</span>
      </div>
    </div>
  );
};

export default SettingsMenu;
