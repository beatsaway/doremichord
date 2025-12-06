// Clap Module
class Clap {
    static parameterNames = {
        spacing: { label: 'Spacing', min: 5, max: 30, step: 1, default: 10 },
        decay: { label: 'Decay', min: 40, max: 150, step: 1, default: 30 },
        reverbDecay: { label: 'Reverb Decay', min: 200, max: 900, step: 10, default: 500 },
        filterFreq: { label: 'Filter Frequency', min: 1000, max: 3000, step: 100, default: 2000 },
        filterQ: { label: 'Filter Q', min: 0.1, max: 10, step: 0.1, default: 0.1 },
        volume: { label: 'Volume', min: 0, max: 1, step: 0.01, default: 0.5 }
    };

    constructor(params = {}) {
        this.audioContext = null;
        this.initAudio();
        
        // Default parameters
        this.params = {
            spacing: params.spacing || 10,
            decay: params.decay || 30,
            reverbDecay: params.reverbDecay || 50,
            filterFreq: params.filterFreq || 2000,
            filterQ: params.filterQ || 0.1,
            volume: params.volume || 0.5
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
        
        // Get parameters from instance
        const spacing = this.params.spacing;
        const decay = this.params.decay / 1000;
        const reverbDecay = this.params.reverbDecay / 1000;
        const filterFreq = this.params.filterFreq;
        const filterQ = this.params.filterQ;
        const volume = this.params.volume;
        
        // Master gain node
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create bandpass filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = filterQ;
        filter.connect(masterGain);
        
        // Create 4 claps with different timings
        for (let i = 0; i < 4; i++) {
            const startTime = now + (spacing * i) / 1000;
            const clapDecay = i === 3 ? reverbDecay : decay; // Last clap has longer decay
            
            // Create noise source
            const noiseBuffer = this.createNoiseBuffer();
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            // Create envelope for the clap
            const clapGain = this.audioContext.createGain();
            clapGain.gain.setValueAtTime(0, startTime);
            clapGain.gain.linearRampToValueAtTime(0.3, startTime + 0.001);
            clapGain.gain.exponentialRampToValueAtTime(0.001, startTime + clapDecay);
            
            // Connect nodes
            noiseSource.connect(clapGain);
            clapGain.connect(filter);
            
            // Start noise
            noiseSource.start(startTime);
            noiseSource.stop(startTime + clapDecay + 0.05);
        }
    }
}

// Make Clap available globally
window.Clap = Clap; 