import type { SfxKind } from "@/lib/escape-room/puzzle";

// 외부 음원 없이 Web Audio로 합성하는 배경음과 효과음.
// 잔잔한 패드 + 바람 소리 + 드문드문 울리는 종소리로 몰입감을 만들고, 조작마다 짧은 피드백을 줍니다.

type Voice = { osc: OscillatorNode[]; gain: GainNode };

const CHORDS = [
  [110, 164.81, 261.63, 329.63], // Am(add9 느낌)
  [87.31, 130.81, 220, 329.63], // Fmaj7
  [98, 146.83, 246.94, 293.66], // G6
  [82.41, 123.47, 207.65, 329.63], // E
];

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

export class EscapeAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private padVoices: Voice[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private timers: number[] = [];
  private musicOn = true;
  private enabled = true;
  private started = false;
  private chordIndex = 0;

  private ensure() {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? webkitWindow.webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(ctx, 3.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = this.musicOn ? 0.5 : 0;
    this.music.connect(this.master);
    this.music.connect(this.reverb);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.8;
    this.sfx.connect(this.master);
    const sfxSend = ctx.createGain();
    sfxSend.gain.value = 0.25;
    this.sfx.connect(sfxSend).connect(this.reverb);

    const length = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  private impulse(ctx: AudioContext, seconds: number, decay: number) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  /** 사용자 제스처 안에서 호출해야 브라우저가 소리를 허용합니다. */
  start() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    if (this.started) return;
    this.started = true;
    this.startPad();
    this.startWind();
    this.scheduleChime();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? 0.9 : 0, this.ctx.currentTime, 0.08);
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.music && this.ctx) {
      this.music.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.4);
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended" && this.started) void this.ctx.resume();
  }

  private startPad() {
    const ctx = this.ctx;
    const music = this.music;
    if (!ctx || !music) return;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    filter.connect(music);

    this.padVoices = CHORDS[0].map((frequency) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const oscs = [-6, 6].map((detune) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      gain.connect(filter);
      gain.gain.setTargetAtTime(0.028, ctx.currentTime, 2.5);
      return { osc: oscs, gain };
    });

    const advance = () => {
      if (!this.ctx) return;
      this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
      const chord = CHORDS[this.chordIndex];
      const now = this.ctx.currentTime;
      this.padVoices.forEach((voice, index) => {
        voice.osc.forEach((osc) => osc.frequency.setTargetAtTime(chord[index], now, 1.8));
      });
      this.timers.push(window.setTimeout(advance, 14000));
    };
    this.timers.push(window.setTimeout(advance, 14000));
  }

  private startWind() {
    const ctx = this.ctx;
    const music = this.music;
    if (!ctx || !music || !this.noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 380;
    band.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain).connect(gain.gain);
    const bandLfo = ctx.createOscillator();
    const bandLfoGain = ctx.createGain();
    bandLfo.frequency.value = 0.031;
    bandLfoGain.gain.value = 160;
    bandLfo.connect(bandLfoGain).connect(band.frequency);
    lfo.start();
    bandLfo.start();
    source.connect(band).connect(gain).connect(music);
    source.start();
  }

  private scheduleChime() {
    const next = 6000 + Math.random() * 9000;
    this.timers.push(
      window.setTimeout(() => {
        if (this.ctx && this.musicOn) {
          const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
          this.bell(note, 0.035, 3.5, this.music);
          if (Math.random() < 0.45) {
            const second = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
            window.setTimeout(() => this.bell(second, 0.025, 3.2, this.music), 420);
          }
        }
        this.scheduleChime();
      }, next),
    );
  }

  private bell(frequency: number, level: number, duration: number, target: AudioNode | null) {
    const ctx = this.ctx;
    if (!ctx || !target) return;
    const now = ctx.currentTime;
    [1, 2.76, 5.4].forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency * ratio;
      const peak = level / (index * 1.8 + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / (index + 1));
      osc.connect(gain).connect(target);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  private tone(
    frequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    level: number,
    delay = 0,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.sfx);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private noise(duration: number, frequency: number, q: number, level: number, delay = 0, sweepTo?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || !this.noiseBuffer) return;
    const now = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, now);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + Math.min(0.03, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.sfx);
    source.start(now, Math.random());
    source.stop(now + duration + 0.05);
  }

  play(kind: SfxKind) {
    const ctx = this.ensure();
    if (!ctx || !this.enabled) return;
    if (ctx.state === "suspended") void ctx.resume();
    switch (kind) {
      case "click":
        this.tone(1800, 900, 0.04, "triangle", 0.06);
        this.noise(0.03, 3000, 2, 0.05);
        break;
      case "pickup":
        [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => this.tone(f, f, 0.22, "sine", 0.07, i * 0.06));
        this.bell(1318.5, 0.04, 1.4, this.sfx);
        break;
      case "unlock":
        this.noise(0.08, 900, 3, 0.25);
        this.tone(160, 80, 0.12, "square", 0.08, 0.02);
        this.noise(0.06, 2400, 5, 0.18, 0.14);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          window.setTimeout(() => this.bell(f, 0.05, 1.8, this.sfx), 160 + i * 70),
        );
        break;
      case "locked":
        this.noise(0.1, 500, 4, 0.22);
        this.tone(120, 70, 0.14, "triangle", 0.12);
        break;
      case "error":
        this.tone(220, 200, 0.14, "square", 0.05);
        this.tone(165, 150, 0.2, "square", 0.05, 0.15);
        break;
      case "drawer":
        this.noise(0.55, 700, 1.5, 0.16, 0, 300);
        this.tone(90, 60, 0.12, "triangle", 0.1, 0.5);
        break;
      case "dial":
        this.noise(0.035, 4200, 8, 0.18);
        this.noise(0.03, 2600, 6, 0.12, 0.05);
        break;
      case "book":
        this.noise(0.28, 1200, 1.2, 0.13, 0, 500);
        this.noise(0.04, 3000, 6, 0.1, 0.27);
        break;
      case "power":
        this.tone(55, 110, 1.4, "sawtooth", 0.07);
        this.tone(110, 220, 1.4, "sine", 0.06);
        this.noise(0.1, 1500, 3, 0.25, 0);
        this.noise(0.08, 2200, 4, 0.2, 0.35);
        this.noise(0.08, 2600, 4, 0.2, 0.55);
        break;
      case "beep":
        this.tone(1320, 1320, 0.07, "square", 0.035);
        break;
      case "success":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          window.setTimeout(() => this.bell(f, 0.06, 2.4, this.sfx), i * 90),
        );
        break;
      case "door":
        [1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, f, 0.12, "square", 0.03, i * 0.1));
        this.noise(1.6, 260, 6, 0.12, 0.45, 420);
        this.tone(70, 45, 1.2, "sawtooth", 0.05, 0.5);
        [523.25, 659.25, 783.99, 987.77, 1318.5].forEach((f, i) =>
          window.setTimeout(() => this.bell(f, 0.06, 3, this.sfx), 900 + i * 180),
        );
        break;
      case "reveal":
        [1568, 1975.5, 2349.3, 2637].forEach((f, i) => this.tone(f, f * 1.01, 0.5, "sine", 0.03, i * 0.07));
        this.noise(0.9, 6000, 1, 0.03, 0, 9000);
        break;
      case "hint":
        this.bell(880, 0.05, 2, this.sfx);
        this.bell(1318.5, 0.035, 2, this.sfx);
        break;
      case "paper":
        this.noise(0.18, 2600, 0.8, 0.12);
        this.noise(0.14, 3600, 0.8, 0.08, 0.12);
        break;
      case "lamp":
        this.noise(0.03, 3800, 10, 0.25);
        this.tone(2400, 1800, 0.03, "square", 0.03);
        break;
      case "spin":
        this.noise(0.9, 900, 2, 0.08, 0, 400);
        break;
    }
  }

  dispose() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    this.padVoices = [];
    if (this.ctx) void this.ctx.close().catch(() => undefined);
    this.ctx = null;
    this.started = false;
  }
}
