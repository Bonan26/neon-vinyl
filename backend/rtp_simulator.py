#!/usr/bin/env python3
"""
NEON VINYL: GHOST GROOVES - RTP Simulator
Simulates thousands of spins to calculate Return To Player percentage.

Usage: python rtp_simulator.py [num_spins]
Default: 100,000 spins
"""
import sys
import random
import time
from typing import Dict, List, Tuple, Set
from collections import defaultdict
from dataclasses import dataclass

# Import game configuration
sys.path.insert(0, '.')
from app.game_config import (
    SYMBOL_WEIGHTS, Symbol, PAYTABLE, MIN_CLUSTER_SIZE,
    SCATTER_FREE_SPINS, SCATTER_RETRIGGER, FREE_SPIN_WEIGHTS,
    GRID_ROWS, GRID_COLS
)
from app.services.game_engine import (
    WILD_WHEEL_MULTIPLIERS, WILD_EXPLOSION_RANGE, Grid
)

# Constants
GRID_SIZE = 7
BET_AMOUNT = 1.0  # Normalized bet for RTP calculation


def weighted_random_symbol(weights_dict: Dict[Symbol, any], is_free_spin: bool = False) -> Symbol:
    """Select a random symbol based on weights."""
    if is_free_spin:
        symbols = list(FREE_SPIN_WEIGHTS.keys())
        weights = list(FREE_SPIN_WEIGHTS.values())
    else:
        symbols = list(SYMBOL_WEIGHTS.keys())
        weights = [SYMBOL_WEIGHTS[s].weight for s in symbols]

    total = sum(weights)
    r = random.random() * total

    for symbol, weight in zip(symbols, weights):
        r -= weight
        if r <= 0:
            return symbol

    return symbols[0]


def get_wild_wheel_multiplier() -> int:
    """Get a random wheel multiplier."""
    total = sum(w for _, w in WILD_WHEEL_MULTIPLIERS)
    r = random.random() * total

    for mult, weight in WILD_WHEEL_MULTIPLIERS:
        r -= weight
        if r <= 0:
            return mult

    return WILD_WHEEL_MULTIPLIERS[0][0]


def get_payout(symbol: Symbol, cluster_size: int) -> float:
    """Get payout for a symbol cluster."""
    if cluster_size < MIN_CLUSTER_SIZE:
        return 0.0

    if symbol not in PAYTABLE:
        return 0.0

    lookup_size = min(cluster_size, 15)
    return PAYTABLE[symbol].get(lookup_size, 0.0)


def find_clusters(grid: List[List[Symbol]]) -> List[Tuple[Symbol, Set[Tuple[int, int]]]]:
    """Find all winning clusters using BFS."""
    visited = set()
    clusters = []

    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # 4-directional

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if (row, col) in visited:
                continue

            symbol = grid[row][col]
            if symbol is None or symbol == Symbol.SCATTER:
                visited.add((row, col))
                continue

            # BFS to find cluster
            cluster = set()
            queue = [(row, col)]

            while queue:
                r, c = queue.pop(0)
                if (r, c) in cluster:
                    continue

                cell_symbol = grid[r][c]
                # Match if same symbol or either is WILD
                if cell_symbol == symbol or cell_symbol == Symbol.WILD or symbol == Symbol.WILD:
                    cluster.add((r, c))
                    visited.add((r, c))

                    for dr, dc in directions:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE:
                            if (nr, nc) not in cluster:
                                next_symbol = grid[nr][nc]
                                if next_symbol == symbol or next_symbol == Symbol.WILD or symbol == Symbol.WILD:
                                    queue.append((nr, nc))

            if len(cluster) >= MIN_CLUSTER_SIZE:
                # Determine the paying symbol (non-wild if possible)
                paying_symbol = symbol if symbol != Symbol.WILD else Symbol.WILD
                for r, c in cluster:
                    if grid[r][c] != Symbol.WILD:
                        paying_symbol = grid[r][c]
                        break
                clusters.append((paying_symbol, cluster))

    return clusters


def count_scatters(grid: List[List[Symbol]]) -> int:
    """Count scatter symbols in grid."""
    count = 0
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if grid[row][col] == Symbol.SCATTER:
                count += 1
    return count


def simulate_spin(is_free_spin: bool = False) -> Tuple[float, int, int, List[int]]:
    """
    Simulate a single spin with tumble mechanic.
    Returns: (total_payout, scatter_count, wild_count, wheel_multipliers_used)
    """
    # Generate initial grid
    grid = [[weighted_random_symbol(SYMBOL_WEIGHTS, is_free_spin) for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]

    # Track multipliers for each cell
    multipliers = [[1 for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]

    total_payout = 0.0
    scatter_count = count_scatters(grid)
    wild_count = sum(1 for row in grid for cell in row if cell == Symbol.WILD)
    wheel_multipliers = []

    # Tumble loop
    tumble_count = 0
    max_tumbles = 50  # Safety limit

    while tumble_count < max_tumbles:
        # Find clusters
        clusters = find_clusters(grid)

        if not clusters:
            break

        tumble_count += 1

        # Track positions to remove and wild positions
        positions_to_remove = set()
        wild_positions = []

        for symbol, cluster_cells in clusters:
            # Calculate payout with multipliers
            base_payout = get_payout(symbol, len(cluster_cells))
            max_mult = 1

            for r, c in cluster_cells:
                max_mult = max(max_mult, multipliers[r][c])
                if grid[r][c] == Symbol.WILD:
                    wild_positions.append((r, c))

            cluster_payout = base_payout * max_mult
            total_payout += cluster_payout
            positions_to_remove.update(cluster_cells)

        # Apply wild explosions (extended range)
        if wild_positions:
            wheel_mult = get_wild_wheel_multiplier()
            wheel_multipliers.append(wheel_mult)

            for wr, wc in wild_positions:
                for dr in range(-WILD_EXPLOSION_RANGE, WILD_EXPLOSION_RANGE + 1):
                    for dc in range(-WILD_EXPLOSION_RANGE, WILD_EXPLOSION_RANGE + 1):
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = wr + dr, wc + dc
                        if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE:
                            multipliers[nr][nc] = wheel_mult

        # Update multipliers for ghost spots (cells that had wins)
        for r, c in positions_to_remove:
            if multipliers[r][c] == 1:
                multipliers[r][c] = 2
            else:
                multipliers[r][c] = min(multipliers[r][c] * 2, 1024)

        # Remove winning symbols
        for r, c in positions_to_remove:
            grid[r][c] = None

        # Apply gravity and fill
        for col in range(GRID_SIZE):
            # Collect non-empty cells
            column_symbols = [grid[row][col] for row in range(GRID_SIZE) if grid[row][col] is not None]
            # Fill from bottom
            empty_count = GRID_SIZE - len(column_symbols)
            for row in range(GRID_SIZE):
                if row < empty_count:
                    grid[row][col] = weighted_random_symbol(SYMBOL_WEIGHTS, is_free_spin)
                else:
                    grid[row][col] = column_symbols[row - empty_count]

    return total_payout, scatter_count, wild_count, wheel_multipliers


def simulate_free_spins(num_spins: int, starting_multiplier: int = 1) -> float:
    """Simulate a free spins session."""
    total_win = 0.0
    spins_remaining = num_spins

    while spins_remaining > 0:
        payout, scatter_count, _, _ = simulate_spin(is_free_spin=True)
        total_win += payout
        spins_remaining -= 1

        # Check for retrigger
        if scatter_count >= 2:
            retrigger_spins = SCATTER_RETRIGGER.get(min(scatter_count, 6), 0)
            spins_remaining += retrigger_spins

    return total_win


def run_simulation(num_spins: int = 100000) -> Dict:
    """Run the full RTP simulation."""
    print(f"\n{'='*60}")
    print(f"NEON VINYL RTP SIMULATION - {num_spins:,} Spins")
    print(f"{'='*60}\n")

    start_time = time.time()

    total_wagered = 0.0
    total_returned = 0.0

    # Stats tracking
    stats = {
        'total_spins': 0,
        'base_game_spins': 0,
        'free_spin_triggers': 0,
        'bonus_3_scatter': 0,  # 3 scatter triggers (8 free spins)
        'bonus_4_scatter': 0,  # 4+ scatter triggers (12 free spins)
        'total_free_spins': 0,
        'scatter_baits': 0,  # 2 scatters but no trigger
        'wild_explosions': 0,
        'wheel_multipliers': defaultdict(int),
        'cluster_sizes': defaultdict(int),
        'big_wins': 0,  # 10x+
        'mega_wins': 0,  # 50x+
        'super_mega_wins': 0,  # 100x+
        'max_win': 0.0,
        'base_game_rtp': 0.0,
        'free_spin_rtp': 0.0,
    }

    base_game_wagered = 0.0
    base_game_returned = 0.0
    free_spin_returned = 0.0

    # Progress tracking
    progress_interval = num_spins // 20

    for spin_num in range(num_spins):
        # Progress update
        if spin_num > 0 and spin_num % progress_interval == 0:
            progress = (spin_num / num_spins) * 100
            current_rtp = (total_returned / total_wagered * 100) if total_wagered > 0 else 0
            print(f"Progress: {progress:.0f}% | Current RTP: {current_rtp:.2f}%")

        # Wager
        total_wagered += BET_AMOUNT
        base_game_wagered += BET_AMOUNT
        stats['total_spins'] += 1
        stats['base_game_spins'] += 1

        # Simulate base game spin
        payout, scatter_count, wild_count, wheel_mults = simulate_spin(is_free_spin=False)
        base_game_returned += payout
        total_returned += payout

        # Track wheel multipliers
        for mult in wheel_mults:
            stats['wheel_multipliers'][mult] += 1
            stats['wild_explosions'] += 1

        # Track scatter baits (2 scatters)
        if scatter_count == 2:
            stats['scatter_baits'] += 1

        # Check for free spins trigger
        if scatter_count >= 3:
            stats['free_spin_triggers'] += 1
            # Track 3-scatter vs 4+ scatter bonuses
            if scatter_count == 3:
                stats['bonus_3_scatter'] += 1
            else:  # 4 or more
                stats['bonus_4_scatter'] += 1

            num_free_spins = SCATTER_FREE_SPINS.get(min(scatter_count, 6), 8)
            stats['total_free_spins'] += num_free_spins

            # Simulate free spins
            fs_win = simulate_free_spins(num_free_spins)
            free_spin_returned += fs_win
            total_returned += fs_win
            payout += fs_win  # For max win tracking

        # Track big wins
        if payout >= 10 * BET_AMOUNT:
            stats['big_wins'] += 1
        if payout >= 50 * BET_AMOUNT:
            stats['mega_wins'] += 1
        if payout >= 100 * BET_AMOUNT:
            stats['super_mega_wins'] += 1

        stats['max_win'] = max(stats['max_win'], payout)

    # Calculate final RTP
    elapsed = time.time() - start_time
    rtp = (total_returned / total_wagered) * 100
    base_rtp = (base_game_returned / base_game_wagered) * 100 if base_game_wagered > 0 else 0
    fs_contribution = (free_spin_returned / total_wagered) * 100

    stats['base_game_rtp'] = base_rtp
    stats['free_spin_rtp'] = fs_contribution

    # Print results
    print(f"\n{'='*60}")
    print(f"SIMULATION COMPLETE - {elapsed:.1f} seconds")
    print(f"{'='*60}\n")

    print(f"{'RTP RESULTS':^60}")
    print(f"{'-'*60}")
    print(f"Total Wagered:        ${total_wagered:,.2f}")
    print(f"Total Returned:       ${total_returned:,.2f}")
    print(f"")
    print(f">>> OVERALL RTP:      {rtp:.2f}% <<<")
    print(f"")
    print(f"Base Game RTP:        {base_rtp:.2f}%")
    print(f"Free Spins RTP:       {fs_contribution:.2f}%")
    print(f"{'-'*60}\n")

    print(f"{'GAME STATISTICS':^60}")
    print(f"{'-'*60}")
    print(f"Total Spins:          {stats['total_spins']:,}")
    print(f"")
    print(f"--- SCATTER STATISTICS ---")
    print(f"Scatter Baits (2 SC): {stats['scatter_baits']:,} ({stats['scatter_baits']/num_spins*100:.2f}%)")
    print(f"3-Scatter Bonus:      {stats['bonus_3_scatter']:,} ({stats['bonus_3_scatter']/num_spins*100:.3f}%)")
    print(f"4+-Scatter Bonus:     {stats['bonus_4_scatter']:,} ({stats['bonus_4_scatter']/num_spins*100:.4f}%)")
    print(f"Total FS Triggers:    {stats['free_spin_triggers']:,} ({stats['free_spin_triggers']/num_spins*100:.2f}%)")
    print(f"Total Free Spins:     {stats['total_free_spins']:,}")
    print(f"")
    print(f"--- WILD STATISTICS ---")
    print(f"Wild Explosions:      {stats['wild_explosions']:,}")
    print(f"{'-'*60}\n")

    print(f"{'WIN DISTRIBUTION':^60}")
    print(f"{'-'*60}")
    print(f"Big Wins (10x+):      {stats['big_wins']:,} ({stats['big_wins']/num_spins*100:.3f}%)")
    print(f"Mega Wins (50x+):     {stats['mega_wins']:,} ({stats['mega_wins']/num_spins*100:.4f}%)")
    print(f"Super Mega (100x+):   {stats['super_mega_wins']:,} ({stats['super_mega_wins']/num_spins*100:.4f}%)")
    print(f"Max Win:              {stats['max_win']:.2f}x")
    print(f"{'-'*60}\n")

    if stats['wheel_multipliers']:
        print(f"{'WILD WHEEL DISTRIBUTION':^60}")
        print(f"{'-'*60}")
        total_wheels = sum(stats['wheel_multipliers'].values())
        for mult in sorted(stats['wheel_multipliers'].keys()):
            count = stats['wheel_multipliers'][mult]
            pct = count / total_wheels * 100 if total_wheels > 0 else 0
            print(f"x{mult:4d}:  {count:6,} ({pct:5.2f}%)")
        print(f"{'-'*60}\n")

    # RTP Target check
    target_rtp = 96.0
    diff = rtp - target_rtp
    print(f"{'RTP TARGET CHECK':^60}")
    print(f"{'-'*60}")
    print(f"Target RTP:           {target_rtp:.2f}%")
    print(f"Actual RTP:           {rtp:.2f}%")
    print(f"Difference:           {diff:+.2f}%")
    if abs(diff) <= 1.0:
        print(f"Status:               ✓ WITHIN TARGET (+/- 1%)")
    else:
        print(f"Status:               ✗ NEEDS ADJUSTMENT")
        if diff > 0:
            print(f"Suggestion:           Reduce payouts or symbol weights")
        else:
            print(f"Suggestion:           Increase payouts or symbol weights")
    print(f"{'='*60}\n")

    return {
        'rtp': rtp,
        'base_rtp': base_rtp,
        'fs_rtp': fs_contribution,
        'stats': stats
    }


if __name__ == '__main__':
    num_spins = 100000
    if len(sys.argv) > 1:
        try:
            num_spins = int(sys.argv[1])
        except ValueError:
            print(f"Invalid number of spins: {sys.argv[1]}")
            sys.exit(1)

    run_simulation(num_spins)
