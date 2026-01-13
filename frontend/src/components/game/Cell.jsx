/**
 * LES WOLFS 86 - Cell Component
 * Clean, minimalist design inspired by "Le Bandit"
 * Uses wolf/hat images with smooth GSAP animations
 */
import React, { useRef, useEffect, useState } from 'react';
import { Container, Graphics, Text, Sprite } from '@pixi/react';
import { TextStyle, Texture } from 'pixi.js';
import gsap from 'gsap';
import { CELL_SIZE, SYMBOLS, MULTIPLIER_COLORS } from '../../config/gameConfig';
import useGameStore from '../../stores/gameStore';

// Symbol to image mapping
const SYMBOL_IMAGES = {
  // Wolves (high/mid tier)
  'WR': '/symbols/wolf_red.png',
  'WB': '/symbols/wolf_black.png',
  'WP': '/symbols/wolf_purple.png',
  'WG': '/symbols/wolf_gray.png',
  'W6': '/symbols/wolf_green.png',
  'WS': '/symbols/wolf_spirit.png',
  // Hats (low tier)
  'HC': '/symbols/hat_cap.png',
  'HS': '/symbols/hat_steampunk.png',
  'HW': '/symbols/hat_straw.png',
  'HK': '/symbols/hat_peacock.png',
  // Special
  'SC': '/symbols/scatter_gold.jpg',
  'WD': '/symbols/crown_matrix.png',
};

// Preload symbol textures
const symbolTextures = {};
Object.entries(SYMBOL_IMAGES).forEach(([id, path]) => {
  try {
    symbolTextures[id] = Texture.from(path);
  } catch (e) {
    console.warn(`Failed to load texture for ${id}`);
  }
});

// Multiplier values for wild wheel animation
const WILD_MULTIPLIERS = [2, 4, 8, 16, 32, 64, 128, 256];

const Cell = ({
  row,
  col,
  symbol,
  multiplier = 1,
  isWinning = false,
  isRemoving = false,
  isNew = false,
  isExploding = false,
  isPendingReveal = false,
  isSpinning = false,
  wildMultiplierTarget = null,
  onWildMultiplierComplete = null,
}) => {
  const containerRef = useRef(null);
  const [animatedAlpha, setAnimatedAlpha] = useState(symbol ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const prevSymbolRef = useRef(symbol);

  // Wild multiplier spinning animation state
  const [wildSpinningMultiplier, setWildSpinningMultiplier] = useState(null);
  const wildMultiplierIntervalRef = useRef(null);

  // Get suspense mode from store
  const suspenseMode = useGameStore((state) => state.suspenseMode);

  // Calculate position
  const x = col * (CELL_SIZE + 4);
  const y = row * (CELL_SIZE + 4);

  // Spinning state - show empty cell
  useEffect(() => {
    if (isSpinning) {
      setAnimatedAlpha(0.3);
    } else if (symbol) {
      setAnimatedAlpha(1);
    }
  }, [isSpinning, symbol]);

  // Wild multiplier spinning animation
  useEffect(() => {
    if (wildMultiplierTarget !== null && symbol === 'WD') {
      let spinCount = 0;
      const maxSpins = 20 + Math.floor(Math.random() * 10);
      let currentIndex = 0;

      const animate = () => {
        spinCount++;
        currentIndex = (currentIndex + 1) % WILD_MULTIPLIERS.length;
        setWildSpinningMultiplier(WILD_MULTIPLIERS[currentIndex]);

        if (spinCount < maxSpins) {
          const progress = spinCount / maxSpins;
          const delay = 50 + Math.pow(progress, 2) * 200;
          wildMultiplierIntervalRef.current = setTimeout(animate, delay);
        } else {
          setWildSpinningMultiplier(wildMultiplierTarget);
          setTimeout(() => {
            setWildSpinningMultiplier(null);
            if (onWildMultiplierComplete) {
              onWildMultiplierComplete(wildMultiplierTarget);
            }
          }, 500);
        }
      };

      wildMultiplierIntervalRef.current = setTimeout(animate, 50);

      return () => {
        if (wildMultiplierIntervalRef.current) {
          clearTimeout(wildMultiplierIntervalRef.current);
        }
      };
    } else {
      setWildSpinningMultiplier(null);
    }
  }, [wildMultiplierTarget, symbol, onWildMultiplierComplete]);

  const displaySymbol = isSpinning ? null : symbol;
  const symbolTexture = displaySymbol ? symbolTextures[displaySymbol] : null;
  const glowColor = multiplier > 1 ? MULTIPLIER_COLORS[multiplier] : null;

  // Animation: new symbol appearing
  useEffect(() => {
    if (isNew && symbol) {
      const anim = { alpha: 0, scale: 0.3, offsetY: -40 };
      gsap.to(anim, {
        alpha: 1,
        scale: 1,
        offsetY: 0,
        duration: 0.4,
        ease: 'back.out(1.5)',
        onUpdate: () => {
          setAnimatedAlpha(anim.alpha);
          setAnimatedScale(anim.scale);
          setOffsetY(anim.offsetY);
        },
      });
    }
  }, [isNew, symbol]);

  // Animation: symbol removing
  useEffect(() => {
    if (isRemoving) {
      const anim = { alpha: animatedAlpha, scale: animatedScale };
      gsap.to(anim, {
        alpha: 0,
        scale: 0.2,
        duration: 0.3,
        ease: 'power2.in',
        onUpdate: () => {
          setAnimatedAlpha(anim.alpha);
          setAnimatedScale(anim.scale);
        },
      });
    }
  }, [isRemoving]);

  // Symbol change animation
  useEffect(() => {
    if (symbol && symbol !== prevSymbolRef.current && !isNew) {
      setAnimatedAlpha(1);
      setAnimatedScale(1);
      setOffsetY(0);
    }
    prevSymbolRef.current = symbol;
  }, [symbol, isNew]);

  // Win explosion state
  const [winExplosion, setWinExplosion] = useState({ scale: 1, rotation: 0, flash: 0 });

  // Winning animation
  useEffect(() => {
    if (isWinning && containerRef.current) {
      const anim = { scale: 1, rotation: 0, flash: 0 };
      gsap.timeline()
        .to(anim, {
          scale: 1.3,
          flash: 1,
          duration: 0.15,
          ease: 'power2.out',
          onUpdate: () => setWinExplosion({ scale: anim.scale, rotation: anim.rotation, flash: anim.flash }),
        })
        .to(anim, {
          scale: 1,
          flash: 0,
          duration: 0.25,
          ease: 'elastic.out(1, 0.5)',
          onUpdate: () => setWinExplosion({ scale: anim.scale, rotation: anim.rotation, flash: anim.flash }),
          onComplete: () => setWinExplosion({ scale: 1, rotation: 0, flash: 0 }),
        });
    }
  }, [isWinning]);

  // Explosion glow state
  const [explosionGlow, setExplosionGlow] = useState(0);
  useEffect(() => {
    if (isExploding) {
      const anim = { scale: 1, glow: 0 };
      gsap.timeline()
        .to(anim, {
          scale: 1.3,
          glow: 1,
          duration: 0.2,
          ease: 'power2.out',
          onUpdate: () => {
            setAnimatedScale(anim.scale);
            setExplosionGlow(anim.glow);
          },
        })
        .to(anim, {
          scale: 1,
          glow: 0,
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)',
          onUpdate: () => {
            setAnimatedScale(anim.scale);
            setExplosionGlow(anim.glow);
          },
        });
    }
  }, [isExploding]);

  // Reset visibility
  useEffect(() => {
    if (symbol && !isRemoving && !isNew) {
      setAnimatedAlpha(1);
    } else if (!symbol) {
      setAnimatedAlpha(0);
    }
  }, [symbol, isRemoving, isNew]);

  // Draw cell background - Clean dark style like "Le Bandit"
  const drawCell = (g) => {
    g.clear();

    // Dark cell background - clean gray/brown tones
    g.beginFill(0x3d3d3d, 0.95);
    g.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 6);
    g.endFill();

    // Subtle inner shadow at top
    g.beginFill(0x4a4a4a, 0.4);
    g.drawRoundedRect(2, 2, CELL_SIZE - 4, 8, 4);
    g.endFill();

    // Simple border
    const borderColor = isWinning ? 0xf5d742 : 0x2a2a2a;
    g.lineStyle(isWinning ? 3 : 2, borderColor, 1);
    g.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 6);

    // Winning glow - golden
    if (isWinning) {
      g.lineStyle(4, 0xf5d742, 0.6);
      g.drawRoundedRect(-2, -2, CELL_SIZE + 4, CELL_SIZE + 4, 8);
    }

    // Multiplier glow
    if (multiplier > 1 && glowColor) {
      g.beginFill(glowColor, 0.15);
      g.drawRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
      g.endFill();
      g.lineStyle(3, glowColor, 0.9);
      g.drawRoundedRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
    }

    // Explosion glow - golden
    if (explosionGlow > 0) {
      g.lineStyle(6, 0xf5d742, explosionGlow);
      g.drawRoundedRect(-3, -3, CELL_SIZE + 6, CELL_SIZE + 6, 9);
      g.lineStyle(10, 0xf5d742, explosionGlow * 0.5);
      g.drawRoundedRect(-6, -6, CELL_SIZE + 12, CELL_SIZE + 12, 12);
    }
  };

  // Multiplier text style - clean
  const multStyle = new TextStyle({
    fontFamily: 'Arial Black, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    fill: glowColor ? `#${glowColor.toString(16).padStart(6, '0')}` : '#f5d742',
    stroke: '#000000',
    strokeThickness: 3,
  });

  const spriteSize = CELL_SIZE - 10;

  return (
    <Container x={x} y={y} ref={containerRef}>
      {/* Cell background */}
      <Graphics draw={drawCell} />

      {/* Symbol */}
      {displaySymbol && (
        <Container
          x={CELL_SIZE / 2}
          y={CELL_SIZE / 2 + offsetY}
          alpha={animatedAlpha}
          scale={animatedScale * winExplosion.scale}
          rotation={winExplosion.rotation}
        >
          {/* Symbol image */}
          {symbolTexture ? (
            <Sprite
              texture={symbolTexture}
              x={-spriteSize / 2}
              y={-spriteSize / 2}
              width={spriteSize}
              height={spriteSize}
            />
          ) : (
            // Fallback: colored placeholder
            <>
              <Graphics
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x666666, 0.8);
                  g.drawRoundedRect(-spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize, 6);
                  g.endFill();
                }}
              />
              <Text
                text={displaySymbol}
                x={0}
                y={0}
                anchor={0.5}
                style={new TextStyle({
                  fontFamily: 'Arial Black, sans-serif',
                  fontSize: 18,
                  fontWeight: 'bold',
                  fill: '#ffffff',
                })}
              />
            </>
          )}

          {/* Wild multiplier spinning text */}
          {displaySymbol === 'WD' && wildSpinningMultiplier && (
            <Container>
              <Graphics
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x000000, 0.8);
                  g.drawRoundedRect(-25, -15, 50, 30, 6);
                  g.endFill();
                }}
              />
              <Text
                text={`x${wildSpinningMultiplier}`}
                x={0}
                y={0}
                anchor={0.5}
                style={new TextStyle({
                  fontFamily: 'Arial Black, sans-serif',
                  fontSize: 16,
                  fontWeight: 'bold',
                  fill: '#f5d742',
                  stroke: '#000000',
                  strokeThickness: 2,
                })}
              />
            </Container>
          )}

          {/* Win flash overlay */}
          {winExplosion.flash > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                g.beginFill(0xf5d742, winExplosion.flash * 0.5);
                g.drawCircle(0, 0, spriteSize * 0.6);
                g.endFill();
              }}
            />
          )}
        </Container>
      )}

      {/* Multiplier badge */}
      {multiplier > 1 && (
        <Text
          text={`x${multiplier}`}
          x={CELL_SIZE - 4}
          y={CELL_SIZE - 4}
          anchor={[1, 1]}
          style={multStyle}
        />
      )}
    </Container>
  );
};

export default Cell;
