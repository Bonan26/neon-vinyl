/**
 * LES WOLFS 86 - Game Stage
 * Clean compact design inspired by "Le Bandit" (Hacksaw Gaming)
 * Contains the grid with smooth GSAP animations
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Stage, Container, Graphics, Text } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import Grid from './Grid';
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '../../config/gameConfig';
import useGameStore from '../../stores/gameStore';
import assetService from '../../services/assetService';

// Calculate grid position (centered)
const GRID_X = (STAGE_WIDTH - GRID_WIDTH) / 2;
const GRID_Y = (STAGE_HEIGHT - GRID_HEIGHT) / 2;

const GameStage = ({ onSpriteReady }) => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Store state
  const isSpinning = useGameStore((state) => state.isSpinning);

  // Load assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      await assetService.initialize();
      setAssetsLoaded(true);
    };
    loadAssets();
  }, []);

  // Draw clean dark background
  const drawBackground = useCallback((g) => {
    g.clear();

    // Main background - dark brown
    g.beginFill(0x1a1814);
    g.drawRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    g.endFill();

    // Subtle corner glows
    const glowSpots = [
      { x: 25, y: 25, color: 0x3a2a1a, radius: 100, alpha: 0.25 },
      { x: STAGE_WIDTH - 25, y: 25, color: 0x3a2a1a, radius: 80, alpha: 0.2 },
      { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT - 25, color: 0x3a2a1a, radius: 120, alpha: 0.18 },
    ];

    glowSpots.forEach((spot) => {
      for (let i = 4; i > 0; i--) {
        g.beginFill(spot.color, spot.alpha * (i / 4));
        g.drawCircle(spot.x, spot.y, spot.radius * (i / 4));
        g.endFill();
      }
    });
  }, []);

  // Draw grid frame - NO border, just subtle shadow
  const drawGridFrame = useCallback((g) => {
    g.clear();

    // Very subtle outer shadow only
    g.beginFill(0x000000, 0.15);
    g.drawRoundedRect(GRID_X - 3, GRID_Y - 3, GRID_WIDTH + 6, GRID_HEIGHT + 6, 4);
    g.endFill();
  }, []);

  // Loading style
  const loadingStyle = new TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    fill: '#c4a060',
    letterSpacing: 3,
  });

  // Spinning indicator style
  const spinningStyle = new TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
    fontWeight: 'bold',
    fill: '#6a6050',
    letterSpacing: 2,
  });

  // Loading state
  if (!assetsLoaded) {
    return (
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        options={{ backgroundColor: 0x1a1814, antialias: true }}
      >
        <Graphics draw={drawBackground} />
        <Text
          text="CHARGEMENT..."
          x={STAGE_WIDTH / 2}
          y={STAGE_HEIGHT / 2}
          anchor={0.5}
          style={loadingStyle}
        />
      </Stage>
    );
  }

  return (
    <Stage
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      options={{
        backgroundColor: 0x1a1814,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      }}
    >
      {/* Background */}
      <Graphics draw={drawBackground} />

      {/* Grid Frame */}
      <Graphics draw={drawGridFrame} />

      {/* Game Grid */}
      <Grid x={GRID_X} y={GRID_Y} onSpriteReady={onSpriteReady} />

      {/* Spinning Indicator */}
      {isSpinning && (
        <Text
          text="..."
          x={STAGE_WIDTH / 2}
          y={STAGE_HEIGHT - 8}
          anchor={0.5}
          style={spinningStyle}
        />
      )}
    </Stage>
  );
};

export default GameStage;
