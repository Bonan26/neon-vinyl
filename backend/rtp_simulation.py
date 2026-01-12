"""
NEON VINYL: GHOST GROOVES - RTP Simulation
100,000 spins to validate Return To Player percentage
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.gamestate import run_spin
from app.game_config import (
    TARGET_RTP, RTP_VARIANCE, Symbol, SYMBOL_WEIGHTS,
    SCATTER_FREE_SPINS, MIN_BET
)
import time
from collections import defaultdict

def run_rtp_simulation(num_spins: int = 100000, bet_amount: float = 1.0):
    """
    Run RTP simulation with specified number of spins.
    """
    print("=" * 60)
    print("NEON VINYL: GHOST GROOVES - RTP SIMULATION")
    print("=" * 60)
    print(f"Spins: {num_spins:,}")
    print(f"Bet Amount: {bet_amount}")
    print(f"Target RTP: {TARGET_RTP}% (±{RTP_VARIANCE}%)")
    print("=" * 60)

    # Tracking variables
    total_bet = 0.0
    total_payout = 0.0
    total_base_wins = 0.0
    total_free_spin_wins = 0.0

    # Statistics
    wins = 0
    losses = 0
    free_spin_triggers = 0
    total_free_spins_awarded = 0
    free_spins_played = 0
    jackpots_won = defaultdict(int)
    max_win = 0.0
    max_multiplier = 1

    # Symbol win tracking
    symbol_wins = defaultdict(int)
    wild_cluster_count = 0

    # Tumble statistics
    tumble_counts = defaultdict(int)

    start_time = time.time()

    # Use consistent seeds for reproducibility
    server_seed = "rtp_simulation_seed_2024"
    client_seed = "client_test"

    spin_number = 0
    nonce = 0

    while spin_number < num_spins:
        # Base game spin
        result = run_spin(
            server_seed=server_seed,
            client_seed=client_seed,
            nonce=nonce,
            bet_amount=bet_amount,
            free_spin_mode=False
        )
        nonce += 1
        spin_number += 1
        total_bet += bet_amount

        spin_payout = result.payout_multiplier * bet_amount
        total_payout += spin_payout
        total_base_wins += spin_payout

        if spin_payout > 0:
            wins += 1
        else:
            losses += 1

        if spin_payout > max_win:
            max_win = spin_payout

        if result.max_multiplier > max_multiplier:
            max_multiplier = result.max_multiplier

        tumble_counts[result.tumble_count] += 1

        # Track symbol wins from events
        for event in result.events:
            if event.type == "win":
                symbol_id = event.data.get("symbol")
                symbol_wins[symbol_id] += 1
                if symbol_id == "WD":
                    wild_cluster_count += 1

        # Track jackpots
        if result.jackpot_won:
            jackpots_won[result.jackpot_won] += 1
            total_payout += result.jackpot_amount

        # Handle free spins if triggered
        if result.free_spins_triggered > 0:
            free_spin_triggers += 1
            total_free_spins_awarded += result.free_spins_triggered

            # Play through free spins
            fs_remaining = result.free_spins_remaining
            fs_multipliers = result.final_multipliers

            while fs_remaining > 0:
                free_spins_played += 1

                fs_result = run_spin(
                    server_seed=server_seed,
                    client_seed=client_seed,
                    nonce=nonce,
                    bet_amount=bet_amount,
                    free_spin_mode=True,
                    free_spins_remaining=fs_remaining,
                    existing_multipliers=fs_multipliers
                )
                nonce += 1

                fs_payout = fs_result.payout_multiplier * bet_amount
                total_payout += fs_payout
                total_free_spin_wins += fs_payout

                if fs_payout > max_win:
                    max_win = fs_payout

                if fs_result.max_multiplier > max_multiplier:
                    max_multiplier = fs_result.max_multiplier

                # Track symbol wins
                for event in fs_result.events:
                    if event.type == "win":
                        symbol_id = event.data.get("symbol")
                        symbol_wins[symbol_id] += 1
                        if symbol_id == "WD":
                            wild_cluster_count += 1

                # Retrigger check
                if fs_result.free_spins_triggered > 0:
                    total_free_spins_awarded += fs_result.free_spins_triggered

                fs_remaining = fs_result.free_spins_remaining
                fs_multipliers = fs_result.final_multipliers

        # Progress update
        if spin_number % 10000 == 0:
            elapsed = time.time() - start_time
            current_rtp = (total_payout / total_bet) * 100 if total_bet > 0 else 0
            print(f"  Progress: {spin_number:,}/{num_spins:,} | RTP: {current_rtp:.2f}% | Time: {elapsed:.1f}s")

    elapsed_time = time.time() - start_time

    # Calculate final RTP
    rtp = (total_payout / total_bet) * 100 if total_bet > 0 else 0
    base_rtp = (total_base_wins / total_bet) * 100 if total_bet > 0 else 0
    free_spin_rtp = (total_free_spin_wins / total_bet) * 100 if total_bet > 0 else 0

    # Results
    print("\n" + "=" * 60)
    print("SIMULATION RESULTS")
    print("=" * 60)

    print(f"\n📊 RTP ANALYSIS:")
    print(f"   Total Bet:        {total_bet:,.2f}")
    print(f"   Total Payout:     {total_payout:,.2f}")
    print(f"   ─────────────────────────────")
    print(f"   ACTUAL RTP:       {rtp:.2f}%")
    print(f"   Target RTP:       {TARGET_RTP:.2f}%")
    print(f"   Difference:       {rtp - TARGET_RTP:+.2f}%")

    rtp_status = "✅ PASS" if abs(rtp - TARGET_RTP) <= RTP_VARIANCE else "❌ FAIL"
    print(f"   Status:           {rtp_status}")

    print(f"\n📈 RTP BREAKDOWN:")
    print(f"   Base Game RTP:    {base_rtp:.2f}%")
    print(f"   Free Spins RTP:   {free_spin_rtp:.2f}%")

    print(f"\n🎰 WIN STATISTICS:")
    print(f"   Winning Spins:    {wins:,} ({wins/num_spins*100:.1f}%)")
    print(f"   Losing Spins:     {losses:,} ({losses/num_spins*100:.1f}%)")
    print(f"   Max Single Win:   {max_win:,.2f}x")
    print(f"   Max Multiplier:   {max_multiplier}x")

    print(f"\n🎁 FREE SPINS:")
    print(f"   Triggers:         {free_spin_triggers:,} ({free_spin_triggers/num_spins*100:.2f}%)")
    print(f"   Total Awarded:    {total_free_spins_awarded:,}")
    print(f"   Total Played:     {free_spins_played:,}")
    if free_spin_triggers > 0:
        print(f"   Avg per Trigger:  {total_free_spins_awarded/free_spin_triggers:.1f}")

    print(f"\n🃏 WILD SYMBOL ANALYSIS:")
    print(f"   Wild Clusters:    {wild_cluster_count:,}")
    print(f"   Wild Win Rate:    {wild_cluster_count/num_spins*100:.2f}% of spins")

    print(f"\n📊 SYMBOL WIN DISTRIBUTION:")
    total_symbol_wins = sum(symbol_wins.values())
    for symbol_id, count in sorted(symbol_wins.items(), key=lambda x: -x[1]):
        pct = count / total_symbol_wins * 100 if total_symbol_wins > 0 else 0
        weight = None
        for s, cfg in SYMBOL_WEIGHTS.items():
            if s.value == symbol_id:
                weight = cfg.weight
                break
        weight_str = f" (weight: {weight})" if weight else ""
        print(f"   {symbol_id}: {count:,} wins ({pct:.1f}%){weight_str}")

    print(f"\n🔄 TUMBLE DISTRIBUTION:")
    for tumbles, count in sorted(tumble_counts.items()):
        pct = count / num_spins * 100
        print(f"   {tumbles} tumbles: {count:,} ({pct:.1f}%)")

    if jackpots_won:
        print(f"\n💎 JACKPOTS:")
        for tier, count in jackpots_won.items():
            print(f"   {tier.upper()}: {count:,}")

    print(f"\n⏱️  Simulation Time: {elapsed_time:.2f}s")
    print(f"   Spins/second: {num_spins/elapsed_time:,.0f}")

    print("\n" + "=" * 60)

    return {
        "rtp": rtp,
        "base_rtp": base_rtp,
        "free_spin_rtp": free_spin_rtp,
        "pass": abs(rtp - TARGET_RTP) <= RTP_VARIANCE,
        "wild_clusters": wild_cluster_count,
        "free_spin_triggers": free_spin_triggers,
    }


if __name__ == "__main__":
    results = run_rtp_simulation(num_spins=100000, bet_amount=1.0)

    if not results["pass"]:
        print("\n⚠️  WARNING: RTP is outside acceptable range!")
        print("   Consider adjusting:")
        print("   - Symbol weights (especially Wild)")
        print("   - Paytable values")
        print("   - Free spin frequency")
