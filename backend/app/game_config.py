"""
NEON VINYL: GHOST GROOVES - Game Configuration
Stake Engine (Carrot) Standard - Math SDK Configuration

All game constants, symbol definitions, paytables, and multiplier settings.
This file is the single source of truth for game math.
"""
from enum import Enum
from typing import Dict, List, Tuple
from dataclasses import dataclass


# =============================================================================
# GRID CONFIGURATION
# =============================================================================

GRID_ROWS: int = 7
GRID_COLS: int = 7
GRID_SIZE: int = GRID_ROWS * GRID_COLS  # 49 cells

MIN_CLUSTER_SIZE: int = 5  # Minimum symbols for a win


# =============================================================================
# MULTIPLIER CONFIGURATION (Spectral Needle Mechanic)
# =============================================================================

INITIAL_MULTIPLIER: int = 1      # Default multiplier (no ghost spot)
GHOST_SPOT_BASE: int = 2         # First ghost spot multiplier
MULTIPLIER_GROWTH: int = 2       # Multiplier doubles each win
MAX_MULTIPLIER: int = 1024       # Cap at x1024


# =============================================================================
# SYMBOL DEFINITIONS
# =============================================================================

class SymbolTier(Enum):
    """Symbol rarity tiers."""
    SPECIAL = "special"  # Wild, Scatter
    HIGH = "high"
    MID = "mid"
    LOW = "low"


class Symbol(Enum):
    """
    Game symbols with their identifiers.
    Values are used for serialization and API responses.
    """
    # Special Symbols
    WILD = "WD"           # Wild - substitutes for any symbol
    SCATTER = "SC"        # Scatter - triggers free spins

    # High Tier (Premium) - Rare
    DJ_SPOOKY = "DJ"      # Ghostly DJ mascot
    GOLD_VINYL = "GV"     # Golden vinyl record

    # Mid Tier - Medium frequency
    HEADPHONES = "HP"     # Neon headphones
    CASSETTE = "CS"       # Retro cassette tape

    # Low Tier - Common
    MUSIC_NOTE_PINK = "NP"    # Pink music note
    MUSIC_NOTE_BLUE = "NB"    # Blue music note
    MUSIC_NOTE_PURPLE = "NU"  # Purple music note


# Special symbol set for quick lookup
SPECIAL_SYMBOLS = {Symbol.WILD, Symbol.SCATTER}
REGULAR_SYMBOLS = [s for s in Symbol if s not in SPECIAL_SYMBOLS]


@dataclass(frozen=True)
class SymbolConfig:
    """Configuration for a single symbol."""
    symbol: Symbol
    tier: SymbolTier
    weight: int  # Spawn probability weight (higher = more common)


# =============================================================================
# SYMBOL WEIGHTS (Probability Distribution)
# =============================================================================

SYMBOL_WEIGHTS: Dict[Symbol, SymbolConfig] = {
    # Special symbols - Tuned for excitement and RTP
    # Free spins should be rare but rewarding when they hit!
    Symbol.WILD: SymbolConfig(Symbol.WILD, SymbolTier.SPECIAL, 1),      # Rare but pays BIG
    Symbol.SCATTER: SymbolConfig(Symbol.SCATTER, SymbolTier.SPECIAL, 1), # REDUCED - rarer free spins, better payouts

    # High tier - rare (weight 8-12)
    Symbol.DJ_SPOOKY: SymbolConfig(Symbol.DJ_SPOOKY, SymbolTier.HIGH, 8),
    Symbol.GOLD_VINYL: SymbolConfig(Symbol.GOLD_VINYL, SymbolTier.HIGH, 12),

    # Mid tier - medium (weight 18-22)
    Symbol.HEADPHONES: SymbolConfig(Symbol.HEADPHONES, SymbolTier.MID, 18),
    Symbol.CASSETTE: SymbolConfig(Symbol.CASSETTE, SymbolTier.MID, 22),

    # Low tier - common but MORE SPREAD (weight 28-38)
    # More variety = harder to cluster
    Symbol.MUSIC_NOTE_PINK: SymbolConfig(Symbol.MUSIC_NOTE_PINK, SymbolTier.LOW, 28),
    Symbol.MUSIC_NOTE_BLUE: SymbolConfig(Symbol.MUSIC_NOTE_BLUE, SymbolTier.LOW, 38),
    Symbol.MUSIC_NOTE_PURPLE: SymbolConfig(Symbol.MUSIC_NOTE_PURPLE, SymbolTier.LOW, 32),
}

# Weights for regular spins (includes Wild and Scatter)
SYMBOLS_LIST: List[Symbol] = list(SYMBOL_WEIGHTS.keys())
WEIGHTS_LIST: List[int] = [SYMBOL_WEIGHTS[s].weight for s in SYMBOLS_LIST]
TOTAL_WEIGHT: int = sum(WEIGHTS_LIST)

# Cumulative weights for efficient weighted random selection
CUMULATIVE_WEIGHTS: List[int] = []
_cumsum = 0
for w in WEIGHTS_LIST:
    _cumsum += w
    CUMULATIVE_WEIGHTS.append(_cumsum)

# Weights for Free Spins (WITH Scatter for retriggers!)
# IMPORTANT: Scatter can land during free spins for retrigger mechanic
# Scatter weight reduced to make retriggres rarer but more rewarding
FREE_SPIN_WEIGHTS: Dict[Symbol, int] = {
    Symbol.WILD: 1,  # Same as base game - rare but powerful
    Symbol.SCATTER: 1,  # REDUCED from 2 - retriggres should be rare but rewarding
    Symbol.DJ_SPOOKY: 8,
    Symbol.GOLD_VINYL: 12,
    Symbol.HEADPHONES: 18,
    Symbol.CASSETTE: 22,
    Symbol.MUSIC_NOTE_PINK: 28,
    Symbol.MUSIC_NOTE_BLUE: 38,
    Symbol.MUSIC_NOTE_PURPLE: 32,
}
FREE_SPIN_SYMBOLS_LIST = list(FREE_SPIN_WEIGHTS.keys())
FREE_SPIN_WEIGHTS_LIST = list(FREE_SPIN_WEIGHTS.values())
FREE_SPIN_TOTAL_WEIGHT = sum(FREE_SPIN_WEIGHTS_LIST)

# Free spin cumulative weights
FREE_SPIN_CUMULATIVE: List[int] = []
_cumsum = 0
for w in FREE_SPIN_WEIGHTS_LIST:
    _cumsum += w
    FREE_SPIN_CUMULATIVE.append(_cumsum)


# =============================================================================
# PAYTABLE (Base Payouts per Cluster Size)
# Balanced for ~96% RTP with tumble and multiplier mechanics
# =============================================================================

PAYTABLE: Dict[Symbol, Dict[int, float]] = {
    # Wild pays same as DJ (best) - Calibrated for 96% RTP (x1.025 boost)
    Symbol.WILD: {
        5: 0.65, 6: 1.07, 7: 1.72, 8: 2.89, 9: 4.32,
        10: 6.55, 11: 10.71, 12: 17.28, 13: 26.21, 14: 43.20,
        15: 65.53,
    },
    # Scatter - no direct payout, triggers free spins
    Symbol.SCATTER: {
        3: 0.0, 4: 0.0, 5: 0.0, 6: 0.0, 7: 0.0,
        8: 0.0, 9: 0.0, 10: 0.0, 11: 0.0, 12: 0.0,
        15: 0.0,
    },
    # High Tier: DJ Spooky (best payouts)
    Symbol.DJ_SPOOKY: {
        5: 0.65, 6: 1.07, 7: 1.72, 8: 2.89, 9: 4.32,
        10: 6.55, 11: 10.71, 12: 17.28, 13: 26.21, 14: 43.20,
        15: 65.53,
    },
    # High Tier: Gold Vinyl
    Symbol.GOLD_VINYL: {
        5: 0.44, 6: 0.73, 7: 1.31, 8: 2.17, 9: 3.49,
        10: 5.23, 11: 8.64, 12: 13.77, 13: 21.64, 14: 34.76,
        15: 52.23,
    },
    # Mid Tier: Headphones
    Symbol.HEADPHONES: {
        5: 0.27, 6: 0.44, 7: 0.73, 8: 1.24, 9: 1.96,
        10: 3.03, 11: 5.23, 12: 7.88, 13: 13.10, 14: 21.64,
        15: 32.75,
    },
    # Mid Tier: Cassette
    Symbol.CASSETTE: {
        5: 0.18, 6: 0.30, 7: 0.51, 8: 0.86, 9: 1.38,
        10: 2.17, 11: 3.66, 12: 6.08, 13: 9.50, 14: 15.11,
        15: 23.55,
    },
    # Low Tier: Music Notes - Low payouts (they win most often!)
    Symbol.MUSIC_NOTE_PINK: {
        5: 0.062, 6: 0.105, 7: 0.162, 8: 0.295, 9: 0.476,
        10: 0.721, 11: 1.24, 12: 2.03, 13: 3.28, 14: 5.23,
        15: 7.88,
    },
    Symbol.MUSIC_NOTE_BLUE: {
        5: 0.062, 6: 0.105, 7: 0.162, 8: 0.295, 9: 0.476,
        10: 0.721, 11: 1.24, 12: 2.03, 13: 3.28, 14: 5.23,
        15: 7.88,
    },
    Symbol.MUSIC_NOTE_PURPLE: {
        5: 0.062, 6: 0.105, 7: 0.162, 8: 0.295, 9: 0.476,
        10: 0.721, 11: 1.24, 12: 2.03, 13: 3.28, 14: 5.23,
        15: 7.88,
    },
}


def get_payout(symbol: Symbol, cluster_size: int) -> float:
    """
    Get the base payout multiplier for a symbol cluster.

    Args:
        symbol: The symbol type
        cluster_size: Number of symbols in the cluster

    Returns:
        Base payout multiplier (before ghost spot multipliers)
    """
    if cluster_size < MIN_CLUSTER_SIZE:
        return 0.0

    paytable = PAYTABLE[symbol]
    # Cap lookup at 15 (max paytable entry)
    lookup_size = min(cluster_size, 15)
    return paytable.get(lookup_size, 0.0)


# =============================================================================
# FREE SPINS CONFIGURATION
# =============================================================================

# Scatter requirements for free spins (BASE GAME)
# Free spins are rarer but more rewarding!
# 3 scatters = 10 free spins (increased from 8)
# 4+ scatters = 15 free spins (increased from 12)
SCATTER_FREE_SPINS: Dict[int, int] = {
    3: 10,  # 3 scatters = 10 free spins (standard bonus)
    4: 15,  # 4+ scatters = 15 free spins (super bonus)
    5: 15,  # Cap at 15 for super bonus
    6: 15,
}

# Scatter retrigger during FREE SPINS (different rules)
# Retriggres are rarer but more rewarding
# 3 scatters = +8 spins (was +5)
# 4+ scatters = +12 spins (was +10)
# NOTE: 2 scatters NO LONGER retrigger (too common, frustrating for user)
SCATTER_RETRIGGER: Dict[int, int] = {
    3: 8,   # 3 scatters = +8 spins (big reward for hitting 3!)
    4: 12,  # 4+ scatters = +12 spins (massive reward!)
    5: 12,
    6: 12,
}

# Can retrigger free spins during free spins
FREE_SPIN_RETRIGGER: bool = True

# Multipliers persist during free spins
FREE_SPIN_PERSISTENT_MULTIPLIERS: bool = True


# =============================================================================
# BONUS BUY CONFIGURATION
# =============================================================================

@dataclass
class BonusBuyOption:
    """Configuration for a bonus buy option."""
    id: str
    name: str
    description: str
    cost_multiplier: float  # Cost as multiplier of bet (e.g., 80x)
    volatility: str  # low, medium, high, extreme
    feature: str  # What it triggers


BONUS_BUY_OPTIONS: Dict[str, BonusBuyOption] = {
    "free_spins_8": BonusBuyOption(
        id="free_spins_8",
        name="Buy Free Spins",
        description="Instantly trigger 8 Free Spins",
        cost_multiplier=100.0,  # x100 bet cost
        volatility="high",
        feature="free_spins",
    ),
    "free_spins_12": BonusBuyOption(
        id="free_spins_12",
        name="Buy Super Free Spins",
        description="Instantly trigger 12 Free Spins with x2 starting multiplier",
        cost_multiplier=200.0,  # x200 bet cost
        volatility="extreme",
        feature="free_spins_enhanced",
    ),
    "wild_grid": BonusBuyOption(
        id="wild_grid",
        name="Wild Boost",
        description="Guaranteed 5-8 Wilds on first spin",
        cost_multiplier=10.0,  # Reduced for balance
        volatility="medium",
        feature="wild_boost",
    ),
    "max_multi_start": BonusBuyOption(
        id="max_multi_start",
        name="Multiplier Madness",
        description="Start with random x4-x8 multipliers on 5 positions",
        cost_multiplier=20.0,  # Reduced for balance
        volatility="high",
        feature="multiplier_start",
    ),
    "jackpot_chance": BonusBuyOption(
        id="jackpot_chance",
        name="Jackpot Hunt",
        description="100x higher chance to hit jackpot this spin",
        cost_multiplier=5.0,  # Low cost, jackpot EV is very small
        volatility="extreme",
        feature="jackpot_boost",
    ),
}


# =============================================================================
# PROGRESSIVE JACKPOT CONFIGURATION
# =============================================================================

@dataclass
class JackpotTier:
    """Configuration for a jackpot tier."""
    name: str
    seed_amount: float  # Starting amount
    contribution_rate: float  # % of bet added to jackpot
    trigger_chance: float  # Base chance per spin (0-1)
    min_bet_multiplier: float  # Min bet to be eligible (as multiplier of MIN_BET)


JACKPOT_TIERS: Dict[str, JackpotTier] = {
    "mini": JackpotTier(
        name="Mini",
        seed_amount=50.0,
        contribution_rate=0.005,  # 0.5%
        trigger_chance=0.00001,  # 0.001% - reduced 100x for ~0.5% RTP contribution
        min_bet_multiplier=1.0,
    ),
    "minor": JackpotTier(
        name="Minor",
        seed_amount=200.0,
        contribution_rate=0.003,  # 0.3%
        trigger_chance=0.000002,  # 0.0002% - reduced 100x
        min_bet_multiplier=2.0,
    ),
    "major": JackpotTier(
        name="Major",
        seed_amount=1000.0,
        contribution_rate=0.002,  # 0.2%
        trigger_chance=0.0000005,  # 0.00005% - reduced 100x
        min_bet_multiplier=5.0,
    ),
    "grand": JackpotTier(
        name="Grand",
        seed_amount=10000.0,
        contribution_rate=0.001,  # 0.1%
        trigger_chance=0.00000005,  # 0.000005% - reduced 100x
        min_bet_multiplier=10.0,
    ),
}


# =============================================================================
# EVENT TYPES (Stake Engine Standard)
# =============================================================================

class EventType(Enum):
    """Event types for the Stake Engine events system."""
    REVEAL = "reveal"                    # Initial grid reveal
    WIN = "win"                          # Cluster win
    MULTIPLIER_UPGRADE = "multiplier_upgrade"  # Ghost spot upgrade
    TUMBLE = "tumble"                    # Symbols falling after win
    FILL = "fill"                        # New symbols filling gaps
    FREE_SPINS_TRIGGER = "free_spins_trigger"  # Scatter triggered free spins
    FREE_SPIN_START = "free_spin_start"  # Individual free spin starting
    JACKPOT_WIN = "jackpot_win"          # Jackpot hit
    BONUS_BUY = "bonus_buy"              # Bonus buy activated
    WILD_EXPLOSION = "wild_explosion"    # Wild explodes and sets adjacent cells to max multiplier


# =============================================================================
# ERROR CODES (Stake Standards)
# =============================================================================

class StakeErrorCode(Enum):
    """Standard Stake error codes."""
    ERR_IPB = "ERR_IPB"  # Insufficient Player Balance
    ERR_IS = "ERR_IS"    # Invalid Session
    ERR_VAL = "ERR_VAL"  # Invalid Request


# =============================================================================
# GAME LIMITS
# =============================================================================

MIN_BET: float = 0.10
MAX_BET: float = 100.0
DEFAULT_BET: float = 1.0

# RTP Configuration
TARGET_RTP: float = 96.0  # Target RTP percentage (96% target)
RTP_VARIANCE: float = 1.0  # Acceptable variance (+/- 1%)

# Max Win Cap
MAX_WIN_MULTIPLIER: float = 40000.0  # Maximum win capped at 40,000x bet
