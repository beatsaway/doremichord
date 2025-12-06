// Hi-Hat Drum Module - Realistic hi-hat synthesizer
class HiHat {
    // Preset definitions
    static presets = {
        open: {
            noiseLevel: 50,
            brightness: 20,
            decay: 200,
            volume: 0.7,
            reverbRoomSize: 1,
            reverbDecayTime: 0.6,
            reverbGain: 0.3
        },
        closed: {
            noiseLevel: 50,
            brightness: 20,
            decay: 0.1,
            volume: 0.7,
            reverbRoomSize: 0.02,
            reverbDecayTime: 0.05,
            reverbGain: 0.1
        }
    };

    static parameterNames = {
        noiseLevel: { label: 'Noise Level', min: 0, max: 100, step: 1, default: 100 },
        brightness: { label: 'Brightness', min: 0, max: 100, step: 1, default: 70 },
        decay: { label: 'Decay', min: 20, max: 500, step: 10, default: 200 },
        volume: { label: 'Volume', min: 0, max: 1, step: 0.01, default: 0.7 }
    };

    constructor(preset = 'open', params = {}) {
        this.audioContext = null;
        this.initAudio();
        
        // Get preset defaults
        const presetDefaults = HiHat.presets[preset] || HiHat.presets.open;
        
        // Merge preset defaults with provided params
        this.params = {
            noiseLevel: params.noiseLevel !== undefined ? params.noiseLevel : presetDefaults.noiseLevel,
            brightness: params.brightness !== undefined ? params.brightness : presetDefaults.brightness,
            decay: params.decay !== undefined ? params.decay : presetDefaults.decay,
            volume: params.volume !== undefined ? params.volume : presetDefaults.volume,
            reverbRoomSize: params.reverbRoomSize !== undefined ? params.reverbRoomSize : presetDefaults.reverbRoomSize,
            reverbDecayTime: params.reverbDecayTime !== undefined ? params.reverbDecayTime : presetDefaults.reverbDecayTime,
            reverbGain: params.reverbGain !== undefined ? params.reverbGain : presetDefaults.reverbGain
        };
    }

    initAudio() {
        // Handle Safari
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
    }

    // Helper function to create distortion/waveshaper
    createDistortion(amount) {
        const waveshaper = this.audioContext.createWaveShaper();
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

    // Function to create reverb using ConvolverNode (watersynth-style approach)
    createReverb(roomSize = 0.5, decayTime = 0.3) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * decayTime;
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            // Initial spike
            data[0] = 1;
            data[1] = 0.5;
            
            // Slower exponential decay (watersynth-style: 0.97 multiplier)
            // More presence and smoother tail
            for (let i = 2; i < length; i++) {
                data[i] = (data[i-1] * 0.97) + (Math.random() * 0.02);
                
                // Add discrete echoes for richer reverb (more frequent like watersynth)
                if (i % 5000 === 0) {
                    data[i] += 0.25 * Math.pow(0.8, i/5000);
                }
            }
        }
        
        const convolver = this.audioContext.createConvolver();
        convolver.buffer = buffer;
        return convolver;
    }

    // Function to create white noise with better quality
    createWhiteNoise() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        // Use Box-Muller transform for better Gaussian distribution
        let spare = null;
        let hasSpare = false;
        
        for (let i = 0; i < bufferSize; i++) {
            let val;
            if (hasSpare) {
                hasSpare = false;
                val = spare;
            } else {
                // Box-Muller transform for Gaussian white noise
                const u1 = Math.random();
                const u2 = Math.random();
                const mag = Math.sqrt(-2.0 * Math.log(u1));
                val = mag * Math.cos(2.0 * Math.PI * u2);
                spare = mag * Math.sin(2.0 * Math.PI * u2);
                hasSpare = true;
            }
            // Normalize and scale to -1 to 1 range
            output[i] = Math.max(-1, Math.min(1, val * 0.3));
        }
        
        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;
        
        return whiteNoise;
    }

    play() {
        const now = this.audioContext.currentTime;
        const duration = Math.max(0.1, this.params.decay / 1000); // Convert ms to seconds
        
        // Get parameter values from instance
        const noiseLevel = this.params.noiseLevel / 100;
        const brightness = this.params.brightness / 100;
        const volume = this.params.volume;
        
        // === MASTER CHAIN: Compressor -> Distortion -> Destination ===
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        
        const masterCompressor = this.audioContext.createDynamicsCompressor();
        masterCompressor.threshold.value = -20;
        masterCompressor.knee.value = 30;
        masterCompressor.ratio.value = 12; // Higher ratio for more compression
        masterCompressor.attack.value = 0.001;
        masterCompressor.release.value = 0.05;
        
        // Add distortion for punchy character (moderate amount for hi-hats)
        const masterDistortion = this.createDistortion(20);
        
        masterGain.connect(masterCompressor);
        masterCompressor.connect(masterDistortion);
        masterDistortion.connect(this.audioContext.destination);
        
        // === WHITE NOISE: Main hi-hat component ===
        const whiteNoise = this.createWhiteNoise();
        
        // Hi-hat envelope: extremely sharp attack, exponential decay
        const attackTime = 0.001; // Very fast attack
        const decayTime = duration * 0.3; // Quick initial decay
        const releaseTime = duration * 0.7; // Longer release tail
        
        const noiseEnvelope = this.audioContext.createGain();
        noiseEnvelope.gain.setValueAtTime(0, now);
        noiseEnvelope.gain.linearRampToValueAtTime(1, now + attackTime); // Sharp attack
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.3, now + attackTime + decayTime); // Quick decay
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime + releaseTime); // Long release
        
        // High-pass filter to remove low frequencies (hi-hats are bright)
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 8000; // Focus on high frequencies
        highpass.Q.value = 0.7;
        
        // Bandpass filter for brightness control (characteristic hi-hat frequencies)
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        // Brightness controls the center frequency: 8kHz to 12kHz
        const centerFreq = 8000 + (brightness * 40); // 8kHz to 12kHz range
        bandpass.frequency.value = centerFreq;
        bandpass.Q.value = 2.0; // Narrow Q for focused sound
        
        // Lowpass filter for smooth rolloff (prevents harshness)
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 16000; // Cut very high frequencies
        lowpass.Q.value = 0.5;
        
        // Create reverb for spatial depth
        const reverb = this.createReverb(this.params.reverbRoomSize, this.params.reverbDecayTime);
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = this.params.reverbGain;
        
        // Connect noise path: noise -> highpass -> bandpass -> lowpass -> envelope
        whiteNoise.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(lowpass);
        lowpass.connect(noiseEnvelope);
        
        // Dry path (direct to master)
        const noiseDryGain = this.audioContext.createGain();
        noiseDryGain.gain.value = noiseLevel;
        noiseEnvelope.connect(noiseDryGain);
        noiseDryGain.connect(masterGain);
        
        // Wet path (through reverb)
        noiseEnvelope.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(masterGain);
        
        // Start noise
        whiteNoise.start(now);
        whiteNoise.stop(now + duration + 0.1);
    }
}

// Make HiHat available globally
window.HiHat = HiHat;

// Convenience aliases for backward compatibility
window.OpenHat = class extends HiHat {
    constructor(params = {}) {
        super('open', params);
    }
};

window.ClosedHat = class extends HiHat {
    constructor(params = {}) {
        super('closed', params);
    }
};

