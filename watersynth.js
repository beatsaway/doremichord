// Water Synthesizer
class WaterSynth {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create audio graph - split into dry and wet (reverb) paths
        this.reverb = this.audioContext.createConvolver();
        this.globalEQ = this.audioContext.createBiquadFilter();
        this.masterGain = this.audioContext.createGain();
        this.reverbGain = this.audioContext.createGain();
        this.dryGain = this.audioContext.createGain();
        
        // Configure EQ for natural high-end rolloff
        this.globalEQ.type = 'lowpass';
        this.globalEQ.frequency.value = 15000; // Higher cutoff for clearer tones
        this.globalEQ.Q.value = 0.7;

        // Connect dry path (main signal - clearer)
        this.masterGain.connect(this.dryGain);
        this.dryGain.connect(this.audioContext.destination);
        this.dryGain.gain.value = 0.3; // Less dry signal for more reverb
        
        // Connect wet path (reverb - very loud reverb)
        this.masterGain.connect(this.globalEQ);
        this.globalEQ.connect(this.reverb);
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.audioContext.destination);
        this.reverbGain.gain.value = 1.0; // Very loud reverb
        
        this.masterGain.gain.value = 0.5;

        // Initialize reverb with shorter, lighter response
        this.reverb.buffer = this.createImpulseResponse();
    }

    // Generate synthetic impulse response for reverb (longer tail for more reverb)
    createImpulseResponse() {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2.0; // 2-second impulse response (much longer tail)
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            // Initial spike
            data[0] = 1;
            data[1] = 0.5;
            
            // Much slower exponential decay for very long reverb tail
            for (let i = 2; i < length; i++) {
                data[i] = (data[i-1] * 0.97) + (Math.random() * 0.02); // Very slow decay, more presence
                
                // Add discrete echoes (more frequent for richer reverb)
                if (i % 5000 === 0) {
                    data[i] += 0.25 * Math.pow(0.8, i/5000);
                }
            }
        }
        return buffer;
    }

    // Create a droplet sound with natural variations
    createDroplet(baseFreq = null, pitchDrop = null, decayTime = null, noiseAmount = null, reverbAmount = null) {
        const now = this.audioContext.currentTime;
        
        // Use provided parameters or generate random ones with natural variations
        const finalBaseFreq = baseFreq || (600 + Math.random() * 1400);
        const finalDecayTime = decayTime || (0.2 + Math.random() * 0.5);
        const finalPitchDrop = pitchDrop || (500 + Math.random() * 1500);
        const finalNoiseAmount = noiseAmount || (0.1 + Math.random() * 0.3);
        
        // Main oscillator with faster pitch drop
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(finalBaseFreq + finalPitchDrop, now);
        osc.frequency.exponentialRampToValueAtTime(finalBaseFreq, now + 0.05);

        // Amplitude envelope
        const gain = this.audioContext.createGain();
        gain.gain.setValueCurveAtTime(
            new Float32Array([0, 0.5, 0.4, 0.3, 0]),
            now,
            finalDecayTime
        );

        // Noise component
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, 2048, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 2048; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/2048, 2);
        }
        noise.buffer = noiseBuffer;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(finalNoiseAmount, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Connect nodes
        osc.connect(gain).connect(this.masterGain);
        noise.connect(noiseGain).connect(this.masterGain);

        // Start/stop
        osc.start(now);
        noise.start(now);
        osc.stop(now + finalDecayTime + 0.2);
        noise.stop(now + 0.15);
    }

    // Play a note using the water droplet synthesis
    playNote(frequency, duration, pitchDrop = 0.2, decayTime = 0.2, noiseAmount = 0.2, reverbAmount = 0.7) {
        const now = this.audioContext.currentTime;
        
        // Add natural variations to the parameters
        const finalPitchDrop = frequency * (pitchDrop + Math.random() * 0.1);
        const finalDecayTime = decayTime * (0.8 + Math.random() * 0.4);
        const finalNoiseAmount = noiseAmount * (0.8 + Math.random() * 0.4);
        
        // Main oscillator with faster pitch drop
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency + finalPitchDrop, now);
        osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.05);

        // Amplitude envelope
        const gain = this.audioContext.createGain();
        gain.gain.setValueCurveAtTime(
            new Float32Array([0, 0.5, 0.4, 0.3, 0]),
            now,
            finalDecayTime
        );

        // Noise component
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, 2048, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 2048; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/2048, 2);
        }
        noise.buffer = noiseBuffer;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(finalNoiseAmount, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Connect nodes
        osc.connect(gain).connect(this.masterGain);
        noise.connect(noiseGain).connect(this.masterGain);

        // Start/stop
        osc.start(now);
        noise.start(now);
        osc.stop(now + finalDecayTime);
        noise.stop(now + 0.15);
        
        return osc;
    }

    // Create a sustained note that can be controlled (for startNote/stopNote pattern)
    createSustainedNote(frequency, pitchDrop = 0.02, noiseAmount = 0.03) {
        const now = this.audioContext.currentTime;
        
        // Much smaller variations for clearer tones
        const finalPitchDrop = frequency * (pitchDrop + Math.random() * 0.02); // Reduced from 0.08+0.07 to 0.02+0.02
        const finalNoiseAmount = noiseAmount * (0.8 + Math.random() * 0.4); // Reduced from 0.15 to 0.03
        
        // Main oscillator with subtle pitch drop on attack
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency + finalPitchDrop, now);
        osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.08); // Faster, shorter pitch drop
        
        // Gain node for envelope control
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        
        // Attack and sustain envelope - clearer attack
        const attackTime = 0.02; // Faster attack
        gain.gain.linearRampToValueAtTime(0.4, now + attackTime); // Higher peak
        gain.gain.linearRampToValueAtTime(0.5, now + attackTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.15); // Higher sustain level
        
        // Noise component - much quieter
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, 2048, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 2048; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/2048, 2);
        }
        noise.buffer = noiseBuffer;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(finalNoiseAmount, now + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Shorter noise tail
        
        // Optional stereo panning - less panning for clearer chords
        const panNode = this.audioContext.createStereoPanner();
        panNode.pan.value = (Math.random() - 0.5) * 0.15; // Reduced from 0.3
        
        // Connect: osc -> gain -> pan -> masterGain
        osc.connect(gain);
        gain.connect(panNode);
        panNode.connect(this.masterGain);
        
        // Connect noise
        noise.connect(noiseGain);
        noiseGain.connect(panNode);
        
        // Start
        osc.start(now);
        noise.start(now);
        noise.stop(now + 0.15); // Shorter noise
        
        return { oscillator: osc, gainNode: gain, panNode: panNode, noise: noise, noiseGain: noiseGain };
    }
} 