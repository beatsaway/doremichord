// Kick Drum Module
class KickDrum {
    static parameterNames = {
        initialFreq: { label: 'Initial Frequency', min: 20, max: 300, step: 1, default: 238 },
        freqDecay: { label: 'Frequency Decay', min: 100, max: 500, step: 1, default: 200 },
        duration: { label: 'Duration', min: 100, max: 1000, step: 10, default: 500 },
        clickLevel: { label: 'Click Level', min: 0, max: 100, step: 1, default: 11 },
        clickDuration: { label: 'Click Duration', min: 10, max: 100, step: 1, default: 37 },
        volume: { label: 'Volume', min: 0, max: 1, step: 0.01, default: 0.7 }
    };

    constructor(params = {}) {
        this.audioContext = null;
        this.initAudio();
        
        // Default parameters
        this.params = {
            initialFreq: params.initialFreq || 238,
            freqDecay: params.freqDecay || 200,
            duration: params.duration || 500,
            clickLevel: params.clickLevel || 11,
            clickDuration: params.clickDuration || 37,
            volume: params.volume || 0.7
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
        const initialFreq = this.params.initialFreq;
        const freqDecay = this.params.freqDecay / 1000;
        const duration = this.params.duration / 1000;
        const clickLevel = this.params.clickLevel / 100;
        const clickDuration = this.params.clickDuration / 1000;
        const volume = this.params.volume;
        
        // Create master gain node for volume control
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create oscillator for the main tone
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(initialFreq, now);
        
        // Exponential frequency ramp down
        osc.frequency.exponentialRampToValueAtTime(1, now + freqDecay);
        
        // Create gain node for amplitude envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Create noise component for the click/snap
        const noiseBuffer = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Create a bandpass filter for the noise
        const clickFilter = this.audioContext.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.value = 6000;
        clickFilter.Q.value = 1.5;
        
        // Create gain node for the click sound
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(clickLevel, now + 0.001);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickDuration);
        
        // Connect nodes
        osc.connect(gainNode);
        gainNode.connect(masterGain);
        
        noiseSource.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(masterGain);
        
        // Start and stop
        osc.start(now);
        noiseSource.start(now);
        
        osc.stop(now + duration + 0.1);
        noiseSource.stop(now + duration + 0.1);
    }
}

// Make KickDrum available globally
window.KickDrum = KickDrum; 