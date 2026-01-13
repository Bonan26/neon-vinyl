/**
 * NEON VINYL: GHOST GROOVES - API Service
 * Communication with FastAPI backend
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/gameConfig';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Service
const apiService = {
  /**
   * Create a new game session
   * @returns {Promise<{sessionID, balance, serverSeedHash, nonce}>}
   */
  async createSession() {
    const response = await api.post('/session/create');
    return response.data;
  },

  /**
   * Get session information
   * @param {string} sessionId
   * @returns {Promise<{sessionID, balance, serverSeedHash, nonce}>}
   */
  async getSession(sessionId) {
    const response = await api.get(`/session/${sessionId}`);
    return response.data;
  },

  /**
   * Play a spin
   * @param {Object} params
   * @param {string} params.sessionID
   * @param {number} params.betAmount
   * @param {string} params.clientSeed
   * @param {number} [params.nonce]
   * @returns {Promise<PlayResponse>}
   */
  async play({ sessionID, betAmount, clientSeed, nonce }) {
    const response = await api.post('/play', {
      sessionID,
      betAmount,
      clientSeed,
      nonce,
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
};

export default apiService;
