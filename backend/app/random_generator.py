"""
NEON VINYL: GHOST GROOVES - Provably Fair Random Number Generator
Stake Engine (Carrot) Standard - Cryptographic RNG

Uses HMAC-SHA256 for transparent, verifiable randomness.
Players can verify results using: server_seed + client_seed + nonce
"""
import hmac
import hashlib
from typing import List, Tuple, Optional
from dataclasses import dataclass

from app.game_config import (
    Symbol, SYMBOLS_LIST, CUMULATIVE_WEIGHTS, TOTAL_WEIGHT,
    GRID_ROWS, GRID_COLS,
    FREE_SPIN_SYMBOLS_LIST, FREE_SPIN_CUMULATIVE, FREE_SPIN_TOTAL_WEIGHT
)


@dataclass
class SeedData:
    """Container for provably fair seed information."""
    server_seed: str
    client_seed: str
    nonce: int

    def to_dict(self) -> dict:
        """Serialize for API response (hide server_seed until reveal)."""
        return {
            "serverSeedHash": hashlib.sha256(self.server_seed.encode()).hexdigest(),
            "clientSeed": self.client_seed,
            "nonce": self.nonce
        }

    def to_verification_dict(self) -> dict:
        """Full data for result verification (post-game)."""
        return {
            "serverSeed": self.server_seed,
            "clientSeed": self.client_seed,
            "nonce": self.nonce
        }


class ProvablyFairRNG:
    """
    Provably Fair Random Number Generator using HMAC-SHA256.

    Algorithm:
    1. Combine server_seed + client_seed + nonce
    2. Generate HMAC-SHA256 hash
    3. Use hash bytes to generate random values
    4. Each byte provides 8 bits of entropy

    This allows players to verify the fairness of results
    by recalculating with revealed seeds.
    """

    def __init__(self, server_seed: str, client_seed: str, nonce: int):
        """
        Initialize the RNG with seeds.

        Args:
            server_seed: Server-generated secret seed
            client_seed: Client-provided seed for verification
            nonce: Incrementing counter for each bet
        """
        self.server_seed = server_seed
        self.client_seed = client_seed
        self.nonce = nonce

        # Generate the master hash
        self._master_hash = self._generate_hash()
        self._byte_index = 0
        self._hash_index = 0

        # Store seed data for verification
        self.seed_data = SeedData(server_seed, client_seed, nonce)

    def _generate_hash(self, index: int = 0) -> bytes:
        """
        Generate HMAC-SHA256 hash from seeds.

        The hash is generated from:
        server_seed : client_seed : nonce : index

        Args:
            index: Additional index for extending entropy

        Returns:
            32 bytes of cryptographic randomness
        """
        message = f"{self.client_seed}:{self.nonce}:{index}"
        return hmac.new(
            self.server_seed.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()

    def _get_next_bytes(self, count: int) -> bytes:
        """
        Get the next N bytes from the hash stream.

        Automatically generates new hashes when needed.

        Args:
            count: Number of bytes needed

        Returns:
            Requested bytes
        """
        result = bytearray()

        while len(result) < count:
            # Check if we need a new hash
            if self._byte_index >= 32:
                self._hash_index += 1
                self._master_hash = self._generate_hash(self._hash_index)
                self._byte_index = 0

            # Take bytes from current hash
            available = 32 - self._byte_index
            take = min(available, count - len(result))
            result.extend(self._master_hash[self._byte_index:self._byte_index + take])
            self._byte_index += take

        return bytes(result)

    def random_int(self, max_value: int) -> int:
        """
        Generate a random integer in range [0, max_value).

        Uses rejection sampling to ensure uniform distribution.

        Args:
            max_value: Exclusive upper bound

        Returns:
            Random integer
        """
        if max_value <= 0:
            return 0

        # Calculate bytes needed for max_value
        bits_needed = max_value.bit_length()
        bytes_needed = (bits_needed + 7) // 8
        mask = (1 << bits_needed) - 1

        # Rejection sampling for uniform distribution
        while True:
            random_bytes = self._get_next_bytes(bytes_needed)
            value = int.from_bytes(random_bytes, 'big') & mask

            if value < max_value:
                return value

    def random_float(self) -> float:
        """
        Generate a random float in range [0, 1).

        Uses 4 bytes for ~32 bits of precision.

        Returns:
            Random float between 0 and 1
        """
        random_bytes = self._get_next_bytes(4)
        value = int.from_bytes(random_bytes, 'big')
        return value / (2 ** 32)

    def weighted_choice(self, cumulative_weights: List[int], total_weight: int) -> int:
        """
        Select an index based on cumulative weights.

        Args:
            cumulative_weights: List of cumulative weight sums
            total_weight: Sum of all weights

        Returns:
            Selected index
        """
        target = self.random_int(total_weight)

        for i, cumsum in enumerate(cumulative_weights):
            if target < cumsum:
                return i

        return len(cumulative_weights) - 1

    def get_symbol(
        self,
        free_spin_mode: bool = False,
        scatter_boost: bool = False,
        wild_boost: bool = False
    ) -> Symbol:
        """
        Get a weighted random symbol.

        Args:
            free_spin_mode: If True, uses free spin weights (no scatter, more wilds)
            scatter_boost: If True, 3x scatter probability
            wild_boost: If True, 5x wild probability

        Returns:
            Randomly selected Symbol
        """
        if free_spin_mode:
            # Free spin mode - use standard free spin weights
            index = self.weighted_choice(FREE_SPIN_CUMULATIVE, FREE_SPIN_TOTAL_WEIGHT)
            return FREE_SPIN_SYMBOLS_LIST[index]

        # Apply boosts to base weights
        if scatter_boost or wild_boost:
            # Build boosted weights dynamically
            from app.game_config import SYMBOL_WEIGHTS
            boosted_weights = []
            boosted_symbols = []

            for symbol in SYMBOLS_LIST:
                weight = SYMBOL_WEIGHTS[symbol].weight

                # Apply scatter boost (3x scatter chance)
                if scatter_boost and symbol == Symbol.SCATTER:
                    weight *= 3

                # Apply wild boost (5x wild chance)
                if wild_boost and symbol == Symbol.WILD:
                    weight *= 5

                boosted_weights.append(weight)
                boosted_symbols.append(symbol)

            # Build cumulative weights
            total = sum(boosted_weights)
            cumulative = []
            cumsum = 0
            for w in boosted_weights:
                cumsum += w
                cumulative.append(cumsum)

            index = self.weighted_choice(cumulative, total)
            return boosted_symbols[index]
        else:
            # No boost - use standard weights
            index = self.weighted_choice(CUMULATIVE_WEIGHTS, TOTAL_WEIGHT)
            return SYMBOLS_LIST[index]

    def generate_grid(
        self,
        free_spin_mode: bool = False,
        scatter_boost: bool = False,
        wild_boost: bool = False
    ) -> List[List[Symbol]]:
        """
        Generate a complete 7x7 grid of symbols.

        Args:
            free_spin_mode: If True, uses free spin weights (no scatter, more wilds)
            scatter_boost: If True, 3x scatter probability
            wild_boost: If True, 5x wild probability

        Returns:
            2D list of Symbols (row-major order)
        """
        grid = []
        for _ in range(GRID_ROWS):
            row = [self.get_symbol(free_spin_mode, scatter_boost, wild_boost) for _ in range(GRID_COLS)]
            grid.append(row)
        return grid

    def fill_positions(
        self,
        positions: List[Tuple[int, int]],
        free_spin_mode: bool = False
    ) -> List[Tuple[Tuple[int, int], Symbol]]:
        """
        Generate symbols for specific positions.

        Args:
            positions: List of (row, col) positions to fill
            free_spin_mode: If True, uses free spin weights

        Returns:
            List of ((row, col), Symbol) tuples
        """
        return [(pos, self.get_symbol(free_spin_mode)) for pos in positions]


def create_rng(server_seed: str, client_seed: str, nonce: int) -> ProvablyFairRNG:
    """
    Factory function to create a Provably Fair RNG.

    Args:
        server_seed: Server secret seed
        client_seed: Client-provided seed
        nonce: Bet counter

    Returns:
        Configured ProvablyFairRNG instance
    """
    return ProvablyFairRNG(server_seed, client_seed, nonce)


def verify_result(
    server_seed: str,
    client_seed: str,
    nonce: int,
    expected_grid: List[List[str]]
) -> bool:
    """
    Verify a game result for provably fair validation.

    Args:
        server_seed: Revealed server seed
        client_seed: Client seed used
        nonce: Nonce used
        expected_grid: The grid that was produced (symbol values)

    Returns:
        True if the result matches, False otherwise
    """
    rng = create_rng(server_seed, client_seed, nonce)
    generated_grid = rng.generate_grid()

    # Convert to comparable format
    generated_values = [[s.value for s in row] for row in generated_grid]

    return generated_values == expected_grid


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def generate_server_seed() -> str:
    """
    Generate a cryptographically secure server seed.

    Returns:
        64-character hex string
    """
    import secrets
    return secrets.token_hex(32)


def hash_server_seed(server_seed: str) -> str:
    """
    Hash server seed for pre-commitment.

    Args:
        server_seed: The server seed to hash

    Returns:
        SHA256 hash of the server seed
    """
    return hashlib.sha256(server_seed.encode()).hexdigest()
