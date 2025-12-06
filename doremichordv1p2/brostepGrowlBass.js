// Brostep Growl Bass Synthesizer
// Initialize Audio Context
let audioContext;
let masterGain;
let masterCompressor;
let masterBrightness;
let masterDistortion;
let masterBoost;
const activeSounds = {}; // Track active sounds
let globalLFORate = 0.5; // Global LFO rate in Hz (default: 0.5 times per second)

// Sidechain ducking
let sidechainGainGrowl = null;
let sidechainGainWatersynth = null;
const SIDECHAIN_DUCK_AMOUNT = 0.0005; // Duck to 0.1% volume (extremely aggressive ducking)
const SIDECHAIN_ATTACK = 0.001; // 1ms attack (very quick)
const SIDECHAIN_HOLD = 0.1; // 10ms hold time (stay ducked before release)
const SIDECHAIN_RELEASE = 0.1; // 5ms release (very quick)

function initMasterChain() {
    if (!audioContext) return;
    
    // Create sidechain gain node for growl bass if not exists
    if (!sidechainGainGrowl) {
        sidechainGainGrowl = audioContext.createGain();
        sidechainGainGrowl.gain.value = 1.0; // Start at full volume
    }
    
    // Create master processing chain if not exists
    if (!masterCompressor) {
        masterCompressor = audioContext.createDynamicsCompressor();
        masterCompressor.threshold.value = -20; // Start compressing at -20dB
        masterCompressor.knee.value = 30; // Soft knee
        masterCompressor.ratio.value = 3; // 3:1 ratio
        masterCompressor.attack.value = 0.003; // Fast attack (3ms)
        masterCompressor.release.value = 0.1; // Quick release (100ms)
    }
    
    if (!masterBrightness) {
        // High-shelf filter for brightness boost
        masterBrightness = audioContext.createBiquadFilter();
        masterBrightness.type = 'highshelf';
        masterBrightness.frequency.value = 3000; // Boost above 3kHz
        masterBrightness.gain.value = 4; // +4dB brightness boost
    }
    
    if (!masterDistortion) {
        // Master distortion for character
        masterDistortion = createDistortion(25); // Light distortion for character
    }
    
    if (!masterBoost) {
        // Final boost after processing
        masterBoost = audioContext.createGain();
        masterBoost.gain.value = 1.2; // 20% boost
    }
    
    // Connect the chain: masterGain -> sidechainGain -> compressor -> brightness -> distortion -> boost -> destination
    if (masterGain) {
        try {
            masterGain.disconnect(); // Disconnect old connection if exists
        } catch (e) {
            // Ignore if not connected
        }
        masterGain.connect(sidechainGainGrowl);
    }
    sidechainGainGrowl.connect(masterCompressor);
    masterCompressor.connect(masterBrightness);
    masterBrightness.connect(masterDistortion);
    masterDistortion.connect(masterBoost);
    masterBoost.connect(audioContext.destination);
}

// Sidechain ducking function - called when kick/snare play
function triggerSidechainDuck() {
    const now = audioContext ? audioContext.currentTime : 0;
    const duckLevel = Math.max(0.001, SIDECHAIN_DUCK_AMOUNT); // Ensure non-zero for exponential
    const holdEnd = now + SIDECHAIN_ATTACK + SIDECHAIN_HOLD;
    const releaseEnd = holdEnd + SIDECHAIN_RELEASE;
    
    // Duck growl bass - using exponential ramps for more natural compression-like curve
    if (sidechainGainGrowl && audioContext) {
        sidechainGainGrowl.gain.cancelScheduledValues(now);
        const currentGain = Math.max(0.001, sidechainGainGrowl.gain.value); // Ensure non-zero for exponential
        sidechainGainGrowl.gain.setValueAtTime(currentGain, now);
        // Exponential ramp down (more aggressive curve)
        sidechainGainGrowl.gain.exponentialRampToValueAtTime(duckLevel, now + SIDECHAIN_ATTACK);
        // Hold at ducked level
        sidechainGainGrowl.gain.setValueAtTime(duckLevel, holdEnd);
        // Exponential ramp back up
        sidechainGainGrowl.gain.exponentialRampToValueAtTime(1.0, releaseEnd);
    }
    
    // Duck watersynth - using exponential ramps for more natural compression-like curve
    if (window.sidechainGainWatersynth && window.musicSoundManager && window.musicSoundManager.audioContext) {
        const waterContext = window.musicSoundManager.audioContext;
        const waterNow = waterContext.currentTime;
        const waterHoldEnd = waterNow + SIDECHAIN_ATTACK + SIDECHAIN_HOLD;
        const waterReleaseEnd = waterHoldEnd + SIDECHAIN_RELEASE;
        
        window.sidechainGainWatersynth.gain.cancelScheduledValues(waterNow);
        const currentGain = Math.max(0.001, window.sidechainGainWatersynth.gain.value); // Ensure non-zero for exponential
        window.sidechainGainWatersynth.gain.setValueAtTime(currentGain, waterNow);
        // Exponential ramp down (more aggressive curve)
        window.sidechainGainWatersynth.gain.exponentialRampToValueAtTime(duckLevel, waterNow + SIDECHAIN_ATTACK);
        // Hold at ducked level
        window.sidechainGainWatersynth.gain.setValueAtTime(duckLevel, waterHoldEnd);
        // Exponential ramp back up
        window.sidechainGainWatersynth.gain.exponentialRampToValueAtTime(1.0, waterReleaseEnd);
    }
}

// Expose sidechain trigger globally
window.triggerSidechainDuck = triggerSidechainDuck;

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.4; // Default 40% (lowered from 70%)
        initMasterChain(); // Initialize master processing chain
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // Ensure masterGain exists for sound functions
    if (!masterGain) {
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.4; // Default 40% (lowered from 70%)
        initMasterChain(); // Initialize master processing chain
    }
}

// Initialize on first user interaction
document.addEventListener('click', initAudioContext, { once: true });
document.addEventListener('touchstart', initAudioContext, { once: true });

// Master volume control (only if elements exist)
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        volumeValue.textContent = value + '%';
        ensureMasterGain();
        if (masterGain) {
            masterGain.gain.value = value / 100;
        }
    });
}

// LFO rate control (only if elements exist)
const lfoSlider = document.getElementById('lfo-slider');
const lfoValue = document.getElementById('lfo-value');

if (lfoSlider && lfoValue) {
    lfoSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        globalLFORate = value;
        lfoValue.textContent = value.toFixed(1) + ' Hz';
        
        // Update all active LFO oscillators
        Object.values(activeSounds).forEach(soundInstance => {
            if (soundInstance.lfo) {
                soundInstance.lfo.frequency.value = value;
            }
            // Also update gateLFO for stutter growl
            if (soundInstance.gateLFO) {
                soundInstance.gateLFO.frequency.value = value;
            }
        });
    });
}

// Helper function to create distortion/waveshaper
function createDistortion(amount) {
    const waveshaper = audioContext.createWaveShaper();
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    waveshaper.curve = curve;
    waveshaper.oversample = '4x';
    return waveshaper;
}

// Helper function to ensure masterGain exists
function ensureMasterGain() {
    if (!masterGain && audioContext) {
        masterGain = audioContext.createGain();
        const defaultVolume = volumeSlider ? parseFloat(volumeSlider.value) / 100 : 0.4; // Lowered from 0.7
        masterGain.gain.value = defaultVolume;
        initMasterChain(); // Initialize master processing chain
    }
}

// Active sound instances - stores oscillators and nodes for each sound
const soundInstances = {};

// Sound synthesis functions - Brostep Growl Bass variations
// Each function returns an object with start() and stop() methods for continuous synthesis
// Accepts optional frequency parameter to pitch the growl to match a note
const soundCreators = {
    classic: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Classic FM growl with sawtooth carrier
            const carrier = audioContext.createOscillator();
            const modulator = audioContext.createOscillator();
            const modGain = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(50);
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();

            carrier.type = 'sawtooth';
            carrier.frequency.value = rootFrequency; // Use provided frequency

            modulator.type = 'sine';
            modulator.frequency.value = rootFrequency * 2; // FM ratio 2:1 (scaled to root frequency)
            modGain.gain.value = 100; // Modulation index

            lfo.type = 'sine';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 150; // Moderate modulation amount

            filter.type = 'lowpass';
            filter.frequency.value = 400; // Base frequency
            filter.Q.value = 8; // High resonance

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            carrier.connect(distortion);
            distortion.connect(filter);
            filter.connect(gainNode);

            // Attack envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gainNode.gain.setValueAtTime(0.4, now + 0.1); // Sustain

            gainNode.connect(masterGain);

            carrier.start();
            modulator.start();
            lfo.start();
            
            nodes = { carrier, modulator, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier) nodes.carrier.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier || !nodes.modulator) return;
            const now = audioContext.currentTime;
            const newCarrierFreq = rootFrequency * pitchBendMultiplier;
            const newModulatorFreq = newCarrierFreq * 2; // Maintain 2:1 ratio
            nodes.carrier.frequency.cancelScheduledValues(now);
            nodes.carrier.frequency.setValueAtTime(nodes.carrier.frequency.value, now);
            nodes.carrier.frequency.linearRampToValueAtTime(newCarrierFreq, now + 0.01);
            nodes.modulator.frequency.cancelScheduledValues(now);
            nodes.modulator.frequency.setValueAtTime(nodes.modulator.frequency.value, now);
            nodes.modulator.frequency.linearRampToValueAtTime(newModulatorFreq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    },

    wobble: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Wobble growl with LFO on filter
            const carrier = audioContext.createOscillator();
            const modulator = audioContext.createOscillator();
            const modGain = audioContext.createGain();
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(60);

            carrier.type = 'sawtooth';
            carrier.frequency.value = rootFrequency;

            modulator.type = 'square';
            modulator.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain.gain.value = 80;

            lfo.type = 'sine';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 800; // Wobble amount

            filter.type = 'lowpass';
            filter.frequency.value = 900; // Reduced for dimmer sound
            filter.Q.value = 8; // Reduced for dimmer sound

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            carrier.connect(distortion);
            distortion.connect(filter);
            filter.connect(gainNode);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1); // Reduced for dimmer sound
            gainNode.gain.setValueAtTime(0.2, now + 0.1); // Reduced for dimmer sound

            gainNode.connect(masterGain);

            carrier.start();
            modulator.start();
            lfo.start();
            
            nodes = { carrier, modulator, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier) nodes.carrier.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier || !nodes.modulator) return;
            const now = audioContext.currentTime;
            const newCarrierFreq = rootFrequency * pitchBendMultiplier;
            const newModulatorFreq = newCarrierFreq * 2; // Maintain 2:1 ratio
            nodes.carrier.frequency.cancelScheduledValues(now);
            nodes.carrier.frequency.setValueAtTime(nodes.carrier.frequency.value, now);
            nodes.carrier.frequency.linearRampToValueAtTime(newCarrierFreq, now + 0.01);
            nodes.modulator.frequency.cancelScheduledValues(now);
            nodes.modulator.frequency.setValueAtTime(nodes.modulator.frequency.value, now);
            nodes.modulator.frequency.linearRampToValueAtTime(newModulatorFreq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    },

    roar: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Deep monster roar with rumbling texture (one octave down for deep character)
            const carrier = audioContext.createOscillator();
            const modulator1 = audioContext.createOscillator();
            const modulator2 = audioContext.createOscillator();
            const modGain1 = audioContext.createGain();
            const modGain2 = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(75);
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();

            carrier.type = 'sawtooth';
            carrier.frequency.value = rootFrequency; // Match the root note frequency

            modulator1.type = 'sine';
            modulator1.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain1.gain.value = 80;

            modulator2.type = 'triangle';
            modulator2.frequency.value = rootFrequency / 2; // Very slow modulation for rumble (half the root)
            modGain2.gain.value = 15;

            lfo.type = 'sine';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 200;

            filter.type = 'lowpass';
            filter.frequency.value = 250; // Sustained position
            filter.Q.value = 12; // High resonance for growl

            modulator1.connect(modGain1);
            modGain1.connect(carrier.frequency);
            modulator2.connect(modGain2);
            modGain2.connect(carrier.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            carrier.connect(distortion);
            distortion.connect(filter);
            filter.connect(gainNode);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.45, now + 0.1);
            gainNode.gain.setValueAtTime(0.45, now + 0.1);

            gainNode.connect(masterGain);

            carrier.start();
            modulator1.start();
            modulator2.start();
            lfo.start();
            
            nodes = { carrier, modulator1, modulator2, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier) nodes.carrier.stop();
                if (nodes.modulator1) nodes.modulator1.stop();
                if (nodes.modulator2) nodes.modulator2.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier || !nodes.modulator1 || !nodes.modulator2) return;
            const now = audioContext.currentTime;
            const newCarrierFreq = rootFrequency * pitchBendMultiplier;
            const newModulator1Freq = newCarrierFreq * 2; // Maintain 2:1 ratio
            const newModulator2Freq = newCarrierFreq / 2; // Maintain 1:2 ratio (half speed for rumble)
            nodes.carrier.frequency.cancelScheduledValues(now);
            nodes.carrier.frequency.setValueAtTime(nodes.carrier.frequency.value, now);
            nodes.carrier.frequency.linearRampToValueAtTime(newCarrierFreq, now + 0.01);
            nodes.modulator1.frequency.cancelScheduledValues(now);
            nodes.modulator1.frequency.setValueAtTime(nodes.modulator1.frequency.value, now);
            nodes.modulator1.frequency.linearRampToValueAtTime(newModulator1Freq, now + 0.01);
            nodes.modulator2.frequency.cancelScheduledValues(now);
            nodes.modulator2.frequency.setValueAtTime(nodes.modulator2.frequency.value, now);
            nodes.modulator2.frequency.linearRampToValueAtTime(newModulator2Freq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    },

    beast: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Powerful beast growl with dual oscillators and heavy distortion
            const carrier1 = audioContext.createOscillator();
            const carrier2 = audioContext.createOscillator();
            const modulator1 = audioContext.createOscillator();
            const modulator2 = audioContext.createOscillator();
            const modGain1 = audioContext.createGain();
            const modGain2 = audioContext.createGain();
            const mixer = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(100); // Higher distortion
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();

            carrier1.type = 'sawtooth';
            carrier1.frequency.value = rootFrequency;
            carrier2.type = 'square';
            carrier2.frequency.value = rootFrequency * 1.009; // Slight detune for thickness (~0.9% higher)

            modulator1.type = 'square';
            modulator1.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain1.gain.value = 120; // Higher modulation

            modulator2.type = 'sawtooth';
            modulator2.frequency.value = rootFrequency * 3; // 3:1 ratio for complexity
            modGain2.gain.value = 60;

            // Lowpass filter instead of bandpass for more volume
            filter.type = 'lowpass';
            filter.frequency.value = 900; // Reduced for dimmer sound
            filter.Q.value = 7; // Reduced for dimmer sound

            lfo.type = 'sine';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 800; // Much stronger LFO modulation for noticeable effect

            modulator1.connect(modGain1);
            modGain1.connect(carrier1.frequency);
            modulator2.connect(modGain2);
            modGain2.connect(carrier2.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            carrier1.connect(mixer);
            carrier2.connect(mixer);
            mixer.gain.value = 0.4; // Reduced for dimmer sound
            mixer.connect(distortion);
            distortion.connect(filter);
            filter.connect(gainNode);

            // Reduced gain for dimmer sound
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1); // Reduced for dimmer sound
            gainNode.gain.setValueAtTime(0.25, now + 0.1); // Reduced for dimmer sound

            gainNode.connect(masterGain);

            carrier1.start();
            carrier2.start();
            modulator1.start();
            modulator2.start();
            lfo.start();
            
            nodes = { carrier1, carrier2, modulator1, modulator2, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier1) nodes.carrier1.stop();
                if (nodes.carrier2) nodes.carrier2.stop();
                if (nodes.modulator1) nodes.modulator1.stop();
                if (nodes.modulator2) nodes.modulator2.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier1 || !nodes.carrier2 || !nodes.modulator1 || !nodes.modulator2) return;
            const now = audioContext.currentTime;
            const newCarrier1Freq = rootFrequency * pitchBendMultiplier;
            const newCarrier2Freq = newCarrier1Freq * 1.009; // Maintain detune
            const newModulator1Freq = newCarrier1Freq * 2; // Maintain 2:1 ratio
            const newModulator2Freq = newCarrier1Freq * 3; // Maintain 3:1 ratio
            nodes.carrier1.frequency.cancelScheduledValues(now);
            nodes.carrier1.frequency.setValueAtTime(nodes.carrier1.frequency.value, now);
            nodes.carrier1.frequency.linearRampToValueAtTime(newCarrier1Freq, now + 0.01);
            nodes.carrier2.frequency.cancelScheduledValues(now);
            nodes.carrier2.frequency.setValueAtTime(nodes.carrier2.frequency.value, now);
            nodes.carrier2.frequency.linearRampToValueAtTime(newCarrier2Freq, now + 0.01);
            nodes.modulator1.frequency.cancelScheduledValues(now);
            nodes.modulator1.frequency.setValueAtTime(nodes.modulator1.frequency.value, now);
            nodes.modulator1.frequency.linearRampToValueAtTime(newModulator1Freq, now + 0.01);
            nodes.modulator2.frequency.cancelScheduledValues(now);
            nodes.modulator2.frequency.setValueAtTime(nodes.modulator2.frequency.value, now);
            nodes.modulator2.frequency.linearRampToValueAtTime(newModulator2Freq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    },

    sweep: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Aggressive filter sweep growl
            const carrier = audioContext.createOscillator();
            const modulator = audioContext.createOscillator();
            const modGain = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(60); // Reduced from 65 to prevent clipping
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();

            carrier.type = 'sawtooth';
            carrier.frequency.value = rootFrequency;

            modulator.type = 'square';
            modulator.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain.gain.value = 150; // Sustained modulation

            lfo.type = 'triangle';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 400; // Reduced from 500 to prevent clipping

            filter.type = 'lowpass';
            filter.frequency.value = 400; // Base frequency
            filter.Q.value = 10; // Reduced from 12 to prevent clipping

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            carrier.connect(distortion);
            distortion.connect(filter);
            filter.connect(gainNode);

            // Reduced gain to prevent clipping
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1);
            gainNode.gain.setValueAtTime(0.25, now + 0.1);

            gainNode.connect(masterGain);

            carrier.start();
            modulator.start();
            lfo.start();
            
            nodes = { carrier, modulator, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier) nodes.carrier.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier || !nodes.modulator) return;
            const now = audioContext.currentTime;
            const newCarrierFreq = rootFrequency * pitchBendMultiplier;
            const newModulatorFreq = newCarrierFreq * 2; // Maintain 2:1 ratio
            nodes.carrier.frequency.cancelScheduledValues(now);
            nodes.carrier.frequency.setValueAtTime(nodes.carrier.frequency.value, now);
            nodes.carrier.frequency.linearRampToValueAtTime(newCarrierFreq, now + 0.01);
            nodes.modulator.frequency.cancelScheduledValues(now);
            nodes.modulator.frequency.setValueAtTime(nodes.modulator.frequency.value, now);
            nodes.modulator.frequency.linearRampToValueAtTime(newModulatorFreq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    },

    stutter: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        let gateLFO;
        let gateGain;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Stutter/rhythmic gating growl
            const carrier = audioContext.createOscillator();
            const modulator = audioContext.createOscillator();
            const modGain = audioContext.createGain();
            gainNode = audioContext.createGain();
            gateGain = audioContext.createGain();
            const gateLFOGain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(50); // Reduced from 55 to prevent clipping
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();
            gateLFO = audioContext.createOscillator(); // Separate LFO for gate pattern
            const gateOffset = audioContext.createConstantSource(); // DC offset for gate

            carrier.type = 'sawtooth';
            carrier.frequency.value = rootFrequency;

            modulator.type = 'sine';
            modulator.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain.gain.value = 90;

            lfo.type = 'square';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 400; // Moderate filter modulation

            // Gate LFO - controls the stutter pattern, syncs with global rate
            // Square wave LFO outputs -1 to 1, we want gate gain from 0.1 to 0.7
            gateLFO.type = 'square';
            gateLFO.frequency.value = globalLFORate; // Sync with global LFO rate
            gateLFOGain.gain.value = 0.3; // Scale LFO: 0.3 * (-1 to 1) = -0.3 to 0.3
            gateOffset.offset.value = 0.4; // Center offset: 0.4 + (-0.3 to 0.3) = 0.1 to 0.7

            filter.type = 'lowpass';
            filter.frequency.value = 900; // Further reduced for dimmer sound
            filter.Q.value = 3; // Further reduced for dimmer sound

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            // Gate LFO modulates gateGain for stutter effect
            // Combine LFO with offset to get proper gate pattern
            gateLFO.connect(gateLFOGain);
            gateOffset.connect(gateGain.gain);
            gateLFOGain.connect(gateGain.gain);
            
            carrier.connect(distortion);
            distortion.connect(filter);
            filter.connect(gateGain);
            gateGain.connect(gainNode);

            // Further reduced gain for dimmer sound
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1); // Further reduced for dimmer sound
            gainNode.gain.setValueAtTime(0.1, now + 0.1); // Further reduced for dimmer sound

            gainNode.connect(masterGain);

            carrier.start();
            modulator.start();
            lfo.start();
            gateLFO.start(); // Start gate LFO
            gateOffset.start(); // Start constant source for offset
            
            nodes = { carrier, modulator, lfo, gateLFO, gateOffset, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier) nodes.carrier.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.lfo) nodes.lfo.stop();
                if (nodes.gateLFO) nodes.gateLFO.stop();
                if (nodes.gateOffset) nodes.gateOffset.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier || !nodes.modulator) return;
            const now = audioContext.currentTime;
            const newCarrierFreq = rootFrequency * pitchBendMultiplier;
            const newModulatorFreq = newCarrierFreq * 2; // Maintain 2:1 ratio
            nodes.carrier.frequency.cancelScheduledValues(now);
            nodes.carrier.frequency.setValueAtTime(nodes.carrier.frequency.value, now);
            nodes.carrier.frequency.linearRampToValueAtTime(newCarrierFreq, now + 0.01);
            nodes.modulator.frequency.cancelScheduledValues(now);
            nodes.modulator.frequency.setValueAtTime(nodes.modulator.frequency.value, now);
            nodes.modulator.frequency.linearRampToValueAtTime(newModulatorFreq, now + 0.01);
        };
        
        return { 
            start, 
            stop, 
            updatePitch,
            get lfo() { return lfo; },
            get gateLFO() { return gateLFO; }, // Expose gate LFO for syncing
            get baseFrequency() { return rootFrequency; }
        };
    },

    deep: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Deep low frequency growl with resonance (one octave down for deep character)
            const carrier = audioContext.createOscillator();
            const modulator = audioContext.createOscillator();
            const modGain = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const distortion = createDistortion(40);
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();

            carrier.type = 'sawtooth';
            carrier.frequency.value = rootFrequency; // Match the root note frequency

            modulator.type = 'sine';
            modulator.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain.gain.value = 60; // Less modulation for deeper sound

            lfo.type = 'sine';
            lfo.frequency.value = globalLFORate; // Use global LFO rate
            lfoGain.gain.value = 100; // Subtle modulation for sub frequencies

            filter.type = 'lowpass';
            filter.frequency.value = 300; // Base frequency
            filter.Q.value = 20; // Very high resonance

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            carrier.connect(distortion);
            distortion.connect(filter);
            filter.connect(gainNode);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.45, now + 0.1);
            gainNode.gain.setValueAtTime(0.45, now + 0.1);

            gainNode.connect(masterGain);

            carrier.start();
            modulator.start();
            lfo.start();
            
            nodes = { carrier, modulator, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier) nodes.carrier.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier || !nodes.modulator) return;
            const now = audioContext.currentTime;
            const newCarrierFreq = rootFrequency * pitchBendMultiplier;
            const newModulatorFreq = newCarrierFreq * 2; // Maintain 2:1 ratio
            nodes.carrier.frequency.cancelScheduledValues(now);
            nodes.carrier.frequency.setValueAtTime(nodes.carrier.frequency.value, now);
            nodes.carrier.frequency.linearRampToValueAtTime(newCarrierFreq, now + 0.01);
            nodes.modulator.frequency.cancelScheduledValues(now);
            nodes.modulator.frequency.setValueAtTime(nodes.modulator.frequency.value, now);
            nodes.modulator.frequency.linearRampToValueAtTime(newModulatorFreq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    },

    aggressive: (rootFrequency = 55) => {
        initAudioContext();
        ensureMasterGain();
        
        let nodes = {};
        let gainNode;
        let lfo;
        
        const start = () => {
            const now = audioContext.currentTime;
            
            // Neuro Bass - Classic drum & bass/brostep sound with detuned sawtooths
            // Based on the classic "Reese bass" with neurofunk character
            const carrier1 = audioContext.createOscillator();
            const carrier2 = audioContext.createOscillator();
            const carrier3 = audioContext.createOscillator();
            const modulator = audioContext.createOscillator();
            const modGain = audioContext.createGain();
            const mixer = audioContext.createGain();
            gainNode = audioContext.createGain();
            const filter1 = audioContext.createBiquadFilter();
            const filter2 = audioContext.createBiquadFilter();
            const distortion = createDistortion(55); // Reduced from 70 to prevent clipping
            const compressor = audioContext.createDynamicsCompressor();
            const makeupGain = audioContext.createGain();
            lfo = audioContext.createOscillator();
            const lfoGain = audioContext.createGain();

            // Classic Reese bass: multiple detuned sawtooth oscillators
            carrier1.type = 'sawtooth';
            carrier1.frequency.value = rootFrequency; // Root
            carrier2.type = 'sawtooth';
            carrier2.frequency.value = rootFrequency * 1.0055; // Slight detune for phasing (~0.55% higher)
            carrier3.type = 'sawtooth';
            carrier3.frequency.value = rootFrequency * 0.9945; // Detune the other way (~0.55% lower)

            // Subtle FM modulation for texture
            modulator.type = 'sine';
            modulator.frequency.value = rootFrequency * 2; // 2:1 ratio
            modGain.gain.value = 30; // Light FM for character

            // Neurofunk-style filtering: bandpass for that metallic character
            filter1.type = 'bandpass';
            filter1.frequency.value = 600; // Mid-range focus
            filter1.Q.value = 6; // Reduced from 8 to prevent clipping

            filter2.type = 'lowpass';
            filter2.frequency.value = 2000; // High-end control
            filter2.Q.value = 3; // Reduced from 4 to prevent clipping

            // LFO modulates the bandpass filter for movement
            lfo.type = 'sine';
            lfo.frequency.value = globalLFORate;
            lfoGain.gain.value = 250; // Reduced from 300 to prevent clipping

            // Compressor settings for bass: controls dynamics and allows gain boost
            compressor.threshold.value = -24; // Start compressing at -24dB
            compressor.knee.value = 30; // Soft knee for smooth compression
            compressor.ratio.value = 4; // 4:1 ratio - moderate compression
            compressor.attack.value = 0.003; // Fast attack (3ms) to catch peaks
            compressor.release.value = 0.1; // Quick release (100ms) for bass

            // Makeup gain after compression to boost the signal
            makeupGain.gain.value = 1.8; // Increased from 1.4 for more volume (~5dB boost)

            // Connect FM
            modulator.connect(modGain);
            modGain.connect(carrier1.frequency);
            modGain.connect(carrier2.frequency);
            modGain.connect(carrier3.frequency);

            // Connect LFO to bandpass filter
            lfo.connect(lfoGain);
            lfoGain.connect(filter1.frequency);

            // Mix all carriers
            carrier1.connect(mixer);
            carrier2.connect(mixer);
            carrier3.connect(mixer);
            mixer.gain.value = 0.25; // Reduced from 0.33 to prevent clipping (3 oscillators sum loudly)

            // Signal chain: mixer -> distortion -> bandpass -> lowpass -> compressor -> makeup gain -> gain
            mixer.connect(distortion);
            distortion.connect(filter1);
            filter1.connect(filter2);
            filter2.connect(compressor);
            compressor.connect(makeupGain);
            makeupGain.connect(gainNode);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1); // Increased from 0.22 - compressor prevents clipping
            gainNode.gain.setValueAtTime(0.3, now + 0.1); // Increased from 0.22 - compressor prevents clipping

            gainNode.connect(masterGain);

            carrier1.start();
            carrier2.start();
            carrier3.start();
            modulator.start();
            lfo.start();
            
            nodes = { carrier1, carrier2, carrier3, modulator, lfo, gainNode };
        };
        
        const stop = () => {
            if (!gainNode) return;
            const now = audioContext.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            setTimeout(() => {
                if (nodes.carrier1) nodes.carrier1.stop();
                if (nodes.carrier2) nodes.carrier2.stop();
                if (nodes.carrier3) nodes.carrier3.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.lfo) nodes.lfo.stop();
            }, 300);
        };
        
        const updatePitch = (pitchBendMultiplier) => {
            if (!nodes.carrier1 || !nodes.carrier2 || !nodes.carrier3 || !nodes.modulator) return;
            const now = audioContext.currentTime;
            const newCarrier1Freq = rootFrequency * pitchBendMultiplier;
            const newCarrier2Freq = newCarrier1Freq * 1.0055; // Maintain detune
            const newCarrier3Freq = newCarrier1Freq * 0.9945; // Maintain detune
            const newModulatorFreq = newCarrier1Freq * 2; // Maintain 2:1 ratio
            nodes.carrier1.frequency.cancelScheduledValues(now);
            nodes.carrier1.frequency.setValueAtTime(nodes.carrier1.frequency.value, now);
            nodes.carrier1.frequency.linearRampToValueAtTime(newCarrier1Freq, now + 0.01);
            nodes.carrier2.frequency.cancelScheduledValues(now);
            nodes.carrier2.frequency.setValueAtTime(nodes.carrier2.frequency.value, now);
            nodes.carrier2.frequency.linearRampToValueAtTime(newCarrier2Freq, now + 0.01);
            nodes.carrier3.frequency.cancelScheduledValues(now);
            nodes.carrier3.frequency.setValueAtTime(nodes.carrier3.frequency.value, now);
            nodes.carrier3.frequency.linearRampToValueAtTime(newCarrier3Freq, now + 0.01);
            nodes.modulator.frequency.cancelScheduledValues(now);
            nodes.modulator.frequency.setValueAtTime(nodes.modulator.frequency.value, now);
            nodes.modulator.frequency.linearRampToValueAtTime(newModulatorFreq, now + 0.01);
        };
        
        return { start, stop, updatePitch, get lfo() { return lfo; }, get baseFrequency() { return rootFrequency; } };
    }
};

// Add event listeners to buttons - toggle sounds on/off (only if buttons exist)
document.querySelectorAll('.sound-button').forEach(button => {
    button.addEventListener('click', () => {
        initAudioContext();
        ensureMasterGain();
        const soundType = button.getAttribute('data-sound');
        
        if (activeSounds[soundType]) {
            // Stop the sound
            activeSounds[soundType].stop();
            delete activeSounds[soundType];
            button.classList.remove('active');
        } else {
            // Start the sound
            if (soundCreators[soundType]) {
                const soundInstance = soundCreators[soundType]();
                activeSounds[soundType] = soundInstance;
                soundInstance.start();
                button.classList.add('active');
            }
        }
    });
});

// Expose functions globally for use in other scripts
window.initGrowlAudioContext = initAudioContext;
window.ensureGrowlMasterGain = ensureMasterGain;
window.growlSoundCreators = soundCreators;

