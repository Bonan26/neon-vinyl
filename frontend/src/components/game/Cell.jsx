/**
 * NEON VINYL: GHOST GROOVES - Cell Component
 * Uses actual symbol images with smooth GSAP animations
 */
import React, { useRef, useEffect, useState } from 'react';
import { Container, Graphics, Text, Sprite } from '@pixi/react';
import { TextStyle, Texture } from 'pixi.js';
import gsap from 'gsap';
import { CELL_SIZE, SYMBOLS, MULTIPLIER_COLORS } from '../../config/gameConfig';
import useGameStore from '../../stores/gameStore';

// Symbols that have actual image files (excluding WD and SC which are custom drawn)
const SYMBOLS_WITH_IMAGES = ['DJ', 'GV', 'HP', 'CS', 'NP', 'NB', 'NU'];

// Preload symbol textures only for existing images
const symbolTextures = {};
SYMBOLS_WITH_IMAGES.forEach(id => {
  try {
    symbolTextures[id] = Texture.from(`/assets/symbols/${id}.png`);
  } catch (e) {
    console.warn(`Failed to load texture for ${id}`);
  }
});

// Custom drawn symbols (Wild and Scatter)
const CUSTOM_DRAWN_SYMBOLS = ['WD', 'SC'];

// All available symbols for spinning animation (including SC)
const ALL_SYMBOLS_FOR_SPIN = ['DJ', 'GV', 'HP', 'CS', 'NP', 'NB', 'NU', 'SC'];

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
  isSpinning = false,  // Cell is spinning (showing cycling symbols)
  wildMultiplierTarget = null,  // Target multiplier for wild animation (null = not spinning)
  onWildMultiplierComplete = null, // Callback when wild multiplier animation completes
}) => {
  const containerRef = useRef(null);
  const [animatedAlpha, setAnimatedAlpha] = useState(symbol ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const prevSymbolRef = useRef(symbol);

  // Spinning animation state
  const [spinningSymbolIndex, setSpinningSymbolIndex] = useState(0);
  const spinIntervalRef = useRef(null);

  // Wild multiplier spinning animation state
  const [wildSpinningMultiplier, setWildSpinningMultiplier] = useState(null);
  const wildMultiplierIntervalRef = useRef(null);

  // Get suspense mode from store for enhanced scatter animations
  const suspenseMode = useGameStore((state) => state.suspenseMode);

  // Spinning animation - REMOVED colorful cycling, just show empty state
  useEffect(() => {
    if (isSpinning) {
      // Just keep alpha visible but don't cycle symbols
      setAnimatedAlpha(0.3);
    } else {
      // When not spinning, restore normal alpha if we have a symbol
      if (symbol) {
        setAnimatedAlpha(1);
      }
    }

    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
    };
  }, [isSpinning, symbol]);

  // Wild multiplier spinning animation - cycles through multipliers then lands on target
  useEffect(() => {
    if (wildMultiplierTarget !== null && symbol === 'WD') {
      // Start spinning through multipliers
      let spinCount = 0;
      const maxSpins = 20 + Math.floor(Math.random() * 10); // 20-30 cycles
      let currentIndex = 0;

      // Start fast, then slow down
      const animate = () => {
        spinCount++;
        currentIndex = (currentIndex + 1) % WILD_MULTIPLIERS.length;
        setWildSpinningMultiplier(WILD_MULTIPLIERS[currentIndex]);

        if (spinCount < maxSpins) {
          // Speed starts at 50ms and slows to 200ms near the end
          const progress = spinCount / maxSpins;
          const delay = 50 + Math.pow(progress, 2) * 200;
          wildMultiplierIntervalRef.current = setTimeout(animate, delay);
        } else {
          // Land on target
          setWildSpinningMultiplier(wildMultiplierTarget);
          // Call completion callback after brief pause
          setTimeout(() => {
            setWildSpinningMultiplier(null);
            if (onWildMultiplierComplete) {
              onWildMultiplierComplete(wildMultiplierTarget);
            }
          }, 500);
        }
      };

      // Start animation
      wildMultiplierIntervalRef.current = setTimeout(animate, 50);

      return () => {
        if (wildMultiplierIntervalRef.current) {
          clearTimeout(wildMultiplierIntervalRef.current);
          wildMultiplierIntervalRef.current = null;
        }
      };
    } else {
      setWildSpinningMultiplier(null);
    }
  }, [wildMultiplierTarget, symbol, onWildMultiplierComplete]);

  // Get the symbol to display (null when spinning, otherwise the actual symbol)
  const displaySymbol = isSpinning ? null : symbol;

  // Scatter animation state
  const [scatterAnim, setScatterAnim] = useState({ scale: 1, glow: 0, rotation: 0 });
  const scatterAnimRef = useRef(null);

  // Wild animation state
  const [wildAnim, setWildAnim] = useState({ scale: 1, glow: 0, rotation: 0, hue: 0 });
  const wildAnimRef = useRef(null);

  // Calculate position
  const x = col * (CELL_SIZE + 4);
  const y = row * (CELL_SIZE + 4);

  // Scatter continuous animation - gentle glow
  useEffect(() => {
    if (symbol === 'SC') {
      // Kill existing animation to rebuild with new parameters
      if (scatterAnimRef.current) {
        scatterAnimRef.current.kill();
        scatterAnimRef.current = null;
      }

      // Gentle animation - only slightly more visible during suspense
      const intensity = suspenseMode ? 1.2 : 0.8;  // Much gentler
      const pulseSpeed = suspenseMode ? 0.6 : 1.0; // Slower, calmer

      // Create continuous gentle pulsing animation for scatter
      const anim = { scale: 1, glow: 0, rotation: 0 };

      if (suspenseMode) {
        // SUSPENSE MODE: Gentle glow, no crazy pulsing
        scatterAnimRef.current = gsap.timeline({ repeat: -1 })
          .to(anim, {
            scale: 1.08,
            glow: intensity,
            rotation: 0.02,
            duration: pulseSpeed,
            ease: 'sine.inOut',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          })
          .to(anim, {
            scale: 1,
            glow: intensity * 0.5,
            rotation: -0.02,
            duration: pulseSpeed,
            ease: 'sine.inOut',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          });
      } else {
        // NORMAL MODE: Very gentle pulsing
        scatterAnimRef.current = gsap.timeline({ repeat: -1 })
          .to(anim, {
            scale: 1.05,
            glow: intensity,
            rotation: 0.02,
            duration: pulseSpeed,
            ease: 'sine.inOut',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          })
          .to(anim, {
            scale: 1,
            glow: 0.3,
            rotation: -0.02,
            duration: pulseSpeed,
            ease: 'sine.inOut',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          });
      }
    } else {
      // Kill animation if symbol changes
      if (scatterAnimRef.current) {
        scatterAnimRef.current.kill();
        scatterAnimRef.current = null;
        setScatterAnim({ scale: 1, glow: 0, rotation: 0 });
      }
    }

    return () => {
      if (scatterAnimRef.current) {
        scatterAnimRef.current.kill();
        scatterAnimRef.current = null;
      }
    };
  }, [symbol, suspenseMode]);

  // Wild continuous animation - subtle golden glow (no rainbow)
  useEffect(() => {
    if (symbol === 'WD') {
      // Create gentle pulsing animation for wild - golden theme
      const anim = { scale: 1, glow: 0.3, rotation: 0, hue: 45 };
      wildAnimRef.current = gsap.timeline({ repeat: -1 })
        // Gentle pulse
        .to(anim, {
          scale: 1.05,
          glow: 0.6,
          rotation: 0.01,
          hue: 50,
          duration: 1.0,
          ease: 'sine.inOut',
          onUpdate: () => {
            setWildAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation, hue: anim.hue });
          },
        })
        .to(anim, {
          scale: 1,
          glow: 0.3,
          rotation: 0,
          hue: 45,
          duration: 1.0,
          ease: 'sine.inOut',
          onUpdate: () => {
            setWildAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation, hue: anim.hue });
          },
        });
    } else {
      // Kill animation if symbol changes
      if (wildAnimRef.current) {
        wildAnimRef.current.kill();
        wildAnimRef.current = null;
        setWildAnim({ scale: 1, glow: 0, rotation: 0, hue: 0 });
      }
    }

    return () => {
      if (wildAnimRef.current) {
        wildAnimRef.current.kill();
        wildAnimRef.current = null;
      }
    };
  }, [symbol]);

  // Get symbol config and texture (use displaySymbol for rendering, symbol for logic)
  const symbolConfig = displaySymbol ? SYMBOLS[displaySymbol] : null;
  const hasTexture = displaySymbol && SYMBOLS_WITH_IMAGES.includes(displaySymbol);
  const symbolTexture = hasTexture ? symbolTextures[displaySymbol] : null;
  const glowColor = multiplier > 1 ? MULTIPLIER_COLORS[multiplier] : null;

  // Animate when isNew changes (new symbol appearing)
  useEffect(() => {
    if (isNew && symbol) {
      // Animate in: drop from above with bounce
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

  // Animate when isRemoving changes
  useEffect(() => {
    if (isRemoving) {
      // Animate out: shrink and fade with sparkle effect
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

  // Animate when symbol changes (not via isNew)
  useEffect(() => {
    if (symbol && symbol !== prevSymbolRef.current && !isNew) {
      setAnimatedAlpha(1);
      setAnimatedScale(1);
      setOffsetY(0);
    }
    prevSymbolRef.current = symbol;
  }, [symbol, isNew]);

  // State for winning explosion effect on symbol
  const [winExplosion, setWinExplosion] = useState({
    scale: 1,
    rotation: 0,
    flash: 0,
  });

  // Animate winning with explosion effect on the symbol (not the border)
  useEffect(() => {
    if (isWinning && containerRef.current) {
      // Explosion animation on the symbol
      const anim = { scale: 1, rotation: 0, flash: 0 };

      gsap.timeline()
        // Phase 1: Quick burst outward with flash
        .to(anim, {
          scale: 1.5,
          rotation: 0.1,
          flash: 1,
          duration: 0.12,
          ease: 'power2.out',
          onUpdate: () => {
            setWinExplosion({
              scale: anim.scale,
              rotation: anim.rotation,
              flash: anim.flash,
            });
          },
        })
        // Phase 2: Shake and contract
        .to(anim, {
          scale: 0.8,
          rotation: -0.15,
          flash: 0.5,
          duration: 0.1,
          ease: 'power2.in',
          onUpdate: () => {
            setWinExplosion({
              scale: anim.scale,
              rotation: anim.rotation,
              flash: anim.flash,
            });
          },
        })
        // Phase 3: Bounce back with shake
        .to(anim, {
          scale: 1.3,
          rotation: 0.08,
          flash: 0.3,
          duration: 0.15,
          ease: 'back.out(2)',
          onUpdate: () => {
            setWinExplosion({
              scale: anim.scale,
              rotation: anim.rotation,
              flash: anim.flash,
            });
          },
        })
        // Phase 4: Settle with small pulses
        .to(anim, {
          scale: 1.1,
          rotation: -0.05,
          flash: 0,
          duration: 0.2,
          ease: 'elastic.out(1, 0.5)',
          onUpdate: () => {
            setWinExplosion({
              scale: anim.scale,
              rotation: anim.rotation,
              flash: anim.flash,
            });
          },
        })
        // Phase 5: Final settle
        .to(anim, {
          scale: 1,
          rotation: 0,
          flash: 0,
          duration: 0.15,
          ease: 'power2.out',
          onUpdate: () => {
            setWinExplosion({
              scale: anim.scale,
              rotation: anim.rotation,
              flash: anim.flash,
            });
          },
          onComplete: () => {
            setWinExplosion({ scale: 1, rotation: 0, flash: 0 });
          },
        });
    }
  }, [isWinning]);

  // Pending reveal animation (suspense highlight before reveal)
  const [pendingGlow, setPendingGlow] = useState(0);
  const pendingAnimRef = useRef(null);
  useEffect(() => {
    if (isPendingReveal) {
      // Pulsing highlight effect when cell is about to be revealed
      const anim = { glow: 0 };
      pendingAnimRef.current = gsap.timeline({ repeat: -1 })
        .to(anim, {
          glow: 1,
          duration: 0.15,
          ease: 'power2.out',
          onUpdate: () => setPendingGlow(anim.glow),
        })
        .to(anim, {
          glow: 0.4,
          duration: 0.15,
          ease: 'power2.in',
          onUpdate: () => setPendingGlow(anim.glow),
        });
    } else {
      if (pendingAnimRef.current) {
        pendingAnimRef.current.kill();
        pendingAnimRef.current = null;
      }
      setPendingGlow(0);
    }
    return () => {
      if (pendingAnimRef.current) {
        pendingAnimRef.current.kill();
      }
    };
  }, [isPendingReveal]);

  // Animate explosion effect (Wild explosion sets cell to max multiplier)
  const [explosionGlow, setExplosionGlow] = useState(0);
  useEffect(() => {
    if (isExploding) {
      // Dramatic explosion animation
      const anim = { scale: 1, glow: 0 };
      gsap.timeline()
        .to(anim, {
          scale: 1.4,
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
          glow: 0.5,
          duration: 0.3,
          ease: 'elastic.out(1, 0.5)',
          onUpdate: () => {
            setAnimatedScale(anim.scale);
            setExplosionGlow(anim.glow);
          },
        })
        .to(anim, {
          glow: 0,
          duration: 0.3,
          onUpdate: () => {
            setExplosionGlow(anim.glow);
          },
          onComplete: () => {
            setExplosionGlow(0);
          },
        });
    }
  }, [isExploding]);

  // Reset to visible when new symbol appears (not through isNew flag)
  useEffect(() => {
    if (symbol && !isRemoving && !isNew) {
      setAnimatedAlpha(1);
    } else if (!symbol) {
      setAnimatedAlpha(0);
    }
  }, [symbol, isRemoving, isNew]);

  // Draw cell background and effects
  const drawCell = (g) => {
    g.clear();

    // Base background - rich purple with gradient effect
    g.beginFill(0x1a0a2e, 0.95);
    g.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 10);
    g.endFill();

    // Inner highlight (top)
    g.beginFill(0x2d1050, 0.5);
    g.drawRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE / 3, 8);
    g.endFill();

    // Border - more colorful
    const borderColor = isWinning ? 0xffffff : (symbolConfig ? symbolConfig.color : 0x4a2070);
    const borderAlpha = isWinning ? 1 : 0.7;
    g.lineStyle(isWinning ? 3 : 2, borderColor, borderAlpha);
    g.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 10);

    // Subtle inner glow for all cells
    if (!isWinning && !multiplier) {
      g.lineStyle(1, 0xff00ff, 0.15);
      g.drawRoundedRect(3, 3, CELL_SIZE - 6, CELL_SIZE - 6, 7);
    }

    // Winning glow effect - softer, less intense
    if (isWinning) {
      g.lineStyle(3, 0xffffff, 0.5);
      g.drawRoundedRect(-2, -2, CELL_SIZE + 4, CELL_SIZE + 4, 11);
      g.lineStyle(6, 0xccaa66, 0.35);
      g.drawRoundedRect(-4, -4, CELL_SIZE + 8, CELL_SIZE + 8, 13);
    }

    // Multiplier glow (Ghost Spot) - more vibrant
    if (multiplier > 1 && glowColor) {
      // Inner fill with color
      g.beginFill(glowColor, 0.1);
      g.drawRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
      g.endFill();
      // Border glow
      g.lineStyle(4, glowColor, 1);
      g.drawRoundedRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2, 9);
      g.lineStyle(2, glowColor, 0.6);
      g.drawRoundedRect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8, 6);
    }

    // Explosion effect (Wild explosion - dramatic neon glow)
    if (explosionGlow > 0) {
      const explosionColor = 0xff00ff; // Neon magenta
      // Inner glow
      g.lineStyle(8, explosionColor, explosionGlow);
      g.drawRoundedRect(-3, -3, CELL_SIZE + 6, CELL_SIZE + 6, 12);
      // Middle glow
      g.lineStyle(12, explosionColor, explosionGlow * 0.6);
      g.drawRoundedRect(-8, -8, CELL_SIZE + 16, CELL_SIZE + 16, 16);
      // Outer glow
      g.lineStyle(20, 0xffee00, explosionGlow * 0.4); // Yellow outer ring
      g.drawRoundedRect(-14, -14, CELL_SIZE + 28, CELL_SIZE + 28, 20);
    }

    // Pending reveal effect (suspense - cell about to be revealed) - subtle
    if (pendingGlow > 0) {
      // Soft blue highlight
      g.lineStyle(2, 0x6699cc, pendingGlow * 0.6);
      g.drawRoundedRect(-1, -1, CELL_SIZE + 2, CELL_SIZE + 2, 11);
      // Very subtle inner fill
      g.beginFill(0x88aacc, pendingGlow * 0.08);
      g.drawRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
      g.endFill();
    }
  };

  // Multiplier text style - bigger and more visible
  const multStyle = new TextStyle({
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'bold',
    fill: glowColor ? `#${glowColor.toString(16).padStart(6, '0')}` : '#00ffff',
    stroke: '#000000',
    strokeThickness: 3,
    dropShadow: true,
    dropShadowColor: glowColor ? `#${glowColor.toString(16).padStart(6, '0')}` : '#00ffff',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
  });

  // Sprite size (slightly smaller than cell for padding)
  const spriteSize = CELL_SIZE - 12;
  const spriteOffset = 6;

  return (
    <Container x={x} y={y} ref={containerRef}>
      {/* Background and effects (always visible) */}
      <Graphics draw={drawCell} />

      {/* Symbol container with animations - centered with pivot for scale */}
      {(displaySymbol || isSpinning) && (
        <Container
          x={CELL_SIZE / 2}
          y={CELL_SIZE / 2 + offsetY}
          alpha={animatedAlpha}
          scale={animatedScale * winExplosion.scale * (displaySymbol === 'SC' && !isSpinning ? scatterAnim.scale : displaySymbol === 'WD' && !isSpinning ? wildAnim.scale : 1)}
          rotation={winExplosion.rotation + (displaySymbol === 'SC' && !isSpinning ? scatterAnim.rotation : displaySymbol === 'WD' && !isSpinning ? wildAnim.rotation : 0)}
        >
          {/* Wild glow effect - subtle golden glow (only for actual wild, not spinning) */}
          {displaySymbol === 'WD' && !isSpinning && wildAnim.glow > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                // Soft golden glow
                g.beginFill(0xccaa66, wildAnim.glow * 0.2);
                g.drawCircle(0, 0, spriteSize * 0.7);
                g.endFill();
                // Inner subtle glow
                g.beginFill(0xddbb77, wildAnim.glow * 0.1);
                g.drawCircle(0, 0, spriteSize * 0.5);
                g.endFill();
              }}
            />
          )}

          {/* Scatter glow effect - subtle and gentle */}
          {displaySymbol === 'SC' && !isSpinning && scatterAnim.glow > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                const glowIntensity = Math.min(scatterAnim.glow, 1.2);

                // Soft outer glow - muted cyan
                g.beginFill(0x4488aa, glowIntensity * 0.15);
                g.drawCircle(0, 0, spriteSize * 0.8);
                g.endFill();

                // Inner subtle glow
                g.beginFill(0x66aacc, glowIntensity * 0.1);
                g.drawCircle(0, 0, spriteSize * 0.6);
                g.endFill();
              }}
            />
          )}

          {/* Symbol image or custom drawn - offset to center around pivot */}
          {displaySymbol === 'WD' ? (
            /* Custom Wild Symbol - Neon Vinyl Disc */
            <>
              <Graphics
                draw={(g) => {
                  g.clear();
                  const size = spriteSize * 0.42;
                  // Outer neon glow
                  g.beginFill(0xff00ff, 0.2);
                  g.drawCircle(0, 0, size * 1.4);
                  g.endFill();
                  g.beginFill(0xff44ff, 0.15);
                  g.drawCircle(0, 0, size * 1.25);
                  g.endFill();
                  // Vinyl disc base - dark with purple tint
                  g.beginFill(0x1a0030);
                  g.drawCircle(0, 0, size);
                  g.endFill();
                  // Vinyl grooves (rings)
                  for (let i = 3; i <= 9; i++) {
                    const ringSize = size * (i / 10);
                    g.lineStyle(1, 0x3d1a5c, 0.6);
                    g.drawCircle(0, 0, ringSize);
                  }
                  // Label center - gradient gold
                  g.beginFill(0xffd700);
                  g.drawCircle(0, 0, size * 0.35);
                  g.endFill();
                  g.beginFill(0xffee88);
                  g.drawCircle(0, -size * 0.05, size * 0.28);
                  g.endFill();
                  // Center hole
                  g.beginFill(0x0d0518);
                  g.drawCircle(0, 0, size * 0.08);
                  g.endFill();
                  // Neon edge ring
                  g.lineStyle(3, 0xff00ff, 0.9);
                  g.drawCircle(0, 0, size);
                  // Inner neon ring
                  g.lineStyle(2, 0x00ffff, 0.7);
                  g.drawCircle(0, 0, size * 0.7);
                  // Highlight shine
                  g.beginFill(0xffffff, 0.3);
                  g.drawEllipse(-size * 0.3, -size * 0.35, size * 0.25, size * 0.12);
                  g.endFill();
                }}
              />
              {/* Show spinning multiplier OR "WILD" text */}
              {wildSpinningMultiplier ? (
                <Text
                  text={`x${wildSpinningMultiplier}`}
                  x={0}
                  y={0}
                  anchor={0.5}
                  style={new TextStyle({
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: 16,
                    fontWeight: 'bold',
                    fill: '#ffffff',
                    stroke: '#ff00ff',
                    strokeThickness: 3,
                    dropShadow: true,
                    dropShadowColor: '#ff00ff',
                    dropShadowBlur: 8,
                    dropShadowDistance: 0,
                  })}
                />
              ) : (
                <Text
                  text="WILD"
                  x={0}
                  y={0}
                  anchor={0.5}
                  style={new TextStyle({
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fill: '#1a0030',
                    stroke: '#ffd700',
                    strokeThickness: 1,
                  })}
                />
              )}
            </>
          ) : displaySymbol === 'SC' ? (
            /* Custom Scatter Symbol - Glowing Crystal/Gem */
            <>
              <Graphics
                draw={(g) => {
                  g.clear();
                  const size = spriteSize * 0.38;
                  // Outer glow rings - mystical purple/cyan
                  g.beginFill(0x00ffff, 0.12);
                  g.drawCircle(0, 0, size * 1.6);
                  g.endFill();
                  g.beginFill(0xff00ff, 0.1);
                  g.drawCircle(0, 0, size * 1.4);
                  g.endFill();
                  g.beginFill(0x00ddff, 0.2);
                  g.drawCircle(0, 0, size * 1.2);
                  g.endFill();
                  // Diamond/gem shape
                  const pts = [
                    { x: 0, y: -size }, // top
                    { x: size * 0.7, y: -size * 0.2 }, // top-right
                    { x: size * 0.5, y: size * 0.8 }, // bottom-right
                    { x: -size * 0.5, y: size * 0.8 }, // bottom-left
                    { x: -size * 0.7, y: -size * 0.2 }, // top-left
                  ];
                  // Main gem body - cyan gradient
                  g.beginFill(0x0088cc);
                  g.moveTo(pts[0].x, pts[0].y);
                  pts.forEach(p => g.lineTo(p.x, p.y));
                  g.closePath();
                  g.endFill();
                  // Top facet - lighter
                  g.beginFill(0x00ccff, 0.8);
                  g.moveTo(pts[0].x, pts[0].y);
                  g.lineTo(pts[1].x, pts[1].y);
                  g.lineTo(0, 0);
                  g.lineTo(pts[4].x, pts[4].y);
                  g.closePath();
                  g.endFill();
                  // Left facet highlight
                  g.beginFill(0x00eeff, 0.6);
                  g.moveTo(pts[0].x, pts[0].y);
                  g.lineTo(pts[4].x, pts[4].y);
                  g.lineTo(0, 0);
                  g.closePath();
                  g.endFill();
                  // Bottom facets - darker
                  g.beginFill(0x005588, 0.9);
                  g.moveTo(0, 0);
                  g.lineTo(pts[1].x, pts[1].y);
                  g.lineTo(pts[2].x, pts[2].y);
                  g.closePath();
                  g.endFill();
                  g.beginFill(0x004466, 0.9);
                  g.moveTo(0, 0);
                  g.lineTo(pts[3].x, pts[3].y);
                  g.lineTo(pts[4].x, pts[4].y);
                  g.closePath();
                  g.endFill();
                  // Center facet
                  g.beginFill(0x006699);
                  g.moveTo(0, 0);
                  g.lineTo(pts[2].x, pts[2].y);
                  g.lineTo(pts[3].x, pts[3].y);
                  g.closePath();
                  g.endFill();
                  // Shine highlight
                  g.beginFill(0xffffff, 0.7);
                  g.moveTo(-size * 0.15, -size * 0.6);
                  g.lineTo(size * 0.05, -size * 0.4);
                  g.lineTo(-size * 0.1, -size * 0.3);
                  g.lineTo(-size * 0.3, -size * 0.45);
                  g.closePath();
                  g.endFill();
                  // Border glow
                  g.lineStyle(2, 0x00ffff, 0.9);
                  g.moveTo(pts[0].x, pts[0].y);
                  pts.forEach(p => g.lineTo(p.x, p.y));
                  g.closePath();
                  // Inner sparkle lines
                  g.lineStyle(1, 0xffffff, 0.4);
                  g.moveTo(0, -size);
                  g.lineTo(0, 0);
                  g.moveTo(pts[1].x, pts[1].y);
                  g.lineTo(0, 0);
                  g.moveTo(pts[4].x, pts[4].y);
                  g.lineTo(0, 0);
                }}
              />
              <Text
                text="FREE"
                x={0}
                y={spriteSize * 0.06}
                anchor={0.5}
                style={new TextStyle({
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  fontSize: 9,
                  fontWeight: 'bold',
                  fill: '#ffffff',
                  stroke: '#004466',
                  strokeThickness: 2,
                  dropShadow: true,
                  dropShadowColor: '#00ffff',
                  dropShadowBlur: 3,
                  dropShadowDistance: 0,
                })}
              />
            </>
          ) : symbolTexture ? (
            <Sprite
              texture={symbolTexture}
              x={-spriteSize / 2}
              y={-spriteSize / 2}
              width={spriteSize}
              height={spriteSize}
            />
          ) : symbolConfig && (
            <>
              {/* Placeholder background */}
              <Graphics
                draw={(g) => {
                  g.clear();
                  const color = symbolConfig.color || 0x666666;
                  g.beginFill(color, 0.8);
                  g.drawRoundedRect(-spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize, 8);
                  g.endFill();
                  g.beginFill(0xffffff, 0.2);
                  g.drawRoundedRect(-spriteSize / 2 + 4, -spriteSize / 2 + 4, spriteSize - 8, spriteSize / 2 - 4, 6);
                  g.endFill();
                  g.lineStyle(2, color, 1);
                  g.drawRoundedRect(-spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize, 8);
                }}
              />
              {/* Symbol text */}
              <Text
                text={displaySymbol}
                x={0}
                y={0}
                anchor={0.5}
                style={new TextStyle({
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  fontSize: 22,
                  fontWeight: 'bold',
                  fill: '#ffffff',
                  dropShadow: true,
                  dropShadowColor: '#000000',
                  dropShadowBlur: 4,
                  dropShadowDistance: 2,
                })}
              />
            </>
          )}

          {/* Flash overlay for explosion effect */}
          {winExplosion.flash > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                g.beginFill(0xffffff, winExplosion.flash * 0.7);
                g.drawCircle(0, 0, spriteSize * 0.6);
                g.endFill();
                // Outer glow ring
                g.beginFill(0xffff00, winExplosion.flash * 0.4);
                g.drawCircle(0, 0, spriteSize * 0.8);
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
