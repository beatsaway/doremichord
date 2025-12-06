// Pin Module
class Pin {
    static parameterNames = {
        freq1: { label: 'Frequency 1', min: 1000, max: 15000, step: 100, default: 8000 },
        freq2: { label: 'Frequency 2', min: 1000, max: 15000, step: 100, default: 10000 },
        duration: { label: 'Duration', min: 20, max: 150, step: 1, default: 50 },
        release: { label: 'Release', min: 10, max: 100, step: 1, default: 30 },
        filterFreq: { label: 'Filter Frequency', min: 1000, max: 10000, step: 100, default: 5000 },
        filterQ: { label: 'Filter Q', min: 0.1, max: 10, step: 0.1, default: 1 },
        volume: { label: 'Volume', min: 0, max: 1, step: 0.01, default: 0.3 }
    };

    constructor(params = {}) {
        this.audioContext = null;
        this.initAudio();
        
        // Default parameters
        this.params = {
            freq1: params.freq1 || 8000,
            freq2: params.freq2 || 10000,
            duration: params.duration || 50,
            release: params.release || 30,
            filterFreq: params.filterFreq || 5000,
            filterQ: params.filterQ || 1,
            volume: params.volume || 0.3
        };
    }

    initAudio() {
        // Handle Safari
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
    }

    // Create pink noise buffer (1/f noise)
    createPinkNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Pink noise algorithm (Voss-McCartney)
        let r = 0;
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            // Generate white noise
            const white = Math.random() * 2 - 1;
            
            // Update the running sums
            b0 = (b0 * 0.99829) + (white * 0.00171);
            b1 = (b1 * 0.99829) + (b0 * 0.00171);
            b2 = (b2 * 0.99829) + (b1 * 0.00171);
            b3 = (b3 * 0.99829) + (b2 * 0.00171);
            b4 = (b4 * 0.99829) + (b3 * 0.00171);
            b5 = (b5 * 0.99829) + (b4 * 0.00171);
            b6 = (b6 * 0.99829) + (b5 * 0.00171);
            
            // Combine the running sums to create pink noise
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6) * 0.15;
        }
        
        return buffer;
    }

    play() {
        const now = this.audioContext.currentTime;
        
        // Get parameters from instance
        const freq1 = this.params.freq1;
        const freq2 = this.params.freq2;
        const duration = this.params.duration / 1000;
        const release = this.params.release / 1000;
        const filterFreq = this.params.filterFreq;
        const filterQ = this.params.filterQ;
        const volume = this.params.volume;
        
        // Create master gain
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = filterQ;
        filter.connect(masterGain);
        
        // Create noise source
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Create noise envelope
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        // Create oscillators
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = freq1;
        osc2.frequency.value = freq2;
        
        // Create oscillator envelopes
        const oscGain1 = this.audioContext.createGain();
        const oscGain2 = this.audioContext.createGain();
        oscGain1.gain.setValueAtTime(0, now);
        oscGain2.gain.setValueAtTime(0, now);
        oscGain1.gain.linearRampToValueAtTime(0.3, now + 0.001);
        oscGain2.gain.linearRampToValueAtTime(0.3, now + 0.001);
        oscGain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
        oscGain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        // Connect nodes
        noiseSource.connect(noiseGain);
        noiseGain.connect(filter);
        
        osc1.connect(oscGain1);
        osc2.connect(oscGain2);
        oscGain1.connect(filter);
        oscGain2.connect(filter);
        
        // Start sources
        noiseSource.start(now);
        noiseSource.stop(now + duration + release);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + release);
        osc2.stop(now + duration + release);
    }
}

// Make Pin available globally
window.Pin = Pin; 