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

  // Draw background with vibrant ambient glow
  const drawBackground = useCallback((g) => {
    g.clear();

    // Rich purple gradient background
    g.beginFill(0x0d0518);
    g.drawRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    g.endFill();

    // Subtle grid pattern
    g.lineStyle(1, 0x2a1040, 0.3);
    for (let i = 0; i < STAGE_WIDTH; i += 40) {
      g.moveTo(i, 0);
      g.lineTo(i, STAGE_HEIGHT);
    }
    for (let j = 0; j < STAGE_HEIGHT; j += 40) {
      g.moveTo(0, j);
      g.lineTo(STAGE_WIDTH, j);
    }

    // Vibrant ambient glow spots (neon atmosphere)
    const glowSpots = [
      { x: 60, y: 60, color: 0xff00ff, radius: 200, alpha: 0.15 },
      { x: STAGE_WIDTH - 60, y: 100, color: 0x00ffff, radius: 180, alpha: 0.15 },
      { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT - 60, color: 0xbf00ff, radius: 220, alpha: 0.12 },
      { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2, color: 0xff00ff, radius: 350, alpha: 0.06 },
      { x: 100, y: STAGE_HEIGHT - 100, color: 0xffd700, radius: 150, alpha: 0.08 },
      { x: STAGE_WIDTH - 100, y: STAGE_HEIGHT - 150, color: 0x00ff88, radius: 140, alpha: 0.08 },
    ];

    glowSpots.forEach((spot) => {
      for (let i = 6; i > 0; i--) {
        g.beginFill(spot.color, spot.alpha * (i / 6));
        g.drawCircle(spot.x, spot.y, spot.radius * (i / 6));
        g.endFill();
      }
    });
  }, []);

  // Draw title banner
  const drawTitleBanner = useCallback((g) => {
    g.clear();

    // Outer glow
    g.beginFill(0xff00ff, 0.1);
    g.drawRoundedRect(STAGE_WIDTH / 2 - 190, 6, 380, 64, 16);
    g.endFill();

    // Title background with gradient effect
    g.beginFill(0x1a0a2e, 0.9);
    g.lineStyle(3, 0xff00ff, 0.8);
    g.drawRoundedRect(STAGE_WIDTH / 2 - 180, 12, 360, 54, 14);
    g.endFill();

    // Inner highlight
    g.beginFill(0x2d1050, 0.4);
    g.drawRoundedRect(STAGE_WIDTH / 2 - 174, 16, 348, 20, 10);
    g.endFill();

    // Inner glow line
    g.lineStyle(2, 0x00ffff, 0.5);
    g.drawRoundedRect(STAGE_WIDTH / 2 - 174, 16, 348, 46, 12);
  }, []);

  // Draw tumble/multiplier info
  const drawInfoPanel = useCallback((g) => {
    g.clear();

    if (tumbleCount === 0 && maxMultiplier <= 1) return;

    // Info panel background - more vibrant
    g.beginFill(0x1a0a2e, 0.95);
    g.lineStyle(2, 0xff00ff, 0.5);
    g.drawRoundedRect(GRID_X + GRID_WIDTH + 15, GRID_Y, 100, 60, 10);
    g.endFill();

    // Inner highlight
    g.beginFill(0x2d1050, 0.3);
    g.drawRoundedRect(GRID_X + GRID_WIDTH + 18, GRID_Y + 3, 94, 20, 7);
    g.endFill();
  }, [tumbleCount, maxMultiplier]);

  // Text styles
  const titleStyle = new TextStyle({
    fontFamily: 'Orbitron, monospace',
    fontSize: 30,
    fontWeight: 'bold',
    fill: ['#ff66ff', '#ffffff', '#00ffff'],
    fillGradientStops: [0, 0.5, 1],
    dropShadow: true,
    dropShadowColor: '#ff00ff',
    dropShadowBlur: 20,
    dropShadowDistance: 0,
  });

  const subtitleStyle = new TextStyle({
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 8,
    fill: '#ffd700',
    dropShadow: true,
    dropShadowColor: '#ff9900',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
  });

  const infoLabelStyle = new TextStyle({
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 11,
    fontWeight: 'bold',
    fill: '#a080c0',
    letterSpacing: 1,
  });

  const infoValueStyle = new TextStyle({
    fontFamily: 'Orbitron, monospace',
    fontSize: 16,
    fontWeight: 'bold',
    fill: '#00ffff',
    dropShadow: true,
    dropShadowColor: '#00ffff',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
  });

  const spinningStyle = new TextStyle({
    fontFamily: 'Orbitron, monospace',
    fontSize: 14,
    fontWeight: 'bold',
    fill: '#00ffff',
    letterSpacing: 4,
    dropShadow: true,
    dropShadowColor: '#00ffff',
    dropShadowBlur: 10,
    dropShadowDistance: 0,
  });

  // Loading state
  if (!assetsLoaded) {
    return (
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        options={{ backgroundColor: 0x0d0518, antialias: true }}
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
        backgroundColor: 0x0d0518,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      }}
    >
      {/* Background with ambient glow */}
      <Graphics draw={drawBackground} />

      {/* Title Banner */}
      <Graphics draw={drawTitleBanner} />
      <Text
        text="WOLFIE"
        x={STAGE_WIDTH / 2}
        y={28}
        anchor={[0.5, 0]}
        style={titleStyle}
      />
      <Text
        text="GROOVE"
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
