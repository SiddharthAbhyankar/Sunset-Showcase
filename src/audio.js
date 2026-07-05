// Ambient dusk soundscape synthesized with WebAudio — a warm slow pad
// plus filtered noise swelling like distant surf. No audio files needed.

export class Ambient {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.playing = false;
  }

  build() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // --- warm pad: detuned low sines through a slowly breathing lowpass ---
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 420;
    padFilter.Q.value = 0.6;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.055;
    padFilter.connect(padGain).connect(master);

    const notes = [
      { freq: 110.0, type: 'sine', gain: 1.0 },   // A2
      { freq: 110.8, type: 'sine', gain: 0.8 },   // slow beat against A2
      { freq: 164.8, type: 'triangle', gain: 0.35 }, // E3
      { freq: 220.9, type: 'sine', gain: 0.22 },  // shimmering octave
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      osc.type = n.type;
      osc.frequency.value = n.freq;
      const g = ctx.createGain();
      g.gain.value = n.gain;
      osc.connect(g).connect(padFilter);
      osc.start();
    }

    // filter breathes
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(padFilter.frequency);
    lfo.start();

    // --- surf: looped noise with a slow tidal swell ---
    const dur = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 480;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    const swell = ctx.createOscillator();
    swell.frequency.value = 0.07;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.009;
    swell.connect(swellGain).connect(noiseGain.gain);
    swell.start();
  }

  toggle(on) {
    if (on && !this.ctx) this.build();
    if (!this.ctx) return;
    this.playing = on;

    clearTimeout(this._suspendT);
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);

    if (on) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      g.linearRampToValueAtTime(1, now + 1.6);
    } else {
      // fade out, then hard-suspend so nothing is audible while off
      g.linearRampToValueAtTime(0, now + 0.4);
      this._suspendT = setTimeout(() => {
        if (!this.playing && this.ctx.state === 'running') this.ctx.suspend();
      }, 480);
    }
  }
}
