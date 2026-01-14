"""
Wolfie Groove - Game State Engine
Stake Engine (Carrot) Standard - Math SDK Core

This module contains the deterministic game logic.
The run_spin() function is the heart of the Stake Engine.

IMPORTANT: All logic here is DETERMINISTIC and STATELESS.
Given the same seeds, the same result will always be produced.
"""
from typing import List, Dict, Set, Tuple, Optional, Any
from dataclasses import dataclass, field
from collections import deque
from enum import Enum

from app.game_config import (
    Symbol, EventType, get_payout,
    GRID_ROWS, GRID_COLS, MIN_CLUSTER_SIZE,
    INITIAL_MULTIPLIER, GHOST_SPOT_BASE, MULTIPLIER_GROWTH, MAX_MULTIPLIER,
    SPECIAL_SYMBOLS, SCATTER_FREE_SPINS, SCATTER_RETRIGGER, FREE_SPIN_RETRIGGER,
    JACKPOT_TIERS, MAX_WIN_MULTIPLIER
)
from app.random_generator import ProvablyFairRNG, create_rng, SeedData


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class GameEvent:
    """
    Represents a single game event for the Stake Engine events system.

    Event Types:
    - reveal: Initial grid reveal
    - win: Cluster win with payout
    - multiplier_upgrade: Ghost spot multiplier increase
    - tumble: Symbols falling after win removal
    - fill: New symbols filling empty positions
    """
    type: str
    data: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Serialize event for API response."""
        return {
            "type": self.type,
            **self.data
        }


@dataclass
class Cluster:
    """Represents a winning cluster of symbols."""
    cluster_id: int
    symbol: Symbol
    positions: List[Tuple[int, int]]  # List of (row, col)
    size: int
    base_payout: float
    multiplier: int
    total_payout: float


@dataclass
class SpinResult:
    """
    Complete result of a spin for Stake Engine.

    Contains all information needed for:
    - API response
    - Client animation
    - Provably fair verification
    """
    payout_multiplier: float          # Total payout as multiplier of bet
    events: List[GameEvent]           # Ordered list of game events
    initial_grid: List[List[str]]     # Starting grid (symbol values)
    final_grid: List[List[str]]       # Ending grid (symbol values)
    final_multipliers: List[List[int]]  # Final multiplier grid
    tumble_count: int                 # Number of tumbles
    max_multiplier: int               # Highest multiplier achieved
    seed_data: SeedData               # For provably fair verification
    # Free Spins
    free_spins_triggered: int = 0     # Free spins awarded (0 if none)
    free_spins_remaining: int = 0     # Remaining free spins
    is_free_spin: bool = False        # Whether this was a free spin
    # Jackpot
    jackpot_won: Optional[str] = None  # Jackpot tier won (if any)
    jackpot_amount: float = 0.0        # Jackpot amount won

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for API response."""
        result = {
            "payoutMultiplier": self.payout_multiplier,
            "events": [e.to_dict() for e in self.events],
            "initialGrid": self.initial_grid,
            "finalGrid": self.final_grid,
            "finalMultipliers": self.final_multipliers,
            "tumbleCount": self.tumble_count,
            "maxMultiplier": self.max_multiplier,
            "seedInfo": self.seed_data.to_dict(),
            "freeSpinsTriggered": self.free_spins_triggered,
            "freeSpinsRemaining": self.free_spins_remaining,
            "isFreeSpin": self.is_free_spin,
        }
        if self.jackpot_won:
            result["jackpotWon"] = self.jackpot_won
            result["jackpotAmount"] = self.jackpot_amount
        return result


# =============================================================================
# GRID STATE (Internal Use)
# =============================================================================

class GridState:
    """
    Internal grid state manager for spin execution.

    Manages:
    - Symbol positions
    - Ghost spot multipliers
    - Cluster detection (BFS)
    - Tumble mechanics
    """

    def __init__(self, initial_grid: List[List[Symbol]]):
        """
        Initialize grid state.

        Args:
            initial_grid: 2D list of Symbols from RNG
        """
        self.rows = GRID_ROWS
        self.cols = GRID_COLS

        # Symbol grid (can be None for empty cells)
        self.symbols: List[List[Optional[Symbol]]] = [
            [s for s in row] for row in initial_grid
        ]

        # Multiplier grid (Ghost Spots)
        self.multipliers: List[List[int]] = [
            [INITIAL_MULTIPLIER for _ in range(self.cols)]
            for _ in range(self.rows)
        ]

    def get_symbol_grid(self) -> List[List[str]]:
        """Get grid as symbol value strings."""
        return [
            [s.value if s else "" for s in row]
            for row in self.symbols
        ]

    def get_multiplier_grid(self) -> List[List[int]]:
        """Get current multiplier values."""
        return [row[:] for row in self.multipliers]

    # =========================================================================
    # BFS CLUSTER DETECTION (with Wild Symbol Support)
    # =========================================================================

    def _symbols_match(self, symbol1: Optional[Symbol], symbol2: Optional[Symbol]) -> bool:
        """
        Check if two symbols match for cluster purposes.
        Wild (WD) matches any regular symbol (not Scatter).
        """
        if symbol1 is None or symbol2 is None:
            return False

        # Both are the same symbol
        if symbol1 == symbol2:
            return True

        # Scatter never matches anything else
        if symbol1 == Symbol.SCATTER or symbol2 == Symbol.SCATTER:
            return False

        # Wild matches any non-scatter symbol
        if symbol1 == Symbol.WILD or symbol2 == Symbol.WILD:
            return True

        return False

    def _get_cluster_symbol(self, positions: List[Tuple[int, int]]) -> Symbol:
        """
        Get the representative symbol for a cluster.
        If cluster contains Wilds, return the non-Wild symbol.
        If all Wilds, return Wild.
        """
        for row, col in positions:
            symbol = self.symbols[row][col]
            if symbol and symbol != Symbol.WILD:
                return symbol
        return Symbol.WILD

    def find_all_clusters(self) -> List[Cluster]:
        """
        Find all winning clusters using BFS.

        A cluster is MIN_CLUSTER_SIZE+ symbols connected
        horizontally or vertically (no diagonals).
        Wild symbols (WD) match any regular symbol.
        Scatter symbols (SC) don't form clusters.

        Returns:
            List of Cluster objects for winning combinations
        """
        visited: Set[Tuple[int, int]] = set()
        clusters: List[Cluster] = []
        cluster_id = 0

        for row in range(self.rows):
            for col in range(self.cols):
                if (row, col) in visited:
                    continue

                symbol = self.symbols[row][col]
                if symbol is None:
                    continue

                # Scatter symbols don't form clusters
                if symbol == Symbol.SCATTER:
                    visited.add((row, col))
                    continue

                # BFS to find connected cells (with Wild support)
                cluster_positions = self._bfs_cluster(row, col, symbol, visited)

                if len(cluster_positions) >= MIN_CLUSTER_SIZE:
                    # Get the representative symbol (non-Wild if possible)
                    cluster_symbol = self._get_cluster_symbol(cluster_positions)
                    cluster = self._create_cluster(cluster_id, cluster_symbol, cluster_positions)
                    clusters.append(cluster)
                    cluster_id += 1

        return clusters

    def _bfs_cluster(
        self,
        start_row: int,
        start_col: int,
        target_symbol: Symbol,
        global_visited: Set[Tuple[int, int]]
    ) -> List[Tuple[int, int]]:
        """
        BFS to find all connected cells with matching symbols.
        Wild symbols match any regular symbol.

        Args:
            start_row: Starting row
            start_col: Starting column
            target_symbol: Symbol to match (or Wild)
            global_visited: Set of already visited cells

        Returns:
            List of (row, col) positions in the cluster
        """
        cluster_positions: List[Tuple[int, int]] = []
        queue = deque([(start_row, start_col)])
        local_visited: Set[Tuple[int, int]] = {(start_row, start_col)}

        # 4-directional movement
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

        # If starting with Wild, we need to find the actual symbol to match
        # by exploring neighbors first
        actual_target = target_symbol

        while queue:
            row, col = queue.popleft()
            cell_symbol = self.symbols[row][col]

            # Check if this cell matches our target (with Wild support)
            if self._symbols_match(cell_symbol, actual_target):
                cluster_positions.append((row, col))
                global_visited.add((row, col))

                # If we found a non-Wild symbol, update target
                if actual_target == Symbol.WILD and cell_symbol != Symbol.WILD:
                    actual_target = cell_symbol

                # Explore neighbors
                for dr, dc in directions:
                    new_row, new_col = row + dr, col + dc

                    # Bounds check
                    if not (0 <= new_row < self.rows and 0 <= new_col < self.cols):
                        continue

                    # Already visited check
                    if (new_row, new_col) in local_visited:
                        continue

                    neighbor_symbol = self.symbols[new_row][new_col]

                    # Check match (with Wild support)
                    if self._symbols_match(neighbor_symbol, actual_target):
                        local_visited.add((new_row, new_col))
                        queue.append((new_row, new_col))

        return cluster_positions

    def count_scatters(self) -> Tuple[int, List[Tuple[int, int]]]:
        """
        Count scatter symbols on the grid.

        Returns:
            Tuple of (count, positions)
        """
        scatter_positions = []
        for row in range(self.rows):
            for col in range(self.cols):
                if self.symbols[row][col] == Symbol.SCATTER:
                    scatter_positions.append((row, col))
        return len(scatter_positions), scatter_positions

    def _create_cluster(
        self,
        cluster_id: int,
        symbol: Symbol,
        positions: List[Tuple[int, int]]
    ) -> Cluster:
        """
        Create a Cluster object with payout calculation.

        Uses MAX multiplier from any position in the cluster.
        """
        size = len(positions)
        base_payout = get_payout(symbol, size)

        # Get highest multiplier in cluster
        max_mult = max(self.multipliers[r][c] for r, c in positions)

        total_payout = base_payout * max_mult

        return Cluster(
            cluster_id=cluster_id,
            symbol=symbol,
            positions=positions,
            size=size,
            base_payout=base_payout,
            multiplier=max_mult,
            total_payout=total_payout
        )

    # =========================================================================
    # GHOST SPOT (MULTIPLIER) MECHANICS
    # =========================================================================

    def upgrade_multipliers(self, positions: List[Tuple[int, int]]) -> List[Tuple[Tuple[int, int], int]]:
        """
        Upgrade multipliers for winning positions (Spectral Needle).

        Args:
            positions: List of winning cell positions

        Returns:
            List of ((row, col), new_multiplier) for upgraded cells
        """
        upgrades = []

        for row, col in positions:
            current = self.multipliers[row][col]

            if current == INITIAL_MULTIPLIER:
                # First win: becomes ghost spot with base multiplier
                new_mult = GHOST_SPOT_BASE
            else:
                # Subsequent win: double the multiplier
                new_mult = min(current * MULTIPLIER_GROWTH, MAX_MULTIPLIER)

            if new_mult != current:
                self.multipliers[row][col] = new_mult
                upgrades.append(((row, col), new_mult))

        return upgrades

    # =========================================================================
    # TUMBLE MECHANICS
    # =========================================================================

    def remove_symbols(self, positions: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """
        Remove symbols at specified positions.

        Returns:
            List of Wild positions that were removed (for explosion effect)
        """
        wild_positions = []
        for row, col in positions:
            if self.symbols[row][col] == Symbol.WILD:
                wild_positions.append((row, col))
            self.symbols[row][col] = None
        return wild_positions

    def apply_wild_explosions(self, wild_positions: List[Tuple[int, int]], rng) -> List[Dict[str, Any]]:
        """
        Apply Wild Wheel mechanic: when a Wild tumbles, a wheel spins to determine
        the multiplier for the Wild cell and all 8 adjacent cells (9 total).

        Wheel probabilities (weighted):
        - x2: 35%, x4: 25%, x8: 18%, x16: 10%
        - x32: 6%, x64: 3.5%, x128: 1.5%, x256: 1%

        Args:
            wild_positions: List of positions where Wilds were removed
            rng: Provably fair RNG for wheel spin

        Returns:
            List of explosion data for events
        """
        # Wheel multipliers with weights (higher weight = more common)
        WHEEL_OPTIONS = [
            (2, 35),     # x2: 35%
            (4, 25),     # x4: 25%
            (8, 18),     # x8: 18%
            (16, 10),    # x16: 10%
            (32, 6),     # x32: 6%
            (64, 3.5),   # x64: 3.5%
            (128, 1.5),  # x128: 1.5%
            (256, 1),    # x256: 1%
        ]
        TOTAL_WEIGHT = sum(w for _, w in WHEEL_OPTIONS)

        explosions = []

        # 8-directional: cardinal + diagonals
        directions = [
            (-1, 0), (1, 0), (0, -1), (0, 1),  # cardinal
            (-1, -1), (-1, 1), (1, -1), (1, 1)  # diagonals
        ]

        for wild_row, wild_col in wild_positions:
            affected_cells = []
            cell_details = []

            # Spin the wheel (provably fair)
            wheel_roll = rng.random_float() * TOTAL_WEIGHT
            wheel_multiplier = WHEEL_OPTIONS[0][0]
            for mult, weight in WHEEL_OPTIONS:
                wheel_roll -= weight
                if wheel_roll <= 0:
                    wheel_multiplier = mult
                    break

            # First, include the Wild cell itself
            # SET multiplier to wheel value (take max of current vs wheel, don't multiply)
            old_mult = self.multipliers[wild_row][wild_col]
            new_mult = max(old_mult, wheel_multiplier)  # Take higher value, don't compound
            self.multipliers[wild_row][wild_col] = new_mult
            affected_cells.append([wild_row, wild_col])
            cell_details.append({
                "position": [wild_row, wild_col],
                "oldMultiplier": old_mult,
                "newMultiplier": new_mult
            })

            # Then add all 8 adjacent cells
            for dr, dc in directions:
                new_row, new_col = wild_row + dr, wild_col + dc

                if 0 <= new_row < self.rows and 0 <= new_col < self.cols:
                    old_mult = self.multipliers[new_row][new_col]
                    new_mult = max(old_mult, wheel_multiplier)  # Take higher value, don't compound
                    self.multipliers[new_row][new_col] = new_mult
                    affected_cells.append([new_row, new_col])
                    cell_details.append({
                        "position": [new_row, new_col],
                        "oldMultiplier": old_mult,
                        "newMultiplier": new_mult
                    })

            max_new_mult = max(d["newMultiplier"] for d in cell_details) if cell_details else wheel_multiplier
            explosions.append({
                "wildPosition": [wild_row, wild_col],
                "affectedCells": affected_cells,
                "cellDetails": cell_details,
                "wheelMultiplier": wheel_multiplier,
                "maxNewMultiplier": max_new_mult
            })

        return explosions

    def apply_gravity(self) -> List[Dict[str, Any]]:
        """
        Apply gravity: symbols fall down to fill empty spaces.

        Returns:
            List of movement data for animation
        """
        movements = []

        for col in range(self.cols):
            # Find empty spaces and drop symbols
            empty_row = self.rows - 1

            while empty_row >= 0:
                # Find next empty cell from bottom
                while empty_row >= 0 and self.symbols[empty_row][col] is not None:
                    empty_row -= 1

                if empty_row < 0:
                    break

                # Find symbol above to drop
                symbol_row = empty_row - 1
                while symbol_row >= 0 and self.symbols[symbol_row][col] is None:
                    symbol_row -= 1

                if symbol_row < 0:
                    break

                # Move symbol down
                symbol = self.symbols[symbol_row][col]
                self.symbols[empty_row][col] = symbol
                self.symbols[symbol_row][col] = None

                movements.append({
                    "from": [symbol_row, col],
                    "to": [empty_row, col],
                    "symbol": symbol.value
                })

                empty_row -= 1

        return movements

    def get_empty_positions(self) -> List[Tuple[int, int]]:
        """Get all empty cell positions (top to bottom, left to right)."""
        empty = []
        for row in range(self.rows):
            for col in range(self.cols):
                if self.symbols[row][col] is None:
                    empty.append((row, col))
        return empty

    def fill_symbols(
        self,
        rng: ProvablyFairRNG,
        positions: List[Tuple[int, int]],
        free_spin_mode: bool = False,
        scatter_boost: bool = False,
        wild_boost: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fill empty positions with new symbols.

        Args:
            rng: Provably Fair RNG for new symbols
            positions: Positions to fill
            free_spin_mode: If True, uses free spin weights (more wilds, no scatter)
            scatter_boost: If True, 3x scatter probability
            wild_boost: If True, 5x wild probability

        Returns:
            List of fill data for animation
        """
        fills = []

        for row, col in positions:
            new_symbol = rng.get_symbol(free_spin_mode, scatter_boost, wild_boost)
            self.symbols[row][col] = new_symbol
            fills.append({
                "position": [row, col],
                "symbol": new_symbol.value
            })

        return fills


# =============================================================================
# MAIN SPIN FUNCTION (STAKE ENGINE HEART)
# =============================================================================

def check_jackpot(rng: ProvablyFairRNG, bet_amount: float) -> Tuple[Optional[str], float]:
    """
    Check if a jackpot was hit based on RNG and bet amount.

    Args:
        rng: The RNG instance for deterministic jackpot check
        bet_amount: Bet amount to determine eligibility

    Returns:
        Tuple of (jackpot_tier or None, jackpot_amount)
    """
    from app.game_config import MIN_BET

    # Check each jackpot tier (from highest to lowest)
    for tier_id in ["grand", "major", "minor", "mini"]:
        tier = JACKPOT_TIERS[tier_id]

        # Check bet eligibility
        min_required_bet = tier.min_bet_multiplier * MIN_BET
        if bet_amount < min_required_bet:
            continue

        # Roll for jackpot
        roll = rng.random_float()
        if roll < tier.trigger_chance:
            # Won this jackpot tier!
            # Calculate jackpot amount (seed + accumulated)
            # For now, return seed amount (in production, track accumulated)
            jackpot_amount = tier.seed_amount * (bet_amount / MIN_BET)
            return tier_id, jackpot_amount

    return None, 0.0


def run_spin(
    server_seed: str,
    client_seed: str,
    nonce: int,
    bet_amount: float = 1.0,
    free_spin_mode: bool = False,
    free_spins_remaining: int = 0,
    existing_multipliers: Optional[List[List[int]]] = None,
    scatter_boost: bool = False,
    wild_boost: bool = False,
    forced_wild_positions: Optional[List[tuple]] = None
) -> SpinResult:
    """
    Execute a complete spin with the Stake Engine.

    This function is:
    - DETERMINISTIC: Same seeds = same result
    - STATELESS: No external state dependencies
    - PROVABLY FAIR: Results can be verified with seeds

    Args:
        server_seed: Server-generated secret seed
        client_seed: Client-provided seed
        nonce: Incrementing bet counter
        bet_amount: Bet amount (for payout calculation)
        free_spin_mode: Whether this is a free spin (different weights)
        free_spins_remaining: Remaining free spins before this spin
        existing_multipliers: Carry over multipliers from previous free spins
        scatter_boost: If True, 3x scatter probability
        wild_boost: If True, 5x wild probability

    Returns:
        SpinResult with all game data and events
    """
    # Initialize RNG
    rng = create_rng(server_seed, client_seed, nonce)

    # Generate initial grid (different weights for free spins and boosts)
    initial_symbols = rng.generate_grid(free_spin_mode, scatter_boost, wild_boost)

    # Apply forced wilds (Wolf Burst feature)
    if forced_wild_positions:
        for row, col in forced_wild_positions:
            if 0 <= row < GRID_ROWS and 0 <= col < GRID_COLS:
                initial_symbols[row][col] = Symbol.WILD

    grid_state = GridState(initial_symbols)

    # Restore multipliers during free spins
    if existing_multipliers:
        for row in range(GRID_ROWS):
            for col in range(GRID_COLS):
                grid_state.multipliers[row][col] = existing_multipliers[row][col]

    # Store initial state
    initial_grid = grid_state.get_symbol_grid()

    # Event collection
    events: List[GameEvent] = []

    # Add reveal event
    events.append(GameEvent(
        type=EventType.REVEAL.value,
        data={
            "positions": [[r, c] for r in range(GRID_ROWS) for c in range(GRID_COLS)],
            "symbols": [s for row in initial_grid for s in row]
        }
    ))

    # Check for scatters (free spins trigger/retrigger) on initial grid
    scatter_count, scatter_positions = grid_state.count_scatters()
    free_spins_triggered = 0

    # Different scatter rules for base game vs free spins
    if free_spin_mode:
        # DURING FREE SPINS: 3+ scatters = retrigger
        # 3 scatters = +5 spins, 4 scatters = +8 spins, 5+ scatters = +10 spins
        if scatter_count >= 3:
            free_spins_triggered = SCATTER_RETRIGGER.get(
                min(scatter_count, 6),
                SCATTER_RETRIGGER[6]  # Cap at 6
            )

            # Add retrigger event
            events.append(GameEvent(
                type=EventType.FREE_SPINS_TRIGGER.value,
                data={
                    "scatterCount": scatter_count,
                    "positions": [[r, c] for r, c in scatter_positions],
                    "freeSpinsAwarded": free_spins_triggered,
                    "isRetrigger": True
                }
            ))
    else:
        # BASE GAME: 3+ scatters = trigger bonus
        # 3 scatters = 8 spins (standard), 4+ scatters = 12 spins (super)
        if scatter_count >= 3:
            free_spins_triggered = SCATTER_FREE_SPINS.get(
                min(scatter_count, 6),
                SCATTER_FREE_SPINS[6]  # Cap at 6
            )

            # Add free spins trigger event
            events.append(GameEvent(
                type=EventType.FREE_SPINS_TRIGGER.value,
                data={
                    "scatterCount": scatter_count,
                    "positions": [[r, c] for r, c in scatter_positions],
                    "freeSpinsAwarded": free_spins_triggered,
                    "isRetrigger": False
                }
            ))

    # Tracking variables
    total_payout = 0.0
    tumble_count = 0
    max_multiplier_seen = 1

    # Tumble loop
    while True:
        # Find winning clusters
        clusters = grid_state.find_all_clusters()

        if not clusters:
            break

        tumble_count += 1

        # Collect all winning positions and find Wilds FIRST
        all_winning_positions: List[Tuple[int, int]] = []
        wild_positions_in_clusters: List[Tuple[int, int]] = []

        for cluster in clusters:
            all_winning_positions.extend(cluster.positions)
            # Find Wild positions in this cluster
            for row, col in cluster.positions:
                if grid_state.symbols[row][col] == Symbol.WILD:
                    if (row, col) not in wild_positions_in_clusters:
                        wild_positions_in_clusters.append((row, col))

        # STEP 1: Process Wild explosions FIRST (before calculating wins)
        # This applies multipliers to the 9 cells around each Wild
        if wild_positions_in_clusters:
            wild_explosions = grid_state.apply_wild_explosions(wild_positions_in_clusters, rng)
            for explosion in wild_explosions:
                events.append(GameEvent(
                    type=EventType.WILD_EXPLOSION.value,
                    data=explosion
                ))
                max_multiplier_seen = max(max_multiplier_seen, explosion["maxNewMultiplier"])

        # STEP 2: Recalculate clusters with NEW multipliers after Wild explosion
        # We need to recalculate payouts since multipliers have changed
        for cluster in clusters:
            # Recalculate the max multiplier in this cluster (may have increased from Wild explosion)
            new_max_mult = max(grid_state.multipliers[r][c] for r, c in cluster.positions)
            new_total_payout = cluster.base_payout * new_max_mult

            # Track max multiplier
            max_multiplier_seen = max(max_multiplier_seen, new_max_mult)

            # Calculate payout for this cluster with updated multiplier
            cluster_payout = new_total_payout * bet_amount
            total_payout += cluster_payout

            # Add win event with updated multiplier
            events.append(GameEvent(
                type=EventType.WIN.value,
                data={
                    "clusterId": cluster.cluster_id,
                    "symbol": cluster.symbol.value,
                    "positions": [[r, c] for r, c in cluster.positions],
                    "size": cluster.size,
                    "basePayout": cluster.base_payout,
                    "multiplier": new_max_mult,
                    "amount": cluster_payout
                }
            ))

        # STEP 3: Upgrade multipliers for winning positions (ghost spots)
        upgrades = grid_state.upgrade_multipliers(all_winning_positions)

        # Add multiplier upgrade events
        for (row, col), new_value in upgrades:
            events.append(GameEvent(
                type=EventType.MULTIPLIER_UPGRADE.value,
                data={
                    "position": [row, col],
                    "value": new_value
                }
            ))
            max_multiplier_seen = max(max_multiplier_seen, new_value)

        # STEP 4: Remove winning symbols (Wilds already processed, no explosion here)
        grid_state.remove_symbols(all_winning_positions)

        # Apply gravity
        movements = grid_state.apply_gravity()

        if movements:
            events.append(GameEvent(
                type=EventType.TUMBLE.value,
                data={
                    "movements": movements
                }
            ))

        # Fill empty positions (with boost if active)
        empty_positions = grid_state.get_empty_positions()

        if empty_positions:
            fills = grid_state.fill_symbols(rng, empty_positions, free_spin_mode, scatter_boost, wild_boost)
            events.append(GameEvent(
                type=EventType.FILL.value,
                data={
                    "fills": fills
                }
            ))

            # Check for NEW scatters after fill (accumulate across tumbles)
            new_scatter_count, new_scatter_positions = grid_state.count_scatters()

            # Only check if we haven't already triggered free spins this spin
            if free_spins_triggered == 0:
                if free_spin_mode:
                    # DURING FREE SPINS: 3+ scatters = retrigger
                    if new_scatter_count >= 3:
                        free_spins_triggered = SCATTER_RETRIGGER.get(
                            min(new_scatter_count, 6),
                            SCATTER_RETRIGGER[6]
                        )
                        events.append(GameEvent(
                            type=EventType.FREE_SPINS_TRIGGER.value,
                            data={
                                "scatterCount": new_scatter_count,
                                "positions": [[r, c] for r, c in new_scatter_positions],
                                "freeSpinsAwarded": free_spins_triggered,
                                "isRetrigger": True
                            }
                        ))
                else:
                    # BASE GAME: 3+ scatters = trigger bonus
                    if new_scatter_count >= 3:
                        free_spins_triggered = SCATTER_FREE_SPINS.get(
                            min(new_scatter_count, 6),
                            SCATTER_FREE_SPINS[6]
                        )
                        events.append(GameEvent(
                            type=EventType.FREE_SPINS_TRIGGER.value,
                            data={
                                "scatterCount": new_scatter_count,
                                "positions": [[r, c] for r, c in new_scatter_positions],
                                "freeSpinsAwarded": free_spins_triggered,
                                "isRetrigger": False
                            }
                        ))

    # Check for jackpot (only on base game, not free spins)
    jackpot_won = None
    jackpot_amount = 0.0
    if not free_spin_mode:
        jackpot_won, jackpot_amount = check_jackpot(rng, bet_amount)
        if jackpot_won:
            events.append(GameEvent(
                type=EventType.JACKPOT_WIN.value,
                data={
                    "tier": jackpot_won,
                    "amount": jackpot_amount
                }
            ))
            total_payout += jackpot_amount

    # Calculate final payout multiplier (capped at MAX_WIN_MULTIPLIER)
    payout_multiplier = total_payout / bet_amount if bet_amount > 0 else 0.0
    payout_multiplier = min(payout_multiplier, MAX_WIN_MULTIPLIER)

    # Calculate remaining free spins
    new_remaining = free_spins_remaining - 1 if free_spin_mode else 0
    if free_spins_triggered > 0:
        new_remaining = max(new_remaining, 0) + free_spins_triggered

    return SpinResult(
        payout_multiplier=payout_multiplier,
        events=events,
        initial_grid=initial_grid,
        final_grid=grid_state.get_symbol_grid(),
        final_multipliers=grid_state.get_multiplier_grid(),
        tumble_count=tumble_count,
        max_multiplier=max_multiplier_seen,
        seed_data=rng.seed_data,
        free_spins_triggered=free_spins_triggered,
        free_spins_remaining=new_remaining,
        is_free_spin=free_spin_mode,
        jackpot_won=jackpot_won,
        jackpot_amount=jackpot_amount
    )


# =============================================================================
# VERIFICATION FUNCTION
# =============================================================================

def verify_spin(
    server_seed: str,
    client_seed: str,
    nonce: int,
    expected_payout: float,
    bet_amount: float = 1.0
) -> Tuple[bool, SpinResult]:
    """
    Verify a spin result for provably fair validation.

    Args:
        server_seed: Revealed server seed
        client_seed: Client seed used
        nonce: Nonce used
        expected_payout: The payout that was claimed
        bet_amount: Bet amount used

    Returns:
        Tuple of (is_valid, regenerated_result)
    """
    result = run_spin(server_seed, client_seed, nonce, bet_amount)
    is_valid = abs(result.payout_multiplier - expected_payout) < 0.001

    return is_valid, result


# =============================================================================
# BONUS TRIGGER SPIN (Forced Scatters)
# =============================================================================

def run_bonus_trigger_spin(
    server_seed: str,
    client_seed: str,
    nonce: int,
    bet_amount: float,
    scatter_count: int = 3
) -> SpinResult:
    """
    Execute a spin that is guaranteed to land on exactly scatter_count scatters.
    Used when buying a bonus - shows the grid spinning and landing on scatters.

    Args:
        server_seed: Server-generated secret seed
        client_seed: Client-provided seed
        nonce: Incrementing bet counter
        bet_amount: Bet amount
        scatter_count: Number of scatters to force (3 or 4)

    Returns:
        SpinResult with scatters on the grid (no tumble processing)
    """
    import random as py_random

    # Initialize RNG
    rng = create_rng(server_seed, client_seed, nonce)

    # Generate initial grid (base game weights)
    initial_symbols = rng.generate_grid(free_spin_mode=False)
    grid_state = GridState(initial_symbols)

    # Force exactly scatter_count scatters on random positions
    # First, remove any existing scatters
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            if grid_state.symbols[row][col] == Symbol.SCATTER:
                # Replace with a random non-scatter symbol
                grid_state.symbols[row][col] = rng.get_symbol(free_spin_mode=True)

    # Now place exactly scatter_count scatters at random positions
    # Use a seeded random for reproducibility
    py_random.seed(f"{server_seed}{client_seed}{nonce}")
    all_positions = [(r, c) for r in range(GRID_ROWS) for c in range(GRID_COLS)]
    scatter_positions = py_random.sample(all_positions, scatter_count)

    for row, col in scatter_positions:
        grid_state.symbols[row][col] = Symbol.SCATTER

    # Store final grid state
    final_grid = grid_state.get_symbol_grid()

    # Event collection
    events: List[GameEvent] = []

    # Add reveal event
    events.append(GameEvent(
        type=EventType.REVEAL.value,
        data={
            "positions": [[r, c] for r in range(GRID_ROWS) for c in range(GRID_COLS)],
            "symbols": [s for row in final_grid for s in row]
        }
    ))

    # Determine free spins from scatter count
    free_spins_triggered = SCATTER_FREE_SPINS.get(
        min(scatter_count, 6),
        SCATTER_FREE_SPINS[6]
    )

    # Add free spins trigger event
    events.append(GameEvent(
        type=EventType.FREE_SPINS_TRIGGER.value,
        data={
            "scatterCount": scatter_count,
            "positions": [[r, c] for r, c in scatter_positions],
            "freeSpinsAwarded": free_spins_triggered,
            "isRetrigger": False,
            "isBonusBuy": True
        }
    ))

    return SpinResult(
        payout_multiplier=0.0,  # No payout for trigger spin
        events=events,
        initial_grid=final_grid,  # Same as final (no tumbles)
        final_grid=final_grid,
        final_multipliers=grid_state.get_multiplier_grid(),
        tumble_count=0,
        max_multiplier=1,
        seed_data=rng.seed_data,
        free_spins_triggered=free_spins_triggered,
        free_spins_remaining=free_spins_triggered,
        is_free_spin=False,
        jackpot_won=None,
        jackpot_amount=0.0
    )
