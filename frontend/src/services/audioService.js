/**
 * NEON VINYL: GHOST GROOVES - Audio Service
 * Procedural synthwave background music using Tone.js
 */
import * as Tone from 'tone';

class AudioService {
  constructor() {
    this.isInitialized = false;
    this.isPlaying = false;
    this.masterVolume = null;
    this.synths = {};
    this.sequences = {};
    this.effects = {};
    this.sfxSynths = {}; // Separate synths for sound effects
    this.sfxEnabled = true;
  }

  /**
   * Initialize the audio engine - must be called after user interaction
   */
  async init() {
    if (this.isInitialized) return;

    await Tone.start();

    // Master volume control - lowered for better balance
    this.masterVolume = new Tone.Volume(-15).toDestination();

    // Create effects chain
    this.effects.reverb = new Tone.Reverb({
      decay: 4,
      wet: 0.3,
    }).connect(this.masterVolume);

    this.effects.delay = new Tone.PingPongDelay({
      delayTime: '8n',
      feedback: 0.2,
      wet: 0.15,
    }).connect(this.effects.reverb);

    this.effects.chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.3,
    }).connect(this.effects.delay);

    this.effects.filter = new Tone.Filter({
      frequency: 2000,
      type: 'lowpass',
      rolloff: -12,
    }).connect(this.effects.chorus);

    // Create synths
    this._createSynths();

    // Create SFX synths
    this._createSFXSynths();

    // Create sequences
    this._createSequences();

    this.isInitialized = true;
    console.log('AudioService: Initialized');
  }

  /**
   * Create all synthesizers
   */
  _createSynths() {
    // Pad synth - atmospheric, ghostly
    this.synths.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 1.5,
        decay: 0.5,
        sustain: 0.8,
        release: 2,
      },
      volume: -18,
    }).connect(this.effects.reverb);

    // Second pad - darker, fuller
    this.synths.pad2 = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.6,
        release: 3,
      },
      volume: -22,
    }).connect(this.effects.reverb);

    // Bass synth - deep, groovy
    this.synths.bass = new Tone.MonoSynth({
      oscillator: {
        type: 'sawtooth',
      },
      filter: {
        Q: 2,
        frequency: 800,
        type: 'lowpass',
      },
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.4,
        release: 0.5,
      },
      filterEnvelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.3,
        release: 0.5,
        baseFrequency: 100,
        octaves: 2,
      },
      volume: -12,
    }).connect(this.effects.filter);

    // Lead/Arpeggio synth - sparkly, neon
    this.synths.arp = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.1,
        release: 0.4,
      },
      volume: -20,
    }).connect(this.effects.delay);

    // Second arpeggio - higher register, ghostly
    this.synths.arp2 = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.05,
        release: 0.6,
      },
      volume: -24,
    }).connect(this.effects.reverb);

    // Lead melody synth - expressive
    this.synths.lead = new Tone.MonoSynth({
      oscillator: {
        type: 'square',
      },
      filter: {
        Q: 3,
        frequency: 1200,
        type: 'lowpass',
      },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.8,
      },
      filterEnvelope: {
        attack: 0.1,
        decay: 0.4,
        sustain: 0.3,
        release: 0.8,
        baseFrequency: 300,
        octaves: 3,
      },
      volume: -18,
    }).connect(this.effects.delay);

    // Pluck synth for accents
    this.synths.pluck = new Tone.PluckSynth({
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.9,
      volume: -20,
    }).connect(this.effects.chorus);

    // Hi-hat / percussion
    this.synths.hihat = new Tone.NoiseSynth({
      noise: {
        type: 'white',
      },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.05,
      },
      volume: -26,
    }).connect(this.effects.filter);

    // Open hi-hat
    this.synths.openHat = new Tone.NoiseSynth({
      noise: {
        type: 'pink',
      },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.1,
      },
      volume: -28,
    }).connect(this.effects.filter);

    // Snare
    this.synths.snare = new Tone.NoiseSynth({
      noise: {
        type: 'white',
      },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.1,
      },
      volume: -22,
    }).connect(this.masterVolume);

    // Kick drum
    this.synths.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.5,
      },
      volume: -14,
    }).connect(this.masterVolume);
  }

  /**
   * Create SFX synthesizers for win sounds
   * Designed for pleasant, classic slot machine sounds
   */
  _createSFXSynths() {
    // SFX volume (connects directly to destination, not music effects)
    this.sfxVolume = new Tone.Volume(-6).toDestination();

    // SFX reverb - warm and spacious
    this.sfxReverb = new Tone.Reverb({
      decay: 2,
      wet: 0.3,
    }).connect(this.sfxVolume);

    // Win chime synth - warm bell-like tones (vibraphone-ish)
    this.sfxSynths.winChime = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.005,
        decay: 0.5,
        sustain: 0.1,
        release: 0.8,
      },
      volume: -10,
    }).connect(this.sfxReverb);

    // Coin sound - softer, more pleasant bell
    this.sfxSynths.coin = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.3,
      },
      volume: -14,
    }).connect(this.sfxReverb);

    // Big win synth - warm pad with gentle attack
    this.sfxSynths.bigWin = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.1,
        decay: 0.5,
        sustain: 0.4,
        release: 1.5,
      },
      volume: -10,
    }).connect(this.sfxReverb);

    // Mega win - rich layered sound (sine + triangle for warmth)
    this.sfxSynths.megaWin = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.08,
        decay: 0.6,
        sustain: 0.5,
        release: 2,
      },
      volume: -8,
    }).connect(this.sfxReverb);

    // Scatter/bonus trigger - magical sparkle (higher, lighter)
    this.sfxSynths.scatter = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.4,
        sustain: 0.2,
        release: 1,
      },
      volume: -8,
    }).connect(this.sfxReverb);

    // Whoosh sound for tumbles - softer
    this.sfxSynths.whoosh = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: 0.03,
        decay: 0.12,
        sustain: 0,
        release: 0.1,
      },
      volume: -24,
    }).connect(this.sfxVolume);

    // Retrigger synth - bright and exciting
    this.sfxSynths.retrigger = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.15,
        release: 0.5,
      },
      volume: -8,
    }).connect(this.sfxReverb);
  }

  // =====================
  // SOUND EFFECTS METHODS
  // =====================

  /**
   * Enable/disable sound effects
   */
  setSFXEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  /**
   * Play small win sound (cluster win)
   */
  playWinSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();
    // Simple pleasant ascending chime
    this.sfxSynths.winChime.triggerAttackRelease('E5', '8n', now, 0.6);
    this.sfxSynths.winChime.triggerAttackRelease('G5', '8n', now + 0.08, 0.7);
    this.sfxSynths.winChime.triggerAttackRelease('C6', '8n', now + 0.16, 0.8);
    // Soft coin ding
    this.sfxSynths.coin.triggerAttackRelease('G6', '16n', now + 0.12, 0.5);
  }

  /**
   * Play big win sound (2x-5x bet)
   */
  playBigWinSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();
    // Warm pad foundation
    this.sfxSynths.bigWin.triggerAttackRelease(['C4', 'E4', 'G4'], '2n', now, 0.6);

    // Pleasant ascending arpeggio
    const arp = ['C5', 'E5', 'G5', 'C6'];
    arp.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.15 + (i * 0.12), 0.7);
    });

    // Soft coin sounds
    this.sfxSynths.coin.triggerAttackRelease('A6', '16n', now + 0.2, 0.4);
    this.sfxSynths.coin.triggerAttackRelease('E6', '16n', now + 0.4, 0.5);
  }

  /**
   * Play mega win sound (5x+ bet) - warm, satisfying jackpot sound
   */
  playMegaWinSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();

    // Rich pad foundation
    this.sfxSynths.megaWin.triggerAttackRelease(['C3', 'G3', 'C4'], '1n', now, 0.5);

    // First ascending phrase (C major)
    const melody1 = ['C5', 'E5', 'G5', 'C6'];
    melody1.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + (i * 0.18), 0.8);
    });

    // Second phrase (moving up to G)
    const melody2 = ['D5', 'G5', 'B5', 'D6'];
    melody2.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.8 + (i * 0.18), 0.85);
    });

    // Final resolution chord
    this.sfxSynths.winChime.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '2n', now + 1.6, 0.9);

    // Gentle coin cascade
    const coinNotes = ['G6', 'E6', 'C6', 'G5'];
    coinNotes.forEach((note, i) => {
      this.sfxSynths.coin.triggerAttackRelease(note, '16n', now + 0.5 + (i * 0.3), 0.4);
    });
  }

  /**
   * Play super mega win sound (15x+ bet) - epic celebration
   */
  playSuperMegaWinSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();

    // Deep pad foundation building
    this.sfxSynths.megaWin.triggerAttackRelease(['G2', 'D3', 'G3'], '1n', now, 0.4);
    this.sfxSynths.megaWin.triggerAttackRelease(['C3', 'G3', 'C4'], '1n', now + 1, 0.5);

    // First ascending phrase
    const melody1 = ['G4', 'B4', 'D5', 'G5'];
    melody1.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + (i * 0.15), 0.7);
    });

    // Second phrase higher
    const melody2 = ['A4', 'C5', 'E5', 'A5'];
    melody2.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.7 + (i * 0.15), 0.75);
    });

    // Third phrase climax
    const melody3 = ['B4', 'D5', 'G5', 'B5'];
    melody3.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 1.4 + (i * 0.15), 0.8);
    });

    // Epic final resolution
    this.sfxSynths.winChime.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '2n', now + 2.1, 0.9);

    // Sparkle cascade at the end
    const sparkle = ['G5', 'C6', 'E6', 'G6'];
    sparkle.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '16n', now + 2.6 + (i * 0.12), 0.6);
    });

    // Coin cascade
    const coinNotes = ['G6', 'C6', 'E6', 'G6', 'C7'];
    coinNotes.forEach((note, i) => {
      this.sfxSynths.coin.triggerAttackRelease(note, '16n', now + 0.8 + (i * 0.25), 0.35);
    });
  }

  /**
   * Play scatter/free spins trigger sound
   */
  playScatterTriggerSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();
    // Magical rising arpeggio
    const rising = ['C4', 'E4', 'G4', 'C5', 'E5'];
    rising.forEach((note, i) => {
      this.sfxSynths.scatter.triggerAttackRelease(note, '8n', now + (i * 0.15), 0.7 + (i * 0.05));
    });

    // High sparkle flourish
    const sparkle = ['G5', 'C6', 'E6'];
    sparkle.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.8 + (i * 0.1), 0.8);
    });
  }

  /**
   * Play scatter suspense sound (when 2 scatters found, building tension)
   * Creates a dramatic drum roll / heartbeat effect
   */
  playScatterSuspenseSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();

    // DRAMATIC DRUM ROLL / HEARTBEAT EFFECT
    // Deep bass thump (heartbeat)
    this.sfxSynths.scatter.triggerAttackRelease('C2', '8n', now, 0.7);
    this.sfxSynths.scatter.triggerAttackRelease('C2', '16n', now + 0.12, 0.5);

    // Rising tension drone
    this.sfxSynths.bigWin.triggerAttackRelease(['C3', 'G3'], '4n', now, 0.25);

    // Snare-like roll effect
    this.sfxSynths.whoosh.triggerAttackRelease('16n', now + 0.1, 0.4);
    this.sfxSynths.whoosh.triggerAttackRelease('16n', now + 0.2, 0.35);
    this.sfxSynths.whoosh.triggerAttackRelease('16n', now + 0.28, 0.3);

    // High tension shimmer
    this.sfxSynths.winChime.triggerAttackRelease('B5', '16n', now + 0.15, 0.25);
    this.sfxSynths.winChime.triggerAttackRelease('E6', '16n', now + 0.3, 0.3);
  }

  /**
   * Start continuous suspense music loop (call when entering suspense mode)
   */
  startSuspenseLoop() {
    if (!this.isInitialized || !this.sfxEnabled) return;
    if (this.suspenseLoop) return; // Already running

    const now = Tone.now();
    let beatCount = 0;

    // Create a continuous heartbeat/tension loop
    this.suspenseLoop = setInterval(() => {
      if (!this.sfxEnabled) {
        this.stopSuspenseLoop();
        return;
      }

      const t = Tone.now();
      beatCount++;

      // Heartbeat thump - gets faster over time
      this.sfxSynths.scatter.triggerAttackRelease('C2', '16n', t, 0.5 + (beatCount * 0.02));
      this.sfxSynths.scatter.triggerAttackRelease('C2', '32n', t + 0.08, 0.35);

      // Rising pitch for tension
      const pitchIndex = Math.min(beatCount, 8);
      const tensionNotes = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4'];
      this.sfxSynths.bigWin.triggerAttackRelease(tensionNotes[pitchIndex], '8n', t, 0.2 + (beatCount * 0.02));

      // Shimmer effect
      if (beatCount % 2 === 0) {
        this.sfxSynths.winChime.triggerAttackRelease('E6', '32n', t + 0.05, 0.15);
      }
    }, 350 - Math.min(beatCount * 10, 150)); // Gets faster
  }

  /**
   * Stop the suspense music loop
   */
  stopSuspenseLoop() {
    if (this.suspenseLoop) {
      clearInterval(this.suspenseLoop);
      this.suspenseLoop = null;
    }
  }

  /**
   * Play retrigger sound (during free spins)
   */
  playRetriggerSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();
    // Bright exciting burst
    this.sfxSynths.retrigger.triggerAttackRelease(['G4', 'B4', 'D5'], '8n', now, 0.7);
    this.sfxSynths.retrigger.triggerAttackRelease(['C5', 'E5', 'G5'], '4n', now + 0.15, 0.8);

    // Quick sparkle
    this.sfxSynths.winChime.triggerAttackRelease('G5', '16n', now + 0.25, 0.7);
    this.sfxSynths.winChime.triggerAttackRelease('C6', '16n', now + 0.35, 0.8);
    this.sfxSynths.winChime.triggerAttackRelease('E6', '8n', now + 0.45, 0.9);
  }

  /**
   * Play bonus complete/summary sound
   */
  playBonusCompleteSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();
    // Triumphant warm pad
    this.sfxSynths.megaWin.triggerAttackRelease(['C3', 'G3', 'C4'], '2n', now, 0.5);
    this.sfxSynths.megaWin.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '1n', now + 0.3, 0.6);

    // Celebration sparkle cascade
    const sparkle = ['C5', 'E5', 'G5', 'C6', 'E6'];
    sparkle.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.6 + (i * 0.12), 0.75);
    });

    // Final high note
    this.sfxSynths.winChime.triggerAttackRelease('G6', '4n', now + 1.3, 0.8);
  }

  /**
   * Play tumble/cascade sound
   */
  playTumbleSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    this.sfxSynths.whoosh.triggerAttackRelease('8n');
  }

  /**
   * Play Wolf Burst sound - Intense wolf howl effect (2.5 seconds)
   */
  playWolfBurstSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();

    // Deep bass growl
    this.sfxSynths.scatter.triggerAttackRelease('C2', '2n', now, 0.8);
    this.sfxSynths.scatter.triggerAttackRelease('G1', '2n', now + 0.1, 0.6);

    // Rising howl - dramatic sweep
    const howl = ['G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5'];
    howl.forEach((note, i) => {
      this.sfxSynths.bigWin.triggerAttackRelease(note, '4n', now + 0.3 + (i * 0.2), 0.5 + (i * 0.05));
    });

    // Wild energy bursts (green glow effect)
    for (let i = 0; i < 8; i++) {
      this.sfxSynths.winChime.triggerAttackRelease('C6', '32n', now + 0.5 + (i * 0.25), 0.6);
      this.sfxSynths.winChime.triggerAttackRelease('G6', '32n', now + 0.6 + (i * 0.25), 0.5);
    }

    // Powerful whoosh effects
    this.sfxSynths.whoosh.triggerAttackRelease('4n', now + 0.8, 0.7);
    this.sfxSynths.whoosh.triggerAttackRelease('4n', now + 1.3, 0.8);
    this.sfxSynths.whoosh.triggerAttackRelease('4n', now + 1.8, 0.9);

    // Final powerful chord
    this.sfxSynths.bigWin.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '2n', now + 2.0, 0.7);

    // Sparkle finish
    const finale = ['E6', 'G6', 'C7'];
    finale.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 2.2 + (i * 0.1), 0.8);
    });
  }

  /**
   * Play coin counter tick sound (for win counter animation)
   */
  playCoinTick() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    this.sfxSynths.coin.triggerAttackRelease('32n', Tone.now(), 0.3);
  }

  /**
   * Play Wild Wheel spin sound - Epic wheel spinning experience
   */
  playWheelSpinSound() {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();

    // Epic intro fanfare
    const fanfare = ['C4', 'E4', 'G4', 'C5', 'E5'];
    fanfare.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '16n', now + i * 0.1, 0.6);
    });

    // Dramatic building pad
    this.sfxSynths.bigWin.triggerAttackRelease(['C3', 'G3', 'C4'], '2n', now, 0.4);

    // Wheel clicking sounds - accelerating then decelerating
    // Fast at start
    for (let i = 0; i < 25; i++) {
      const speed = Math.max(0.03, 0.03 + (i * 0.002));
      const delay = i * speed;
      const volume = 0.15 + (i * 0.01);
      this.sfxSynths.coin.triggerAttackRelease('B6', '64n', now + 0.6 + delay, Math.min(volume, 0.35));
    }

    // Middle section - steady fast clicks
    for (let i = 0; i < 30; i++) {
      const delay = 1.2 + (i * 0.05);
      this.sfxSynths.coin.triggerAttackRelease('A6', '64n', now + delay, 0.3);
    }

    // Slowing down - dramatic deceleration
    for (let i = 0; i < 20; i++) {
      const baseDelay = 2.7;
      const decel = i * 0.08 + (i * i * 0.012);
      this.sfxSynths.coin.triggerAttackRelease('G6', '32n', now + baseDelay + decel, 0.35);
    }

    // Tension building chord progression
    this.sfxSynths.bigWin.triggerAttackRelease(['E3', 'B3', 'E4'], '2n', now + 1.5, 0.3);
    this.sfxSynths.bigWin.triggerAttackRelease(['F3', 'C4', 'F4'], '2n', now + 2.5, 0.35);
    this.sfxSynths.bigWin.triggerAttackRelease(['G3', 'D4', 'G4'], '1n', now + 3.5, 0.4);

    // Rising anticipation notes
    const rising = ['G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
    rising.forEach((note, i) => {
      this.sfxSynths.winChime.triggerAttackRelease(note, '16n', now + 3 + (i * 0.15), 0.4 + (i * 0.05));
    });
  }

  /**
   * Play Wild Wheel result sound - Celebration based on multiplier
   */
  playWheelResultSound(multiplier = 2) {
    if (!this.isInitialized || !this.sfxEnabled) return;

    const now = Tone.now();

    if (multiplier >= 128) {
      // LEGENDARY WIN - x128 or x256
      // Epic explosion of sound
      this.sfxSynths.megaWin.triggerAttackRelease(['C3', 'G3', 'C4', 'E4', 'G4', 'C5'], '1n', now, 0.7);

      // Triumphant fanfare
      const melody = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'];
      melody.forEach((note, i) => {
        this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.1 + i * 0.1, 0.8);
      });

      // Victory chord progression
      this.sfxSynths.bigWin.triggerAttackRelease(['C4', 'E4', 'G4'], '2n', now + 0.5, 0.5);
      this.sfxSynths.bigWin.triggerAttackRelease(['F4', 'A4', 'C5'], '2n', now + 1, 0.55);
      this.sfxSynths.megaWin.triggerAttackRelease(['G4', 'B4', 'D5', 'G5'], '1n', now + 1.5, 0.6);

    } else if (multiplier >= 64) {
      // EPIC WIN - x64
      this.sfxSynths.megaWin.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '1n', now, 0.6);
      const melody = ['C5', 'E5', 'G5', 'C6', 'E6'];
      melody.forEach((note, i) => {
        this.sfxSynths.winChime.triggerAttackRelease(note, '8n', now + 0.15 + i * 0.12, 0.7);
      });
      this.sfxSynths.bigWin.triggerAttackRelease(['G3', 'C4', 'E4'], '2n', now + 0.8, 0.5);

    } else if (multiplier >= 16) {
      // BIG WIN - x16 or x32
      this.sfxSynths.bigWin.triggerAttackRelease(['G3', 'B3', 'D4', 'G4'], '2n', now, 0.55);
      this.sfxSynths.winChime.triggerAttackRelease('G5', '4n', now + 0.15, 0.6);
      this.sfxSynths.winChime.triggerAttackRelease('B5', '4n', now + 0.3, 0.6);
      this.sfxSynths.winChime.triggerAttackRelease('D6', '4n', now + 0.45, 0.55);

    } else if (multiplier >= 8) {
      // GOOD WIN - x8
      this.sfxSynths.bigWin.triggerAttackRelease(['E3', 'G3', 'B3'], '4n', now, 0.45);
      this.sfxSynths.winChime.triggerAttackRelease('E5', '8n', now + 0.1, 0.5);
      this.sfxSynths.winChime.triggerAttackRelease('G5', '8n', now + 0.2, 0.55);

    } else {
      // SMALL WIN - x2 or x4
      this.sfxSynths.winChime.triggerAttackRelease('C5', '8n', now, 0.5);
      this.sfxSynths.winChime.triggerAttackRelease('E5', '8n', now + 0.1, 0.5);
      this.sfxSynths.winChime.triggerAttackRelease('G5', '8n', now + 0.2, 0.45);
    }
  }

  /**
   * Create musical sequences - Casino/Wolf Theme
   * Darker, more mysterious with occasional tension
   */
  _createSequences() {
    // BPM - Slightly slower for mysterious vibe
    Tone.Transport.bpm.value = 92;

    // Chord progression - Dm, Am, Bb, Gm (darker, more dramatic)
    const chordProgression = [
      ['D3', 'F3', 'A3'],  // Dm - mysterious
      ['A2', 'C3', 'E3'],  // Am - tension
      ['Bb2', 'D3', 'F3'], // Bb - drama
      ['G2', 'Bb2', 'D3'], // Gm - resolve
    ];

    // Lower octave chords for pad2 - deep and rumbling
    const chordProgression2 = [
      ['D2', 'A2'],  // Dm bass
      ['A1', 'E2'],  // Am bass
      ['Bb1', 'F2'], // Bb bass
      ['G1', 'D2'],  // Gm bass
    ];

    // Pad sequence - long sustained chords
    let chordIndex = 0;
    this.sequences.pad = new Tone.Loop((time) => {
      const chord = chordProgression[chordIndex % chordProgression.length];
      this.synths.pad.triggerAttackRelease(chord, '2n', time);
      chordIndex++;
    }, '2n');

    // Second pad - lower, offset
    let chord2Index = 0;
    this.sequences.pad2 = new Tone.Loop((time) => {
      const chord = chordProgression2[chord2Index % chordProgression2.length];
      this.synths.pad2.triggerAttackRelease(chord, '1n', time);
      chord2Index++;
    }, '1n');

    // Bass line - darker, prowling wolf feel
    const bassPattern = [
      ['D1', '4n'], [null, '8n'], ['D2', '8n'], ['D1', '16n'], [null, '16n'],
      ['A1', '4n'], [null, '8n'], ['A2', '8n'], ['E2', '16n'], [null, '16n'],
      ['Bb1', '4n'], [null, '8n'], ['F2', '8n'], ['Bb1', '16n'], [null, '16n'],
      ['G1', '4n'], [null, '8n'], ['D2', '8n'], ['G1', '16n'], [null, '16n'],
    ];

    let bassIndex = 0;
    this.sequences.bass = new Tone.Loop((time) => {
      const [note, duration] = bassPattern[bassIndex % bassPattern.length];
      if (note) {
        this.synths.bass.triggerAttackRelease(note, duration, time);
      }
      bassIndex++;
    }, '8n');

    // Main arpeggio pattern - mysterious, wolf-like
    const arpNotes = ['D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'E4', 'D4'];
    let arpIndex = 0;
    this.sequences.arp = new Tone.Loop((time) => {
      const note = arpNotes[arpIndex % arpNotes.length];
      this.synths.arp.triggerAttackRelease(note, '16n', time);
      arpIndex++;
    }, '8n');

    // Second arpeggio - eerie wolf howl-like high notes
    const arp2Notes = [null, 'D6', null, 'A5', null, 'F5', null, null, null, 'D6', null, 'Bb5', null, null, null, null];
    let arp2Index = 0;
    this.sequences.arp2 = new Tone.Loop((time) => {
      const note = arp2Notes[arp2Index % arp2Notes.length];
      if (note) {
        this.synths.arp2.triggerAttackRelease(note, '8n', time, 0.35);
      }
      arp2Index++;
    }, '16n');

    // Lead melody - wolf howl inspired, dramatic
    const leadMelodies = [
      ['D5', 'F5', 'A5', 'D6', 'A5', 'F5', 'E5', 'D5'],
      ['A5', 'Bb5', 'D6', 'F6', 'D6', 'Bb5', 'A5', 'G5'],
      ['Bb4', 'D5', 'F5', 'A5', 'F5', 'D5', 'C5', 'Bb4'],
      ['G5', 'Bb5', 'D6', 'F6', 'D6', 'Bb5', 'G5', 'F5'],
    ];
    let leadMelodyIndex = 0;
    let leadNoteIndex = 0;
    this.sequences.lead = new Tone.Loop((time) => {
      const melody = leadMelodies[leadMelodyIndex % leadMelodies.length];
      const note = melody[leadNoteIndex % melody.length];
      if (note) {
        this.synths.lead.triggerAttackRelease(note, '8n', time, 0.6);
      }
      leadNoteIndex++;
      if (leadNoteIndex >= melody.length) {
        leadNoteIndex = 0;
        leadMelodyIndex++;
      }
    }, '4n');

    // Pluck accents - casino coins/chips feel
    const pluckPattern = ['D5', null, null, null, 'A4', null, null, null, 'F4', null, null, 'D4', null, null, null, null];
    let pluckIndex = 0;
    this.sequences.pluck = new Tone.Loop((time) => {
      const note = pluckPattern[pluckIndex % pluckPattern.length];
      if (note) {
        this.synths.pluck.triggerAttack(note, time);
      }
      pluckIndex++;
    }, '8n');

    // Hi-hat pattern (offbeat with variations)
    const hihatPattern = [0.3, 1, 0.5, 1, 0.3, 1, 0.5, 1];
    let hihatIndex = 0;
    this.sequences.hihat = new Tone.Loop((time) => {
      const velocity = hihatPattern[hihatIndex % hihatPattern.length];
      this.synths.hihat.triggerAttackRelease('16n', time, velocity);
      hihatIndex++;
    }, '8n');

    // Open hi-hat on offbeats
    const openHatPattern = [0, 0, 0, 0, 0, 0, 1, 0];
    let openHatIndex = 0;
    this.sequences.openHat = new Tone.Loop((time) => {
      if (openHatPattern[openHatIndex % openHatPattern.length]) {
        this.synths.openHat.triggerAttackRelease('8n', time, 0.5);
      }
      openHatIndex++;
    }, '8n');

    // Snare on 2 and 4
    const snarePattern = [0, 0, 1, 0, 0, 0, 1, 0];
    let snareIndex = 0;
    this.sequences.snare = new Tone.Loop((time) => {
      if (snarePattern[snareIndex % snarePattern.length]) {
        this.synths.snare.triggerAttackRelease('8n', time, 0.7);
      }
      snareIndex++;
    }, '8n');

    // Kick pattern (four on the floor with ghost notes)
    const kickPattern = [1, 0, 0.3, 0, 1, 0, 0.4, 0];
    let kickIndex = 0;
    this.sequences.kick = new Tone.Loop((time) => {
      const velocity = kickPattern[kickIndex % kickPattern.length];
      if (velocity > 0) {
        this.synths.kick.triggerAttackRelease('C1', '8n', time, velocity);
      }
      kickIndex++;
    }, '8n');
  }

  /**
   * Start playing background music
   */
  async play() {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isPlaying) return;

    // Start all sequences with staggered entry for build-up
    this.sequences.pad.start(0);
    this.sequences.pad2.start('1m');
    this.sequences.bass.start(0);
    this.sequences.kick.start(0);
    this.sequences.hihat.start('1m');
    this.sequences.openHat.start('2m');
    this.sequences.snare.start('2m');
    this.sequences.arp.start('2m');
    this.sequences.arp2.start('4m');
    this.sequences.pluck.start('3m');
    this.sequences.lead.start('4m');

    // Start transport
    Tone.Transport.start();

    this.isPlaying = true;
    console.log('AudioService: Playing');
  }

  /**
   * Stop background music
   */
  stop() {
    if (!this.isPlaying) return;

    // Stop transport
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    // Stop all sequences
    Object.values(this.sequences).forEach(seq => seq.stop());

    this.isPlaying = false;
    console.log('AudioService: Stopped');
  }

  /**
   * Toggle play/stop
   */
  async toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      await this.play();
    }
    return this.isPlaying;
  }

  /**
   * Set master volume
   * @param {number} value - Volume in dB (-60 to 0)
   */
  setVolume(value) {
    if (this.masterVolume) {
      this.masterVolume.volume.value = value;
    }
  }

  /**
   * Fade out music
   * @param {number} duration - Fade duration in seconds
   */
  fadeOut(duration = 2) {
    if (!this.isPlaying || !this.masterVolume) return;

    this.masterVolume.volume.rampTo(-60, duration);
    setTimeout(() => {
      this.stop();
      this.masterVolume.volume.value = -6; // Reset volume
    }, duration * 1000);
  }

  /**
   * Fade in music
   * @param {number} duration - Fade duration in seconds
   */
  async fadeIn(duration = 2) {
    if (!this.isInitialized) {
      await this.init();
    }

    this.masterVolume.volume.value = -60;
    await this.play();
    this.masterVolume.volume.rampTo(-6, duration);
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();

    Object.values(this.synths).forEach(synth => synth.dispose());
    Object.values(this.sequences).forEach(seq => seq.dispose());
    Object.values(this.effects).forEach(effect => effect.dispose());

    // Clean up SFX synths
    Object.values(this.sfxSynths).forEach(synth => synth.dispose());
    if (this.sfxReverb) {
      this.sfxReverb.dispose();
    }
    if (this.sfxVolume) {
      this.sfxVolume.dispose();
    }

    if (this.masterVolume) {
      this.masterVolume.dispose();
    }

    this.isInitialized = false;
    console.log('AudioService: Disposed');
  }
}

// Singleton instance
const audioService = new AudioService();

export default audioService;