/**
 * LES WOLFS 86 - API Service
 * Stake Engine (Carrot) Standard - RGS Client
 *
 * Supports both:
 * - New Stake Engine endpoints (/wallet/*, /bet/event)
 * - Legacy endpoints for backwards compatibility
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/gameConfig';

// Stake Engine monetary precision (6 decimals)
const MONETARY_MULTIPLIER = 1_000_000;

/**
 * Convert float to Stake Engine integer format
 * @param {number} value - Float value (e.g., 1.00)
 * @returns {number} - Integer value (e.g., 1000000)
 */
export const toStakeAmount = (value) => Math.round(value * MONETARY_MULTIPLIER);

/**
 * Convert Stake Engine integer to float
 * @param {number} value - Integer value (e.g., 1000000)
 * @returns {number} - Float value (e.g., 1.00)
 */
export const fromStakeAmount = (value) => value / MONETARY_MULTIPLIER;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Service
const apiService = {
  // =========================================================================
  // STAKE ENGINE WALLET ENDPOINTS (New Standard)
  // =========================================================================

  /**
   * Authenticate session - Stake Engine standard
   * @param {string} sessionID - Player session token
   * @returns {Promise<{balance: {amount, currency}, config: {minBet, maxBet, stepBet, betLevels}, round?: Object}>}
   */
  async authenticate(sessionID) {
    const response = await api.post('/wallet/authenticate', { sessionID });
    return response.data;
  },

  /**
   * Get balance - Stake Engine standard
   * @param {string} sessionID
   * @returns {Promise<{balance: {amount, currency}}>}
   */
  async getBalance(sessionID) {
    const response = await api.post('/wallet/balance', { sessionID });
    return response.data;
  },

  /**
   * Play/Spin - Stake Engine standard
   * @param {Object} params
   * @param {string} params.sessionID
   * @param {number} params.amount - Bet in Stake format (integer)
   * @param {string} params.mode - Game mode (base, free_spin)
   * @param {string} params.clientSeed
   * @param {boolean} [params.scatterBoostActive]
   * @param {boolean} [params.wildBoostActive]
   * @returns {Promise<{balance, round}>}
   */
  async walletPlay({ sessionID, amount, mode = 'base', clientSeed, scatterBoostActive = false, wildBoostActive = false }) {
    const response = await api.post('/wallet/play', {
      sessionID,
      amount,
      mode,
      clientSeed,
      scatterBoostActive,
      wildBoostActive,
    });
    return response.data;
  },

  /**
   * End round - Stake Engine standard
   * @param {string} sessionID
   * @returns {Promise<{balance}>}
   */
  async endRound(sessionID) {
    const response = await api.post('/wallet/end-round', { sessionID });
    return response.data;
  },

  /**
   * Track event - Stake Engine standard
   * @param {string} sessionID
   * @param {number} eventIndex - Event sequence index
   * @returns {Promise<{status, eventIndex}>}
   */
  async trackEvent(sessionID, eventIndex) {
    const response = await api.post('/bet/event', { sessionID, eventIndex });
    return response.data;
  },

  // =========================================================================
  // LEGACY ENDPOINTS (Backwards Compatibility)
  // =========================================================================

  /**
   * Create a new game session (legacy)
   * @returns {Promise<{sessionID, balance, serverSeedHash, nonce, config}>}
   */
  async createSession() {
    const response = await api.post('/session/create');
    // Convert balance object to legacy format for compatibility
    const data = response.data;
    return {
      sessionID: data.sessionID,
      balance: fromStakeAmount(data.balance.amount),
      balanceStake: data.balance,
      serverSeedHash: data.serverSeedHash,
      nonce: data.nonce,
      config: data.config,
    };
  },

  /**
   * Get session information (legacy)
   * @param {string} sessionId
   * @returns {Promise<{sessionID, balance, serverSeedHash, nonce}>}
   */
  async getSession(sessionId) {
    const response = await api.get(`/session/${sessionId}`);
    const data = response.data;
    return {
      sessionID: data.sessionID,
      balance: fromStakeAmount(data.balance.amount),
      balanceStake: data.balance,
      serverSeedHash: data.serverSeedHash,
      nonce: data.nonce,
      config: data.config,
    };
  },

  /**
   * Play a spin (legacy format with float amounts)
   * @param {Object} params
   * @param {string} params.sessionID
   * @param {number} params.betAmount - Float bet amount
   * @param {string} params.clientSeed
   * @param {number} [params.nonce]
   * @param {boolean} [params.scatterBoostActive]
   * @param {boolean} [params.wildBoostActive]
   * @returns {Promise<PlayResponse>}
   */
  async play({ sessionID, betAmount, clientSeed, nonce, scatterBoostActive = false, wildBoostActive = false }) {
    const response = await api.post('/play', {
      sessionID,
      betAmount,
      clientSeed,
      nonce,
      scatterBoostActive,
      wildBoostActive,
    });
    return response.data;
  },

  /**
   * Verify a provably fair result
   * @param {Object} params
   * @param {string} params.serverSeed
   * @param {string} params.clientSeed
   * @param {number} params.nonce
   * @param {number} params.betAmount
   * @returns {Promise<VerifyResponse>}
   */
  async verify({ serverSeed, clientSeed, nonce, betAmount }) {
    const response = await api.post('/verify', {
      serverSeed,
      clientSeed,
      nonce,
      betAmount,
    });
    return response.data;
  },

  /**
   * Rotate server seed and reveal old one
   * @param {string} sessionId
   * @returns {Promise<{revealedServerSeed, newServerSeedHash}>}
   */
  async rotateSeed(sessionId) {
    const response = await api.post(`/session/${sessionId}/rotate-seed`);
    return response.data;
  },

  /**
   * Get game information
   * @returns {Promise<GameInfo>}
   */
  async getGameInfo() {
    const response = await api.get('/game/info');
    return response.data;
  },

  /**
   * Get session history
   * @param {string} sessionId
   * @param {number} [limit=10]
   * @returns {Promise<{history: Array}>}
   */
  async getHistory(sessionId, limit = 10) {
    const response = await api.get(`/session/${sessionId}/history`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Health check
   * @returns {Promise<{status: string}>}
   */
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // =========================================================================
  // BONUS BUY & JACKPOT ENDPOINTS
  // =========================================================================

  /**
   * Get available bonus buy options
   * @param {number} [betAmount=1.0] - Bet amount to calculate costs
   * @returns {Promise<{betAmount: number, options: Array}>}
   */
  async getBonusOptions(betAmount = 1.0) {
    const response = await api.get('/bonus/options', {
      params: { bet_amount: betAmount },
    });
    return response.data;
  },

  /**
   * Purchase a bonus feature
   * @param {Object} params
   * @param {string} params.sessionID - Session ID
   * @param {string} params.bonusId - Bonus feature ID
   * @param {string} params.clientSeed - Client seed for provably fair
   * @param {number} params.betAmount - Bet amount for cost calculation
   * @returns {Promise<BonusBuyResponse>}
   */
  async buyBonus({ sessionID, bonusId, clientSeed, betAmount }) {
    const response = await api.post('/bonus/buy', {
      sessionID,
      bonusId,
      clientSeed,
      betAmount,
    });
    return response.data;
  },

  /**
   * Bonus trigger spin - spins the grid and lands on scatters
   * @param {Object} params
   * @param {string} params.sessionID - Session ID
   * @param {string} params.bonusId - Bonus feature ID (free_spins_8 or free_spins_12)
   * @param {string} params.clientSeed - Client seed for provably fair
   * @param {number} params.betAmount - Bet amount for cost calculation
   * @returns {Promise<BonusTriggerSpinResponse>}
   */
  async bonusTriggerSpin({ sessionID, bonusId, clientSeed, betAmount }) {
    const response = await api.post('/bonus/trigger-spin', {
      sessionID,
      bonusId,
      clientSeed,
      betAmount,
    });
    return response.data;
  },

  /**
   * Activate a boost feature (Scatter Hunt or Wild Boost)
   * @param {Object} params
   * @param {string} params.sessionID - Session ID
   * @param {string} params.boostType - Boost type (scatter_boost or wild_boost)
   * @param {number} params.betAmount - Bet amount for cost calculation
   * @returns {Promise<{balance: number, boostType: string, spinsRemaining: number}>}
   */
  async activateBoost({ sessionID, boostType, betAmount }) {
    const response = await api.post('/bonus/activate-boost', {
      sessionID,
      boostType,
      betAmount,
    });
    return response.data;
  },

  /**
   * Get current jackpot information
   * @param {string} [sessionId] - Optional session ID
   * @returns {Promise<{jackpots: Object}>}
   */
  async getJackpotInfo(sessionId) {
    const params = sessionId ? { session_id: sessionId } : {};
    const response = await api.get('/jackpot/info', { params });
    return response.data;
  },

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Convert float bet to Stake Engine format
   */
  toStakeAmount,

  /**
   * Convert Stake Engine amount to float
   */
  fromStakeAmount,
};

export default apiService;
