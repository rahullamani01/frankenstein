// Audio engine using Web Audio API for calm, native offline playback simulation
class CalmAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isRunning: boolean = false;
  private volume: number = 0.7;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume * 0.15, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playTrack(trackSeed: number) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      this.stop();

      // Peaceful base frequencies for acoustic ambient warmth (e.g. D major / A minor pentatonic)
      const baseFreqs = [146.83, 164.81, 196.0, 220.0, 261.63, 293.66];
      const base = baseFreqs[Math.abs(trackSeed) % baseFreqs.length];

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.setValueAtTime(base, this.ctx.currentTime);

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(base * 1.5, this.ctx.currentTime); // Perfect fifth

      this.osc3 = this.ctx.createOscillator();
      this.osc3.type = 'triangle';
      this.osc3.frequency.setValueAtTime(base * 2.0, this.ctx.currentTime); // Octave

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 1.2);

      this.osc1.connect(this.filter);
      this.osc2.connect(this.filter);
      this.osc3.connect(this.filter);
      this.filter.connect(oscGain);
      oscGain.connect(this.masterGain);

      this.osc1.start();
      this.osc2.start();
      this.osc3.start();
      this.isRunning = true;
    } catch {
      // AudioContext might be blocked until user gesture, graceful fallback
    }
  }

  public pause() {
    if (this.ctx && this.isRunning) {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      setTimeout(() => {
        this.stop();
      }, 150);
    }
  }

  public resume(trackSeed: number) {
    if (!this.isRunning) {
      this.playTrack(trackSeed);
    }
  }

  public stop() {
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
        this.osc1 = null;
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
        this.osc2 = null;
      }
      if (this.osc3) {
        this.osc3.stop();
        this.osc3.disconnect();
        this.osc3 = null;
      }
      if (this.filter) {
        this.filter.disconnect();
        this.filter = null;
      }
    } catch {
      // Ignore
    }
    this.isRunning = false;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.15, this.ctx.currentTime, 0.05);
    }
  }
}

export const audioEngine = new CalmAudioEngine();
