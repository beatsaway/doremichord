// Sound Manager for Drum Emojis
class SoundManager {
    constructor() {
        this.kick = null;
        this.snare = null;
        this.hihat = null;
        this.clap = null;
        this.openHat = null;
        this.closedHat = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Initialize drum sounds
        if (window.KickDrum) {
            this.kick = new KickDrum();
            console.log('Kick initialized');
        } else {
            console.warn('KickDrum class not found');
        }
        if (window.SnareDrum) {
            this.snare = new SnareDrum();
            console.log('Snare initialized');
        } else {
            console.warn('SnareDrum class not found');
        }
        if (window.Pin) {
            this.hihat = new Pin();
            console.log('Pin initialized');
        } else {
            console.warn('Pin class not found');
        }
        if (window.Clap) {
            this.clap = new Clap();
            console.log('Clap initialized');
        } else {
            console.warn('Clap class not found');
        }
        if (window.OpenHat) {
            this.openHat = new OpenHat();
            console.log('OpenHat initialized');
        } else {
            console.warn('OpenHat class not found');
        }
        if (window.ClosedHat) {
            this.closedHat = new ClosedHat();
            console.log('ClosedHat initialized');
        } else {
            console.warn('ClosedHat class not found');
        }
        
        this.initialized = true;
        console.log('SoundManager initialized');
    }

    async playSound(emoji) {
        // Ensure audio context is initialized (required for user interaction)
        if (!this.initialized) {
            this.init();
        }

        // Resume audio contexts if suspended (required for autoplay policies)
        const contexts = [];
        if (this.kick && this.kick.audioContext) contexts.push(this.kick.audioContext);
        if (this.snare && this.snare.audioContext) contexts.push(this.snare.audioContext);
        if (this.hihat && this.hihat.audioContext) contexts.push(this.hihat.audioContext);
        if (this.clap && this.clap.audioContext) contexts.push(this.clap.audioContext);
        if (this.openHat && this.openHat.audioContext) contexts.push(this.openHat.audioContext);
        if (this.closedHat && this.closedHat.audioContext) contexts.push(this.closedHat.audioContext);
        
        // Resume all suspended contexts
        const resumePromises = contexts
            .filter(ctx => ctx.state === 'suspended')
            .map(ctx => ctx.resume());
        
        if (resumePromises.length > 0) {
            await Promise.all(resumePromises);
        }

        // Map emojis to sounds
        switch(emoji) {
            case '🌋':
                if (this.kick) {
                    this.kick.play();
                }
                break;
            case '🤯':
                if (this.snare) {
                    this.snare.play();
                }
                break;
            case '🪡':
                if (this.hihat) {
                    this.hihat.play();
                }
                break;
            case '🖐':
                if (this.clap) {
                    this.clap.play();
                }
                break;
            case '🫨':
                if (this.openHat) {
                    this.openHat.play();
                }
                break;
            case '🤏':
                if (this.closedHat) {
                    this.closedHat.play();
                }
                break;
            default:
                console.warn('Unknown emoji for sound:', emoji);
        }
    }
}

// Create global sound manager instance
const soundManager = new SoundManager();
window.soundManager = soundManager;
