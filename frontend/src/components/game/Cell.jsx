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

const Cell = ({
  row,
  col,
  symbol,
  multiplier = 1,
  isWinning = false,
  isRemoving = false,
  isNew = false,
  isExploding = false,
}) => {
  const containerRef = useRef(null);
  const [animatedAlpha, setAnimatedAlpha] = useState(symbol ? 1 : 0);
  const [animatedScale, setAnimatedScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const prevSymbolRef = useRef(symbol);

  // Get suspense mode from store for enhanced scatter animations
  const suspenseMode = useGameStore((state) => state.suspenseMode);

  // Scatter animation state
  const [scatterAnim, setScatterAnim] = useState({ scale: 1, glow: 0, rotation: 0 });
  const scatterAnimRef = useRef(null);

  // Wild animation state
  const [wildAnim, setWildAnim] = useState({ scale: 1, glow: 0, rotation: 0, hue: 0 });
  const wildAnimRef = useRef(null);

  // Calculate position
  const x = col * (CELL_SIZE + 4);
  const y = row * (CELL_SIZE + 4);

  // Scatter continuous animation - INTENSE during suspense mode
  useEffect(() => {
    if (symbol === 'SC') {
      // Kill existing animation to rebuild with new parameters
      if (scatterAnimRef.current) {
        scatterAnimRef.current.kill();
        scatterAnimRef.current = null;
      }

      // Animation intensity varies DRAMATICALLY based on suspense mode
      const intensity = suspenseMode ? 2.5 : 1;  // Much more intense during suspense
      const pulseSpeed = suspenseMode ? 0.25 : 0.8; // Much faster heartbeat pulse during suspense

      // Create continuous pulsing animation for scatter
      const anim = { scale: 1, glow: 0, rotation: 0 };

      if (suspenseMode) {
        // SUSPENSE MODE: Rapid heartbeat-like pulsing
        scatterAnimRef.current = gsap.timeline({ repeat: -1 })
          // Quick pulse up - like a heartbeat
          .to(anim, {
            scale: 1.35,
            glow: intensity,
            rotation: 0.08,
            duration: 0.15,
            ease: 'power2.out',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          })
          // Quick pulse down
          .to(anim, {
            scale: 1.1,
            glow: intensity * 0.6,
            rotation: -0.04,
            duration: 0.1,
            ease: 'power2.in',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          })
          // Second beat (double beat like heartbeat)
          .to(anim, {
            scale: 1.25,
            glow: intensity * 0.9,
            rotation: 0.05,
            duration: 0.12,
            ease: 'power2.out',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          })
          // Rest between beats
          .to(anim, {
            scale: 1,
            glow: intensity * 0.4,
            rotation: 0,
            duration: 0.3,
            ease: 'power1.inOut',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          });
      } else {
        // NORMAL MODE: Gentle pulsing
        scatterAnimRef.current = gsap.timeline({ repeat: -1 })
          .to(anim, {
            scale: 1.15,
            glow: 1,
            rotation: 0.05,
            duration: pulseSpeed,
            ease: 'sine.inOut',
            onUpdate: () => {
              setScatterAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation });
            },
          })
          .to(anim, {
            scale: 1,
            glow: 0.3,
            rotation: -0.05,
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

  // Wild continuous animation - rainbow pulsing glow
  useEffect(() => {
    if (symbol === 'WD') {
      // Create continuous rainbow animation for wild
      const anim = { scale: 1, glow: 0.5, rotation: 0, hue: 0 };
      wildAnimRef.current = gsap.timeline({ repeat: -1 })
        // Pulse up with rainbow shift
        .to(anim, {
          scale: 1.12,
          glow: 1,
          rotation: 0.03,
          hue: 120,
          duration: 0.6,
          ease: 'sine.inOut',
          onUpdate: () => {
            setWildAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation, hue: anim.hue });
          },
        })
        // Continue color shift
        .to(anim, {
          scale: 1.08,
          glow: 0.7,
          rotation: -0.02,
          hue: 240,
          duration: 0.6,
          ease: 'sine.inOut',
          onUpdate: () => {
            setWildAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation, hue: anim.hue });
          },
        })
        // Pulse down
        .to(anim, {
          scale: 1,
          glow: 0.5,
          rotation: 0,
          hue: 360,
          duration: 0.6,
          ease: 'sine.inOut',
          onUpdate: () => {
            setWildAnim({ scale: anim.scale, glow: anim.glow, rotation: anim.rotation, hue: anim.hue % 360 });
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

  // Get symbol config and texture
  const symbolConfig = symbol ? SYMBOLS[symbol] : null;
  const hasTexture = symbol && SYMBOLS_WITH_IMAGES.includes(symbol);
  const symbolTexture = hasTexture ? symbolTextures[symbol] : null;
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

    // Winning glow effect - more intense
    if (isWinning) {
      g.lineStyle(5, 0xffffff, 0.7);
      g.drawRoundedRect(-3, -3, CELL_SIZE + 6, CELL_SIZE + 6, 12);
      g.lineStyle(10, 0xffd700, 0.5);
      g.drawRoundedRect(-6, -6, CELL_SIZE + 12, CELL_SIZE + 12, 14);
      g.lineStyle(15, 0xff00ff, 0.25);
      g.drawRoundedRect(-10, -10, CELL_SIZE + 20, CELL_SIZE + 20, 18);
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
      {symbol && (
        <Container
          x={CELL_SIZE / 2}
          y={CELL_SIZE / 2 + offsetY}
          alpha={animatedAlpha}
          scale={animatedScale * winExplosion.scale * (symbol === 'SC' ? scatterAnim.scale : symbol === 'WD' ? wildAnim.scale : 1)}
          rotation={winExplosion.rotation + (symbol === 'SC' ? scatterAnim.rotation : symbol === 'WD' ? wildAnim.rotation : 0)}
        >
          {/* Wild glow effect - rainbow pulsing */}
          {symbol === 'WD' && wildAnim.glow > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                // Convert hue to RGB for rainbow effect
                const hue = wildAnim.hue;
                const h = hue / 60;
                const c = 1;
                const x = c * (1 - Math.abs(h % 2 - 1));
                let r, gb, b;
                if (h < 1) { r = c; gb = x; b = 0; }
                else if (h < 2) { r = x; gb = c; b = 0; }
                else if (h < 3) { r = 0; gb = c; b = x; }
                else if (h < 4) { r = 0; gb = x; b = c; }
                else if (h < 5) { r = x; gb = 0; b = c; }
                else { r = c; gb = 0; b = x; }
                const color = (Math.floor(r * 255) << 16) | (Math.floor(gb * 255) << 8) | Math.floor(b * 255);

                // Outer rainbow glow
                g.beginFill(color, wildAnim.glow * 0.35);
                g.drawCircle(0, 0, spriteSize * 0.8);
                g.endFill();
                // Inner bright glow
                g.beginFill(0xffffff, wildAnim.glow * 0.2);
                g.drawCircle(0, 0, spriteSize * 0.5);
                g.endFill();
              }}
            />
          )}

          {/* Scatter glow effect - MASSIVE during suspense */}
          {symbol === 'SC' && scatterAnim.glow > 0 && (
            <Graphics
              draw={(g) => {
                g.clear();
                // Glow intensity increases during suspense mode (glow > 1.5 means suspense)
                const isSuspense = scatterAnim.glow > 1.5;
                const glowMult = isSuspense ? 1.8 : 1;
                const glowIntensity = Math.min(scatterAnim.glow, 2.5);

                if (isSuspense) {
                  // MASSIVE outer ring during suspense - pulsing beacon
                  g.beginFill(0xff00ff, (glowIntensity - 1) * 0.15);
                  g.drawCircle(0, 0, spriteSize * 1.5 * glowMult);
                  g.endFill();

                  // Secondary magenta ring
                  g.beginFill(0xff44ff, (glowIntensity - 1) * 0.2);
                  g.drawCircle(0, 0, spriteSize * 1.2 * glowMult);
                  g.endFill();

                  // Cyan ring
                  g.beginFill(0x00ffff, (glowIntensity - 1) * 0.25);
                  g.drawCircle(0, 0, spriteSize * 1.0 * glowMult);
                  g.endFill();

                  // White hot center
                  g.beginFill(0xffffff, (glowIntensity - 1) * 0.15);
                  g.drawCircle(0, 0, spriteSize * 0.6);
                  g.endFill();
                }

                // Main cyan/blue outer glow
                g.beginFill(0x00ddff, Math.min(glowIntensity, 1) * 0.3 * glowMult);
                g.drawCircle(0, 0, spriteSize * 0.75 * glowMult);
                g.endFill();
              }}
            />
          )}

          {/* Symbol image or custom drawn - offset to center around pivot */}
          {symbol === 'WD' ? (
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
            </>
          ) : symbol === 'SC' ? (
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
                text={symbol}
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
