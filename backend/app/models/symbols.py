"""
NEON VINYL: GHOST GROOVES - Symbol Definitions
"""
from enum import Enum
from dataclasses import dataclass
from typing import Dict


class SymbolTier(Enum):
    HIGH = "high"
    MID = "mid"
    LOW = "low"


class Symbol(Enum):
    # Special Symbols
    WILD = "WD"
    SCATTER = "SC"

    # High Tier Symbols
    DJ_SPOOKY = "DJ"
    GOLD_VINYL = "GV"

    # Mid Tier Symbols
    HEADPHONES = "HP"
    CASSETTE = "CS"

    # Low Tier Symbols
    MUSIC_NOTE_PINK = "NP"
    MUSIC_NOTE_BLUE = "NB"
    MUSIC_NOTE_PURPLE = "NU"


@dataclass
class SymbolInfo:
    symbol: Symbol
    tier: SymbolTier
    weight: int  # Probability weight for RNG


class SpecialTier(Enum):
    SPECIAL = "special"


# Symbol configuration with spawn weights
SYMBOL_CONFIG: Dict[Symbol, SymbolInfo] = {
    # Special symbols - very rare
    Symbol.WILD: SymbolInfo(Symbol.WILD, SymbolTier.HIGH, 3),  # Wild substitutes
    Symbol.SCATTER: SymbolInfo(Symbol.SCATTER, SymbolTier.HIGH, 4),  # Triggers free spins

    # High tier - rare (weight 5-8)
    Symbol.DJ_SPOOKY: SymbolInfo(Symbol.DJ_SPOOKY, SymbolTier.HIGH, 5),
    Symbol.GOLD_VINYL: SymbolInfo(Symbol.GOLD_VINYL, SymbolTier.HIGH, 8),

    # Mid tier - medium (weight 15-20)
    Symbol.HEADPHONES: SymbolInfo(Symbol.HEADPHONES, SymbolTier.MID, 15),
    Symbol.CASSETTE: SymbolInfo(Symbol.CASSETTE, SymbolTier.MID, 20),

    # Low tier - common (weight 25-30)
    Symbol.MUSIC_NOTE_PINK: SymbolInfo(Symbol.MUSIC_NOTE_PINK, SymbolTier.LOW, 25),
    Symbol.MUSIC_NOTE_BLUE: SymbolInfo(Symbol.MUSIC_NOTE_BLUE, SymbolTier.LOW, 30),
    Symbol.MUSIC_NOTE_PURPLE: SymbolInfo(Symbol.MUSIC_NOTE_PURPLE, SymbolTier.LOW, 27),
}

# Symbols that should NOT be included in regular cluster matching
SPECIAL_SYMBOLS = {Symbol.SCATTER}

# Wild symbol substitutes for all regular symbols
WILD_SYMBOL = Symbol.WILD


# Paytable: cluster_size -> payout multiplier (for 1 unit bet)
# BALANCED FOR ~95% RTP with tumble and multiplier mechanics
PAYTABLE: Dict[Symbol, Dict[int, float]] = {
    # Wild symbol (premium payouts when clustering)
    Symbol.WILD: {
        5: 2.0, 6: 3.5, 7: 5.5, 8: 8.5, 9: 14.0,
        10: 22.0, 11: 35.0, 12: 55.0, 13: 100.0, 14: 200.0,
        15: 500.0,
    },
    # Scatter doesn't form clusters - triggers free spins instead
    Symbol.SCATTER: {
        5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
        10: 0, 11: 0, 12: 0, 13: 0, 14: 0,
        15: 0,
    },
    # High Tier: DJ Spooky (best payouts)
    Symbol.DJ_SPOOKY: {
        5: 1.7, 6: 2.85, 7: 4.5, 8: 6.8, 9: 11.2,
        10: 17.0, 11: 28.5, 12: 45.5, 13: 86.0, 14: 170.0,
        15: 455.0,  # 15+ symbols
    },
    # High Tier: Gold Vinyl
    Symbol.GOLD_VINYL: {
        5: 1.42, 6: 2.25, 7: 4.0, 8: 5.7, 9: 9.1,
        10: 13.6, 11: 22.5, 12: 40.5, 13: 68.0, 14: 136.0,
        15: 340.0,
    },
    # Mid Tier: Headphones
    Symbol.HEADPHONES: {
        5: 0.91, 6: 1.42, 7: 2.25, 8: 3.4, 9: 5.7,
        10: 9.1, 11: 13.6, 12: 22.5, 13: 45.5, 14: 91.0,
        15: 170.0,
    },
    # Mid Tier: Cassette
    Symbol.CASSETTE: {
        5: 0.71, 6: 1.12, 7: 1.7, 8: 2.85, 9: 4.5,
        10: 6.8, 11: 11.2, 12: 18.2, 13: 34.0, 14: 68.0,
        15: 136.0,
    },
    # Low Tier: Music Notes (all same payouts)
    Symbol.MUSIC_NOTE_PINK: {
        5: 0.35, 6: 0.57, 7: 0.91, 8: 1.36, 9: 2.25,
        10: 3.4, 11: 5.7, 12: 9.1, 13: 17.0, 14: 34.0,
        15: 68.0,
    },
    Symbol.MUSIC_NOTE_BLUE: {
        5: 0.35, 6: 0.57, 7: 0.91, 8: 1.36, 9: 2.25,
        10: 3.4, 11: 5.7, 12: 9.1, 13: 17.0, 14: 34.0,
        15: 68.0,
    },
    Symbol.MUSIC_NOTE_PURPLE: {
        5: 0.35, 6: 0.57, 7: 0.91, 8: 1.36, 9: 2.25,
        10: 3.4, 11: 5.7, 12: 9.1, 13: 17.0, 14: 34.0,
        15: 68.0,
    },
}


def get_payout(symbol: Symbol, cluster_size: int) -> float:
    """Get the base payout for a symbol cluster."""
    if cluster_size < 5:
        return 0.0

    paytable = PAYTABLE[symbol]
    # Cap at 15 for lookup
    lookup_size = min(cluster_size, 15)
    return paytable.get(lookup_size, 0.0)
