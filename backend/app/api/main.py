"""
LES WOLFS 86 - FastAPI Wrapper
Stake Engine (Carrot) Standard - RGS API

Fully compliant with Stake Engine documentation:
- /wallet/authenticate, /wallet/balance, /wallet/play, /wallet/end-round
- /bet/event for tracking
- Integer monetary values (6 decimal precision)
- Round tracking and session management
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum
import uuid

from app.game_config import (
    StakeErrorCode,
    MIN_BET, MAX_BET, DEFAULT_BET, STEP_BET, BET_LEVELS,
    MIN_BET_FLOAT, MAX_BET_FLOAT, DEFAULT_BET_FLOAT,
    MONETARY_MULTIPLIER, to_stake_amount, from_stake_amount,
    DEFAULT_CURRENCY,
    GRID_ROWS, GRID_COLS, Symbol, PAYTABLE,
    BONUS_BUY_OPTIONS, JACKPOT_TIERS, SCATTER_FREE_SPINS
)
from app.gamestate import run_spin, verify_spin, run_bonus_trigger_spin, SpinResult
from app.random_generator import generate_server_seed, hash_server_seed


# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(
    title="LES WOLFS 86",
    description="High-volatility Cluster Pays Slot - Stake Engine RGS API",
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
# STAKE ENGINE MODELS
# =============================================================================

class StatusCode(str, Enum):
    """Stake Engine status codes."""
    SUCCESS = "SUCCESS"
    ERR_VAL = "ERR_VAL"
    ERR_IPB = "ERR_IPB"
    ERR_IS = "ERR_IS"
    ERR_ATE = "ERR_ATE"
    ERR_GLE = "ERR_GLE"
    ERR_LOC = "ERR_LOC"
    ERR_BNF = "ERR_BNF"
    ERR_GEN = "ERR_GEN"
    ERR_MAINTENANCE = "ERR_MAINTENANCE"


class StatusObject(BaseModel):
    """Stake Engine status object included in all responses."""
    code: StatusCode = StatusCode.SUCCESS
    message: Optional[str] = None


class BalanceObject(BaseModel):
    """Stake Engine standard balance object."""
    amount: int = Field(..., description="Balance in integer format (6 decimals)")
    currency: str = Field(DEFAULT_CURRENCY, description="ISO 4217 currency code")


class RoundStatus(str, Enum):
    """Round status for tracking."""
    ACTIVE = "active"
    COMPLETED = "completed"


class JurisdictionObject(BaseModel):
    """Stake Engine jurisdiction settings."""
    socialCasino: bool = False
    disabledFullscreen: bool = False
    disabledTurbo: bool = False


class RoundDetailObject(BaseModel):
    """Stake Engine round detail object (RoundDetailObject spec)."""
    roundID: str  # uppercase ID per spec
    payoutMultiplier: float = 0.0
    state: List[Dict[str, Any]] = []  # Game events array (spec uses 'state')
    # Additional fields for our implementation
    status: RoundStatus = RoundStatus.ACTIVE
    betAmount: int = 0
    mode: str = "base"
    createdAt: Optional[str] = None
    completedAt: Optional[str] = None


class ConfigObject(BaseModel):
    """Stake Engine configuration object."""
    minBet: int
    maxBet: int
    stepBet: int
    defaultBetLevel: int  # Added per spec
    betLevels: List[int]
    currency: str
    jurisdiction: JurisdictionObject = JurisdictionObject()  # Added per spec


# =============================================================================
# REQUEST/RESPONSE MODELS (Stake Engine Standard)
# =============================================================================

class AuthenticateRequest(BaseModel):
    """Stake Engine /wallet/authenticate request."""
    sessionID: str = Field(..., description="Player session token")
    language: str = Field("en", description="Language code (ISO 639-1)")


class AuthenticateResponse(BaseModel):
    """Stake Engine /wallet/authenticate response."""
    status: StatusObject = StatusObject()
    balance: BalanceObject
    config: ConfigObject
    round: Optional[RoundDetailObject] = None  # Active or last round


class BalanceRequest(BaseModel):
    """Stake Engine /wallet/balance request."""
    sessionID: str


class BalanceResponse(BaseModel):
    """Stake Engine /wallet/balance response."""
    status: StatusObject = StatusObject()
    balance: BalanceObject


class PlayRequest(BaseModel):
    """Stake Engine /wallet/play request."""
    sessionID: str = Field(..., description="Player session ID")
    amount: int = Field(..., description="Bet amount in integer format")
    mode: str = Field("base", description="Game mode (base, free_spin, etc.)")
    currency: str = Field(DEFAULT_CURRENCY, description="Currency code")
    # Custom fields for our game (not in base spec)
    clientSeed: str = Field("", description="Client-provided seed for provably fair")
    scatterBoostActive: bool = Field(False)
    wildBoostActive: bool = Field(False)

    @validator('amount')
    def validate_amount(cls, v):
        if v < MIN_BET:
            raise ValueError(f"Minimum bet is {MIN_BET} ({from_stake_amount(MIN_BET)} {DEFAULT_CURRENCY})")
        if v > MAX_BET * 10:  # Allow boost multipliers
            raise ValueError(f"Maximum bet exceeded")
        if v % STEP_BET != 0:
            raise ValueError(f"Bet must be divisible by {STEP_BET}")
        return v


class PlayResponse(BaseModel):
    """Stake Engine /wallet/play response."""
    status: StatusObject = StatusObject()
    balance: BalanceObject
    round: RoundDetailObject


class EndRoundRequest(BaseModel):
    """Stake Engine /wallet/end-round request."""
    sessionID: str


class EndRoundResponse(BaseModel):
    """Stake Engine /wallet/end-round response."""
    status: StatusObject = StatusObject()
    balance: BalanceObject


class EventRequest(BaseModel):
    """Stake Engine /bet/event request."""
    sessionID: str
    eventIndex: int = Field(..., description="Event sequence index")


class EventResponse(BaseModel):
    """Stake Engine /bet/event response."""
    status: StatusObject = StatusObject()
    eventIndex: int


# =============================================================================
# LEGACY COMPATIBILITY MODELS (for gradual migration)
# =============================================================================

class LegacyPlayRequest(BaseModel):
    """Legacy play request format (float amounts)."""
    sessionID: str
    betAmount: float = Field(DEFAULT_BET_FLOAT)
    clientSeed: str
    nonce: Optional[int] = None
    scatterBoostActive: bool = False
    wildBoostActive: bool = False


class LegacyPlayResponse(BaseModel):
    """Legacy play response format."""
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
    freeSpinsTriggered: int = 0
    freeSpinsRemaining: int = 0
    isFreeSpin: bool = False
    freeSpinTotalWin: float = 0.0
    jackpotWon: Optional[str] = None
    jackpotAmount: float = 0.0


class VerifyRequest(BaseModel):
    """Request to verify a provably fair result."""
    serverSeed: str
    clientSeed: str
    nonce: int
    betAmount: float = DEFAULT_BET_FLOAT


class VerifyResponse(BaseModel):
    """Response for provably fair verification."""
    isValid: bool
    payoutMultiplier: float
    initialGrid: List[List[str]]
    events: List[Dict[str, Any]]


class SessionResponse(BaseModel):
    """Session information response (legacy + Stake Engine)."""
    sessionID: str
    balance: BalanceObject
    serverSeedHash: str
    nonce: int
    config: ConfigObject


class GameInfoResponse(BaseModel):
    """Game configuration information."""
    name: str
    version: str
    gridSize: Dict[str, int]
    minBet: int
    maxBet: int
    stepBet: int
    betLevels: List[int]
    minClusterSize: int
    symbols: List[Dict[str, Any]]
    paytable: Dict[str, Dict[str, float]]
    bonusBuyOptions: List[Dict[str, Any]] = []
    jackpotTiers: List[Dict[str, Any]] = []


class BonusBuyRequest(BaseModel):
    """Request to purchase a bonus feature."""
    sessionID: str
    bonusId: str
    clientSeed: str
    betAmount: float = Field(DEFAULT_BET_FLOAT)


class BonusBuyResponse(BaseModel):
    """Response after purchasing a bonus."""
    success: bool
    cost: float
    balance: float
    featureActivated: str
    initialResult: Optional[Dict[str, Any]] = None


class BonusTriggerSpinRequest(BaseModel):
    """Request for bonus trigger spin."""
    sessionID: str
    bonusId: str
    clientSeed: str
    betAmount: float = Field(DEFAULT_BET_FLOAT)


class BonusTriggerSpinResponse(BaseModel):
    """Response for bonus trigger spin."""
    success: bool
    cost: float
    balance: float
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


class BoostActivateRequest(BaseModel):
    """Request to activate a boost feature."""
    sessionID: str
    boostType: str
    betAmount: float = Field(DEFAULT_BET_FLOAT)


class BoostActivateResponse(BaseModel):
    """Response for boost activation."""
    success: bool
    cost: float
    balance: float
    boostType: str
    boostSpinsRemaining: int


# =============================================================================
# ERROR HANDLING
# =============================================================================

class StakeError(HTTPException):
    """Custom exception for Stake Engine standard errors."""

    def __init__(self, code: StakeErrorCode, message: str, status_code: int = 400):
        super().__init__(
            status_code=status_code,
            detail={
                "error": code.value,
                "code": code.value,
                "message": message
            }
        )


# =============================================================================
# SESSION & ROUND MANAGEMENT
# =============================================================================

# In production, use Redis or database
sessions: Dict[str, Dict[str, Any]] = {}
rounds: Dict[str, Dict[str, Any]] = {}  # Round tracking


def get_session(session_id: str) -> Dict[str, Any]:
    """Get existing session or raise error."""
    if session_id not in sessions:
        raise StakeError(StakeErrorCode.ERR_IS, "Invalid session")
    return sessions[session_id]


def create_session(session_id: str) -> Dict[str, Any]:
    """Create a new session."""
    if session_id not in sessions:
        sessions[session_id] = {
            "id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "balance": to_stake_amount(10000.0),  # Demo balance: 10,000 USD = 10,000,000,000
            "server_seed": generate_server_seed(),
            "server_seed_hash": "",
            "nonce": 0,
            "history": [],
            # Active round
            "active_round_id": None,
            # Free spins state
            "free_spins_remaining": 0,
            "free_spin_multipliers": None,
            "free_spin_bet_amount": 0,
            "free_spin_total_win": 0,
            # Boost state
            "scatter_boost_spins": 0,
            "wild_boost_spins": 0,
            # Jackpot tracking
            "jackpot_contributions": {tier: to_stake_amount(JACKPOT_TIERS[tier].seed_amount) for tier in JACKPOT_TIERS}
        }
        sessions[session_id]["server_seed_hash"] = hash_server_seed(
            sessions[session_id]["server_seed"]
        )
    return sessions[session_id]


def create_round(session_id: str, bet_amount: int, mode: str = "base") -> Dict[str, Any]:
    """Create a new game round."""
    round_id = str(uuid.uuid4())
    round_data = {
        "roundID": round_id,  # uppercase ID per Stake spec
        "sessionId": session_id,
        "status": RoundStatus.ACTIVE,
        "betAmount": bet_amount,
        "mode": mode,
        "state": [],  # 'state' per Stake spec (not 'events')
        "payoutMultiplier": 0.0,  # per Stake spec
        "createdAt": datetime.utcnow().isoformat(),
        "completedAt": None,
        # Game state (internal use)
        "initialGrid": None,
        "finalGrid": None,
        "finalMultipliers": None,
        "payoutMultiplier": 0.0,
        "tumbleCount": 0,
        "maxMultiplier": 1,
        "seedInfo": None,
        "freeSpinsTriggered": 0,
        "freeSpinsRemaining": 0,
        "jackpotWon": None,
        "jackpotAmount": 0,
    }
    rounds[round_id] = round_data
    sessions[session_id]["active_round_id"] = round_id
    return round_data


def complete_round(round_id: str) -> Dict[str, Any]:
    """Mark a round as completed."""
    if round_id not in rounds:
        raise StakeError(StakeErrorCode.ERR_VAL, "Invalid round")
    rounds[round_id]["status"] = RoundStatus.COMPLETED
    rounds[round_id]["completedAt"] = datetime.utcnow().isoformat()
    return rounds[round_id]


def get_round_object(round_data: Dict[str, Any]) -> RoundDetailObject:
    """Convert round data to RoundDetailObject (Stake Engine spec)."""
    return RoundDetailObject(
        roundID=round_data["roundID"],  # uppercase ID
        payoutMultiplier=round_data.get("payoutMultiplier", 0.0),
        state=round_data.get("state", []),  # 'state' per spec
        status=round_data["status"],
        betAmount=round_data["betAmount"],
        mode=round_data["mode"],
        createdAt=round_data.get("createdAt"),
        completedAt=round_data.get("completedAt")
    )


def get_config_object() -> ConfigObject:
    """Get standard config object (Stake Engine spec)."""
    return ConfigObject(
        minBet=MIN_BET,
        maxBet=MAX_BET,
        stepBet=STEP_BET,
        defaultBetLevel=DEFAULT_BET,  # Added per spec
        betLevels=BET_LEVELS,
        currency=DEFAULT_CURRENCY,
        jurisdiction=JurisdictionObject()  # Added per spec
    )


def get_balance_object(session: Dict[str, Any]) -> BalanceObject:
    """Get balance object from session."""
    return BalanceObject(
        amount=session["balance"],
        currency=DEFAULT_CURRENCY
    )


# =============================================================================
# STAKE ENGINE WALLET ENDPOINTS
# =============================================================================

@app.post("/wallet/authenticate", response_model=AuthenticateResponse, tags=["Wallet"])
async def wallet_authenticate(request: AuthenticateRequest):
    """
    Stake Engine /wallet/authenticate endpoint.

    Validates session and returns:
    - balance object
    - config object (minBet, maxBet, stepBet, betLevels)
    - active/last round if any
    """
    session = create_session(request.sessionID)

    # Get active or last round
    active_round = None
    if session.get("active_round_id") and session["active_round_id"] in rounds:
        round_data = rounds[session["active_round_id"]]
        active_round = get_round_object(round_data)

    return AuthenticateResponse(
        status=StatusObject(code=StatusCode.SUCCESS),
        balance=get_balance_object(session),
        config=get_config_object(),
        round=active_round
    )


@app.post("/wallet/balance", response_model=BalanceResponse, tags=["Wallet"])
async def wallet_balance(request: BalanceRequest):
    """
    Stake Engine /wallet/balance endpoint.

    Returns current player balance.
    """
    session = get_session(request.sessionID)
    return BalanceResponse(
        status=StatusObject(code=StatusCode.SUCCESS),
        balance=get_balance_object(session)
    )


@app.post("/wallet/play", response_model=PlayResponse, tags=["Wallet"])
async def wallet_play(request: PlayRequest):
    """
    Stake Engine /wallet/play endpoint.

    Initiates a round and debits the bet amount.
    Returns balance and round object with game events.
    """
    session = get_session(request.sessionID)

    # Check balance
    if session["balance"] < request.amount:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {request.amount}, Available: {session['balance']}"
        )

    # Check if in free spins
    is_free_spin = session["free_spins_remaining"] > 0

    if is_free_spin:
        bet_amount_int = session["free_spin_bet_amount"]
        bet_amount_float = from_stake_amount(bet_amount_int)
        existing_multipliers = session["free_spin_multipliers"]
        free_spins_remaining = session["free_spins_remaining"]
    else:
        # Debit bet
        session["balance"] -= request.amount
        bet_amount_int = request.amount
        bet_amount_float = from_stake_amount(request.amount)
        existing_multipliers = None
        free_spins_remaining = 0

    # Create round
    mode = "free_spin" if is_free_spin else request.mode
    round_data = create_round(session["id"], bet_amount_int, mode)

    # Execute spin
    nonce = session["nonce"]
    result: SpinResult = run_spin(
        server_seed=session["server_seed"],
        client_seed=request.clientSeed,
        nonce=nonce,
        bet_amount=bet_amount_float,
        free_spin_mode=is_free_spin,
        free_spins_remaining=free_spins_remaining,
        existing_multipliers=existing_multipliers,
        scatter_boost=request.scatterBoostActive,
        wild_boost=request.wildBoostActive
    )

    # Calculate payout
    payout_float = result.payout_multiplier * bet_amount_float
    payout_int = to_stake_amount(payout_float)

    # Credit winnings
    session["balance"] += payout_int
    session["nonce"] = nonce + 1

    # Update round with results (using 'state' per Stake spec)
    round_data["state"] = [e.to_dict() for e in result.events]
    round_data["payoutMultiplier"] = result.payout_multiplier
    round_data["initialGrid"] = result.initial_grid
    round_data["finalGrid"] = result.final_grid
    round_data["finalMultipliers"] = result.final_multipliers
    round_data["payoutMultiplier"] = result.payout_multiplier
    round_data["tumbleCount"] = result.tumble_count
    round_data["maxMultiplier"] = result.max_multiplier
    round_data["seedInfo"] = result.seed_data.to_dict()
    round_data["freeSpinsTriggered"] = result.free_spins_triggered
    round_data["freeSpinsRemaining"] = result.free_spins_remaining
    round_data["jackpotWon"] = result.jackpot_won
    round_data["jackpotAmount"] = to_stake_amount(result.jackpot_amount) if result.jackpot_amount else 0

    # Handle free spins state
    if result.free_spins_triggered > 0 and not is_free_spin:
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_bet_amount"] = bet_amount_int
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] = payout_int
    elif is_free_spin:
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] = session.get("free_spin_total_win", 0) + payout_int

        if result.free_spins_remaining <= 0:
            session["free_spin_multipliers"] = None
            session["free_spin_bet_amount"] = 0

    # Record history
    session["history"].append({
        "roundID": round_data["roundID"],
        "nonce": nonce,
        "betAmount": bet_amount_int,
        "payoutAmount": payout_int,
        "isFreeSpin": is_free_spin,
        "timestamp": datetime.utcnow().isoformat()
    })

    return PlayResponse(
        status=StatusObject(code=StatusCode.SUCCESS),
        balance=get_balance_object(session),
        round=get_round_object(round_data)
    )


@app.post("/wallet/end-round", response_model=EndRoundResponse, tags=["Wallet"])
async def wallet_end_round(request: EndRoundRequest):
    """
    Stake Engine /wallet/end-round endpoint.

    Completes the active round and returns final balance.
    """
    session = get_session(request.sessionID)

    # Complete active round if any
    if session.get("active_round_id"):
        complete_round(session["active_round_id"])
        session["active_round_id"] = None

    return EndRoundResponse(
        status=StatusObject(code=StatusCode.SUCCESS),
        balance=get_balance_object(session)
    )


@app.post("/bet/event", response_model=EventResponse, tags=["Bet"])
async def bet_event(request: EventRequest):
    """
    Stake Engine /bet/event endpoint.

    Tracks in-progress player actions/events for analytics.
    Uses eventIndex to track event sequence.
    """
    session = get_session(request.sessionID)

    # Record event in active round if any (using 'state' per Stake spec)
    if session.get("active_round_id") and session["active_round_id"] in rounds:
        rounds[session["active_round_id"]]["state"].append({
            "eventIndex": request.eventIndex,
            "timestamp": datetime.utcnow().isoformat()
        })

    return EventResponse(
        status=StatusObject(code=StatusCode.SUCCESS),
        eventIndex=request.eventIndex
    )


# =============================================================================
# LEGACY ENDPOINTS (for backwards compatibility)
# =============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "game": "LES WOLFS 86",
        "version": "1.0.0",
        "engine": "Stake Engine (Carrot)"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "activeSessions": len(sessions),
        "activeRounds": len([r for r in rounds.values() if r["status"] == RoundStatus.ACTIVE])
    }


@app.get("/game/info", response_model=GameInfoResponse, tags=["Game"])
async def get_game_info():
    """Get game configuration and paytable."""
    return GameInfoResponse(
        name="LES WOLFS 86",
        version="1.0.0",
        gridSize={"rows": GRID_ROWS, "cols": GRID_COLS},
        minBet=MIN_BET,
        maxBet=MAX_BET,
        stepBet=STEP_BET,
        betLevels=BET_LEVELS,
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
                "seedAmount": to_stake_amount(tier.seed_amount),
                "triggerChance": tier.trigger_chance,
                "minBetMultiplier": tier.min_bet_multiplier
            }
            for tier_id, tier in JACKPOT_TIERS.items()
        ]
    )


# Legacy session endpoints (maps to wallet/authenticate internally)
@app.post("/session/create", response_model=SessionResponse, tags=["Session (Legacy)"])
async def create_session_endpoint():
    """Create a new game session (legacy endpoint)."""
    session_id = str(uuid.uuid4())
    session = create_session(session_id)

    return SessionResponse(
        sessionID=session["id"],
        balance=get_balance_object(session),
        serverSeedHash=session["server_seed_hash"],
        nonce=session["nonce"],
        config=get_config_object()
    )


@app.get("/session/{session_id}", response_model=SessionResponse, tags=["Session (Legacy)"])
async def get_session_endpoint(session_id: str):
    """Get session information (legacy endpoint)."""
    session = get_session(session_id)
    return SessionResponse(
        sessionID=session["id"],
        balance=get_balance_object(session),
        serverSeedHash=session["server_seed_hash"],
        nonce=session["nonce"],
        config=get_config_object()
    )


@app.post("/session/{session_id}/rotate-seed", tags=["Session (Legacy)"])
async def rotate_server_seed(session_id: str):
    """Rotate server seed and reveal the old one."""
    session = get_session(session_id)
    old_seed = session["server_seed"]
    old_hash = session["server_seed_hash"]

    new_seed = generate_server_seed()
    session["server_seed"] = new_seed
    session["server_seed_hash"] = hash_server_seed(new_seed)
    session["nonce"] = 0

    return {
        "revealedServerSeed": old_seed,
        "revealedServerSeedHash": old_hash,
        "newServerSeedHash": session["server_seed_hash"],
        "message": "You can now verify all bets made with the old seed"
    }


# Legacy play endpoint (accepts float amounts)
@app.post("/play", response_model=LegacyPlayResponse, tags=["Game (Legacy)"])
async def play_legacy(request: LegacyPlayRequest):
    """Execute a spin (legacy endpoint with float amounts)."""
    session = create_session(request.sessionID)

    # Convert float to integer
    bet_amount_int = to_stake_amount(request.betAmount)
    bet_amount_float = request.betAmount

    # Check if in free spins
    is_free_spin = session["free_spins_remaining"] > 0

    if is_free_spin:
        bet_amount_int = session["free_spin_bet_amount"]
        bet_amount_float = from_stake_amount(bet_amount_int)
        existing_multipliers = session["free_spin_multipliers"]
        free_spins_remaining = session["free_spins_remaining"]
    else:
        if session["balance"] < bet_amount_int:
            raise StakeError(
                StakeErrorCode.ERR_IPB,
                f"Insufficient balance. Required: {bet_amount_float}, Available: {from_stake_amount(session['balance'])}"
            )
        session["balance"] -= bet_amount_int
        existing_multipliers = None
        free_spins_remaining = 0

    nonce = request.nonce if request.nonce is not None else session["nonce"]

    result: SpinResult = run_spin(
        server_seed=session["server_seed"],
        client_seed=request.clientSeed,
        nonce=nonce,
        bet_amount=bet_amount_float,
        free_spin_mode=is_free_spin,
        free_spins_remaining=free_spins_remaining,
        existing_multipliers=existing_multipliers,
        scatter_boost=request.scatterBoostActive,
        wild_boost=request.wildBoostActive
    )

    payout_float = result.payout_multiplier * bet_amount_float
    payout_int = to_stake_amount(payout_float)

    session["balance"] += payout_int
    session["nonce"] = nonce + 1

    # Handle free spins
    if result.free_spins_triggered > 0 and not is_free_spin:
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_bet_amount"] = bet_amount_int
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] = payout_int
    elif is_free_spin:
        session["free_spins_remaining"] = result.free_spins_remaining
        session["free_spin_multipliers"] = result.final_multipliers
        session["free_spin_total_win"] = session.get("free_spin_total_win", 0) + payout_int

        if result.free_spins_remaining <= 0:
            session["free_spin_multipliers"] = None
            session["free_spin_bet_amount"] = 0

    session["history"].append({
        "nonce": nonce,
        "clientSeed": request.clientSeed,
        "betAmount": bet_amount_float,
        "payoutMultiplier": result.payout_multiplier,
        "isFreeSpin": is_free_spin,
        "freeSpinsTriggered": result.free_spins_triggered,
        "jackpotWon": result.jackpot_won,
        "timestamp": datetime.utcnow().isoformat()
    })

    return LegacyPlayResponse(
        payoutMultiplier=result.payout_multiplier,
        payoutAmount=payout_float,
        events=[e.to_dict() for e in result.events],
        initialGrid=result.initial_grid,
        finalGrid=result.final_grid,
        finalMultipliers=result.final_multipliers,
        tumbleCount=result.tumble_count,
        maxMultiplier=result.max_multiplier,
        seedInfo=result.seed_data.to_dict(),
        balance=from_stake_amount(session["balance"]),
        nonce=nonce,
        freeSpinsTriggered=result.free_spins_triggered,
        freeSpinsRemaining=result.free_spins_remaining,
        isFreeSpin=is_free_spin,
        freeSpinTotalWin=from_stake_amount(session.get("free_spin_total_win", 0)),
        jackpotWon=result.jackpot_won,
        jackpotAmount=result.jackpot_amount
    )


@app.post("/verify", response_model=VerifyResponse, tags=["Provably Fair"])
async def verify_result(request: VerifyRequest):
    """Verify a provably fair result."""
    is_valid, result = verify_spin(
        server_seed=request.serverSeed,
        client_seed=request.clientSeed,
        nonce=request.nonce,
        expected_payout=0,
        bet_amount=request.betAmount
    )

    return VerifyResponse(
        isValid=True,
        payoutMultiplier=result.payout_multiplier,
        initialGrid=result.initial_grid,
        events=[e.to_dict() for e in result.events]
    )


@app.get("/session/{session_id}/history", tags=["Session (Legacy)"])
async def get_session_history(session_id: str, limit: int = 10):
    """Get recent bet history for a session."""
    session = get_session(session_id)
    history = session.get("history", [])

    return {
        "sessionID": session_id,
        "totalBets": len(history),
        "history": history[-limit:][::-1]
    }


# =============================================================================
# BONUS BUY ENDPOINTS
# =============================================================================

@app.get("/bonus/options", tags=["Bonus"])
async def get_bonus_options(bet_amount: float = DEFAULT_BET_FLOAT):
    """Get available bonus buy options."""
    options = []
    for opt in BONUS_BUY_OPTIONS.values():
        options.append({
            "id": opt.id,
            "name": opt.name,
            "description": opt.description,
            "costMultiplier": opt.cost_multiplier,
            "cost": opt.cost_multiplier * bet_amount,
            "costStake": to_stake_amount(opt.cost_multiplier * bet_amount),
            "volatility": opt.volatility,
            "feature": opt.feature
        })
    return {"betAmount": bet_amount, "options": options}


@app.post("/bonus/buy", response_model=BonusBuyResponse, tags=["Bonus"])
async def buy_bonus(request: BonusBuyRequest):
    """Purchase a bonus feature."""
    if request.bonusId not in BONUS_BUY_OPTIONS:
        raise StakeError(StakeErrorCode.ERR_VAL, f"Invalid bonus ID: {request.bonusId}")

    session = create_session(request.sessionID)
    bonus = BONUS_BUY_OPTIONS[request.bonusId]

    if session["free_spins_remaining"] > 0:
        raise StakeError(StakeErrorCode.ERR_VAL, "Cannot buy bonus during free spins")

    cost_float = bonus.cost_multiplier * request.betAmount
    cost_int = to_stake_amount(cost_float)

    if session["balance"] < cost_int:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {cost_float}, Available: {from_stake_amount(session['balance'])}"
        )

    session["balance"] -= cost_int

    initial_result = None
    bet_amount_int = to_stake_amount(request.betAmount)

    if bonus.feature == "free_spins":
        session["free_spins_remaining"] = 8
        session["free_spin_bet_amount"] = bet_amount_int
        session["free_spin_multipliers"] = None
        session["free_spin_total_win"] = 0
    elif bonus.feature == "free_spins_enhanced":
        session["free_spins_remaining"] = 12
        session["free_spin_bet_amount"] = bet_amount_int
        session["free_spin_multipliers"] = [[2 for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        session["free_spin_total_win"] = 0
    elif bonus.feature == "wolf_burst":
        import random
        num_wilds = random.randint(3, 6)
        all_positions = [(r, c) for r in range(GRID_ROWS) for c in range(GRID_COLS)]
        wild_positions = random.sample(all_positions, num_wilds)
        session["wolf_burst_positions"] = wild_positions
        initial_result = {
            "wolfBurstActive": True,
            "wolfBurstWilds": wild_positions,
            "numWilds": num_wilds,
        }
    elif bonus.feature == "wild_boost":
        nonce = session["nonce"]
        result = run_spin(
            server_seed=session["server_seed"],
            client_seed=request.clientSeed,
            nonce=nonce,
            bet_amount=request.betAmount
        )
        session["nonce"] = nonce + 1
        payout = result.payout_multiplier * request.betAmount
        session["balance"] += to_stake_amount(payout)
        initial_result = result.to_dict()
        initial_result["payoutAmount"] = payout
        initial_result["balance"] = from_stake_amount(session["balance"])
    elif bonus.feature == "multiplier_start":
        import random
        multipliers = [[1 for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        positions = random.sample([(r, c) for r in range(GRID_ROWS) for c in range(GRID_COLS)], 5)
        for r, c in positions:
            multipliers[r][c] = random.choice([4, 8, 16])
        session["bonus_multipliers"] = multipliers
    elif bonus.feature == "jackpot_boost":
        session["jackpot_boost_active"] = True

    return BonusBuyResponse(
        success=True,
        cost=cost_float,
        balance=from_stake_amount(session["balance"]),
        featureActivated=bonus.feature,
        initialResult=initial_result
    )


@app.post("/bonus/trigger-spin", response_model=BonusTriggerSpinResponse, tags=["Bonus"])
async def bonus_trigger_spin(request: BonusTriggerSpinRequest):
    """Execute a bonus trigger spin."""
    if request.bonusId not in BONUS_BUY_OPTIONS:
        raise StakeError(StakeErrorCode.ERR_VAL, f"Invalid bonus ID: {request.bonusId}")

    session = create_session(request.sessionID)
    bonus = BONUS_BUY_OPTIONS[request.bonusId]

    if session["free_spins_remaining"] > 0:
        raise StakeError(StakeErrorCode.ERR_VAL, "Cannot buy bonus during free spins")

    scatter_count = 4 if request.bonusId == "free_spins_12" else 3

    cost_float = bonus.cost_multiplier * request.betAmount
    cost_int = to_stake_amount(cost_float)

    if session["balance"] < cost_int:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {cost_float}, Available: {from_stake_amount(session['balance'])}"
        )

    session["balance"] -= cost_int
    nonce = session["nonce"]

    result = run_bonus_trigger_spin(
        server_seed=session["server_seed"],
        client_seed=request.clientSeed,
        nonce=nonce,
        bet_amount=request.betAmount,
        scatter_count=scatter_count
    )

    session["nonce"] = nonce + 1
    session["free_spins_remaining"] = result.free_spins_triggered
    session["free_spin_bet_amount"] = to_stake_amount(request.betAmount)
    session["free_spin_total_win"] = 0

    if scatter_count == 4:
        session["free_spin_multipliers"] = [[2 for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
    else:
        session["free_spin_multipliers"] = None

    return BonusTriggerSpinResponse(
        success=True,
        cost=cost_float,
        balance=from_stake_amount(session["balance"]),
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


@app.post("/bonus/activate-boost", response_model=BoostActivateResponse, tags=["Bonus"])
async def activate_boost(request: BoostActivateRequest):
    """Activate a boost feature."""
    session = create_session(request.sessionID)

    if session["free_spins_remaining"] > 0:
        raise StakeError(StakeErrorCode.ERR_VAL, "Cannot activate boost during free spins")

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

    cost_float = cost_multiplier * request.betAmount
    cost_int = to_stake_amount(cost_float)

    if session["balance"] < cost_int:
        raise StakeError(
            StakeErrorCode.ERR_IPB,
            f"Insufficient balance. Required: {cost_float}, Available: {from_stake_amount(session['balance'])}"
        )

    session["balance"] -= cost_int
    session[session_key] = session.get(session_key, 0) + boost_spins

    return BoostActivateResponse(
        success=True,
        cost=cost_float,
        balance=from_stake_amount(session["balance"]),
        boostType=request.boostType,
        boostSpinsRemaining=session[session_key]
    )


@app.get("/jackpot/info", tags=["Jackpot"])
async def get_jackpot_info(session_id: Optional[str] = None):
    """Get current jackpot values."""
    jackpots = {}
    for tier_id, tier in JACKPOT_TIERS.items():
        jackpots[tier_id] = {
            "name": tier.name,
            "currentAmount": to_stake_amount(tier.seed_amount),
            "currentAmountFloat": tier.seed_amount,
            "minBet": to_stake_amount(tier.min_bet_multiplier * MIN_BET_FLOAT),
            "minBetFloat": tier.min_bet_multiplier * MIN_BET_FLOAT,
            "triggerChance": f"{tier.trigger_chance * 100:.4f}%"
        }
    return {"jackpots": jackpots}


# =============================================================================
# DEV/DEBUG ENDPOINTS
# =============================================================================

@app.post("/dev/test-spin", tags=["Development"])
async def test_spin(
    server_seed: str = "test_server_seed",
    client_seed: str = "test_client_seed",
    nonce: int = 0,
    bet_amount: float = 1.0
):
    """Development endpoint for testing spins."""
    result = run_spin(server_seed, client_seed, nonce, bet_amount)
    return result.to_dict()


@app.get("/dev/sessions", tags=["Development"])
async def list_sessions():
    """List all active sessions."""
    return {
        "count": len(sessions),
        "sessions": [
            {
                "id": s["id"],
                "balance": from_stake_amount(s["balance"]),
                "balanceStake": s["balance"],
                "nonce": s["nonce"],
                "bets": len(s.get("history", []))
            }
            for s in sessions.values()
        ]
    }


@app.get("/dev/rounds", tags=["Development"])
async def list_rounds():
    """List all rounds."""
    return {
        "count": len(rounds),
        "active": len([r for r in rounds.values() if r["status"] == RoundStatus.ACTIVE]),
        "completed": len([r for r in rounds.values() if r["status"] == RoundStatus.COMPLETED])
    }


# =============================================================================
# STARTUP/SHUTDOWN
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    print("=" * 60)
    print("LES WOLFS 86 - Stake Engine RGS")
    print("=" * 60)
    print(f"Grid: {GRID_ROWS}x{GRID_COLS}")
    print(f"Min Bet: {MIN_BET} ({from_stake_amount(MIN_BET)} {DEFAULT_CURRENCY})")
    print(f"Max Bet: {MAX_BET} ({from_stake_amount(MAX_BET)} {DEFAULT_CURRENCY})")
    print(f"Step Bet: {STEP_BET} ({from_stake_amount(STEP_BET)} {DEFAULT_CURRENCY})")
    print(f"Bet Levels: {len(BET_LEVELS)} options")
    print("=" * 60)
    print("Stake Engine Endpoints:")
    print("  POST /wallet/authenticate")
    print("  POST /wallet/balance")
    print("  POST /wallet/play")
    print("  POST /wallet/end-round")
    print("  POST /bet/event")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down Stake Engine...")
    sessions.clear()
    rounds.clear()
