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
    # Special symbols - Tuned for excitement and RTP
    Symbol.WILD: SymbolConfig(Symbol.WILD, SymbolTier.SPECIAL, 1),      # Matrix Crown - Rare but pays BIG
    Symbol.SCATTER: SymbolConfig(Symbol.SCATTER, SymbolTier.SPECIAL, 1), # Golden Wolf - triggers free spins

    # High tier wolves - rare (weight 6-10)
    Symbol.WOLF_RED: SymbolConfig(Symbol.WOLF_RED, SymbolTier.HIGH, 6),     # Red Wolf - best payout
    Symbol.WOLF_BLACK: SymbolConfig(Symbol.WOLF_BLACK, SymbolTier.HIGH, 8),  # Black Wolf
    Symbol.WOLF_PURPLE: SymbolConfig(Symbol.WOLF_PURPLE, SymbolTier.HIGH, 10), # Purple Wolf

    # Mid tier wolves - medium (weight 14-20)
    Symbol.WOLF_GRAY: SymbolConfig(Symbol.WOLF_GRAY, SymbolTier.MID, 14),
    Symbol.WOLF_GREEN: SymbolConfig(Symbol.WOLF_GREEN, SymbolTier.MID, 17),
    Symbol.WOLF_SPIRIT: SymbolConfig(Symbol.WOLF_SPIRIT, SymbolTier.MID, 20),

    # Low tier wolves - common (weight 25-35)
    Symbol.WOLF_WHITE: SymbolConfig(Symbol.WOLF_WHITE, SymbolTier.LOW, 25),
    Symbol.WOLF_SNAKE: SymbolConfig(Symbol.WOLF_SNAKE, SymbolTier.LOW, 28),
    Symbol.WOLF_STREET: SymbolConfig(Symbol.WOLF_STREET, SymbolTier.LOW, 32),
    Symbol.WOLF_BLUE: SymbolConfig(Symbol.WOLF_BLUE, SymbolTier.LOW, 35),
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
FREE_SPIN_WEIGHTS: Dict[Symbol, int] = {
    Symbol.WILD: 1,  # Matrix Crown - rare but powerful
    Symbol.SCATTER: 1,  # Golden Wolf - rare retriggres
    Symbol.WOLF_RED: 6,
    Symbol.WOLF_BLACK: 8,
    Symbol.WOLF_PURPLE: 10,
    Symbol.WOLF_GRAY: 14,
    Symbol.WOLF_GREEN: 17,
    Symbol.WOLF_SPIRIT: 20,
    Symbol.WOLF_WHITE: 25,
    Symbol.WOLF_SNAKE: 28,
    Symbol.WOLF_STREET: 32,
    Symbol.WOLF_BLUE: 35,
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
    # Wild (Matrix Crown) pays same as best wolf
    Symbol.WILD: {
        4: 0.40, 5: 0.65, 6: 1.07, 7: 1.72, 8: 2.89, 9: 4.32,
        10: 6.55, 11: 10.71, 12: 17.28, 13: 26.21, 14: 43.20,
        15: 65.53,
    },
    # Scatter (Golden Wolf) - no direct payout, triggers free spins
    Symbol.SCATTER: {
        3: 0.0, 4: 0.0, 5: 0.0, 6: 0.0, 7: 0.0,
        8: 0.0, 9: 0.0, 10: 0.0, 11: 0.0, 12: 0.0,
        15: 0.0,
    },
    # High Tier: Red Wolf (best payouts)
    Symbol.WOLF_RED: {
        4: 0.40, 5: 0.65, 6: 1.07, 7: 1.72, 8: 2.89, 9: 4.32,
        10: 6.55, 11: 10.71, 12: 17.28, 13: 26.21, 14: 43.20,
        15: 65.53,
    },
    # High Tier: Black Wolf
    Symbol.WOLF_BLACK: {
        4: 0.30, 5: 0.50, 6: 0.85, 7: 1.50, 8: 2.50, 9: 3.80,
        10: 5.80, 11: 9.50, 12: 15.00, 13: 23.00, 14: 38.00,
        15: 58.00,
    },
    # High Tier: Purple Wolf
    Symbol.WOLF_PURPLE: {
        4: 0.26, 5: 0.44, 6: 0.73, 7: 1.31, 8: 2.17, 9: 3.49,
        10: 5.23, 11: 8.64, 12: 13.77, 13: 21.64, 14: 34.76,
        15: 52.23,
    },
    # Mid Tier: Gray Wolf
    Symbol.WOLF_GRAY: {
        4: 0.18, 5: 0.30, 6: 0.50, 7: 0.85, 8: 1.40, 9: 2.20,
        10: 3.50, 11: 6.00, 12: 9.00, 13: 15.00, 14: 25.00,
        15: 38.00,
    },
    # Mid Tier: Green Wolf
    Symbol.WOLF_GREEN: {
        4: 0.16, 5: 0.27, 6: 0.44, 7: 0.73, 8: 1.24, 9: 1.96,
        10: 3.03, 11: 5.23, 12: 7.88, 13: 13.10, 14: 21.64,
        15: 32.75,
    },
    # Mid Tier: Spirit Wolf
    Symbol.WOLF_SPIRIT: {
        4: 0.13, 5: 0.22, 6: 0.38, 7: 0.62, 8: 1.05, 9: 1.68,
        10: 2.60, 11: 4.40, 12: 7.00, 13: 11.20, 14: 18.00,
        15: 28.00,
    },
    # Low Tier: Wolves - Lower payouts (they win most often!)
    Symbol.WOLF_WHITE: {
        4: 0.06, 5: 0.10, 6: 0.18, 7: 0.30, 8: 0.50, 9: 0.80,
        10: 1.20, 11: 2.00, 12: 3.20, 13: 5.20, 14: 8.50,
        15: 13.00,
    },
    Symbol.WOLF_SNAKE: {
        4: 0.05, 5: 0.08, 6: 0.14, 7: 0.24, 8: 0.40, 9: 0.65,
        10: 1.00, 11: 1.70, 12: 2.70, 13: 4.40, 14: 7.00,
        15: 10.50,
    },
    Symbol.WOLF_STREET: {
        4: 0.04, 5: 0.062, 6: 0.105, 7: 0.162, 8: 0.295, 9: 0.476,
        10: 0.721, 11: 1.24, 12: 2.03, 13: 3.28, 14: 5.23,
        15: 7.88,
    },
    Symbol.WOLF_BLUE: {
        4: 0.04, 5: 0.062, 6: 0.105, 7: 0.162, 8: 0.295, 9: 0.476,
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
