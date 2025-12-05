// Snare Drum Module
class SnareDrum {
    static parameterNames = {
        noiseLevel: { label: 'Noise Level', min: 0, max: 200, step: 1, default: 150 },
        oscLevel: { label: 'Oscillator Level', min: 0, max: 200, step: 1, default: 100 },
        thudLevel: { label: 'Thud Level', min: 0, max: 300, step: 1, default: 240 },
        oscFreq: { label: 'Oscillator Frequency', min: 100, max: 1000, step: 10, default: 170 },
        duration: { label: 'Duration', min: 50, max: 300, step: 10, default: 50 },
        volume: { label: 'Volume', min: 0, max: 1, step: 0.01, default: 1 }
    };

    constructor(params = {}) {
        this.audioContext = null;
        this.initAudio();
        
        // Default parameters
        this.params = {
            noiseLevel: params.noiseLevel || 150,
            oscLevel: params.oscLevel || 100,
            thudLevel: params.thudLevel !== undefined ? params.thudLevel : 240,
            oscFreq: params.oscFreq || 170,
            duration: params.duration || 50,
            volume: params.volume || 1
        };
    }

    initAudio() {
        // Handle Safari
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
    }

    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    play() {
        const now = this.audioContext.currentTime;
        
        // Read parameter values from instance
        const noiseLevel = this.params.noiseLevel / 100;
        const oscLevel = this.params.oscLevel / 100;
        const thudLevel = this.params.thudLevel / 100;
        const oscFreq = this.params.oscFreq;
        const duration = this.params.duration / 1000;
        const volume = this.params.volume;
        
        // Create master gain node with compression for strength
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        
        // Add compressor for stronger, punchier sound
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 30;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.1;
        
        masterGain.connect(compressor);
        compressor.connect(this.audioContext.destination);
        
        // === THUD: Low frequency body ===
        if (thudLevel > 0) {
            const thudOsc = this.audioContext.createOscillator();
            thudOsc.type = 'sine';
            thudOsc.frequency.value = 150; // Low frequency thud
            
            // Thud filter to add character
            const thudFilter = this.audioContext.createBiquadFilter();
            thudFilter.type = 'lowpass';
            thudFilter.frequency.value = 300;
            thudFilter.Q.value = 1;
            
            // Thud envelope: quick attack, fast decay
            const thudGain = this.audioContext.createGain();
            thudGain.gain.setValueAtTime(0, now);
            thudGain.gain.linearRampToValueAtTime(thudLevel * 0.6, now + 0.001);
            thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            
            thudOsc.connect(thudFilter);
            thudFilter.connect(thudGain);
            thudGain.connect(masterGain);
            
            thudOsc.start(now);
            thudOsc.stop(now + duration + 0.1);
        }
        
        // Create the noise component (stronger)
        const noiseBuffer = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Create a bandpass filter for the noise
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 4000;
        noiseFilter.Q.value = 1;
        
        // Create gain node for noise component (increased level)
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(noiseLevel * 1.2, now + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Create oscillator component (stronger)
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = oscFreq;
        
        // Create gain node for oscillator component (increased level)
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(oscLevel * 1.1, now + 0.005);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);
        
        // Connect the noise path
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        // Connect the oscillator path
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        
        // Start and stop
        noiseSource.start(now);
        osc.start(now);
        
        noiseSource.stop(now + duration + 0.1);
        osc.stop(now + duration + 0.1);
    }
}

// Make SnareDrum available globally
window.SnareDrum = SnareDrum; 