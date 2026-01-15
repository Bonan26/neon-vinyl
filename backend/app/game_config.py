"""
LES WOLFS 86 - Game Configuration
Stake Engine (Carrot) Standard - Math SDK Configuration

All game constants, symbol definitions, paytables, and multiplier settings.
This file is the single source of truth for game math.
"""
from enum import Enum
from typing import Dict, List, Tuple
from dataclasses import dataclass


# =============================================================================
# GRID CONFIGURATION - RECTANGULAR (wider than tall, like Hacksaw Gaming)
# =============================================================================

GRID_ROWS: int = 5  # 5 rows (shorter)
GRID_COLS: int = 6  # 6 columns (wider)
GRID_SIZE: int = GRID_ROWS * GRID_COLS  # 30 cells

MIN_CLUSTER_SIZE: int = 4  # Minimum symbols for a win (6x5 rectangular grid)


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
    LES WOLFS 86 Theme
    """
    # Special Symbols
    WILD = "WD"           # Wild - Matrix Crown
    SCATTER = "SC"        # Scatter - Golden Wolf (triggers free spins)

    # High Tier (Wolves) - Premium symbols
    WOLF_RED = "WR"       # Red Wolf (screaming) - Best payout
    WOLF_BLACK = "WB"     # Black Wolf
    WOLF_PURPLE = "WP"    # Purple Gradient Wolf

    # Mid Tier (Wolves) - Medium frequency
    WOLF_GRAY = "WG"      # Gray Wolf
    WOLF_GREEN = "W6"     # Green Snake Wolf
    WOLF_SPIRIT = "WS"    # Spirit Wolf (dark blue)

    # Low Tier (Wolves) - Common
    WOLF_WHITE = "HC"     # White Screaming Wolf
    WOLF_SNAKE = "HS"     # Snake Screaming Wolf
    WOLF_STREET = "HW"    # Street Relaxing Wolf
    WOLF_BLUE = "HK"      # Blue Whistling Wolf


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
    # Special symbols - Tuned for 96% RTP
    Symbol.WILD: SymbolConfig(Symbol.WILD, SymbolTier.SPECIAL, 3),      # Matrix Crown - Balanced for RTP
    Symbol.SCATTER: SymbolConfig(Symbol.SCATTER, SymbolTier.SPECIAL, 2), # Golden Wolf - ~0.5% trigger rate

    # High tier wolves - slightly increased (weight 8-12)
    Symbol.WOLF_RED: SymbolConfig(Symbol.WOLF_RED, SymbolTier.HIGH, 8),     # Red Wolf - best payout
    Symbol.WOLF_BLACK: SymbolConfig(Symbol.WOLF_BLACK, SymbolTier.HIGH, 10),  # Black Wolf
    Symbol.WOLF_PURPLE: SymbolConfig(Symbol.WOLF_PURPLE, SymbolTier.HIGH, 12), # Purple Wolf

    # Mid tier wolves - medium (weight 16-22)
    Symbol.WOLF_GRAY: SymbolConfig(Symbol.WOLF_GRAY, SymbolTier.MID, 16),
    Symbol.WOLF_GREEN: SymbolConfig(Symbol.WOLF_GREEN, SymbolTier.MID, 19),
    Symbol.WOLF_SPIRIT: SymbolConfig(Symbol.WOLF_SPIRIT, SymbolTier.MID, 22),

    # Low tier wolves - common (weight 26-36)
    Symbol.WOLF_WHITE: SymbolConfig(Symbol.WOLF_WHITE, SymbolTier.LOW, 26),
    Symbol.WOLF_SNAKE: SymbolConfig(Symbol.WOLF_SNAKE, SymbolTier.LOW, 29),
    Symbol.WOLF_STREET: SymbolConfig(Symbol.WOLF_STREET, SymbolTier.LOW, 33),
    Symbol.WOLF_BLUE: SymbolConfig(Symbol.WOLF_BLUE, SymbolTier.LOW, 36),
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
# Slightly more Wilds during free spins for exciting gameplay
FREE_SPIN_WEIGHTS: Dict[Symbol, int] = {
    Symbol.WILD: 5,  # Matrix Crown - slightly more frequent during free spins
    Symbol.SCATTER: 3,  # Golden Wolf - some retrigger chance
    Symbol.WOLF_RED: 8,
    Symbol.WOLF_BLACK: 10,
    Symbol.WOLF_PURPLE: 12,
    Symbol.WOLF_GRAY: 16,
    Symbol.WOLF_GREEN: 19,
    Symbol.WOLF_SPIRIT: 22,
    Symbol.WOLF_WHITE: 26,
    Symbol.WOLF_SNAKE: 29,
    Symbol.WOLF_STREET: 33,
    Symbol.WOLF_BLUE: 36,
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
    # Wild (Matrix Crown) pays same as best wolf - Tuned for 96% RTP
    Symbol.WILD: {
        4: 0.78, 5: 1.25, 6: 2.04, 7: 3.29, 8: 5.49, 9: 8.15,
        10: 12.54, 11: 20.38, 12: 32.93, 13: 50.18, 14: 81.54,
        15: 125.44,
    },
    # Scatter (Golden Wolf) - no direct payout, triggers free spins
    Symbol.SCATTER: {
        3: 0.0, 4: 0.0, 5: 0.0, 6: 0.0, 7: 0.0,
        8: 0.0, 9: 0.0, 10: 0.0, 11: 0.0, 12: 0.0,
        15: 0.0,
    },
    # High Tier: Red Wolf (best payouts)
    Symbol.WOLF_RED: {
        4: 0.78, 5: 1.25, 6: 2.04, 7: 3.29, 8: 5.49, 9: 8.15,
        10: 12.54, 11: 20.38, 12: 32.93, 13: 50.18, 14: 81.54,
        15: 125.44,
    },
    # High Tier: Black Wolf
    Symbol.WOLF_BLACK: {
        4: 0.63, 5: 1.02, 6: 1.65, 7: 2.82, 8: 4.70, 9: 7.21,
        10: 10.98, 11: 18.03, 12: 28.22, 13: 43.90, 14: 72.13,
        15: 109.76,
    },
    # High Tier: Purple Wolf
    Symbol.WOLF_PURPLE: {
        4: 0.50, 5: 0.84, 6: 1.41, 7: 2.51, 8: 4.16, 9: 6.66,
        10: 10.04, 11: 16.46, 12: 26.34, 13: 41.40, 14: 66.64,
        15: 100.35,
    },
    # Mid Tier: Gray Wolf
    Symbol.WOLF_GRAY: {
        4: 0.34, 5: 0.58, 6: 0.94, 7: 1.65, 8: 2.67, 9: 4.23,
        10: 6.66, 11: 11.45, 12: 17.25, 13: 28.22, 14: 47.04,
        15: 72.13,
    },
    # Mid Tier: Green Wolf
    Symbol.WOLF_GREEN: {
        4: 0.31, 5: 0.52, 6: 0.84, 7: 1.41, 8: 2.35, 9: 3.76,
        10: 5.80, 11: 10.04, 12: 15.05, 13: 25.09, 14: 41.40,
        15: 62.72,
    },
    # Mid Tier: Spirit Wolf
    Symbol.WOLF_SPIRIT: {
        4: 0.25, 5: 0.42, 6: 0.73, 7: 1.20, 8: 2.01, 9: 3.21,
        10: 5.02, 11: 8.47, 12: 13.33, 13: 21.48, 14: 34.50,
        15: 53.31,
    },
    # Low Tier: Wolves - Lower payouts (win more often)
    Symbol.WOLF_WHITE: {
        4: 0.13, 5: 0.19, 6: 0.34, 7: 0.57, 8: 0.94, 9: 1.57,
        10: 2.35, 11: 3.84, 12: 6.12, 13: 10.04, 14: 16.31,
        15: 25.09,
    },
    Symbol.WOLF_SNAKE: {
        4: 0.10, 5: 0.16, 6: 0.26, 7: 0.47, 8: 0.78, 9: 1.25,
        10: 1.91, 11: 3.29, 12: 5.17, 13: 8.47, 14: 13.48,
        15: 20.38,
    },
    Symbol.WOLF_STREET: {
        4: 0.08, 5: 0.13, 6: 0.21, 7: 0.31, 8: 0.57, 9: 0.91,
        10: 1.38, 11: 2.35, 12: 3.92, 13: 6.27, 14: 10.04,
        15: 15.05,
    },
    Symbol.WOLF_BLUE: {
        4: 0.08, 5: 0.13, 6: 0.21, 7: 0.31, 8: 0.57, 9: 0.91,
        10: 1.38, 11: 2.35, 12: 3.92, 13: 6.27, 14: 10.04,
        15: 15.05,
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
# Same as buying bonuses but earned naturally!
# 3 scatters = 8 free spins (like buying Free Spins bonus)
# 4 scatters = 12 free spins (like buying Super Bonus)
# 5 scatters = 15 free spins
# 6 scatters = 20 free spins
SCATTER_FREE_SPINS: Dict[int, int] = {
    3: 8,   # 3 scatters = 8 free spins (same as Buy Free Spins)
    4: 12,  # 4 scatters = 12 free spins (same as Buy Super Bonus)
    5: 15,  # 5 scatters = 15 free spins
    6: 20,  # 6 scatters = 20 free spins
}

# Scatter retrigger during FREE SPINS (different rules)
# When already in bonus (bought or earned), retriggering adds extra spins
SCATTER_RETRIGGER: Dict[int, int] = {
    3: 5,   # 3 scatters = +5 spins
    4: 8,   # 4 scatters = +8 spins
    5: 10,  # 5 scatters = +10 spins
    6: 12,  # 6 scatters = +12 spins
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
    "wolf_burst": BonusBuyOption(
        id="wolf_burst",
        name="Wolf Burst",
        description="Wolf mascot blows 3-6 WILDs onto the grid",
        cost_multiplier=10.0,  # x10 bet cost (matches frontend)
        volatility="medium",
        feature="wolf_burst",
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

# Super Bonus Configuration (5+ Scatters = Sticky Wilds)
SUPER_BONUS_CONFIG = {
    "scatter_count_threshold": 5,  # 5+ scatters triggers super bonus
    "sticky_wilds_enabled": True,  # All wilds during bonus stay sticky
    "extra_free_spins": 5,  # Bonus free spins on top of normal
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
    WOLF_BURST = "wolf_burst"            # Wolf mascot blows wilds onto grid
    SUPER_BONUS_TRIGGER = "super_bonus_trigger"  # 5+ scatters - sticky wilds bonus


# =============================================================================
# ERROR CODES (Stake Engine Standards)
# =============================================================================

class StakeErrorCode(Enum):
    """Standard Stake Engine error codes."""
    # Success
    SUCCESS = "SUCCESS"
    # 400 Client Errors
    ERR_VAL = "ERR_VAL"          # Invalid Request
    ERR_IPB = "ERR_IPB"          # Insufficient Player Balance
    ERR_IS = "ERR_IS"            # Invalid Session
    ERR_ATE = "ERR_ATE"          # Authentication Token Expired
    ERR_GLE = "ERR_GLE"          # Gambling Limits Exceeded
    ERR_LOC = "ERR_LOC"          # Invalid Player Location
    ERR_BNF = "ERR_BNF"          # Bet/Bonus Not Found
    ERR_SCR = "ERR_SCR"          # Script Error
    ERR_OPT = "ERR_OPT"          # Option Error
    ERR_UE = "ERR_UE"            # Unknown Error
    # 500 Server Errors
    ERR_GEN = "ERR_GEN"          # General Server Error
    ERR_MAINTENANCE = "ERR_MAINTENANCE"  # Planned Maintenance


# =============================================================================
# MONETARY CONFIGURATION (Stake Engine Standard)
# =============================================================================
# All monetary values are integers with 6 decimal places of precision
# $1.00 = 1,000,000 units
# $0.10 = 100,000 units

MONETARY_PRECISION: int = 6
MONETARY_MULTIPLIER: int = 1_000_000  # 10^6


def to_stake_amount(value: float) -> int:
    """Convert float currency to Stake Engine integer format."""
    return int(round(value * MONETARY_MULTIPLIER))


def from_stake_amount(value: int) -> float:
    """Convert Stake Engine integer to float currency."""
    return value / MONETARY_MULTIPLIER


# =============================================================================
# GAME LIMITS (Stake Engine Format - integers)
# =============================================================================

# Float values for internal calculations
MIN_BET_FLOAT: float = 0.10
MAX_BET_FLOAT: float = 100.0
DEFAULT_BET_FLOAT: float = 1.0
STEP_BET_FLOAT: float = 0.10  # Bet must be divisible by this

# Integer values for Stake Engine API (×1,000,000)
MIN_BET: int = to_stake_amount(MIN_BET_FLOAT)      # 100,000
MAX_BET: int = to_stake_amount(MAX_BET_FLOAT)      # 100,000,000
DEFAULT_BET: int = to_stake_amount(DEFAULT_BET_FLOAT)  # 1,000,000
STEP_BET: int = to_stake_amount(STEP_BET_FLOAT)    # 100,000

# Predefined bet levels (Stake Engine standard)
BET_LEVELS: List[int] = [
    to_stake_amount(0.10),   # 100,000
    to_stake_amount(0.20),   # 200,000
    to_stake_amount(0.50),   # 500,000
    to_stake_amount(1.00),   # 1,000,000
    to_stake_amount(2.00),   # 2,000,000
    to_stake_amount(5.00),   # 5,000,000
    to_stake_amount(10.00),  # 10,000,000
    to_stake_amount(20.00),  # 20,000,000
    to_stake_amount(50.00),  # 50,000,000
    to_stake_amount(100.00), # 100,000,000
]

# Default currency
DEFAULT_CURRENCY: str = "USD"

# RTP Configuration
TARGET_RTP: float = 96.0  # Target RTP percentage (96% target)
RTP_VARIANCE: float = 1.0  # Acceptable variance (+/- 1%)

# Max Win Cap
MAX_WIN_MULTIPLIER: float = 40000.0  # Maximum win capped at 40,000x bet
