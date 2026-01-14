/**
 * LES WOLFS 86 - Cell Component
 * Clean Le Bandit style - NO visible borders, subtle backgrounds
 */
import React, { useRef, useEffect, useState } from 'react';
import { Container, Graphics, Text, Sprite } from '@pixi/react';
import { TextStyle, Texture } from 'pixi.js';
import gsap from 'gsap';
import { CELL_SIZE, CELL_GAP, SYMBOLS, MULTIPLIER_COLORS } from '../../config/gameConfig';

// Symbol to image mapping (with cache buster)
const CACHE_VERSION = 'v11';
const SYMBOL_IMAGES = {
  'WR': `/symbols/wolf_red.png?${CACHE_VERSION}`,
  'WB': `/symbols/wolf_black.png?${CACHE_VERSION}`,
  'WP': `/symbols/wolf_purple.png?${CACHE_VERSION}`,
  'WG': `/symbols/wolf_gray.png?${CACHE_VERSION}`,
  'W6': `/symbols/wolf_green.png?${CACHE_VERSION}`,
  'WS': `/symbols/wolf_spirit.png?${CACHE_VERSION}`,
  'HC': `/symbols/hat_cap.png?${CACHE_VERSION}`,
  'HS': `/symbols/hat_steam.png?${CACHE_VERSION}`,
  'HW': `/symbols/hat_straw.png?${CACHE_VERSION}`,
  'HK': `/symbols/hat_peacock.png?${CACHE_VERSION}`,
  'SC': `/symbols/scatter_gold.jpg?${CACHE_VERSION}`,
  'WD': `/symbols/crown_matrix.png?${CACHE_VERSION}`,
};

// Preload textures
const symbolTextures = {};
Object.entries(SYMBOL_IMAGES).forEach(([id, path]) => {
  try {
    symbolTextures[id] = Texture.from(path);
  } catch (e) {
    console.warn(`Failed to load texture for ${id}`);
  }
});

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
  isSpinning = false,
  wildMultiplierTarget = null,
  onWildMultiplierComplete = null,
}) => {
  const containerRef = useRef(null);
  const [animatedAlpha, setAnimatedAlpha] = useState(symbol ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const prevSymbolRef = useRef(symbol);

  const [wildSpinningMultiplier, setWildSpinningMultiplier] = useState(null);
  const wildMultiplierIntervalRef = useRef(null);

  // Position with configured gap
  const x = col * (CELL_SIZE + CELL_GAP);
  const y = row * (CELL_SIZE + CELL_GAP);

  // Spinning state - smooth transition
  const [spinRotation, setSpinRotation] = useState(0);
  const spinAnimRef = useRef(null);

  useEffect(() => {
    if (isSpinning) {
      // Smooth fade out when starting spin
      const anim = { alpha: animatedAlpha, rotation: 0 };
      gsap.to(anim, {
        alpha: 0.2,
        duration: 0.15,
        ease: 'power2.out',
        onUpdate: () => setAnimatedAlpha(anim.alpha),
      });

      // Continuous rotation during spin for slot machine effect
      spinAnimRef.current = gsap.to(anim, {
        rotation: 360,
        duration: 0.3,
        repeat: -1,
        ease: 'linear',
        onUpdate: () => setSpinRotation(anim.rotation),
      });
    } else {
      // Stop spin animation
      if (spinAnimRef.current) {
        spinAnimRef.current.kill();
        spinAnimRef.current = null;
      }
      setSpinRotation(0);

      // Smooth fade in when symbol appears
      if (symbol) {
        const anim = { alpha: animatedAlpha };
        gsap.to(anim, {
          alpha: 1,
          duration: 0.2,
          ease: 'power2.out',
          onUpdate: () => setAnimatedAlpha(anim.alpha),
        });
      }
    }

    return () => {
      if (spinAnimRef.current) {
        spinAnimRef.current.kill();
      }
    };
  }, [isSpinning, symbol]);

  // Wild multiplier animation
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
            onWildMultiplierComplete?.(wildMultiplierTarget);
          }, 500);
        }
      };

      wildMultiplierIntervalRef.current = setTimeout(animate, 50);
      return () => clearTimeout(wildMultiplierIntervalRef.current);
    } else {
      setWildSpinningMultiplier(null);
    }
  }, [wildMultiplierTarget, symbol, onWildMultiplierComplete]);

  const displaySymbol = isSpinning ? null : symbol;
  const symbolTexture = displaySymbol ? symbolTextures[displaySymbol] : null;
  const glowColor = multiplier > 1 ? MULTIPLIER_COLORS[multiplier] : null;

  // New symbol animation
  useEffect(() => {
    if (isNew && symbol) {
      const anim = { alpha: 0, scale: 0.3, offsetY: -25 };
      gsap.to(anim, {
        alpha: 1,
        scale: 1,
        offsetY: 0,
        duration: 0.3,
        ease: 'back.out(1.2)',
        onUpdate: () => {
          setAnimatedAlpha(anim.alpha);
          setAnimatedScale(anim.scale);
          setOffsetY(anim.offsetY);
        },
      });
    }
  }, [isNew, symbol]);

  // Remove animation
  useEffect(() => {
    if (isRemoving) {
      const anim = { alpha: animatedAlpha, scale: animatedScale };
      gsap.to(anim, {
        alpha: 0,
        scale: 0.2,
        duration: 0.2,
        ease: 'power2.in',
        onUpdate: () => {
          setAnimatedAlpha(anim.alpha);
          setAnimatedScale(anim.scale);
        },
      });
    }
  }, [isRemoving]);

  // Symbol change
  useEffect(() => {
    if (symbol && symbol !== prevSymbolRef.current && !isNew) {
      setAnimatedAlpha(1);
      setAnimatedScale(1);
      setOffsetY(0);
    }
    prevSymbolRef.current = symbol;
  }, [symbol, isNew]);

  // Win animation
  const [winExplosion, setWinExplosion] = useState({ scale: 1, flash: 0 });
  useEffect(() => {
    if (isWinning && containerRef.current) {
      const anim = { scale: 1, flash: 0 };
      gsap.timeline()
        .to(anim, {
          scale: 1.2,
          flash: 1,
          duration: 0.1,
          ease: 'power2.out',
          onUpdate: () => setWinExplosion({ scale: anim.scale, flash: anim.flash }),
        })
        .to(anim, {
          scale: 1,
          flash: 0,
          duration: 0.18,
          ease: 'elastic.out(1, 0.5)',
          onUpdate: () => setWinExplosion({ scale: anim.scale, flash: anim.flash }),
          onComplete: () => setWinExplosion({ scale: 1, flash: 0 }),
        });
    }
  }, [isWinning]);

  // Explosion glow
  const [explosionGlow, setExplosionGlow] = useState(0);
  useEffect(() => {
    if (isExploding) {
      const anim = { scale: 1, glow: 0 };
      gsap.timeline()
        .to(anim, {
          scale: 1.15,
          glow: 1,
          duration: 0.12,
          ease: 'power2.out',
          onUpdate: () => {
            setAnimatedScale(anim.scale);
            setExplosionGlow(anim.glow);
          },
        })
        .to(anim, {
          scale: 1,
          glow: 0,
          duration: 0.25,
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

  // Draw cell - Premium dark design with subtle depth
  const drawCell = (g) => {
    g.clear();

    // Checkerboard background - dark rich tones
    const isEven = (row + col) % 2 === 0;
    const bgColor = isEven ? 0x1a1612 : 0x141210;

    // Main cell background
    g.beginFill(bgColor);
    g.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    g.endFill();

    // Subtle inner border for depth
    g.lineStyle(1, 0x2a2420, 0.5);
    g.drawRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // Winning highlight - golden glow
    if (isWinning) {
      g.beginFill(0xf5d742, 0.3);
      g.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
      g.endFill();
      // Add border glow
      g.lineStyle(2, 0xf5d742, 0.6);
      g.drawRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    // Multiplier glow
    if (multiplier > 1 && glowColor) {
      g.beginFill(glowColor, 0.25);
      g.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
      g.endFill();
      g.lineStyle(2, glowColor, 0.5);
      g.drawRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    // Explosion glow
    if (explosionGlow > 0) {
      g.beginFill(0xf5d742, explosionGlow * 0.4);
      g.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
      g.endFill();
    }
  };

  const multStyle = new TextStyle({
    fontFamily: 'Arial Black, sans-serif',
    fontSize: 24,
    fontWeight: 'bold',
    fill: '#ffffff',
    stroke: glowColor ? `#${glowColor.toString(16).padStart(6, '0')}` : '#f5d742',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: glowColor ? `#${glowColor.toString(16).padStart(6, '0')}` : '#f5d742',
    dropShadowBlur: 15,
    dropShadowDistance: 0,
  });

  // Symbol size - ALL symbols contained within cell
  const isWild = displaySymbol === 'WD';
  const isScatter = displaySymbol === 'SC';

  // Symbols fill most of the cell for premium feel
  const spriteSize = CELL_SIZE - 8;

  // Falling symbols animation during spin
  const [fallOffset, setFallOffset] = useState(0);
  const [spinSymbols] = useState(() => {
    // Random symbols for spinning effect
    const allSymbols = Object.keys(SYMBOL_IMAGES);
    return [
      allSymbols[Math.floor(Math.random() * allSymbols.length)],
      allSymbols[Math.floor(Math.random() * allSymbols.length)],
      allSymbols[Math.floor(Math.random() * allSymbols.length)],
    ];
  });

  useEffect(() => {
    if (isSpinning) {
      let offset = 0;
      let lastTime = 0;
      const speed = 10; // Perfect speed

      const animate = (time) => {
        if (time - lastTime > 16) { // ~60fps cap
          offset = (offset + speed) % (CELL_SIZE * 2);
          setFallOffset(offset);
          lastTime = time;
        }
        if (isSpinning) {
          requestAnimationFrame(animate);
        }
      };
      const animId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animId);
    } else {
      setFallOffset(0);
    }
  }, [isSpinning]);

  return (
    <Container x={x} y={y} ref={containerRef}>
      <Graphics draw={drawCell} />

      {/* Falling symbols during spin */}
      {isSpinning && spinSymbols.map((sym, idx) => {
        const yOffset = (fallOffset + idx * CELL_SIZE * 0.7) % (CELL_SIZE * 2) - CELL_SIZE * 0.5;
        const alpha = yOffset > 0 && yOffset < CELL_SIZE ? 0.7 : 0.3;
        const symTexture = symbolTextures[sym];
        if (!symTexture) return null;
        return (
          <Sprite
            key={idx}
            texture={symTexture}
            x={CELL_SIZE / 2}
            y={yOffset + CELL_SIZE / 2}
            anchor={0.5}
            width={spriteSize * 0.8}
            height={spriteSize * 0.8}
            alpha={alpha}
          />
        );
      })}

      {displaySymbol && (
        <Container
          x={CELL_SIZE / 2}
          y={CELL_SIZE / 2 + offsetY}
          alpha={animatedAlpha}
          scale={animatedScale * winExplosion.scale}
        >
          {symbolTexture ? (
            <>
              <Sprite
                texture={symbolTexture}
                x={-spriteSize / 2}
                y={-spriteSize / 2}
                width={spriteSize}
                height={spriteSize}
              />
              {/* WILD badge - large and very prominent */}
              {isWild && !wildSpinningMultiplier && (
                <>
                  {/* Large glow behind everything */}
                  <Graphics
                    draw={(g) => {
                      g.clear();
                      // Outer glow
                      g.beginFill(0x00ff66, 0.2);
                      g.drawCircle(0, 0, spriteSize * 0.55);
                      g.endFill();
                    }}
                  />
                  {/* Prominent pill badge */}
                  <Graphics
                    draw={(g) => {
                      g.clear();
                      // Background pill
                      g.beginFill(0x000000, 0.9);
                      g.drawRoundedRect(-34, spriteSize / 2 - 22, 68, 28, 8);
                      g.endFill();
                      // Glowing border
                      g.lineStyle(3, 0x00ff66, 1);
                      g.drawRoundedRect(-34, spriteSize / 2 - 22, 68, 28, 8);
                    }}
                  />
                  <Text
                    text="WILD"
                    x={0}
                    y={spriteSize / 2 - 8}
                    anchor={0.5}
                    style={new TextStyle({
                      fontFamily: 'Arial Black',
                      fontSize: 20,
                      fontWeight: 'bold',
                      fill: '#00ff66',
                      stroke: '#000000',
                      strokeThickness: 5,
                      dropShadow: true,
                      dropShadowColor: '#00ff66',
                      dropShadowBlur: 12,
                      dropShadowDistance: 0,
                    })}
                  />
                </>
              )}
              {/* FS badge at bottom of scatter - prominent */}
              {isScatter && (
                <>
                  <Graphics
                    draw={(g) => {
                      g.clear();
                      g.beginFill(0x000000, 0.9);
                      g.drawRoundedRect(-22, spriteSize / 2 - 20, 44, 24, 6);
                      g.endFill();
                      g.lineStyle(2, 0xf5d742, 1);
                      g.drawRoundedRect(-22, spriteSize / 2 - 20, 44, 24, 6);
                    }}
                  />
                  <Text
                    text="FS"
                    x={0}
                    y={spriteSize / 2 - 8}
                    anchor={0.5}
                    style={new TextStyle({
                      fontFamily: 'Arial Black',
                      fontSize: 16,
                      fontWeight: 'bold',
                      fill: '#f5d742',
                      stroke: '#000000',
                      strokeThickness: 4,
                      dropShadow: true,
                      dropShadowColor: '#f5d742',
                      dropShadowBlur: 8,
                      dropShadowDistance: 0,
                    })}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Graphics
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x555555, 0.8);
                  g.drawRoundedRect(-spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize, 4);
                  g.endFill();
                }}
              />
              <Text
                text={displaySymbol}
                x={0}
                y={0}
                anchor={0.5}
                style={new TextStyle({
                  fontFamily: 'Arial Black',
                  fontSize: 14,
                  fill: '#ffffff',
                })}
              />
            </>
          )}

          {/* Wild multiplier spinner */}
          {displaySymbol === 'WD' && wildSpinningMultiplier && (
            <Container>
              <Graphics
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x000000, 0.85);
                  g.drawRoundedRect(-18, -10, 36, 20, 4);
                  g.endFill();
                }}
              />
              <Text
                text={`x${wildSpinningMultiplier}`}
                x={0}
                y={0}
                anchor={0.5}
                style={new TextStyle({
                  fontFamily: 'Arial Black',
                  fontSize: 12,
                  fill: '#f5d742',
                  stroke: '#000000',
                  strokeThickness: 2,
                })}
              />
            </Container>
          )}

          {/* Win flash */}
          {winExplosion.flash > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                g.beginFill(0xf5d742, winExplosion.flash * 0.35);
                g.drawCircle(0, 0, spriteSize * 0.45);
                g.endFill();
              }}
            />
          )}
        </Container>
      )}

      {/* Multiplier badge - large and centered at bottom */}
      {multiplier > 1 && (
        <>
          <Graphics
            draw={(g) => {
              g.clear();
              // Large background pill centered
              const badgeW = 55;
              const badgeH = 28;
              const badgeX = (CELL_SIZE - badgeW) / 2;
              const badgeY = CELL_SIZE - badgeH - 4;
              g.beginFill(0x000000, 0.9);
              g.drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 8);
              g.endFill();
              // Thick glow border
              g.lineStyle(3, glowColor || 0xf5d742, 1);
              g.drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 8);
            }}
          />
          <Text
            text={`x${multiplier}`}
            x={CELL_SIZE / 2}
            y={CELL_SIZE - 18}
            anchor={0.5}
            style={multStyle}
          />
        </>
      )}
    </Container>
  );
};

export default Cell;
