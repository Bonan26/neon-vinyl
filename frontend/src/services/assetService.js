/**
 * NEON VINYL: GHOST GROOVES - Asset Service
 * Manages game assets and Gemini AI image generation
 */
import { SYMBOLS, PLACEHOLDER_SYMBOLS } from '../config/gameConfig';

// Asset cache
const assetCache = new Map();

// Asset URLs (will be populated by Gemini or use placeholders)
let symbolTextures = {};
let backgroundTexture = null;

/**
 * Generate a placeholder symbol texture (colored gradient square)
 * @param {string} symbolId - Symbol ID
 * @param {number} color - Hex color
 * @param {number} size - Texture size
 * @returns {HTMLCanvasElement}
 */
function generatePlaceholderSymbol(symbolId, color, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );

  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;

  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.7, `rgba(${r * 0.7}, ${g * 0.7}, ${b * 0.7}, 1)`);
  gradient.addColorStop(1, `rgba(${r * 0.3}, ${g * 0.3}, ${b * 0.3}, 0.8)`);

  // Draw rounded rectangle
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  ctx.fillStyle = gradient;
  ctx.fill();

  // Add glow effect
  ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Add symbol text
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.35}px Orbitron, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbolId, size / 2, size / 2);

  return canvas;
}

/**
 * Generate placeholder background
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
function generatePlaceholderBackground(width = 900, height = 700) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(0.5, '#0d0d20');
  gradient.addColorStop(1, '#05050a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add some ambient neon glow spots
  const glowColors = ['#ff00ff20', '#00ffff20', '#bf00ff20'];
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 100 + Math.random() * 200;
    const color = glowColors[Math.floor(Math.random() * glowColors.length)];

    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // Add grid lines (subtle)
  ctx.strokeStyle = '#ffffff08';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  return canvas;
}

/**
 * Asset Service
 */
const assetService = {
  /**
   * Initialize all assets
   * @param {boolean} useGemini - Whether to use Gemini for asset generation
   */
  async initialize(useGemini = false) {
    console.log('AssetService: Initializing assets...');

    if (useGemini) {
      // TODO: Implement Gemini API calls
      console.log('AssetService: Gemini integration not yet implemented, using placeholders');
    }

    // Generate placeholder symbols
    for (const [id, config] of Object.entries(SYMBOLS)) {
      const canvas = generatePlaceholderSymbol(id, config.color, 64);
      symbolTextures[id] = canvas;
      assetCache.set(`symbol_${id}`, canvas);
    }

    // Generate placeholder background
    backgroundTexture = generatePlaceholderBackground();
    assetCache.set('background', backgroundTexture);

    console.log('AssetService: Assets initialized');
    return true;
  },

  /**
   * Get symbol texture
   * @param {string} symbolId
   * @returns {HTMLCanvasElement|null}
   */
  getSymbolTexture(symbolId) {
    return symbolTextures[symbolId] || null;
  },

  /**
   * Get background texture
   * @returns {HTMLCanvasElement|null}
   */
  getBackgroundTexture() {
    return backgroundTexture;
  },

  /**
   * Get all symbol textures
   * @returns {Object}
   */
  getAllSymbolTextures() {
    return { ...symbolTextures };
  },

  /**
   * Check if assets are loaded
   * @returns {boolean}
   */
  isLoaded() {
    return Object.keys(symbolTextures).length === Object.keys(SYMBOLS).length;
  },

  /**
   * Generate multiplier overlay texture
   * @param {number} multiplier
   * @param {number} size
   * @returns {HTMLCanvasElement}
   */
  generateMultiplierOverlay(multiplier, size = 64) {
    const cacheKey = `multiplier_${multiplier}_${size}`;
    if (assetCache.has(cacheKey)) {
      return assetCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Color based on multiplier
    const colors = {
      2: '#00ffff',
      4: '#00ff66',
      8: '#ffff00',
      16: '#ff6600',
      32: '#ff00ff',
      64: '#ff0066',
      128: '#ff0000',
      256: '#ffffff',
    };
    const color = colors[multiplier] || '#ffffff';

    // Draw glowing border
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    const padding = 4;
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);

    // Draw multiplier text
    ctx.fillStyle = color;
    ctx.font = `bold ${size * 0.25}px Orbitron`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`x${multiplier}`, size - 6, size - 4);

    assetCache.set(cacheKey, canvas);
    return canvas;
  },

  /**
   * Future: Generate assets using Gemini API
   * @param {string} prompt
   * @returns {Promise<string>} - Image URL
   */
  async generateWithGemini(prompt) {
    // TODO: Implement Gemini API integration
    // This would call a backend endpoint that interfaces with Gemini
    console.warn('Gemini generation not implemented yet');
    return null;
  },
};

export default assetService;
