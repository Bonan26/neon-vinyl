"""
NEON VINYL: GHOST GROOVES - Game State Engine
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
    JACKPOT_TIERS
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

    def apply_wild_explosions(self, wild_positions: List[Tuple[int, int]]) -> List[Dict[str, Any]]:
        """
        Apply Wild explosion mechanic: when a Wild tumbles, the Wild cell itself
        plus all 8 adjacent cells (9 total) get their multiplier MULTIPLIED by 64.

        Example: x2 becomes x128, x4 becomes x256, x1 becomes x64

        Args:
            wild_positions: List of positions where Wilds were removed

        Returns:
            List of explosion data for events
        """
        WILD_EXPLOSION_FACTOR = 64  # Multiply existing multiplier by 64
        explosions = []

        # 8-directional: cardinal + diagonals
        directions = [
            (-1, 0), (1, 0), (0, -1), (0, 1),  # cardinal
            (-1, -1), (-1, 1), (1, -1), (1, 1)  # diagonals
        ]

        for wild_row, wild_col in wild_positions:
            affected_cells = []
            cell_details = []  # Track old and new multipliers for animation

            # First, include the Wild cell itself
            old_mult = self.multipliers[wild_row][wild_col]
            new_mult = min(old_mult * WILD_EXPLOSION_FACTOR, MAX_MULTIPLIER)  # Cap at max
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

                # Check bounds
                if 0 <= new_row < self.rows and 0 <= new_col < self.cols:
                    # Multiply existing multiplier by 64
                    old_mult = self.multipliers[new_row][new_col]
                    new_mult = min(old_mult * WILD_EXPLOSION_FACTOR, MAX_MULTIPLIER)
                    self.multipliers[new_row][new_col] = new_mult
                    affected_cells.append([new_row, new_col])
                    cell_details.append({
                        "position": [new_row, new_col],
                        "oldMultiplier": old_mult,
                        "newMultiplier": new_mult
                    })

            max_new_mult = max(d["newMultiplier"] for d in cell_details) if cell_details else WILD_EXPLOSION_FACTOR
            explosions.append({
                "wildPosition": [wild_row, wild_col],
                "affectedCells": affected_cells,
                "cellDetails": cell_details,
                "explosionFactor": WILD_EXPLOSION_FACTOR,
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
        free_spin_mode: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fill empty positions with new symbols.

        Args:
            rng: Provably Fair RNG for new symbols
            positions: Positions to fill
            free_spin_mode: If True, uses free spin weights (more wilds, no scatter)

        Returns:
            List of fill data for animation
        """
        fills = []

        for row, col in positions:
            new_symbol = rng.get_symbol(free_spin_mode)
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
    existing_multipliers: Optional[List[List[int]]] = None
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

    Returns:
        SpinResult with all game data and events
    """
    # Initialize RNG
    rng = create_rng(server_seed, client_seed, nonce)

    # Generate initial grid (different weights for free spins)
    initial_symbols = rng.generate_grid(free_spin_mode)
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
        # DURING FREE SPINS: 2+ scatters = retrigger
        # 2 scatters = +3 spins, 3 scatters = +5 spins, 4+ scatters = +10 spins
        if scatter_count >= 2:
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

        # Process each cluster
        all_winning_positions: List[Tuple[int, int]] = []

        for cluster in clusters:
            # Track max multiplier
            max_multiplier_seen = max(max_multiplier_seen, cluster.multiplier)

            # Calculate payout for this cluster
            cluster_payout = cluster.total_payout * bet_amount
            total_payout += cluster_payout

            # Add win event
            events.append(GameEvent(
                type=EventType.WIN.value,
                data={
                    "clusterId": cluster.cluster_id,
                    "symbol": cluster.symbol.value,
                    "positions": [[r, c] for r, c in cluster.positions],
                    "size": cluster.size,
                    "basePayout": cluster.base_payout,
                    "multiplier": cluster.multiplier,
                    "amount": cluster_payout
                }
            ))

            all_winning_positions.extend(cluster.positions)

        # Upgrade multipliers BEFORE removing symbols
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

        # Remove winning symbols (returns Wild positions)
        wild_positions = grid_state.remove_symbols(all_winning_positions)

        # Apply Wild explosions - set adjacent cells to MAX_MULTIPLIER
        if wild_positions:
            wild_explosions = grid_state.apply_wild_explosions(wild_positions)
            for explosion in wild_explosions:
                events.append(GameEvent(
                    type=EventType.WILD_EXPLOSION.value,
                    data=explosion
                ))
                max_multiplier_seen = max(max_multiplier_seen, explosion["maxNewMultiplier"])

        # Apply gravity
        movements = grid_state.apply_gravity()

        if movements:
            events.append(GameEvent(
                type=EventType.TUMBLE.value,
                data={
                    "movements": movements
                }
            ))

        # Fill empty positions
        empty_positions = grid_state.get_empty_positions()

        if empty_positions:
            fills = grid_state.fill_symbols(rng, empty_positions, free_spin_mode)
            events.append(GameEvent(
                type=EventType.FILL.value,
                data={
                    "fills": fills
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

    # Calculate final payout multiplier
    payout_multiplier = total_payout / bet_amount if bet_amount > 0 else 0.0

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
