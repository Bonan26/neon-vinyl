"""
LES WOLFS 86 - Symbol Definitions
Wolf-themed premium slot game symbols
"""
from enum import Enum
from dataclasses import dataclass
from typing import Dict


class SymbolTier(Enum):
    SPECIAL = "special"
    HIGH = "high"
    MID = "mid"
    LOW = "low"


class Symbol(Enum):
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

    # Low Tier (Hats) - Common
    HAT_CAP = "HC"        # W86 Cap
    HAT_STEAMPUNK = "HS"  # Steampunk Hat
    HAT_STRAW = "HW"      # Straw Hat
    HAT_PEACOCK = "HK"    # Peacock Feather Hat


@dataclass
class SymbolInfo:
    symbol: Symbol
    tier: SymbolTier
    weight: int  # Probability weight for RNG


# Symbol configuration with spawn weights
SYMBOL_CONFIG: Dict[Symbol, SymbolInfo] = {
    # Special symbols - rare
    Symbol.WILD: SymbolInfo(Symbol.WILD, SymbolTier.SPECIAL, 1),
    Symbol.SCATTER: SymbolInfo(Symbol.SCATTER, SymbolTier.SPECIAL, 1),

    # High tier wolves - rare (weight 6-10)
    Symbol.WOLF_RED: SymbolInfo(Symbol.WOLF_RED, SymbolTier.HIGH, 6),
    Symbol.WOLF_BLACK: SymbolInfo(Symbol.WOLF_BLACK, SymbolTier.HIGH, 8),
    Symbol.WOLF_PURPLE: SymbolInfo(Symbol.WOLF_PURPLE, SymbolTier.HIGH, 10),

    # Mid tier wolves - medium (weight 14-20)
    Symbol.WOLF_GRAY: SymbolInfo(Symbol.WOLF_GRAY, SymbolTier.MID, 14),
    Symbol.WOLF_GREEN: SymbolInfo(Symbol.WOLF_GREEN, SymbolTier.MID, 17),
    Symbol.WOLF_SPIRIT: SymbolInfo(Symbol.WOLF_SPIRIT, SymbolTier.MID, 20),

    # Low tier hats - common (weight 25-35)
    Symbol.HAT_CAP: SymbolInfo(Symbol.HAT_CAP, SymbolTier.LOW, 25),
    Symbol.HAT_STEAMPUNK: SymbolInfo(Symbol.HAT_STEAMPUNK, SymbolTier.LOW, 28),
    Symbol.HAT_STRAW: SymbolInfo(Symbol.HAT_STRAW, SymbolTier.LOW, 32),
    Symbol.HAT_PEACOCK: SymbolInfo(Symbol.HAT_PEACOCK, SymbolTier.LOW, 35),
}

# Symbols that should NOT be included in regular cluster matching
SPECIAL_SYMBOLS = {Symbol.SCATTER}

# Wild symbol substitutes for all regular symbols
WILD_SYMBOL = Symbol.WILD

# Minimum cluster size for a win
MIN_CLUSTER_SIZE = 4

# Paytable: cluster_size -> payout multiplier (for 1 unit bet)
# BALANCED FOR ~96% RTP with tumble and multiplier mechanics
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
    # Low Tier: Hats - Lower payouts (they win most often!)
    Symbol.HAT_CAP: {
        4: 0.06, 5: 0.10, 6: 0.18, 7: 0.30, 8: 0.50, 9: 0.80,
        10: 1.20, 11: 2.00, 12: 3.20, 13: 5.20, 14: 8.50,
        15: 13.00,
    },
    Symbol.HAT_STEAMPUNK: {
        4: 0.05, 5: 0.08, 6: 0.14, 7: 0.24, 8: 0.40, 9: 0.65,
        10: 1.00, 11: 1.70, 12: 2.70, 13: 4.40, 14: 7.00,
        15: 10.50,
    },
    Symbol.HAT_STRAW: {
        4: 0.04, 5: 0.062, 6: 0.105, 7: 0.162, 8: 0.295, 9: 0.476,
        10: 0.721, 11: 1.24, 12: 2.03, 13: 3.28, 14: 5.23,
        15: 7.88,
    },
    Symbol.HAT_PEACOCK: {
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

    paytable = PAYTABLE.get(symbol)
    if not paytable:
        return 0.0

    # Cap lookup at 15 (max paytable entry)
    lookup_size = min(cluster_size, 15)
    return paytable.get(lookup_size, 0.0)
