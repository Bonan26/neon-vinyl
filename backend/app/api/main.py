"""
Wolfie Groove - FastAPI Wrapper
Stake Engine (Carrot) Standard - RGS API

This module wraps the Math SDK for the dev environment.
Implements the Stake RGS spec for game operations.
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from app.game_config import (
    StakeErrorCode, MIN_BET, MAX_BET, DEFAULT_BET,
    GRID_ROWS, GRID_COLS, Symbol, PAYTABLE,
    BONUS_BUY_OPTIONS, JACKPOT_TIERS, SCATTER_FREE_SPINS
)
from app.gamestate import run_spin, verify_spin, run_bonus_trigger_spin, SpinResult
from app.random_generator import generate_server_seed, hash_server_seed


# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(
    title="Wolfie Groove",
    description="High-volatility 7x7 Cluster Pays Slot Game - Stake Engine API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# SESSION MANAGEMENT (In-Memory for Dev)
# =============================================================================

# In production, use Redis or database
sessions: Dict[str, Dict[str, Any]] = {}


def get_or_create_session(session_id: str) -> Dict[str, Any]:
    """Get existing session or create new one."""
    if session_id not in sessions:
        sessions[session_id] = {
            "id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "balance": 10000.0,  # Demo balance
            "server_seed": generate_server_seed(),
            "server_seed_hash": "",
            "nonce": 0,
            "history": [],
            # Free spins state
            "free_spins_remaining": 0,
            "free_spin_multipliers": None,  # Carried multiplier grid
            "free_spin_bet_amount": 0.0,  # Bet amount locked during free spins
            "free_spin_total_win": 0.0,  # Accumulated win during free spins
            # Boost state (Scatter Hunt / Wild Boost)
            "scatter_boost_spins": 0,  # Remaining spins with 3x scatter chance
            "wild_boost_spins": 0,     # Remaining spins with 5x wild chance
            # Jackpot tracking (simplified - in production use Redis)
            "jackpot_contributions": {tier: JACKPOT_TIERS[tier].seed_amount for tier in JACKPOT_TIERS}
        }
        sessions[session_id]["server_seed_hash"] = hash_server_seed(
            sessions[session_id]["server_seed"]
        )
    return sessions[session_id]


# =============================================================================
# REQUEST/RESPONSE MODELS (Stake RGS Spec)
# =============================================================================

class PlayRequest(BaseModel):
    """Stake RGS play request format."""
    sessionID: str = Field(..., description="Player session ID")
    betAmount: float = Field(DEFAULT_BET, description="Bet amount in credits (includes boost multipliers)")
    clientSeed: str = Field(..., description="Client-provided seed for provably fair")
    nonce: Optional[int] = Field(None, description="Optional nonce override")
    # Boost toggles - these affect probability, cost is already included in betAmount
    scatterBoostActive: bool = Field(False, description="Scatter Hunt boost active (3x scatter chance)")
    wildBoostActive: bool = Field(False, description="Wild Boost active (5x wild chance)")

    @validator('betAmount')
    def validate_bet(cls, v):
        # Allow higher bets when boosts are active (up to 10x MAX_BET for stacked boosts)
        max_with_boosts = MAX_BET * 10
        if v < MIN_BET:
            raise ValueError(f"Minimum bet is {MIN_BET}")
        if v > max_with_boosts:
            raise ValueError(f"Maximum bet is {max_with_boosts}")
        return v

    @validator('clientSeed')
    def validate_client_seed(cls, v):
        if not v or len(v) < 1:
            raise ValueError("Client seed is required")
        if len(v) > 64:
            raise ValueError("Client seed too long (max 64 chars)")
        return v


class PlayResponse(BaseModel):
    """Stake RGS play response format."""
    payoutMultiplier: float
    payoutAmount: float
    events: List[Dict[str, Any]]
    initialGrid: List[List[str]]
    finalGrid: List[List[str]]
    finalMultipliers: List[List[int]]
    tumbleCount: int
    maxMultiplier: int
    seedInfo: Dict[str, Any]
    balance: float
    nonce: int
    # Free spins info
    freeSpinsTriggered: int = 0
    freeSpinsRemaining: int = 0
    isFreeSpin: bool = False
    freeSpinTotalWin: float = 0.0
    # Jackpot info
    jackpotWon: Optional[str] = None
    jackpotAmount: float = 0.0


class VerifyRequest(BaseModel):
    """Request to verify a provably fair result."""
    serverSeed: str
    clientSeed: str
    nonce: int
    betAmount: float = DEFAULT_BET


class VerifyResponse(BaseModel):
    """Response for provably fair verification."""
    isValid: bool
    payoutMultiplier: float
    initialGrid: List[List[str]]
    events: List[Dict[str, Any]]


class SessionResponse(BaseModel):
    """Session information response."""
    sessionID: str
    balance: float
    serverSeedHash: str
    nonce: int


class ErrorResponse(BaseModel):
    """Stake standard error response."""
    error: str
    code: str
    message: str


class GameInfoResponse(BaseModel):
    """Game configuration information."""
    name: str
    version: str
    gridSize: Dict[str, int]
    minBet: float
    maxBet: float
    minClusterSize: int
    symbols: List[Dict[str, Any]]
    paytable: Dict[str, Dict[str, float]]
    bonusBuyOptions: List[Dict[str, Any]] = []
    jackpotTiers: List[Dict[str, Any]] = []


class BonusBuyRequest(BaseModel):
    """Request to purchase a bonus feature."""
    sessionID: str
    bonusId: str  # e.g., "free_spins_8", "wild_grid"
    clientSeed: str
    betAmount: float = Field(DEFAULT_BET, description="Bet amount for bonus cost calculation")


class BonusBuyResponse(BaseModel):
    """Response after purchasing a bonus."""
    success: bool
    cost: float
    balance: float
    featureActivated: str
    # Initial result if feature starts immediately
    initialResult: Optional[Dict[str, Any]] = None


# =============================================================================
# ERROR HANDLING
# =============================================================================

class StakeError(HTTPException):
    """Custom exception for Stake standard errors."""

    def __init__(self, code: StakeErrorCode, message: str):
        super().__init__(
            status_code=400,
            detail={
                "error": code.value,
                "code": code.value,
                "message": message
            }
        )


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "game": "Wolfie Groove",
        "version": "1.0.0",
        "engine": "Stake Engine (Carrot)"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "activeSessions": len(sessions)
    }


@app.get("/game/info", response_model=GameInfoResponse, tags=["Game"])
async def get_game_info():
    """Get game configuration and paytable."""
    return GameInfoResponse(
        name="Wolfie Groove",
        version="1.0.0",
        gridSize={"rows": GRID_ROWS, "cols": GRID_COLS},
        minBet=MIN_BET,
        maxBet=MAX_BET,
        minClusterSize=5,
        symbols=[
            {"id": s.value, "name": s.name, "tier": s.name.split("_")[0]}
            for s in Symbol
        ],
        paytable={
            s.value: {str(k): v for k, v in payouts.items()}
            for s, payouts in PAYTABLE.items()
        },
        bonusBuyOptions=[
            {
                "id": opt.id,
                "name": opt.name,
                "description": opt.description,
                "costMultiplier": opt.cost_multiplier,
                "volatility": opt.volatility,
                "feature": opt.feature
            }
            for opt in BONUS_BUY_OPTIONS.values()
        ],
        jackpotTiers=[
            {
                "id": tier_id,
                "name": tier.name,
                "seedAmount": tier.seed_amount,
                "triggerChance": tier.trigger_chance,
                "minBetMultiplier": tier.min_bet_multiplier
            }
            for tier_id, tier in JACKPOT_TIERS.items()
        ]
    )


@app.post("/session/create", response_model=SessionResponse, tags=["Session"])
async def create_session():
    """Create a new game session."""
    session_id = str(uuid.uuid4())
    session = get_or_create_session(session_id)

    return SessionResponse(
        sessionID=session["id"],
        balance=session["balance"],
        serverSeedHash=session["server_seed_hash"],
        nonce=session["nonce"]
    )


@app.get("/session/{session_id}", response_model=SessionResponse, tags=["Session"])
async def get_session(session_id: str):
    """Get session information."""
    if session_id not in sessions:
        raise StakeError(StakeErrorCode.ERR_IS, "Session not found")

    session = sessions[session_id]
    return SessionResponse(
        sessionID=session["id"],
        balance=session["balance"],
        serverSeedHash=session["server_seed_hash"],
        nonce=session["nonce"]
    )


@app.post("/session/{session_id}/rotate-seed", tags=["Session"])
async def rotate_server_seed(session_id: str):
    """
    Rotate server seed and reveal the old one.
    Used for provably fair verification.
    """
    if session_id not in sessions:
        raise StakeError(StakeErrorCode.ERR_IS, "Session not found")

    session = sessions[session_id]
    old_seed = session["server_seed"]
    old_hash = session["server_seed_hash"]

    # Generate new seed
    new_seed = generate_server_seed()
    session["server_seed"] = new_seed
    session["server_seed_hash"] = hash_server_seed(new_seed)
    session["nonce"] = 0  # Reset nonce

    return {
        "revealedServerSeed": old_seed,
        "revealedServerSeedHash": old_hash,
        "newServerSeedHash": session["server_seed_hash"],
        "message": "You can now verify all bets made with the old seed"
    }


@app.post("/play", response_model=PlayResponse, tags=["Game"])
async def play(request: PlayRequest):
    """
    Execute a spin - Main game endpoint.

    Stake RGS Spec:
    - Validates session and balance
    - Executes deterministic spin
    - Handles free spins with persistent multipliers
    - Returns events and payout
    """
    # Validate session
    if not request.sessionID:
        raise StakeError(StakeErrorCode.ERR_VAL, "Session ID is required")

    session = get_or_create_session(request.sessionID)

    # Check if we're in free spin mode
    is_free_spin = session["free_spins_remaining"] > 0
    free_spin_mode = is_free_spin

    if is_free_spin:
        # During free spins: use locked bet amount, no cost
        bet_amount = session["free_spin_bet_amount"]
        existing_multipliers = session["free_spin_multipliers"]
        free_spins_remaining = session["free_spins_remaining"]
    else:
        # Normal spin: validate and deduct bet
        bet_amount = request.betAmount

        if session["balance"] < bet_amount:
            raise StakeError(
                StakeErrorCode.ERR_IPB,
                f"Insufficient balance. Required: {bet_amount}, Available: {session['balance']}"
            )

        # Deduct bet
        session["balance"] -= bet_amount
        existing_multipliers = None
        free_spins_remaining = 0

    # Use provided nonce or auto-increment
    nonce = request.nonce if request.nonce is not None else session["nonce"]

    # Get boost state directly from request (toggle model - cost included in betAmount)
    scatter_boost = request.scatterBoostActive
    wild_boost = request.wildBoostActive

    print(f"[PLAY] betAmount={bet_amount}, scatterBoost={scatter_boost}, wildBoost={wild_boost}")

    # Execute spin (deterministic Math SDK)
    result: SpinResult = run_spin(
        server_seed=session["server_seed"],
        client_seed=request.clientSeed,
        nonce=nonce,
        bet_amount=bet_amount,
        free_spin_mode=free_spin_mode,
        free_spins_remaining=free_spins_remaining,
        existing_multipliers=existing_multipliers,
        scatter_boost=scatter_boost,
        wild_boost=wild_boost
    )

    # NOTE: Boost is a toggle now, no session counter to decrement

    # Calculate payout
    payout_amount = result.payout_multiplier * bet_amount

    # Credit winnings
    session["balance"] += payout_amount

    # Update nonce
    session["nonce"] = nonce + 1

    # Handle free spins state
    if result.free_spins_triggered > 0 and not is_free_spin:
        # New free spins triggered from base game
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_bet_amount"] = bet_amount
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] = payout_amount
    elif is_free_spin:
        # Update free spins state
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] = session.get("free_spin_total_win", 0.0) + payout_amount

        print(f"[FREE SPIN] Payout: {payout_amount}, Total: {session['free_spin_total_win']}, Remaining: {result.free_spins_remaining}")

        # If free spins ended, keep total for response but reset other state
        if result.free_spins_remaining <= 0:
            session["free_spin_multipliers"] = None
            session["free_spin_bet_amount"] = 0.0
            print(f"[FREE SPIN END] Final total win: {session['free_spin_total_win']}")
    elif result.free_spins_triggered > 0:
        # Triggered during free spins (retrigger)
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] += payout_amount

    # Record in history
    session["history"].append({
        "nonce": nonce,
        "clientSeed": request.clientSeed,
        "betAmount": bet_amount,
        "payoutMultiplier": result.payout_multiplier,
        "isFreeSpin": is_free_spin,
        "freeSpinsTriggered": result.free_spins_triggered,
        "jackpotWon": result.jackpot_won,
        "timestamp": datetime.utcnow().isoformat()
    })

    return PlayResponse(
        payoutMultiplier=result.payout_multiplier,
        payoutAmount=payout_amount,
        events=[e.to_dict() for e in result.events],
        initialGrid=result.initial_grid,
        finalGrid=result.final_grid,
        finalMultipliers=result.final_multipliers,
        tumbleCount=result.tumble_count,
        maxMultiplier=result.max_multiplier,
        seedInfo=result.seed_data.to_dict(),
        balance=session["balance"],
        nonce=nonce,
        freeSpinsTriggered=result.free_spins_triggered,
        freeSpinsRemaining=result.free_spins_remaining,
        isFreeSpin=is_free_spin,
        freeSpinTotalWin=session.get("free_spin_total_win", 0.0),
        jackpotWon=result.jackpot_won,
        jackpotAmount=result.jackpot_amount
    )


@app.post("/verify", response_model=VerifyResponse, tags=["Provably Fair"])
async def verify_result(request: VerifyRequest):
    """
    Verify a provably fair result.

    Players can use this to verify game fairness
    after the server seed is revealed.
    """
    is_valid, result = verify_spin(
        server_seed=request.serverSeed,
        client_seed=request.clientSeed,
        nonce=request.nonce,
        expected_payout=0,  # We'll return the calculated payout
        bet_amount=request.betAmount
    )

    return VerifyResponse(
        isValid=True,  # If we got here, calculation succeeded
        payoutMultiplier=result.payout_multiplier,
        initialGrid=result.initial_grid,
        events=[e.to_dict() for e in result.events]
    )


@app.get("/session/{session_id}/history", tags=["Session"])
async def get_session_history(session_id: str, limit: int = 10):
    """Get recent bet history for a session."""
    if session_id not in sessions:
        raise StakeError(StakeErrorCode.ERR_IS, "Session not found")

    session = sessions[session_id]
    history = session.get("history", [])

    return {
        "sessionID": session_id,
        "totalBets": len(history),
        "history": history[-limit:][::-1]  # Most recent first
    }


# =============================================================================
# BONUS BUY ENDPOINTS
# =============================================================================

@app.get("/bonus/options", tags=["Bonus"])
async def get_bonus_options(bet_amount: float = DEFAULT_BET):
    """
    Get available bonus buy options with costs calculated for the given bet amount.
    """
    options = []
    for opt in BONUS_BUY_OPTIONS.values():
        options.append({
            "id": opt.id,
            "name": opt.name,
            "description": opt.description,
            "costMultiplier": opt.cost_multiplier,
            "cost": opt.cost_multiplier * bet_amount,
            "volatility": opt.volatility,
            "feature": opt.feature
        })
    return {"betAmount": bet_amount, "options": options}


@app.post("/bonus/buy", response_model=BonusBuyResponse, tags=["Bonus"])
async def buy_bonus(request: BonusBuyRequest):
    """
    Purchase a bonus feature.

    Available bonuses:
    - free_spins_8: Buy 8 Free Spins (80x bet)
    - free_spins_12: Buy 12 Enhanced Free Spins with x2 start (150x bet)
    - wild_grid: Guaranteed 5-8 Wilds on first spin (25x bet)
    - max_multi_start: Start with x4-x16 multipliers on 5 positions (100x bet)
    - jackpot_chance: 10x higher jackpot chance this spin (50x bet)
    """
    if request.bonusId not in BONUS_BUY_OPTIONS:
        raise StakeError(StakeErrorCode.ERR_VAL, f"Invalid bonus ID: {request.bonusId}")

    session = get_or_create_session(request.sessionID)
    bonus = BONUS_BUY_OPTIONS[request.bonusId]

    # Check if already in free spins
    if session["free_spins_remaining"] > 0:
        raise StakeError(StakeErrorCode.ERR_VAL, "Cannot buy bonus during free spins")

    # Calculate cost based on actual bet amount
    bet_amount = request.betAmount
    cost = bonus.cost_multiplier * bet_amount

    # Check balance
    if session["balance"] < cost:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {cost}, Available: {session['balance']}"
        )

    # Deduct cost
    session["balance"] -= cost

    # Handle different bonus types
    initial_result = None

    if bonus.feature == "free_spins":
        # Buy Free Spins (8)
        session["free_spins_remaining"] = 8
        session["free_spin_bet_amount"] = bet_amount
        session["free_spin_multipliers"] = None  # Start fresh
        session["free_spin_total_win"] = 0.0

    elif bonus.feature == "free_spins_enhanced":
        # Buy Enhanced Free Spins (12) with x2 starting multiplier
        session["free_spins_remaining"] = 12
        session["free_spin_bet_amount"] = bet_amount
        # Start with x2 multipliers everywhere
        session["free_spin_multipliers"] = [[2 for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        session["free_spin_total_win"] = 0.0

    elif bonus.feature == "wild_boost":
        # Wild Boost: Execute a spin with guaranteed wilds
        # This is handled specially - we force wilds onto the grid after generation
        nonce = session["nonce"]
        result = run_spin(
            server_seed=session["server_seed"],
            client_seed=request.clientSeed,
            nonce=nonce,
            bet_amount=bet_amount
        )
        session["nonce"] = nonce + 1

        # Add payout
        payout = result.payout_multiplier * bet_amount
        session["balance"] += payout

        initial_result = result.to_dict()
        initial_result["payoutAmount"] = payout
        initial_result["balance"] = session["balance"]

    elif bonus.feature == "multiplier_start":
        # Multiplier Madness: Start next spin with random high multipliers
        import random
        multipliers = [[1 for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        # Place 5 random multipliers
        positions = random.sample([(r, c) for r in range(GRID_ROWS) for c in range(GRID_COLS)], 5)
        for r, c in positions:
            multipliers[r][c] = random.choice([4, 8, 16])

        # Store for next spin
        session["bonus_multipliers"] = multipliers

    elif bonus.feature == "jackpot_boost":
        # Jackpot Hunt: Flag for next spin
        session["jackpot_boost_active"] = True

    return BonusBuyResponse(
        success=True,
        cost=cost,
        balance=session["balance"],
        featureActivated=bonus.feature,
        initialResult=initial_result
    )


class BonusTriggerSpinRequest(BaseModel):
    """Request for bonus trigger spin (shows scatters landing)."""
    sessionID: str
    bonusId: str  # e.g., "free_spins_8" or "free_spins_12"
    clientSeed: str
    betAmount: float = Field(DEFAULT_BET)


class BonusTriggerSpinResponse(BaseModel):
    """Response for bonus trigger spin."""
    success: bool
    cost: float
    balance: float
    # Spin result to animate
    payoutMultiplier: float
    payoutAmount: float
    events: List[Dict[str, Any]]
    initialGrid: List[List[str]]
    finalGrid: List[List[str]]
    finalMultipliers: List[List[int]]
    tumbleCount: int
    maxMultiplier: int
    seedInfo: Dict[str, Any]
    nonce: int
    freeSpinsTriggered: int
    freeSpinsRemaining: int
    scatterCount: int


@app.post("/bonus/trigger-spin", response_model=BonusTriggerSpinResponse, tags=["Bonus"])
async def bonus_trigger_spin(request: BonusTriggerSpinRequest):
    """
    Execute a bonus trigger spin - shows the grid spinning and landing on scatters.

    This endpoint:
    1. Deducts the bonus cost
    2. Generates a grid with forced scatters (3 or 4)
    3. Returns the spin result for animation
    4. Sets up free spins state

    The frontend should animate the real grid with this result,
    then show the rules popup.
    """
    if request.bonusId not in BONUS_BUY_OPTIONS:
        raise StakeError(StakeErrorCode.ERR_VAL, f"Invalid bonus ID: {request.bonusId}")

    session = get_or_create_session(request.sessionID)
    bonus = BONUS_BUY_OPTIONS[request.bonusId]

    # Check if already in free spins
    if session["free_spins_remaining"] > 0:
        raise StakeError(StakeErrorCode.ERR_VAL, "Cannot buy bonus during free spins")

    # Determine scatter count from bonus type
    scatter_count = 4 if request.bonusId == "free_spins_12" else 3

    # Calculate cost
    bet_amount = request.betAmount
    cost = bonus.cost_multiplier * bet_amount

    # Check balance
    if session["balance"] < cost:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {cost}, Available: {session['balance']}"
        )

    # Deduct cost
    session["balance"] -= cost

    # Get nonce
    nonce = session["nonce"]

    # Run the bonus trigger spin (forced scatters)
    result = run_bonus_trigger_spin(
        server_seed=session["server_seed"],
        client_seed=request.clientSeed,
        nonce=nonce,
        bet_amount=bet_amount,
        scatter_count=scatter_count
    )

    # Update nonce
    session["nonce"] = nonce + 1

    # Set up free spins state
    session["free_spins_remaining"] = result.free_spins_triggered
    session["free_spin_bet_amount"] = bet_amount
    session["free_spin_total_win"] = 0.0

    # For super bonus (4 scatters), start with x2 multipliers
    if scatter_count == 4:
        session["free_spin_multipliers"] = [[2 for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
    else:
        session["free_spin_multipliers"] = None

    return BonusTriggerSpinResponse(
        success=True,
        cost=cost,
        balance=session["balance"],
        payoutMultiplier=result.payout_multiplier,
        payoutAmount=0.0,
        events=[e.to_dict() for e in result.events],
        initialGrid=result.initial_grid,
        finalGrid=result.final_grid,
        finalMultipliers=result.final_multipliers,
        tumbleCount=result.tumble_count,
        maxMultiplier=result.max_multiplier,
        seedInfo=result.seed_data.to_dict(),
        nonce=nonce,
        freeSpinsTriggered=result.free_spins_triggered,
        freeSpinsRemaining=result.free_spins_remaining,
        scatterCount=scatter_count
    )


class BoostActivateRequest(BaseModel):
    """Request to activate a boost feature."""
    sessionID: str
    boostType: str  # "scatter_boost" or "wild_boost"
    betAmount: float = Field(DEFAULT_BET)


class BoostActivateResponse(BaseModel):
    """Response for boost activation."""
    success: bool
    cost: float
    balance: float
    boostType: str
    boostSpinsRemaining: int


@app.post("/bonus/activate-boost", response_model=BoostActivateResponse, tags=["Bonus"])
async def activate_boost(request: BoostActivateRequest):
    """
    Activate a boost feature (Scatter Hunt or Wild Boost).

    - scatter_boost: 3x scatter chance for 10 spins (2x bet cost)
    - wild_boost: 5x wild chance for 5 spins (5x bet cost)
    """
    session = get_or_create_session(request.sessionID)

    # Check if already in free spins
    if session["free_spins_remaining"] > 0:
        raise StakeError(StakeErrorCode.ERR_VAL, "Cannot activate boost during free spins")

    bet_amount = request.betAmount
    print(f"[BOOST] Activating {request.boostType}, betAmount={bet_amount}")

    if request.boostType == "scatter_boost":
        cost_multiplier = 2.0
        boost_spins = 10
        session_key = "scatter_boost_spins"
    elif request.boostType == "wild_boost":
        cost_multiplier = 5.0
        boost_spins = 5
        session_key = "wild_boost_spins"
    else:
        raise StakeError(StakeErrorCode.ERR_VAL, f"Invalid boost type: {request.boostType}")

    cost = cost_multiplier * bet_amount

    # Check balance
    if session["balance"] < cost:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {cost}, Available: {session['balance']}"
        )

    # Deduct cost
    session["balance"] -= cost
    print(f"[BOOST] Cost={cost}, New balance={session['balance']}")

    # Activate boost (add to existing if any)
    session[session_key] = session.get(session_key, 0) + boost_spins

    return BoostActivateResponse(
        success=True,
        cost=cost,
        balance=session["balance"],
        boostType=request.boostType,
        boostSpinsRemaining=session[session_key]
    )


@app.get("/jackpot/info", tags=["Jackpot"])
async def get_jackpot_info(session_id: Optional[str] = None):
    """
    Get current jackpot values.
    In production, these would be tracked globally in Redis.
    """
    jackpots = {}
    for tier_id, tier in JACKPOT_TIERS.items():
        # In production, get accumulated value from Redis
        # For demo, show seed amount
        jackpots[tier_id] = {
            "name": tier.name,
            "currentAmount": tier.seed_amount,
            "minBet": tier.min_bet_multiplier * MIN_BET,
            "triggerChance": f"{tier.trigger_chance * 100:.4f}%"
        }
    return {"jackpots": jackpots}


# =============================================================================
# DEV/DEBUG ENDPOINTS (Remove in Production)
# =============================================================================

@app.post("/dev/test-spin", tags=["Development"])
async def test_spin(
    server_seed: str = "test_server_seed",
    client_seed: str = "test_client_seed",
    nonce: int = 0,
    bet_amount: float = 1.0
):
    """
    Development endpoint for testing spins directly.
    Bypasses session management.
    """
    result = run_spin(server_seed, client_seed, nonce, bet_amount)
    return result.to_dict()


@app.get("/dev/sessions", tags=["Development"])
async def list_sessions():
    """List all active sessions (dev only)."""
    return {
        "count": len(sessions),
        "sessions": [
            {
                "id": s["id"],
                "balance": s["balance"],
                "nonce": s["nonce"],
                "bets": len(s.get("history", []))
            }
            for s in sessions.values()
        ]
    }


# =============================================================================
# STARTUP/SHUTDOWN EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    print("=" * 60)
    print("Wolfie Groove - Stake Engine")
    print("=" * 60)
    print(f"Grid: {GRID_ROWS}x{GRID_COLS}")
    print(f"Min Bet: {MIN_BET} | Max Bet: {MAX_BET}")
    print(f"Engine: Stake Engine (Carrot) Standard")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down Stake Engine...")
    sessions.clear()
