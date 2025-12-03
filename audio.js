// Audio handling for musical plates - Ratio-based system
// 
// This system uses Just Intonation ratios to build scales and chords from a root frequency.
// 
// TO CHANGE ROOT FREQUENCY:
//   Set ROOT_FREQUENCY to your desired base frequency (e.g., 432Hz, 440Hz, etc.)
//   All notes and chords will be calculated from this root.
//
// TO USE CHORD EXTENSIONS:
//   Pass extensions array to startChord():
//   - ['seventh'] for 7th chord
//   - ['seventh', 'ninth'] for 7add9 chord
//   - ['ninth', 'thirteenth'] for 9add13 chord
//   Available extensions: 'seventh', 'minorSeventh', 'ninth', 'eleventh', 'thirteenth'
//
// Root frequency (can be changed, e.g., 432Hz, 440Hz, etc.)
let ROOT_FREQUENCY = 261.63; // C4 (middle C) - change to 432 for A4=432Hz tuning

// Function to update root frequency (for settings)
function updateRootFrequency(newFrequency) {
    ROOT_FREQUENCY = newFrequency;
}

// Make updateRootFrequency globally accessible
window.updateRootFrequency = updateRootFrequency;

// Major scale ratios (Just Intonation - pure ratios)
// These ratios are relative to the root frequency
// Layout: Lower La (A), Lower Ti (S), Do (D), Re (F), Mi (G), Fa (H), So (J), La (K)
const MAJOR_SCALE_RATIOS = [
    { name: 'Lower La', key: 'a', ratio: [5, 6], color: 0x9b59b6 },   // 5:6 (La an octave below - minor third below Do)
    { name: 'Lower Ti', key: 's', ratio: [15, 16], color: 0xe74c3c }, // 15:16 (Ti an octave below - semitone below Do)
    { name: 'Do', key: 'd', ratio: [1, 1], color: 0xff6b6b },         // 1:1 (unison)
    { name: 'Re', key: 'f', ratio: [9, 8], color: 0x4ecdc4 },         // 9:8 (major second)
    { name: 'Mi', key: 'g', ratio: [5, 4], color: 0x45b7d1 },          // 5:4 (major third)
    { name: 'Fa', key: 'h', ratio: [4, 3], color: 0xf9ca24 },         // 4:3 (perfect fourth)
    { name: 'So', key: 'j', ratio: [3, 2], color: 0x6c5ce7 },          // 3:2 (perfect fifth)
    { name: 'La', key: 'k', ratio: [5, 3], color: 0xa29bfe }           // 5:3 (major sixth)
];

// Chord interval ratios
const CHORD_INTERVALS = {
    // Basic triads
    major: [
        [1, 1],    // Root (unison)
        [5, 4],    // Major third
        [3, 2]     // Perfect fifth
    ],
    minor: [
        [1, 1],    // Root (unison)
        [6, 5],    // Minor third
        [3, 2]     // Perfect fifth
    ],
    // Extended chords (add these to triads)
    seventh: [15, 8],      // Major 7th
    minorSeventh: [9, 5],  // Minor 7th
    ninth: [9, 4],         // 9th (2nd an octave up)
    eleventh: [11, 4],      // 11th (4th an octave up)
    thirteenth: [5, 3]     // 13th (major 6th in same octave, lowered to avoid too high)
};

// Helper function to calculate frequency from ratio
function getFrequencyFromRatio(ratio, rootFreq = ROOT_FREQUENCY) {
    // ratio is [numerator, denominator] or a number
    if (Array.isArray(ratio)) {
        return rootFreq * (ratio[0] / ratio[1]);
    }
    return rootFreq * ratio;
}

// Helper function to get scale note frequency
function getScaleNoteFrequency(noteIndex, octave = 0) {
    const note = MAJOR_SCALE_RATIOS[noteIndex];
    const baseFreq = getFrequencyFromRatio(note.ratio, ROOT_FREQUENCY);
    // Apply octave shift (multiply by 2^octave)
    return baseFreq * Math.pow(2, octave);
}

// Helper function to get note frequency from scale degree (convenience wrapper)
function getNoteFrequency(noteIndex) {
    return getScaleNoteFrequency(noteIndex, 0);
}

// Build chord frequencies from root note and chord type
function buildChordFrequencies(rootNoteIndex, chordType = 'major', extensions = []) {
    const rootFreq = getScaleNoteFrequency(rootNoteIndex, 0);
    const intervals = CHORD_INTERVALS[chordType] || CHORD_INTERVALS.major;
    const frequencies = [];
    
    // Add base triad
    intervals.forEach(interval => {
        frequencies.push(getFrequencyFromRatio(interval, rootFreq));
    });
    
    // Add extensions if requested
    extensions.forEach(ext => {
        if (CHORD_INTERVALS[ext]) {
            frequencies.push(getFrequencyFromRatio(CHORD_INTERVALS[ext], rootFreq));
        }
    });
    
    return frequencies;
}

// Define which chord type each scale degree uses
// Layout: Lower La, Lower Ti, Do, Re, Mi, Fa, So, La
// In a major scale context: vi, vii°, I, ii, iii, IV, V, vi
const scaleDegreeChordTypes = [
    'minor',   // Lower La (vi - minor chord)
    'minor',   // Lower Ti (vii° - diminished, using minor as approximation)
    'major',   // Do (I)
    'minor',   // Re (ii) 
    'minor',   // Mi (iii)
    'major',   // Fa (IV)
    'major',   // So (V)
    'minor'    // La (vi)
];

// Helper function to create chord with extensions
// Example: createChordWithExtensions(0, ['seventh', 'ninth']) for Do7add9
function createChordWithExtensions(rootNoteIndex, extensions = []) {
    const chordType = scaleDegreeChordTypes[rootNoteIndex] || 'major';
    return buildChordFrequencies(rootNoteIndex, chordType, extensions);
}

// Chord extension modes - Diatonic and 3 jazz levels
const CHORD_MODES = [
    { name: 'Diatonic', getExtensions: () => [] },
    { name: 'Jazz7', getExtensions: getJazz7Extensions },
    { name: 'Jazz79', getExtensions: getJazz79Extensions },
    { name: 'Jazz13', getExtensions: getJazz13Extensions }
];

// Jazz7 - Just 7th extensions (light jazz flavor)
function getJazz7Extensions(noteIndex) {
    const chordType = scaleDegreeChordTypes[noteIndex] || 'major';
    
    switch (noteIndex) {
        case 0: // Lower La (vi) - Minor chord
            return ['minorSeventh'];
        case 1: // Lower Ti (vii°) - Diminished (approximated as minor)
            return ['minorSeventh'];
        case 2: // Do (I) - Major chord
            return ['seventh']; // Maj7
        case 3: // Re (ii) - Minor chord
            return ['minorSeventh'];
        case 4: // Mi (iii) - Minor chord
            return ['minorSeventh'];
        case 5: // Fa (IV) - Major chord
            return ['seventh']; // Maj7
        case 6: // So (V) - Dominant chord
            return ['minorSeventh']; // Dom7
        case 7: // La (vi) - Minor chord
            return ['minorSeventh'];
        default:
            if (chordType === 'major') {
                return ['seventh'];
            } else {
                return ['minorSeventh'];
            }
    }
}

// Jazz79 - 7th and 9th extensions (classic jazz)
function getJazz79Extensions(noteIndex) {
    const chordType = scaleDegreeChordTypes[noteIndex] || 'major';
    
    switch (noteIndex) {
        case 0: // Lower La (vi) - Minor chord
            return ['minorSeventh', 'ninth'];
        case 1: // Lower Ti (vii°) - Diminished (approximated as minor)
            return ['minorSeventh', 'ninth'];
        case 2: // Do (I) - Major chord
            return ['seventh', 'ninth']; // Maj7, add9
        case 3: // Re (ii) - Minor chord
            return ['minorSeventh', 'ninth'];
        case 4: // Mi (iii) - Minor chord
            return ['minorSeventh', 'ninth'];
        case 5: // Fa (IV) - Major chord
            return ['seventh', 'ninth']; // Maj7, add9
        case 6: // So (V) - Dominant chord (most important in jazz)
            return ['minorSeventh', 'ninth']; // Dom7, add9
        case 7: // La (vi) - Minor chord
            return ['minorSeventh', 'ninth'];
        default:
            if (chordType === 'major') {
                return ['seventh', 'ninth'];
            } else {
                return ['minorSeventh', 'ninth'];
            }
    }
}

// Jazz13 - Just 13th extensions (only 13th, no 7th or 9th)
// Major chords get 13th
// V chord gets 13th
// Minor chords get 13th (can work as 6th)
function getJazz13Extensions(noteIndex) {
    const chordType = scaleDegreeChordTypes[noteIndex] || 'major';
    
    switch (noteIndex) {
        case 0: // Lower La (vi) - Minor chord
            return ['thirteenth'];
        case 1: // Lower Ti (vii°) - Diminished (approximated as minor)
            return ['thirteenth'];
        case 2: // Do (I) - Major chord
            return ['thirteenth'];
        case 3: // Re (ii) - Minor chord
            return ['thirteenth'];
        case 4: // Mi (iii) - Minor chord
            return ['thirteenth'];
        case 5: // Fa (IV) - Major chord
            return ['thirteenth'];
        case 6: // So (V) - Dominant chord
            return ['thirteenth'];
        case 7: // La (vi) - Minor chord
            return ['thirteenth'];
        default:
            return ['thirteenth'];
    }
}

// Create WaterSynth instance for sound generation
let waterSynth = new WaterSynth();
let audioContext = waterSynth.audioContext;

// Make waterSynth globally accessible for settings
window.waterSynth = waterSynth;

// Bass mode - adds bass note one octave lower
window.bassMode = true;

// Track active notes/chords (key -> array of {oscillator, gainNode})
let activeNotes = {};

// Get active notes (for cleanup)
function getActiveNotes() {
    return activeNotes;
}

// Clear active notes
function clearActiveNotes() {
    activeNotes = {};
}

// ADSR envelope parameters (in seconds)
const ATTACK_TIME = 0.01;   // Attack: how fast the note fades in
const DECAY_TIME = 0.05;    // Decay: fade from attack peak to sustain level
const SUSTAIN_LEVEL = 0.3;  // Sustain: volume while key is held
const RELEASE_TIME = 0.2;   // Release: how fast the note fades out when released

// Resume audio context on first user interaction (required by some browsers)
function resumeAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Calculate gain based on frequency (pink noise distribution - lower notes louder)
// Pink noise has equal energy per octave, so gain is proportional to 1/sqrt(frequency)
function getFrequencyBasedGain(frequency, baseGain = 1.0) {
    // Reference frequency (middle C)
    const referenceFreq = ROOT_FREQUENCY; // 261.63 Hz
    // Pink noise: gain proportional to 1/sqrt(frequency)
    // Normalize so reference frequency has baseGain
    const gainMultiplier = Math.sqrt(referenceFreq / frequency);
    return baseGain * gainMultiplier;
}

// Create a pure sine sub bass (like in music production)
function createSubBass(frequency) {
    const now = audioContext.currentTime;
    
    // Pure sine wave oscillator for sub bass
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    
    // Gain node for envelope
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    
    // Smooth attack and sustain for sub bass - louder for lowest bass note
    const attackTime = 0.05;
    gain.gain.linearRampToValueAtTime(1.0, now + attackTime); // Louder bass
    gain.gain.linearRampToValueAtTime(1.2, now + attackTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(1.1, now + 0.2);
    
    // Connect: osc -> gain -> masterGain (no panning, no noise, pure sine)
    osc.connect(gain);
    gain.connect(waterSynth.masterGain);
    
    // Start
    osc.start(now);
    
    return { oscillator: osc, gainNode: gain };
}

// Helper function to add bass note to oscillators array if bass mode is on
// This is shared by both startNote and startChord to avoid code duplication
function addBassNoteIfEnabled(oscillators, noteIndex) {
    if (window.bassMode && noteIndex !== null) {
        const rootFreq = getScaleNoteFrequency(noteIndex, 0);
        const bassFrequency = rootFreq / 2; // One octave lower
        const bassComponents = createSubBass(bassFrequency);
        oscillators.push(bassComponents);
    }
}

// Function to start a note (attack phase) - stores in activeNotes and returns key
// noteIndex is optional - if provided and bass mode is on, adds bass note
function startNote(frequency, noteKey, noteIndex = null) {
    resumeAudioContext();
    
    // Stop existing note if any
    if (activeNotes[noteKey]) {
        const existing = activeNotes[noteKey];
        existing.forEach(comp => {
            stopNote(comp.oscillator, comp.gainNode);
        });
    }
    
    // Use WaterSynth to create sustained note
    const noteComponents = waterSynth.createSustainedNote(frequency);
    
    // Apply frequency-based gain (pink noise distribution - lower notes louder)
    const now = audioContext.currentTime;
    const baseGain = noteComponents.gainNode.gain.value;
    const frequencyGain = getFrequencyBasedGain(frequency, baseGain);
    
    // Adjust the gain envelope to use frequency-based gain
    noteComponents.gainNode.gain.cancelScheduledValues(now);
    noteComponents.gainNode.gain.setValueAtTime(0, now);
    const attackTime = 0.02;
    noteComponents.gainNode.gain.linearRampToValueAtTime(frequencyGain * 0.8, now + attackTime);
    noteComponents.gainNode.gain.linearRampToValueAtTime(frequencyGain, now + attackTime + 0.01);
    noteComponents.gainNode.gain.exponentialRampToValueAtTime(frequencyGain * 0.7, now + 0.15);
    
    const oscillators = [noteComponents];
    
    // Add bass note if bass mode is enabled (shared logic with startChord)
    addBassNoteIfEnabled(oscillators, noteIndex);
    
    // Store in activeNotes
    activeNotes[noteKey] = oscillators;
    
    return noteKey;
}

// Function to stop a note (release phase)
function stopNote(oscillator, gainNode) {
    const now = audioContext.currentTime;
    
    // Release: fade out smoothly
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + RELEASE_TIME);
    
    // Stop oscillator after release
    oscillator.stop(now + RELEASE_TIME);
}

// Function to start a chord (attack phase) - stores in activeNotes and returns key
function startChord(noteIndex, noteKey, extensions = []) {
    resumeAudioContext();
    
    // Stop existing chord if any
    if (activeNotes[noteKey]) {
        stopChord(activeNotes[noteKey]);
    }
    
    // Get chord type for this scale degree
    const chordType = scaleDegreeChordTypes[noteIndex] || 'major';
    
    // Build chord frequencies using ratio-based system
    const frequencies = buildChordFrequencies(noteIndex, chordType, extensions);
    
    const oscillators = [];
    
    // Play each frequency in the chord using WaterSynth
    frequencies.forEach((frequency, i) => {
        const noteComponents = waterSynth.createSustainedNote(frequency);
        
        // Minimal panning for chords - keep them centered for clarity
        const panValue = (i / Math.max(1, frequencies.length - 1) - 0.5) * 0.3; // Reduced from 1.2 to 0.3
        noteComponents.panNode.pan.value = Math.max(-1, Math.min(1, panValue));
        
        // Apply frequency-based gain (pink noise distribution - lower notes louder)
        const now = audioContext.currentTime;
        const baseGain = 0.35; // Base gain for chords
        const frequencyGain = getFrequencyBasedGain(frequency, baseGain);
        
        noteComponents.gainNode.gain.cancelScheduledValues(now);
        noteComponents.gainNode.gain.setValueAtTime(noteComponents.gainNode.gain.value, now);
        noteComponents.gainNode.gain.linearRampToValueAtTime(frequencyGain * 0.8, now + 0.02);
        noteComponents.gainNode.gain.linearRampToValueAtTime(frequencyGain, now + 0.03);
        noteComponents.gainNode.gain.exponentialRampToValueAtTime(frequencyGain * 0.85, now + 0.15);
        
        oscillators.push(noteComponents);
    });
    
    // Add bass note if bass mode is enabled (shared logic with startNote)
    addBassNoteIfEnabled(oscillators, noteIndex);
    
    // Store in activeNotes
    activeNotes[noteKey] = oscillators;
    
    return noteKey;
}

// Function to stop a chord (release phase)
function stopChord(oscillators) {
    oscillators.forEach(({ oscillator, gainNode }) => {
        stopNote(oscillator, gainNode);
    });
}

// Function to stop a note by key
function stopNoteByKey(noteKey) {
    if (activeNotes[noteKey]) {
        const oscillators = activeNotes[noteKey];
        if (oscillators.length > 1) {
            stopChord(oscillators);
        } else {
            stopNote(oscillators[0].oscillator, oscillators[0].gainNode);
        }
        delete activeNotes[noteKey];
    }
}

// Function to stop all active notes
function stopAllNotes() {
    Object.keys(activeNotes).forEach(noteKey => {
        stopNoteByKey(noteKey);
    });
}

// Legacy function for quick note playback (backwards compatibility)
function playNote(frequency, duration = 0.3) {
    waterSynth.playNote(frequency, duration);
}

// Legacy function for quick chord playback (backwards compatibility)
function playChord(noteIndex, duration = 0.5) {
    const chordType = scaleDegreeChordTypes[noteIndex] || 'major';
    const frequencies = buildChordFrequencies(noteIndex, chordType, []);
    
    frequencies.forEach(frequency => {
        waterSynth.playNote(frequency, duration);
    });
}

