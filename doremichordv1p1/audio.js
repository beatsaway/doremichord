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
let ROOT_FREQUENCY = 261.63; // C4 - change to 432 for A4=432Hz tuning

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
    { name: 'Lower La', key: 'a', ratio: [5, 6] },   // 5:6 (La an octave below - minor third below Do)
    { name: 'Lower Ti', key: 's', ratio: [15, 16] }, // 15:16 (Ti an octave below - semitone below Do)
    { name: 'Do', key: 'd', ratio: [1, 1] },         // 1:1 (unison)
    { name: 'Re', key: 'f', ratio: [9, 8] },         // 9:8 (major second)
    { name: 'Mi', key: 'g', ratio: [5, 4] },          // 5:4 (major third)
    { name: 'Fa', key: 'h', ratio: [4, 3] },         // 4:3 (perfect fourth)
    { name: 'So', key: 'j', ratio: [3, 2] },          // 3:2 (perfect fifth)
    { name: 'La', key: 'k', ratio: [5, 3] }           // 5:3 (major sixth)
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
window.bassMode = false;

// Pre-master gain node (before the settings master volume)
// This allows quick volume control via fastcontrol slider
// Audio chain: notes → preMasterGain → gateGain → masterGain (settings) → output
const preMasterGain = audioContext.createGain();
preMasterGain.gain.value = 1.0; // Default to 100%

// Gate gain node for choppy on/off ducking effect (rectangular/square wave)
const gateGain = audioContext.createGain();
gateGain.gain.value = 1.0; // Default to 100%
preMasterGain.connect(gateGain);
gateGain.connect(waterSynth.masterGain);

// Gate parameters
let gateAmount = 0; // 0-100% ducking amount
let gateSpeedSequence = ["4"]; // Array of note values (e.g., ["8", "4T", "1"] for 1/8, 1/4T, 1/1 sequence)
let gateBaseSequence = ["4"]; // Base sequence (original order, used for random mode)
let gateSequenceIndex = 0; // Current index in the sequence
let gateRandomEnabled = false; // Whether random mode is enabled
let gateInterval = null;
let gateTimeout = null; // For scheduling next cycle in sequence

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Helper function to calculate duration from note value and BPM
// noteValue can be a string like "8", "8T", "4", "4T", "2", "2T", "1", "1T"
// Regular notes: Duration = (60/BPM) / noteValue seconds
// Triplets: Duration = (60/BPM) * (2/3) for 1/4T, (60/BPM) / 3 for 1/8T, (60/BPM) * (4/3) for 1/2T, (60/BPM) * (8/3) for 1/1T
function getNoteDuration(noteValue, bpm) {
    // BPM is beats per minute, so one beat = 60/BPM seconds
    const beatDuration = 60.0 / bpm;
    
    // Check if it's a triplet (ends with "T")
    if (typeof noteValue === 'string' && noteValue.endsWith('T')) {
        // Extract the base note value (e.g., "8" from "8T")
        const baseValue = parseInt(noteValue.slice(0, -1));
        
        // Triplet calculations:
        // 1/8T = 1/3 of a beat = beatDuration / 3
        // 1/4T = 2/3 of a beat = beatDuration * 2/3
        // 1/2T = 4/3 of a beat = beatDuration * 4/3
        // 1/1T = 8/3 of a beat = beatDuration * 8/3 (3 whole notes in time of 2 whole notes = 8 beats / 3)
        if (baseValue === 8) {
            // 1/8T: 1/3 of a beat
            return beatDuration / 3;
        } else if (baseValue === 4) {
            // 1/4T: 2/3 of a beat
            return beatDuration * (2.0 / 3.0);
        } else if (baseValue === 2) {
            // 1/2T: 4/3 of a beat
            return beatDuration * (4.0 / 3.0);
        } else if (baseValue === 1) {
            // 1/1T: 8/3 of a beat (3 whole notes in time of 2 whole notes)
            return beatDuration * (8.0 / 3.0);
        }
    } else {
        // Regular note: 1/N of a beat
        const numValue = typeof noteValue === 'string' ? parseInt(noteValue) : noteValue;
        return beatDuration / numValue;
    }
    
    // Fallback (shouldn't happen)
    return beatDuration;
}

// Function to continuously update gate gain using rectangular/square wave pattern
function startGateLoop() {
    // Clear existing interval and timeout
    if (gateInterval) {
        clearInterval(gateInterval);
        gateInterval = null;
    }
    if (gateTimeout) {
        clearTimeout(gateTimeout);
        gateTimeout = null;
    }
    
    // If gate amount is 0, no effect needed
    if (gateAmount === 0) {
        const now = audioContext.currentTime;
        gateGain.gain.cancelScheduledValues(now);
        gateGain.gain.setValueAtTime(1.0, now);
        // Clear playing index
        if (window.updatePlayingSequenceIndex) {
            window.updatePlayingSequenceIndex(-1);
        }
        return;
    }
    
    // If no speeds selected, don't run
    if (!gateSpeedSequence || gateSpeedSequence.length === 0) {
        const now = audioContext.currentTime;
        gateGain.gain.cancelScheduledValues(now);
        gateGain.gain.setValueAtTime(1.0, now);
        // Clear playing index
        if (window.updatePlayingSequenceIndex) {
            window.updatePlayingSequenceIndex(-1);
        }
        return;
    }
    
    // Reset sequence index
    gateSequenceIndex = 0;
    
    // Notify UI of starting index
    if (window.updatePlayingSequenceIndex) {
        window.updatePlayingSequenceIndex(0);
    }
    
    // Start the sequence
    scheduleNextGateCycle();
}

// Function to schedule the next cycle in the sequence
function scheduleNextGateCycle() {
    if (gateAmount === 0 || !gateSpeedSequence || gateSpeedSequence.length === 0) {
        return;
    }
    
    // If random mode is enabled, shuffle the sequence before each cycle
    if (gateRandomEnabled && gateBaseSequence.length > 0) {
        gateSpeedSequence = shuffleArray(gateBaseSequence);
        gateSequenceIndex = 0; // Reset to start of shuffled sequence
    }
    
    // Get current note value from sequence
    const noteValue = gateSpeedSequence[gateSequenceIndex];
    
    // Get BPM (default to 120 if not set)
    const bpm = window.bpm || 120;
    
    // Calculate duration for this note value
    const gateSpeed = getNoteDuration(noteValue, bpm);
    
    const duckingAmount = gateAmount / 100;
    const sampleRate = audioContext.sampleRate;
    const curveLength = Math.ceil(gateSpeed * sampleRate);
    
    function scheduleGateCycle() {
        const now = audioContext.currentTime;
        const curve = new Float32Array(curveLength);
        
        // Fourier series approximation of square wave using 3 sine terms
        // square(t) ≈ (4/π) * [sin(ωt) + (1/3)sin(3ωt) + (1/5)sin(5ωt)]
        // This gives a recognizable but imperfect square wave with smoother edges
        const pi = Math.PI;
        const fundamentalFreq = 1 / gateSpeed; // Frequency = 1 / period
        
        for (let i = 0; i < curveLength; i++) {
            const t = i / sampleRate;
            const omega = 2 * pi * fundamentalFreq;
            
            // Calculate 3-term Fourier approximation
            const term1 = Math.sin(omega * t);
            const term3 = (1/3) * Math.sin(3 * omega * t);
            const term5 = (1/5) * Math.sin(5 * omega * t);
            const squareApprox = (4 / pi) * (term1 + term3 + term5);
            
            // Normalize and clamp to prevent clipping
            // The Fourier series can overshoot, so we need to clamp it
            // Clamp squareApprox to [-1, 1] range first
            const clampedApprox = Math.max(-1, Math.min(1, squareApprox));
            
            // Map from [-1, 1] to [0, 1]
            const normalized = (clampedApprox + 1) / 2;
            
            // Map to gain range: [0, 1] → [(1.0 - duckingAmount), 1.0]
            // Then clamp to ensure it never exceeds 1.0 or goes below 0.0
            const gainValue = (1.0 - duckingAmount) + (duckingAmount * normalized);
            curve[i] = Math.max(0.0, Math.min(1.0, gainValue));
        }
        
        gateGain.gain.cancelScheduledValues(now);
        gateGain.gain.setValueCurveAtTime(curve, now, gateSpeed);
    }
    
    // Schedule this cycle
    scheduleGateCycle();
    
    // Notify UI of current playing index
    // Map the current gateSequenceIndex to the base sequence index
    if (window.updatePlayingSequenceIndex) {
        if (gateRandomEnabled) {
            // In random mode, find which note value is playing and highlight first instance in base sequence
            const currentNoteValue = gateSpeedSequence[gateSequenceIndex];
            const baseIndex = gateBaseSequence.indexOf(currentNoteValue);
            window.updatePlayingSequenceIndex(baseIndex >= 0 ? baseIndex : -1);
        } else {
            // In normal mode, use the sequence index directly
            window.updatePlayingSequenceIndex(gateSequenceIndex);
        }
    }
    
    // Move to next item in sequence
    gateSequenceIndex = (gateSequenceIndex + 1) % gateSpeedSequence.length;
    
    // Schedule next cycle after this one completes
    gateTimeout = setTimeout(() => {
        scheduleNextGateCycle();
    }, gateSpeed * 1000);
}

// Function to update gate amount
function updateGateAmount(amount) {
    gateAmount = amount;
    startGateLoop();
}

// Function to update gate speed sequence
// sequence: array of note values (e.g., ["8", "4T", "1"] for 1/8, 1/4T, 1/1)
// randomEnabled: boolean, whether to randomize the sequence order
function updateGateSpeedSequence(sequence, randomEnabled = false) {
    gateBaseSequence = sequence && sequence.length > 0 ? [...sequence] : ["4"]; // Default to 1/4 if empty
    gateRandomEnabled = randomEnabled;
    
    // If random is enabled, shuffle the sequence
    if (randomEnabled) {
        gateSpeedSequence = shuffleArray(gateBaseSequence);
    } else {
        gateSpeedSequence = [...gateBaseSequence];
    }
    
    gateSequenceIndex = 0; // Reset to start of sequence
    startGateLoop();
}

// Legacy function for backwards compatibility
function updateGateSpeed(speed) {
    // Convert old speed (seconds) to approximate note value at 120 BPM
    // This is a rough conversion for backwards compatibility
    const bpm = window.bpm || 120;
    const approximateNoteValue = Math.round((60.0 / bpm) / speed);
    // Clamp to valid note values
    const validNoteValues = [16, 8, 4, 2, 1];
    let closest = validNoteValues[0];
    let minDiff = Math.abs(approximateNoteValue - closest);
    for (const val of validNoteValues) {
        const diff = Math.abs(approximateNoteValue - val);
        if (diff < minDiff) {
            minDiff = diff;
            closest = val;
        }
    }
    updateGateSpeedSequence([closest]);
}

// Make functions globally accessible
window.updateGateAmount = updateGateAmount;
window.updateGateSpeed = updateGateSpeed;
window.updateGateSpeedSequence = updateGateSpeedSequence;

// Patch WaterSynth to route through preMasterGain instead of directly to masterGain
// We'll intercept createSustainedNote calls and modify the connection
const originalCreateSustainedNote = waterSynth.createSustainedNote.bind(waterSynth);
waterSynth.createSustainedNote = function(frequency, pitchDrop, noiseAmount) {
    const result = originalCreateSustainedNote(frequency, pitchDrop, noiseAmount);
    // Disconnect from masterGain and reconnect through preMasterGain
    result.panNode.disconnect(waterSynth.masterGain);
    result.panNode.connect(preMasterGain);
    return result;
};

// Track active notes/chords (key -> array of {oscillator, gainNode, baseFrequency})
let activeNotes = {};

// Get active notes (for cleanup)
function getActiveNotes() {
    return activeNotes;
}

// Clear active notes
function clearActiveNotes() {
    activeNotes = {};
}

// Update pitch bend for a note/chord in real-time
// pitchBendMultiplier: 1.0 = no bend, >1.0 = pitch up, <1.0 = pitch down
function updatePitchBend(noteKey, pitchBendMultiplier) {
    if (!activeNotes[noteKey]) return;
    
    const now = audioContext.currentTime;
    const oscillators = activeNotes[noteKey];
    
    oscillators.forEach(comp => {
        // Skip if baseFrequency is not available
        if (!comp.baseFrequency) return;
        
        const newFrequency = comp.baseFrequency * pitchBendMultiplier;
        // Use linearRampToValueAtTime for smooth pitch transitions
        comp.oscillator.frequency.cancelScheduledValues(now);
        comp.oscillator.frequency.setValueAtTime(comp.oscillator.frequency.value, now);
        comp.oscillator.frequency.linearRampToValueAtTime(newFrequency, now + 0.01);
    });
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
    // Pre-master volume is applied automatically via preMasterGain node
    const attackTime = 0.05;
    gain.gain.linearRampToValueAtTime(1.0, now + attackTime); // Louder bass
    gain.gain.linearRampToValueAtTime(1.2, now + attackTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(1.1, now + 0.2);
    
    // Connect: osc -> gain -> preMasterGain (no panning, no noise, pure sine)
    osc.connect(gain);
    gain.connect(preMasterGain);
    
    // Start
    osc.start(now);
    
    return { oscillator: osc, gainNode: gain, baseFrequency: frequency };
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
    
    // Store base frequency for pitch bending
    noteComponents.baseFrequency = frequency;
    
    // Apply frequency-based gain (pink noise distribution - lower notes louder)
    const now = audioContext.currentTime;
    const baseGain = noteComponents.gainNode.gain.value;
    const frequencyGain = getFrequencyBasedGain(frequency, baseGain);
    // Pre-master volume is applied automatically via preMasterGain node
    
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
        
        // Store base frequency for pitch bending
        noteComponents.baseFrequency = frequency;
        
        // Minimal panning for chords - keep them centered for clarity
        const panValue = (i / Math.max(1, frequencies.length - 1) - 0.5) * 0.3; // Reduced from 1.2 to 0.3
        noteComponents.panNode.pan.value = Math.max(-1, Math.min(1, panValue));
        
        // Apply frequency-based gain (pink noise distribution - lower notes louder)
        const now = audioContext.currentTime;
        const baseGain = 0.35; // Base gain for chords
        const frequencyGain = getFrequencyBasedGain(frequency, baseGain);
        // Pre-master volume is applied automatically via preMasterGain node
        
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

// Make updatePitchBend globally accessible
window.updatePitchBend = updatePitchBend;

