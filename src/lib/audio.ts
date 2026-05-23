export class AudioSystem {
  static audioCtx: AudioContext | null = null;

  static init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  static playDiceRoll() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    
    // Simulate dice rattle (noise)
    const dur = 0.3;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + dur);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + dur);
  }

  static playMove() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    // Pop sound
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  static playCut() {
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      // sharp descending sound
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
  }

  static playWin() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const playNote = (freq: number, time: number) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(time);
        osc.stop(time + 0.3);
    };
    playNote(440, t); // A4
    playNote(554.37, t + 0.15); // C#5
    playNote(659.25, t + 0.3); // E5
    playNote(880, t + 0.45); // A5
  }
}
