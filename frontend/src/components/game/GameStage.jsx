/**
 * NEON VINYL: GHOST GROOVES - Game Stage
 *
 * Main PixiJS stage with GSAP animation integration.
 * Contains the grid, win meter, and visual effects.
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Stage, Container, Graphics, Text } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import gsap from 'gsap';
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
const GRID_Y = (STAGE_HEIGHT - GRID_HEIGHT) / 2 + 30;

// Win meter position
const WIN_METER_Y = GRID_Y - 60;

const GameStage = ({ onSpriteReady }) => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Store state
  const maxMultiplier = useGameStore((state) => state.maxMultiplier);
  const tumbleCount = useGameStore((state) => state.tumbleCount);
  const isSpinning = useGameStore((state) => state.isSpinning);
  const isAnimating = useGameStore((state) => state.isAnimating);

  // Load assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      await assetService.initialize();
      setAssetsLoaded(true);
    };
    loadAssets();
  }, []);

  // Draw background with ambient glow
  const drawBackground = useCallback((g) => {
    g.clear();

    // Dark gradient background
    g.beginFill(0x0a0a12);
    g.drawRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    g.endFill();

    // Ambient glow spots (neon atmosphere)
    const glowSpots = [
      { x: 80, y: 80, color: 0xff00ff, radius: 180, alpha: 0.08 },
      { x: STAGE_WIDTH - 80, y: 120, color: 0x00ffff, radius: 160, alpha: 0.08 },
      { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT - 80, color: 0xbf00ff, radius: 200, alpha: 0.06 },
      { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2, color: 0x00ffff, radius: 300, alpha: 0.03 },
    ];

    glowSpots.forEach((spot) => {
      for (let i = 5; i > 0; i--) {
        g.beginFill(spot.color, spot.alpha * (i / 5));
        g.drawCircle(spot.x, spot.y, spot.radius * (i / 5));
        g.endFill();
      }
    });
  }, []);

  // Draw title banner
  const drawTitleBanner = useCallback((g) => {
    g.clear();

    // Title background
    g.beginFill(0x000000, 0.6);
    g.lineStyle(2, 0xff00ff, 0.6);
    g.drawRoundedRect(STAGE_WIDTH / 2 - 180, 12, 360, 54, 12);
    g.endFill();

    // Inner glow line
    g.lineStyle(1, 0x00ffff, 0.3);
    g.drawRoundedRect(STAGE_WIDTH / 2 - 176, 16, 352, 46, 10);
  }, []);

  // Draw tumble/multiplier info
  const drawInfoPanel = useCallback((g) => {
    g.clear();

    if (tumbleCount === 0 && maxMultiplier <= 1) return;

    // Info panel background
    g.beginFill(0x0a0a15, 0.9);
    g.lineStyle(1, 0x333366, 0.8);
    g.drawRoundedRect(GRID_X + GRID_WIDTH + 15, GRID_Y, 100, 60, 8);
    g.endFill();
  }, [tumbleCount, maxMultiplier]);

  // Text styles
  const titleStyle = new TextStyle({
    fontFamily: 'Orbitron, monospace',
    fontSize: 28,
    fontWeight: 'bold',
    fill: ['#ff00ff', '#00ffff'],
    fillGradientStops: [0, 1],
    dropShadow: true,
    dropShadowColor: '#ff00ff',
    dropShadowBlur: 12,
    dropShadowDistance: 0,
  });

  const subtitleStyle = new TextStyle({
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    letterSpacing: 6,
    fill: '#808090',
  });

  const infoLabelStyle = new TextStyle({
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fill: '#606080',
    letterSpacing: 1,
  });

  const infoValueStyle = new TextStyle({
    fontFamily: 'Orbitron, monospace',
    fontSize: 14,
    fontWeight: 'bold',
    fill: '#00ffff',
  });

  const spinningStyle = new TextStyle({
    fontFamily: 'Orbitron, monospace',
    fontSize: 14,
    fill: '#00ffff',
    letterSpacing: 3,
  });

  // Loading state
  if (!assetsLoaded) {
    return (
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        options={{ backgroundColor: 0x0a0a12, antialias: true }}
      >
        <Graphics draw={drawBackground} />
        <Text
          text="LOADING..."
          x={STAGE_WIDTH / 2}
          y={STAGE_HEIGHT / 2}
          anchor={0.5}
          style={new TextStyle({
            fontFamily: 'Orbitron, monospace',
            fontSize: 20,
            fill: '#00ffff',
            letterSpacing: 4,
          })}
        />
      </Stage>
    );
  }

  return (
    <Stage
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      options={{
        backgroundColor: 0x0a0a12,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      }}
    >
      {/* Background with ambient glow */}
      <Graphics draw={drawBackground} />

      {/* Title Banner */}
      <Graphics draw={drawTitleBanner} />
      <Text
        text="NEON VINYL"
        x={STAGE_WIDTH / 2}
        y={28}
        anchor={[0.5, 0]}
        style={titleStyle}
      />
      <Text
        text="GHOST GROOVES"
        x={STAGE_WIDTH / 2}
        y={52}
        anchor={[0.5, 0]}
        style={subtitleStyle}
      />

      {/* Game Grid */}
      <Grid x={GRID_X} y={GRID_Y} onSpriteReady={onSpriteReady} />

      {/* Info Panel (Tumble Count & Max Multiplier) */}
      <Graphics draw={drawInfoPanel} />
      {tumbleCount > 0 && (
        <>
          <Text
            text="TUMBLE"
            x={GRID_X + GRID_WIDTH + 25}
            y={GRID_Y + 8}
            style={infoLabelStyle}
          />
          <Text
            text={`${tumbleCount}`}
            x={GRID_X + GRID_WIDTH + 25}
            y={GRID_Y + 22}
            style={infoValueStyle}
          />
        </>
      )}
      {maxMultiplier > 1 && (
        <>
          <Text
            text="MAX MULT"
            x={GRID_X + GRID_WIDTH + 25}
            y={GRID_Y + 38}
            style={infoLabelStyle}
          />
          <Text
            text={`x${maxMultiplier}`}
            x={GRID_X + GRID_WIDTH + 25}
            y={GRID_Y + 52}
            style={new TextStyle({
              fontFamily: 'Orbitron, monospace',
              fontSize: 14,
              fontWeight: 'bold',
              fill: '#ff00ff',
            })}
          />
        </>
      )}

      {/* Spinning Indicator */}
      {isSpinning && (
        <Text
          text="SPINNING..."
          x={STAGE_WIDTH / 2}
          y={STAGE_HEIGHT - 25}
          anchor={0.5}
          style={spinningStyle}
        />
      )}

      {/* Animating Indicator */}
      {!isSpinning && isAnimating && (
        <Text
          text="..."
          x={STAGE_WIDTH / 2}
          y={STAGE_HEIGHT - 25}
          anchor={0.5}
          style={spinningStyle}
        />
      )}
    </Stage>
  );
};

export default GameStage;
