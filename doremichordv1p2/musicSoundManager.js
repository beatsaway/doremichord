// Sound Manager for Musical Notes with Jazz79 Harmonics
class MusicSoundManager {
    constructor() {
        // Root frequency (default C4 = 261.63 Hz)
        this.ROOT_FREQUENCY = 261.63;
        
        // Major scale ratios (Just Intonation - pure ratios)
        // Layout: 4 before (Lower Re, Mi, Fa, So) + Original 8 (La, Ti, Do, Re, Mi, Fa, So, La') + 4 after (Ti', Do', Re', Mi')
        // Keyboard mapping (row by row, 4x4 grid):
        // Row 1: 1, 2, 3, 4
        // Row 2: q, w, e, r
        // Row 3: a, s, d, f
        // Row 4: z, x, c, v
        this.MAJOR_SCALE_RATIOS = [
            // Row 1 (top): 1, 2, 3, 4
            { name: 'Lower Re', key: '1', ratio: [9, 16] },   // Re one octave down (9:8 / 2)
            { name: 'Lower Mi', key: '2', ratio: [5, 8] },    // Mi one octave down (5:4 / 2)
            { name: 'Lower Fa', key: '3', ratio: [2, 3] },    // Fa one octave down (4:3 / 2)
            { name: 'Lower So', key: '4', ratio: [3, 4] },    // So one octave down (3:2 / 2)
            // Row 2: q, w, e, r
            { name: 'La', key: 'q', ratio: [5, 6] },          // Original Lower La
            { name: 'Ti', key: 'w', ratio: [15, 16] },        // Original Lower Ti
            { name: 'Do', key: 'e', ratio: [1, 1] },          // 1:1 (unison)
            { name: 'Re', key: 'r', ratio: [9, 8] },          // 9:8 (major second)
            // Row 3: a, s, d, f
            { name: 'Mi', key: 'a', ratio: [5, 4] },          // 5:4 (major third)
            { name: 'Fa', key: 's', ratio: [4, 3] },          // 4:3 (perfect fourth)
            { name: 'So', key: 'd', ratio: [3, 2] },          // 3:2 (perfect fifth)
            { name: 'La', key: 'f', ratio: [5, 3] },          // La' (major sixth, one octave above original Lower La)
            // Row 4 (bottom): z, x, c, v
            { name: 'Ti', key: 'z', ratio: [15, 8] },         // Ti' (major seventh, one octave above original Lower Ti)
            { name: 'Do', key: 'x', ratio: [2, 1] },          // Do' (one octave up from Do)
            { name: 'Re', key: 'c', ratio: [9, 4] },          // Re' (one octave up from Re)
            { name: 'Mi', key: 'v', ratio: [5, 2] }           // Mi' (one octave up from Mi)
        ];
        
        // Chord interval ratios
        this.CHORD_INTERVALS = {
            major: [
                [1, 1],    // Root
                [5, 4],    // Major third
                [3, 2]     // Perfect fifth
            ],
            minor: [
                [1, 1],    // Root
                [6, 5],    // Minor third
                [3, 2]     // Perfect fifth
            ],
            seventh: [15, 8],      // Major 7th
            minorSeventh: [9, 5],  // Minor 7th
            ninth: [9, 4],         // 9th
            eleventh: [11, 4],      // 11th
            thirteenth: [5, 3]     // 13th
        };
        
        // Chord types for each scale degree (16 notes)
        this.scaleDegreeChordTypes = [
            // 4 notes before original range
            'minor',   // Lower Re (ii one octave down)
            'minor',   // Lower Mi (iii one octave down)
            'major',   // Lower Fa (IV one octave down)
            'major',   // Lower So (V one octave down)
            // Original 8 notes
            'minor',   // La (vi)
            'minor',   // Ti (vii°)
            'major',   // Do (I)
            'minor',   // Re (ii)
            'minor',   // Mi (iii)
            'major',   // Fa (IV)
            'major',   // So (V)
            'minor',   // La' (vi one octave up)
            // 4 notes after original range
            'minor',   // Ti' (vii° one octave up)
            'major',   // Do' (I one octave up)
            'minor',   // Re' (ii one octave up)
            'minor'    // Mi' (iii one octave up)
        ];
        
        // WaterSynth instance
        this.waterSynth = null;
        this.audioContext = null;
        
        // Active notes/chords tracking
        this.activeNotes = {}; // key -> array of {oscillator, gainNode, baseFrequency}
        
        // Bass always on
        this.bassMode = true;
        
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Initialize WaterSynth (check both window.WaterSynth and global WaterSynth)
        const WaterSynthClass = window.WaterSynth || (typeof WaterSynth !== 'undefined' ? WaterSynth : null);
        
        if (WaterSynthClass) {
            this.waterSynth = new WaterSynthClass();
            this.audioContext = this.waterSynth.audioContext;
            console.log('WaterSynth initialized');
        } else {
            console.error('WaterSynth class not found. Make sure ss_watersynth.js is loaded before musicSoundManager.js');
            return;
        }
        
        this.initialized = true;
        console.log('MusicSoundManager initialized');
    }

    // Helper function to calculate frequency from ratio
    getFrequencyFromRatio(ratio, rootFreq = null) {
        const root = rootFreq || this.ROOT_FREQUENCY;
        if (Array.isArray(ratio)) {
            return root * (ratio[0] / ratio[1]);
        }
        return root * ratio;
    }

    // Get scale note frequency
    getScaleNoteFrequency(noteIndex, octave = 0) {
        const note = this.MAJOR_SCALE_RATIOS[noteIndex];
        const noteOctave = note.octave || 0;
        const baseFreq = this.getFrequencyFromRatio(note.ratio, this.ROOT_FREQUENCY);
        return baseFreq * Math.pow(2, octave + noteOctave);
    }

    // Get Jazz79 extensions for a note index
    getJazz79Extensions(noteIndex) {
        // Use chord type to determine extensions
        const chordType = this.scaleDegreeChordTypes[noteIndex] || 'major';
        
        // Check if it's a dominant chord (V degree) - positions 3, 10
        const isDominant = (noteIndex === 3 || noteIndex === 10);
        
        if (isDominant) {
            // Dominant chord (So/V) - use dominant 7th
            return ['minorSeventh', 'ninth']; // Dom7, add9
        } else if (chordType === 'major') {
            // Major chord - use major 7th
            return ['seventh', 'ninth']; // Maj7, add9
        } else {
            // Minor chord - use minor 7th
            return ['minorSeventh', 'ninth'];
        }
    }

    // Build chord frequencies from root note and extensions
    buildChordFrequencies(rootNoteIndex, extensions = []) {
        const rootFreq = this.getScaleNoteFrequency(rootNoteIndex, 0);
        const chordType = this.scaleDegreeChordTypes[rootNoteIndex] || 'major';
        const intervals = this.CHORD_INTERVALS[chordType];
        const frequencies = [];
        
        // Add base triad
        intervals.forEach(interval => {
            frequencies.push(this.getFrequencyFromRatio(interval, rootFreq));
        });
        
        // Add extensions
        extensions.forEach(ext => {
            if (this.CHORD_INTERVALS[ext]) {
                frequencies.push(this.getFrequencyFromRatio(this.CHORD_INTERVALS[ext], rootFreq));
            }
        });
        
        return frequencies;
    }

    // Create sub bass (pure sine wave)
    createSubBass(frequency) {
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, now);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        
        const attackTime = 0.05;
        gain.gain.linearRampToValueAtTime(1.0, now + attackTime);
        gain.gain.linearRampToValueAtTime(1.2, now + attackTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(1.1, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.waterSynth.masterGain);
        
        osc.start(now);
        
        return { oscillator: osc, gainNode: gain, baseFrequency: frequency };
    }

    // Calculate frequency-based gain (pink noise distribution)
    getFrequencyBasedGain(frequency, baseGain = 1.0) {
        const referenceFreq = this.ROOT_FREQUENCY;
        const gainMultiplier = Math.sqrt(referenceFreq / frequency);
        return baseGain * gainMultiplier;
    }

    // Resume audio context
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Start a chord (Jazz79)
    startChord(noteIndex, noteKey) {
        if (!this.initialized) this.init();
        this.resumeAudioContext();
        
        // Stop existing chord if any
        if (this.activeNotes[noteKey]) {
            this.stopChord(this.activeNotes[noteKey]);
        }
        
        // Get Jazz79 extensions
        const extensions = this.getJazz79Extensions(noteIndex);
        
        // Build chord frequencies
        const frequencies = this.buildChordFrequencies(noteIndex, extensions);
        
        const oscillators = [];
        
        // Play each frequency in the chord
        frequencies.forEach((frequency, i) => {
            const noteComponents = this.waterSynth.createSustainedNote(frequency);
            noteComponents.baseFrequency = frequency;
            
            // Minimal panning for chords
            const panValue = (i / Math.max(1, frequencies.length - 1) - 0.5) * 0.3;
            noteComponents.panNode.pan.value = Math.max(-1, Math.min(1, panValue));
            
            // Apply frequency-based gain
            const now = this.audioContext.currentTime;
            const baseGain = 0.35;
            const frequencyGain = this.getFrequencyBasedGain(frequency, baseGain);
            
            noteComponents.gainNode.gain.cancelScheduledValues(now);
            noteComponents.gainNode.gain.setValueAtTime(noteComponents.gainNode.gain.value, now);
            noteComponents.gainNode.gain.linearRampToValueAtTime(frequencyGain * 0.8, now + 0.02);
            noteComponents.gainNode.gain.linearRampToValueAtTime(frequencyGain, now + 0.03);
            noteComponents.gainNode.gain.exponentialRampToValueAtTime(frequencyGain * 0.85, now + 0.15);
            
            oscillators.push(noteComponents);
        });
        
        // Add bass note if bass mode is on
        if (this.bassMode) {
            const rootFreq = this.getScaleNoteFrequency(noteIndex, 0);
            const bassFrequency = rootFreq / 2; // One octave lower
            const bassComponents = this.createSubBass(bassFrequency);
            oscillators.push(bassComponents);
        }
        
        // Store in activeNotes
        this.activeNotes[noteKey] = oscillators;
        
        return noteKey;
    }

    // Stop a chord
    stopChord(oscillators) {
        const RELEASE_TIME = 0.2;
        const now = this.audioContext.currentTime;
        
        oscillators.forEach(({ oscillator, gainNode }) => {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + RELEASE_TIME);
            oscillator.stop(now + RELEASE_TIME);
        });
    }

    // Stop a note by key
    stopNoteByKey(noteKey) {
        if (this.activeNotes[noteKey]) {
            this.stopChord(this.activeNotes[noteKey]);
            delete this.activeNotes[noteKey];
        }
    }

    // Update pitch bend for a note/chord
    updatePitchBend(noteKey, pitchBendMultiplier) {
        if (!this.activeNotes[noteKey]) return;
        
        const now = this.audioContext.currentTime;
        const oscillators = this.activeNotes[noteKey];
        
        oscillators.forEach(comp => {
            if (!comp.baseFrequency) return;
            
            const newFrequency = comp.baseFrequency * pitchBendMultiplier;
            comp.oscillator.frequency.cancelScheduledValues(now);
            comp.oscillator.frequency.setValueAtTime(comp.oscillator.frequency.value, now);
            comp.oscillator.frequency.linearRampToValueAtTime(newFrequency, now + 0.01);
        });
    }

    // Update root frequency
    updateRootFrequency(newFrequency) {
        this.ROOT_FREQUENCY = newFrequency;
    }

    // Stop all notes
    stopAllNotes() {
        Object.keys(this.activeNotes).forEach(noteKey => {
            this.stopNoteByKey(noteKey);
        });
    }
}

// Create global music sound manager instance
const musicSoundManager = new MusicSoundManager();
window.musicSoundManager = musicSoundManager;
