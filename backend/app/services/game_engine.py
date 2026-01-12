"""
NEON VINYL: GHOST GROOVES - Core Game Engine
Implements: Grid, BFS Cluster Detection, Spectral Needle Multiplier, Tumble Mechanic
"""
import random
from typing import List, Set, Tuple, Optional, Dict
from dataclasses import dataclass, field
from collections import deque
from copy import deepcopy

from app.models.symbols import Symbol, SYMBOL_CONFIG, get_payout, SymbolTier, SPECIAL_SYMBOLS, WILD_SYMBOL


# Constants
GRID_SIZE = 7
MIN_CLUSTER_SIZE = 5
MAX_MULTIPLIER = 1024

# Wild Wheel multiplier weights (lower weight = rarer)
# This determines what multiplier the wheel can land on
WILD_WHEEL_MULTIPLIERS = [
    (2, 30),      # x2 - most common (30%)
    (4, 25),      # x4 - common (25%)
    (8, 18),      # x8 - uncommon (18%)
    (16, 12),     # x16 - rare (12%)
    (32, 8),      # x32 - very rare (8%)
    (64, 4),      # x64 - epic (4%)
    (128, 2),     # x128 - legendary (2%)
    (256, 0.8),   # x256 - mythic (0.8%)
    (512, 0.15),  # x512 - ultra rare (0.15%)
    (1024, 0.05), # x1024 - jackpot (0.05%)
]

def get_wild_wheel_multiplier() -> int:
    """
    Select a random multiplier for the Wild Wheel based on weighted probabilities.
    Lower weights mean rarer (higher) multipliers.
    """
    total_weight = sum(weight for _, weight in WILD_WHEEL_MULTIPLIERS)
    rand = random.random() * total_weight

    for multiplier, weight in WILD_WHEEL_MULTIPLIERS:
        rand -= weight
        if rand <= 0:
            return multiplier

    return WILD_WHEEL_MULTIPLIERS[0][0]  # Fallback to lowest multiplier

# Free spins configuration
FREE_SPINS_TRIGGER = 3  # Minimum scatters to trigger
FREE_SPINS_AWARDED = {
    3: 10,
    4: 15,
    5: 20,
    6: 25,
}
RETRIGGER_SPINS = 5


@dataclass
class Cell:
    """Represents a single cell in the grid."""
    row: int
    col: int
    symbol: Optional[Symbol] = None
    multiplier: int = 1  # Ghost Spot multiplier (1 = no multiplier, 2, 4, 8... up to 256)
    is_ghost_spot: bool = False

    def __hash__(self):
        return hash((self.row, self.col))

    def __eq__(self, other):
        if not isinstance(other, Cell):
            return False
        return self.row == other.row and self.col == other.col


@dataclass
class Cluster:
    """Represents a winning cluster of symbols."""
    symbol: Symbol
    cells: Set[Tuple[int, int]]  # Set of (row, col) positions
    size: int
    base_payout: float
    combined_multiplier: int  # Highest multiplier from any Ghost Spot in cluster
    total_payout: float


@dataclass
class WildExplosion:
    """Represents a Wild symbol explosion with affected cells."""
    wild_position: Tuple[int, int]  # Position where Wild exploded
    affected_cells: List[Tuple[int, int]]  # Adjacent cells affected by explosion
    wheel_multiplier: int = 64  # The multiplier determined by the Wild Wheel


@dataclass
class TumbleStep:
    """Represents one step in the tumble sequence for animation."""
    clusters_found: List[Cluster]
    cells_removed: List[Tuple[int, int]]
    cells_dropped: List[Tuple[Tuple[int, int], Tuple[int, int]]]  # (from, to) positions
    new_symbols: List[Tuple[Tuple[int, int], Symbol]]  # (position, new_symbol)
    grid_state: List[List[Optional[str]]]  # Grid snapshot after this step
    multiplier_grid: List[List[int]]  # Multiplier values snapshot
    step_payout: float
    wild_explosions: List[WildExplosion] = field(default_factory=list)  # Wild explosions this step


@dataclass
class SpinResult:
    """Complete result of a spin including all tumbles."""
    initial_grid: List[List[str]]
    tumble_steps: List[TumbleStep]
    total_payout: float
    total_multiplier_gained: int
    final_grid: List[List[str]]
    final_multiplier_grid: List[List[int]]


class Grid:
    """7x7 Cluster Pays Grid with Spectral Needle Mechanic."""

    def __init__(self, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)

        # Initialize the grid with cells
        self.cells: List[List[Cell]] = [
            [Cell(row=r, col=c) for c in range(GRID_SIZE)]
            for r in range(GRID_SIZE)
        ]

        # Symbol weights for random generation
        self.symbols = list(SYMBOL_CONFIG.keys())
        self.weights = [SYMBOL_CONFIG[s].weight for s in self.symbols]

        # Fill grid with random symbols
        self._fill_grid()

    def _get_random_symbol(self) -> Symbol:
        """Get a weighted random symbol."""
        return random.choices(self.symbols, weights=self.weights, k=1)[0]

    def _fill_grid(self) -> List[Tuple[Tuple[int, int], Symbol]]:
        """Fill empty cells with random symbols. Returns list of new symbols."""
        new_symbols = []
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                if self.cells[row][col].symbol is None:
                    new_symbol = self._get_random_symbol()
                    self.cells[row][col].symbol = new_symbol
                    new_symbols.append(((row, col), new_symbol))
        return new_symbols

    def get_grid_state(self) -> List[List[str]]:
        """Get current grid as list of symbol names."""
        return [
            [cell.symbol.value if cell.symbol else None for cell in row]
            for row in self.cells
        ]

    def get_multiplier_grid(self) -> List[List[int]]:
        """Get current multiplier values for each cell."""
        return [
            [cell.multiplier for cell in row]
            for row in self.cells
        ]

    def reset_multipliers(self):
        """Reset all multipliers to 1 (start of new spin)."""
        for row in self.cells:
            for cell in row:
                cell.multiplier = 1
                cell.is_ghost_spot = False

    # =========================================================================
    # BFS CLUSTER DETECTION ALGORITHM
    # =========================================================================

    def find_all_clusters(self) -> List[Cluster]:
        """
        Find all winning clusters using BFS.
        A cluster is 5+ identical symbols connected horizontally/vertically.
        Scatter symbols do not form clusters - they trigger free spins instead.

        Algorithm:
        1. Iterate through each cell in the grid
        2. For unvisited cells, perform BFS to find connected symbols
        3. If cluster size >= 5, it's a winning cluster
        4. Calculate payout with combined multipliers from Ghost Spots
        """
        visited: Set[Tuple[int, int]] = set()
        clusters: List[Cluster] = []

        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                if (row, col) in visited:
                    continue

                cell = self.cells[row][col]
                if cell.symbol is None:
                    continue

                # Skip scatter symbols - they don't form clusters
                if cell.symbol == Symbol.SCATTER:
                    visited.add((row, col))
                    continue

                # BFS to find all connected cells with same symbol (wilds included)
                cluster_cells = self._bfs_find_cluster(row, col, cell.symbol, visited)

                if len(cluster_cells) >= MIN_CLUSTER_SIZE:
                    cluster = self._create_cluster(cell.symbol, cluster_cells)
                    clusters.append(cluster)

        return clusters

    def _symbols_match(self, symbol1: Symbol, symbol2: Symbol, target_symbol: Symbol) -> bool:
        """
        Check if two symbols match for cluster purposes.
        Wild symbols match everything except Scatter.
        """
        if symbol1 is None or symbol2 is None:
            return False

        # Scatter never clusters
        if symbol1 == Symbol.SCATTER or symbol2 == Symbol.SCATTER:
            return False

        # Wild matches everything (except scatter)
        if symbol1 == WILD_SYMBOL or symbol2 == WILD_SYMBOL:
            return True

        # Regular match
        return symbol1 == symbol2

    def _bfs_find_cluster(
        self,
        start_row: int,
        start_col: int,
        target_symbol: Symbol,
        global_visited: Set[Tuple[int, int]]
    ) -> Set[Tuple[int, int]]:
        """
        BFS to find all cells connected to (start_row, start_col) with the same symbol.
        Wild symbols can substitute for any regular symbol.

        Uses a queue-based BFS approach:
        - Start from the initial cell
        - Explore all 4 adjacent cells (up, down, left, right)
        - Add matching symbols (including wilds) to the cluster
        - Continue until no more connected symbols found
        """
        cluster_cells: Set[Tuple[int, int]] = set()
        queue = deque([(start_row, start_col)])

        # Local visited set for this BFS exploration
        local_visited: Set[Tuple[int, int]] = set()
        local_visited.add((start_row, start_col))

        # 4-directional movement (no diagonals in cluster pays)
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # up, down, left, right

        while queue:
            row, col = queue.popleft()
            cell = self.cells[row][col]

            # Add if symbol matches target OR is a wild
            if cell.symbol == target_symbol or cell.symbol == WILD_SYMBOL:
                cluster_cells.add((row, col))
                global_visited.add((row, col))

                # Explore neighbors
                for dr, dc in directions:
                    new_row, new_col = row + dr, col + dc

                    # Check bounds
                    if not (0 <= new_row < GRID_SIZE and 0 <= new_col < GRID_SIZE):
                        continue

                    # Check if already visited in this BFS
                    if (new_row, new_col) in local_visited:
                        continue

                    neighbor = self.cells[new_row][new_col]

                    # Check if same symbol or wild
                    if neighbor.symbol == target_symbol or neighbor.symbol == WILD_SYMBOL:
                        local_visited.add((new_row, new_col))
                        queue.append((new_row, new_col))

        return cluster_cells

    def count_scatters(self) -> Tuple[int, List[Tuple[int, int]]]:
        """
        Count scatter symbols on the grid.
        Returns (count, positions).
        """
        count = 0
        positions = []
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                if self.cells[row][col].symbol == Symbol.SCATTER:
                    count += 1
                    positions.append((row, col))
        return count, positions

    def get_free_spins_awarded(self, scatter_count: int) -> int:
        """Get number of free spins for scatter count."""
        if scatter_count < FREE_SPINS_TRIGGER:
            return 0
        # Cap at 6 for lookup
        lookup_count = min(scatter_count, 6)
        return FREE_SPINS_AWARDED.get(lookup_count, FREE_SPINS_AWARDED[6])

    def _create_cluster(self, symbol: Symbol, cells: Set[Tuple[int, int]]) -> Cluster:
        """
        Create a Cluster object with payout calculation.

        SPECTRAL NEEDLE MECHANIC:
        Uses the HIGHEST multiplier from any Ghost Spot in the cluster.
        This prevents exponential growth while still rewarding multiplier stacking.

        Example: Cluster covers spots with x2, x4, x8 = uses x8 multiplier
        """
        size = len(cells)
        base_payout = get_payout(symbol, size)

        # Calculate combined multiplier (MAX of all cell multipliers)
        combined_multiplier = 1
        for row, col in cells:
            cell_multiplier = self.cells[row][col].multiplier
            combined_multiplier = max(combined_multiplier, cell_multiplier)

        total_payout = base_payout * combined_multiplier

        return Cluster(
            symbol=symbol,
            cells=cells,
            size=size,
            base_payout=base_payout,
            combined_multiplier=combined_multiplier,
            total_payout=total_payout
        )

    # =========================================================================
    # SPECTRAL NEEDLE MULTIPLIER MECHANIC
    # =========================================================================

    def apply_ghost_spots(self, cluster_cells: Set[Tuple[int, int]]):
        """
        Apply the Spectral Needle mechanic to winning cells.

        When a cell is part of a winning cluster:
        - If it's NOT a Ghost Spot yet: becomes a Ghost Spot with x2 multiplier
        - If it's ALREADY a Ghost Spot: double its multiplier (up to x256)

        This creates escalating multipliers during tumble sequences!
        """
        for row, col in cluster_cells:
            cell = self.cells[row][col]

            if not cell.is_ghost_spot:
                # First win on this cell: becomes Ghost Spot with x2
                cell.is_ghost_spot = True
                cell.multiplier = 2
            else:
                # Subsequent win: double the multiplier (cap at 256)
                cell.multiplier = min(cell.multiplier * 2, MAX_MULTIPLIER)

    # =========================================================================
    # TUMBLE MECHANIC
    # =========================================================================

    def remove_cluster_symbols(self, clusters: List[Cluster]) -> Tuple[List[Tuple[int, int]], List[Tuple[int, int]]]:
        """
        Remove symbols from winning clusters.
        Returns (removed_positions, wild_positions) - positions where Wilds were removed.
        """
        removed_positions = []
        wild_positions = []

        for cluster in clusters:
            for row, col in cluster.cells:
                cell = self.cells[row][col]
                # Track Wild positions before removing
                if cell.symbol == WILD_SYMBOL:
                    wild_positions.append((row, col))
                cell.symbol = None
                removed_positions.append((row, col))

        return removed_positions, wild_positions

    def apply_wild_explosions(self, wild_positions: List[Tuple[int, int]]) -> List[WildExplosion]:
        """
        Apply Wild explosion mechanic: when a Wild tumbles, all adjacent cells
        get a multiplier determined by the Wild Wheel (random weighted selection).

        Uses 8-directional adjacency (including diagonals).
        Returns list of WildExplosion objects for animation.
        The wheel_multiplier is pre-determined here for provably fair gameplay,
        but the frontend will show a spinning wheel animation.
        """
        explosions = []

        # 8-directional: up, down, left, right, and 4 diagonals
        directions = [
            (-1, 0), (1, 0), (0, -1), (0, 1),  # cardinal
            (-1, -1), (-1, 1), (1, -1), (1, 1)  # diagonals
        ]

        for wild_row, wild_col in wild_positions:
            affected_cells = []

            # Get the wheel multiplier for this Wild explosion
            wheel_multiplier = get_wild_wheel_multiplier()

            for dr, dc in directions:
                new_row, new_col = wild_row + dr, wild_col + dc

                # Check bounds
                if 0 <= new_row < GRID_SIZE and 0 <= new_col < GRID_SIZE:
                    cell = self.cells[new_row][new_col]
                    # Set to the wheel-determined multiplier
                    cell.multiplier = wheel_multiplier
                    cell.is_ghost_spot = True
                    affected_cells.append((new_row, new_col))

            if affected_cells:
                explosions.append(WildExplosion(
                    wild_position=(wild_row, wild_col),
                    affected_cells=affected_cells,
                    wheel_multiplier=wheel_multiplier
                ))

        return explosions

    def apply_gravity(self) -> List[Tuple[Tuple[int, int], Tuple[int, int]]]:
        """
        Apply gravity: symbols fall down to fill empty spaces.
        Returns list of (from_position, to_position) for animation.

        Algorithm:
        - Process each column from bottom to top
        - When an empty cell is found, find the nearest symbol above
        - Move that symbol down (keep multiplier on the cell, not the symbol!)
        """
        movements = []

        for col in range(GRID_SIZE):
            # Find empty spaces and symbols above them
            empty_row = GRID_SIZE - 1  # Start from bottom

            while empty_row >= 0:
                # Find the next empty cell from bottom
                while empty_row >= 0 and self.cells[empty_row][col].symbol is not None:
                    empty_row -= 1

                if empty_row < 0:
                    break

                # Find the next symbol above the empty cell
                symbol_row = empty_row - 1
                while symbol_row >= 0 and self.cells[symbol_row][col].symbol is None:
                    symbol_row -= 1

                if symbol_row < 0:
                    break

                # Move the symbol down
                symbol = self.cells[symbol_row][col].symbol
                self.cells[empty_row][col].symbol = symbol
                self.cells[symbol_row][col].symbol = None

                movements.append(((symbol_row, col), (empty_row, col)))

                # Continue searching from the position above where we just moved from
                empty_row -= 1

        return movements

    # =========================================================================
    # MAIN SPIN EXECUTION
    # =========================================================================

    def execute_spin(self, bet_amount: float = 1.0) -> SpinResult:
        """
        Execute a complete spin with tumble sequence.

        Flow:
        1. Reset multipliers for new spin
        2. Generate new grid
        3. Find clusters
        4. While clusters exist:
           a. Calculate payouts
           b. Apply Ghost Spots (increase multipliers)
           c. Remove winning symbols
           d. Apply gravity
           e. Fill with new symbols
           f. Record tumble step
           g. Find new clusters
        5. Return complete spin result
        """
        # Reset for new spin
        self.reset_multipliers()

        # Fill grid with new symbols
        for row in self.cells:
            for cell in row:
                cell.symbol = None
        self._fill_grid()

        initial_grid = self.get_grid_state()
        tumble_steps: List[TumbleStep] = []
        total_payout = 0.0
        max_multiplier = 1

        # Tumble loop
        while True:
            clusters = self.find_all_clusters()

            if not clusters:
                break

            # Calculate step payout
            step_payout = sum(c.total_payout for c in clusters) * bet_amount

            # Track max multiplier achieved
            for cluster in clusters:
                max_multiplier = max(max_multiplier, cluster.combined_multiplier)

            # Apply Ghost Spots BEFORE removing symbols
            for cluster in clusters:
                self.apply_ghost_spots(cluster.cells)

            # Remove winning symbols (also returns Wild positions)
            cells_removed, wild_positions = self.remove_cluster_symbols(clusters)

            # Apply Wild explosions - set adjacent cells to MAX_MULTIPLIER
            wild_explosions = self.apply_wild_explosions(wild_positions)

            # Apply gravity
            cells_dropped = self.apply_gravity()

            # Fill with new symbols
            new_symbols = self._fill_grid()

            # Record this tumble step
            tumble_step = TumbleStep(
                clusters_found=[
                    Cluster(
                        symbol=c.symbol,
                        cells=c.cells,
                        size=c.size,
                        base_payout=c.base_payout,
                        combined_multiplier=c.combined_multiplier,
                        total_payout=c.total_payout * bet_amount
                    ) for c in clusters
                ],
                cells_removed=cells_removed,
                cells_dropped=cells_dropped,
                new_symbols=new_symbols,
                grid_state=self.get_grid_state(),
                multiplier_grid=self.get_multiplier_grid(),
                step_payout=step_payout,
                wild_explosions=wild_explosions
            )
            tumble_steps.append(tumble_step)
            total_payout += step_payout

        return SpinResult(
            initial_grid=initial_grid,
            tumble_steps=tumble_steps,
            total_payout=total_payout,
            total_multiplier_gained=max_multiplier,
            final_grid=self.get_grid_state(),
            final_multiplier_grid=self.get_multiplier_grid()
        )


# =========================================================================
# HELPER FUNCTIONS FOR DEBUGGING / VISUALIZATION
# =========================================================================

def print_grid(grid: Grid, show_multipliers: bool = False):
    """Print the grid in a readable format."""
    symbol_chars = {
        Symbol.DJ_SPOOKY: "DJ",
        Symbol.GOLD_VINYL: "GV",
        Symbol.HEADPHONES: "HP",
        Symbol.CASSETTE: "CS",
        Symbol.MUSIC_NOTE_PINK: "P ",
        Symbol.MUSIC_NOTE_BLUE: "B ",
        Symbol.MUSIC_NOTE_PURPLE: "U ",
    }

    print("\n" + "=" * 35)
    for row in range(GRID_SIZE):
        row_str = "|"
        for col in range(GRID_SIZE):
            cell = grid.cells[row][col]
            if cell.symbol:
                char = symbol_chars.get(cell.symbol, "??")
                if show_multipliers and cell.multiplier > 1:
                    row_str += f"{char}x{cell.multiplier}|"
                else:
                    row_str += f" {char} |"
            else:
                row_str += " -- |"
        print(row_str)
    print("=" * 35)


def demo_spin():
    """Demonstrate a spin with the game engine."""
    print("\n🎰 NEON VINYL: GHOST GROOVES - Demo Spin 🎰\n")

    # Create grid with seed for reproducibility
    grid = Grid(seed=42)

    print("Initial Grid:")
    print_grid(grid)

    # Execute spin
    result = grid.execute_spin(bet_amount=1.0)

    print(f"\n📊 Spin Results:")
    print(f"   Tumble Steps: {len(result.tumble_steps)}")
    print(f"   Total Payout: {result.total_payout:.2f}x")
    print(f"   Max Multiplier: {result.total_multiplier_gained}x")

    for i, step in enumerate(result.tumble_steps):
        print(f"\n--- Tumble {i + 1} ---")
        print(f"   Clusters: {len(step.clusters_found)}")
        for cluster in step.clusters_found:
            print(f"      {cluster.symbol.value}: {cluster.size} symbols, "
                  f"base={cluster.base_payout:.2f}x, "
                  f"mult={cluster.combined_multiplier}x, "
                  f"total={cluster.total_payout:.2f}x")
        print(f"   Step Payout: {step.step_payout:.2f}x")

    print("\nFinal Grid (with multipliers):")
    print_grid(grid, show_multipliers=True)


if __name__ == "__main__":
    demo_spin()
