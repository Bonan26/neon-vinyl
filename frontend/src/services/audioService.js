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
  }

  /**
   * Initialize the audio engine - must be called after user interaction
   */
  async init() {
    if (this.isInitialized) return;

    await Tone.start();

    // Master volume control
    this.masterVolume = new Tone.Volume(-6).toDestination();

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
   * Create musical sequences
   */
  _createSequences() {
    // BPM
    Tone.Transport.bpm.value = 108;

    // Chord progression - Am, Em, F, G (classic synthwave)
    const chordProgression = [
      ['A3', 'C4', 'E4'],  // Am
      ['E3', 'G3', 'B3'],  // Em
      ['F3', 'A3', 'C4'],  // F
      ['G3', 'B3', 'D4'],  // G
    ];

    // Lower octave chords for pad2
    const chordProgression2 = [
      ['A2', 'E3'],  // Am bass
      ['E2', 'B2'],  // Em bass
      ['F2', 'C3'],  // F bass
      ['G2', 'D3'],  // G bass
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

    // Bass line - more groove
    const bassPattern = [
      ['A1', '8n'], [null, '16n'], ['A1', '16n'], ['A2', '8n'], [null, '8n'],
      ['E1', '8n'], [null, '16n'], ['E1', '16n'], ['E2', '8n'], [null, '8n'],
      ['F1', '8n'], [null, '16n'], ['F1', '16n'], ['F2', '8n'], [null, '8n'],
      ['G1', '8n'], [null, '16n'], ['G2', '16n'], ['G1', '8n'], [null, '8n'],
    ];

    let bassIndex = 0;
    this.sequences.bass = new Tone.Loop((time) => {
      const [note, duration] = bassPattern[bassIndex % bassPattern.length];
      if (note) {
        this.synths.bass.triggerAttackRelease(note, duration, time);
      }
      bassIndex++;
    }, '8n');

    // Main arpeggio pattern
    const arpNotes = ['E4', 'A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'A4'];
    let arpIndex = 0;
    this.sequences.arp = new Tone.Loop((time) => {
      const note = arpNotes[arpIndex % arpNotes.length];
      this.synths.arp.triggerAttackRelease(note, '16n', time);
      arpIndex++;
    }, '8n');

    // Second arpeggio - ghostly high notes
    const arp2Notes = [null, 'E6', null, 'C6', null, 'A5', null, 'G5', null, 'E6', null, null, null, 'B5', null, null];
    let arp2Index = 0;
    this.sequences.arp2 = new Tone.Loop((time) => {
      const note = arp2Notes[arp2Index % arp2Notes.length];
      if (note) {
        this.synths.arp2.triggerAttackRelease(note, '8n', time, 0.4);
      }
      arp2Index++;
    }, '16n');

    // Lead melody - plays every 4 bars with variation
    const leadMelodies = [
      ['E5', 'G5', 'A5', 'C6', 'B5', 'A5', 'G5', 'E5'],
      ['A5', 'C6', 'E6', 'D6', 'C6', 'A5', 'G5', 'A5'],
      ['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5'],
      ['G5', 'A5', 'B5', 'C6', 'B5', 'G5', 'E5', 'G5'],
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

    // Pluck accents - sporadic
    const pluckPattern = ['A4', null, null, null, 'E4', null, null, null, 'C5', null, null, null, null, null, 'G4', null];
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