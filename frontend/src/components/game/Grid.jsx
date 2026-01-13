/**
 * NEON VINYL: GHOST GROOVES - Grid Component
 *
 * 7x7 game grid with GSAP animation support.
 * Manages cell sprites and forwards refs for animation.
 */
import React, { useCallback, useMemo } from 'react';
import { Container, Graphics } from '@pixi/react';
import Cell from './Cell';
import {
  GRID_ROWS,
  GRID_COLS,
  CELL_SIZE,
  CELL_GAP,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '../../config/gameConfig';
import useGameStore from '../../stores/gameStore';

const Grid = ({ x = 0, y = 0 }) => {
  const grid = useGameStore((state) => state.grid);
  const multiplierGrid = useGameStore((state) => state.multiplierGrid);

  // Draw grid background/frame
  const drawGridFrame = useCallback((g) => {
    g.clear();

    // Outer neon glow
    for (let i = 3; i > 0; i--) {
      g.beginFill(0x000000, 0);
      g.lineStyle(i * 2, 0x00ffff, 0.1 * i);
      g.drawRoundedRect(-10 - i * 2, -10 - i * 2, GRID_WIDTH + 20 + i * 4, GRID_HEIGHT + 20 + i * 4, 16 + i * 2);
    }

    // Main border
    g.lineStyle(2, 0x333366, 0.9);
    g.drawRoundedRect(-8, -8, GRID_WIDTH + 16, GRID_HEIGHT + 16, 14);

    // Inner background
    g.beginFill(0x0a0a15, 0.95);
    g.drawRoundedRect(-4, -4, GRID_WIDTH + 8, GRID_HEIGHT + 8, 10);
    g.endFill();

    // Subtle grid pattern
    g.lineStyle(1, 0x1a1a2f, 0.5);
    for (let row = 1; row < GRID_ROWS; row++) {
      const py = row * (CELL_SIZE + CELL_GAP) - CELL_GAP / 2;
      g.moveTo(0, py);
      g.lineTo(GRID_WIDTH, py);
    }
    for (let col = 1; col < GRID_COLS; col++) {
      const px = col * (CELL_SIZE + CELL_GAP) - CELL_GAP / 2;
      g.moveTo(px, 0);
      g.lineTo(px, GRID_HEIGHT);
    }
  }, []);

  // Generate cells
  const cells = useMemo(() => {
    const cellElements = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cellData = grid[row]?.[col] || {};
        const multiplier = multiplierGrid[row]?.[col] || 1;

        cellElements.push(
          <Cell
            key={`cell-${row}-${col}`}
            row={row}
            col={col}
            symbol={cellData.symbol}
            multiplier={multiplier}
            isWinning={cellData.isWinning || false}
            isRemoving={cellData.isRemoving || false}
            isNew={cellData.isNew || false}
            isExploding={cellData.isExploding || false}
            isPendingReveal={cellData.isPendingReveal || false}
            isSpinning={cellData.isSpinning || false}
            wildMultiplierTarget={cellData.wildMultiplierTarget || null}
          />
        );
      }
    }

    return cellElements;
  }, [grid, multiplierGrid]);

  return (
    <Container x={x} y={y}>
      {/* Grid frame/background */}
      <Graphics draw={drawGridFrame} />

      {/* Cells container */}
      <Container x={0} y={0}>
        {cells}
      </Container>
    </Container>
  );
};

export default Grid;
