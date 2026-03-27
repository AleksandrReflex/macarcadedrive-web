import Phaser from "phaser";

type MusicMode = "none" | "menu" | "race" | "finish";
type AudioBus = "sfx" | "music";

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  toFrequency?: number;
  bus?: AudioBus;
}

interface TurboNodes {
  osc: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
}

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private unlocked = false;
  private muted = false;
  private musicMode: MusicMode = "none";
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextMusicTime = 0;
  private turboNodes: TurboNodes | null = null;
  private turboActive = false;
  private unlockChimePlayed = false;
  private fallbackToneUrl: string | null = null;
  private fallbackReady = false;
  private readonly fallbackPlayers = new Set<HTMLAudioElement>();
  private readonly forceFallbackAudio = this.detectForceFallbackAudio();
  private fallbackMusicTimer: number | null = null;
  private fallbackMusicStep = 0;
  private fallbackTurboTimer: number | null = null;

  unlock(): void {
    this.unlocked = true;
    this.unlockFallbackAudio();
    if (this.forceFallbackAudio) {
      if (this.musicMode !== "none") {
        this.startFallbackMusicScheduler(true);
      }
      return;
    }
    const ctx = this.ensureContext(true);
    if (!ctx) {
      return;
    }

    if (ctx.state !== "running") {
      void ctx
        .resume()
        .then(() => {
          this.warmupContext();
          this.playUnlockChimeOnce();
          if (this.musicMode !== "none") {
            this.startMusicScheduler(true);
          }
        })
        .catch(() => {
          // Keep silent; next user gesture will attempt resume again.
        });
      return;
    }

    this.warmupContext();
    this.playUnlockChimeOnce();

    if (this.musicMode !== "none") {
      this.startMusicScheduler(true);
    }
  }

  setMusic(mode: MusicMode): void {
    if (this.musicMode === mode) {
      return;
    }
    this.musicMode = mode;
    this.musicStep = 0;

    if (mode === "none") {
      this.stopMusicScheduler();
      this.stopFallbackMusicScheduler();
      return;
    }

    if (this.forceFallbackAudio) {
      if (this.unlocked) {
        this.startFallbackMusicScheduler(true);
      }
      return;
    }

    if (this.unlocked) {
      this.startMusicScheduler(true);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  playUiTap(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.35, 0.22);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(1046, t, 0.05, { type: "square", gain: 0.035 });
    this.playTone(880, t + 0.045, 0.06, { type: "triangle", gain: 0.03 });
  }

  playStartCue(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.2, 0.25);
      window.setTimeout(() => this.playFallbackTone(1.45, 0.22), 70);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(392, t, 0.09, { type: "square", gain: 0.04 });
    this.playTone(523, t + 0.08, 0.1, { type: "square", gain: 0.05 });
    this.playTone(659, t + 0.17, 0.14, { type: "triangle", gain: 0.055 });
  }

  playSelectMove(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.1, 0.14);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(720, t, 0.04, { type: "square", gain: 0.028, toFrequency: 650 });
  }

  playConfirm(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.5, 0.22);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(523, t, 0.08, { type: "triangle", gain: 0.04 });
    this.playTone(659, t + 0.035, 0.1, { type: "triangle", gain: 0.04 });
    this.playTone(784, t + 0.07, 0.12, { type: "triangle", gain: 0.04 });
  }

  playPause(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(0.8, 0.18);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(440, t, 0.08, { type: "square", gain: 0.035 });
    this.playTone(294, t + 0.08, 0.1, { type: "square", gain: 0.035 });
  }

  playResume(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.05, 0.18);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(294, t, 0.07, { type: "square", gain: 0.03 });
    this.playTone(440, t + 0.06, 0.09, { type: "square", gain: 0.04 });
  }

  playThrottle(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(0.92, 0.16);
      return;
    }
    this.playTone(210, ctx.currentTime, 0.07, { type: "sawtooth", gain: 0.024, toFrequency: 320 });
  }

  playBrake(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(0.72, 0.18);
      return;
    }
    const t = ctx.currentTime;
    this.playNoise(t, 0.07, 0.03, 1600);
    this.playTone(220, t, 0.06, { type: "square", gain: 0.02, toFrequency: 170 });
  }

  playSteer(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.08, 0.11);
      return;
    }
    this.playTone(620, ctx.currentTime, 0.03, { type: "square", gain: 0.02 });
  }

  playCollision(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(0.65, 0.34);
      return;
    }
    const t = ctx.currentTime;
    this.playNoise(t, 0.2, 0.07, 1400);
    this.playTone(120, t, 0.22, { type: "sawtooth", gain: 0.06, toFrequency: 64 });
    this.playTone(82, t + 0.03, 0.26, { type: "triangle", gain: 0.05, toFrequency: 42 });
  }

  playDamageTick(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(0.78, 0.2);
      return;
    }
    this.playTone(180, ctx.currentTime, 0.08, { type: "square", gain: 0.022, toFrequency: 110 });
  }

  playFinishStinger(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(1.35, 0.24);
      window.setTimeout(() => this.playFallbackTone(1.7, 0.22), 90);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(392, t, 0.12, { type: "triangle", gain: 0.05 });
    this.playTone(523, t + 0.1, 0.16, { type: "triangle", gain: 0.055 });
    this.playTone(784, t + 0.2, 0.22, { type: "triangle", gain: 0.06 });
  }

  playGameOverStinger(): void {
    const ctx = this.canPlay();
    if (!ctx) {
      this.playFallbackTone(0.62, 0.27);
      return;
    }
    const t = ctx.currentTime;
    this.playTone(262, t, 0.14, { type: "square", gain: 0.04 });
    this.playTone(220, t + 0.12, 0.16, { type: "square", gain: 0.04 });
    this.playTone(165, t + 0.24, 0.28, { type: "triangle", gain: 0.05, toFrequency: 98 });
  }

  setTurboActive(active: boolean): void {
    if (this.turboActive === active) {
      return;
    }
    this.turboActive = active;
    if (this.forceFallbackAudio) {
      if (active) {
        this.startFallbackTurbo();
      } else {
        this.stopFallbackTurbo();
      }
      return;
    }
    if (active) {
      this.startTurbo();
      return;
    }
    this.stopTurbo();
  }

  stopAll(): void {
    this.setTurboActive(false);
    this.stopMusicScheduler();
    this.stopFallbackMusicScheduler();
    this.stopFallbackTurbo();
    this.stopFallbackPlayers();
  }

  private ensureContext(forceCreate = false): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    if (!forceCreate) {
      return null;
    }

    const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctx) {
      return null;
    }

    const ctx = new Ctx();
    const master = ctx.createGain();
    const music = ctx.createGain();
    const sfx = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    music.gain.value = 0.52;
    sfx.gain.value = 0.9;
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);

    this.context = ctx;
    this.masterGain = master;
    this.musicGain = music;
    this.sfxGain = sfx;

    return ctx;
  }

  private canPlay(): AudioContext | null {
    if (this.forceFallbackAudio) {
      return null;
    }
    if (!this.unlocked) {
      return null;
    }
    const ctx = this.ensureContext(false);
    if (!ctx || !this.sfxGain || !this.musicGain) {
      return null;
    }
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {
        // Keep silent; this is expected before a trusted gesture.
      });
      return null;
    }
    this.unlocked = true;
    return ctx;
  }

  private warmupContext(): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") {
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.type = "sine";
    osc.frequency.value = 440;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + 0.001);
  }

  private playUnlockChimeOnce(): void {
    if (this.unlockChimePlayed) {
      return;
    }
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") {
      return;
    }
    this.unlockChimePlayed = true;
    const t = ctx.currentTime + 0.01;
    this.playTone(988, t, 0.04, { type: "triangle", gain: 0.06 });
    this.playTone(1318, t + 0.04, 0.06, { type: "triangle", gain: 0.06 });
  }

  private unlockFallbackAudio(): void {
    if (this.fallbackReady || typeof Audio === "undefined") {
      return;
    }

    const probe = new Audio(this.getFallbackToneUrl());
    probe.preload = "auto";
    probe.volume = 0.001;
    probe.muted = false;
    probe.currentTime = 0;

    const playPromise = probe.play();
    if (!playPromise) {
      return;
    }

    void playPromise
      .then(() => {
        probe.pause();
        probe.currentTime = 0;
        this.fallbackReady = true;
        if (this.forceFallbackAudio && this.musicMode !== "none") {
          this.startFallbackMusicScheduler(true);
        }
        if (this.forceFallbackAudio && this.turboActive) {
          this.startFallbackTurbo();
        }
      })
      .catch(() => {
        // iOS/Safari may reject until a later user gesture.
      });
  }

  private playFallbackTone(playbackRate: number, volume: number): void {
    if (!this.fallbackReady || this.muted || typeof Audio === "undefined") {
      return;
    }

    const player = new Audio(this.getFallbackToneUrl());
    player.preload = "auto";
    player.volume = Phaser.Math.Clamp(volume, 0, 1);
    player.playbackRate = Phaser.Math.Clamp(playbackRate, 0.5, 2);
    player.currentTime = 0;

    const cleanup = () => {
      player.removeEventListener("ended", cleanup);
      player.removeEventListener("error", cleanup);
      this.fallbackPlayers.delete(player);
    };

    player.addEventListener("ended", cleanup);
    player.addEventListener("error", cleanup);
    this.fallbackPlayers.add(player);
    void player.play().catch(() => cleanup());
  }

  private stopFallbackPlayers(): void {
    this.fallbackPlayers.forEach((player) => {
      player.pause();
      player.currentTime = 0;
    });
    this.fallbackPlayers.clear();
  }

  private getFallbackToneUrl(): string {
    if (this.fallbackToneUrl) {
      return this.fallbackToneUrl;
    }

    const sampleRate = 22050;
    const durationSeconds = 0.08;
    const sampleCount = Math.max(1, Math.floor(sampleRate * durationSeconds));
    const pcm = new Int16Array(sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / sampleRate;
      const env = Math.max(0, 1 - i / sampleCount) ** 1.6;
      const tone = Math.sin(2 * Math.PI * 880 * t);
      const value = tone * env * 0.5;
      pcm[i] = Math.max(-1, Math.min(1, value)) * 0x7fff;
    }

    const headerSize = 44;
    const bytesPerSample = 2;
    const dataSize = sampleCount * bytesPerSample;
    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    this.writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    this.writeAscii(view, 8, "WAVE");
    this.writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    this.writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);

    let offset = headerSize;
    for (let i = 0; i < sampleCount; i += 1) {
      view.setInt16(offset, pcm[i], true);
      offset += bytesPerSample;
    }

    this.fallbackToneUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    return this.fallbackToneUrl;
  }

  private writeAscii(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  private startFallbackTurbo(): void {
    if (!this.fallbackReady || this.fallbackTurboTimer !== null) {
      return;
    }
    this.fallbackTurboTimer = window.setInterval(() => {
      this.playFallbackTone(0.9, 0.09);
    }, 120);
  }

  private stopFallbackTurbo(): void {
    if (this.fallbackTurboTimer === null) {
      return;
    }
    window.clearInterval(this.fallbackTurboTimer);
    this.fallbackTurboTimer = null;
  }

  private startFallbackMusicScheduler(reset: boolean): void {
    if (!this.fallbackReady || this.musicMode === "none") {
      return;
    }
    if (reset) {
      this.fallbackMusicStep = 0;
    }
    if (this.fallbackMusicTimer !== null) {
      window.clearInterval(this.fallbackMusicTimer);
    }
    const interval = this.fallbackMusicInterval(this.musicMode);
    this.fallbackMusicTimer = window.setInterval(() => this.tickFallbackMusic(), interval);
    this.tickFallbackMusic();
  }

  private stopFallbackMusicScheduler(): void {
    if (this.fallbackMusicTimer !== null) {
      window.clearInterval(this.fallbackMusicTimer);
      this.fallbackMusicTimer = null;
    }
    this.fallbackMusicStep = 0;
  }

  private tickFallbackMusic(): void {
    if (!this.fallbackReady || this.musicMode === "none") {
      return;
    }

    if (this.musicMode === "menu") {
      const pattern = [1.0, 1.18, 1.34, 1.18, 0.96, 1.12, 1.28, 1.1];
      const index = this.fallbackMusicStep % pattern.length;
      this.playFallbackTone(pattern[index], 0.07);
    } else if (this.musicMode === "race") {
      const pattern = [0.9, 1.0, 1.08, 1.0, 0.95, 1.04, 1.12, 1.04];
      const index = this.fallbackMusicStep % pattern.length;
      this.playFallbackTone(pattern[index], 0.08);
    } else {
      const pattern = [1.22, 1.34, 1.46, 1.34];
      const index = this.fallbackMusicStep % pattern.length;
      this.playFallbackTone(pattern[index], 0.07);
    }

    this.fallbackMusicStep += 1;
  }

  private fallbackMusicInterval(mode: MusicMode): number {
    if (mode === "menu") {
      return 240;
    }
    if (mode === "race") {
      return 170;
    }
    return 220;
  }

  private detectForceFallbackAudio(): boolean {
    const ua = navigator.userAgent;
    const isIOSDevice = /iP(hone|ad|od)/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return isIOSDevice;
  }

  private playTone(frequency: number, start: number, duration: number, options: ToneOptions = {}): void {
    const ctx = this.context;
    if (!ctx || !this.sfxGain || !this.musicGain) {
      return;
    }

    const bus = options.bus === "music" ? this.musicGain : this.sfxGain;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.type ?? "square";
    osc.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (options.toFrequency && options.toFrequency > 20) {
      osc.frequency.exponentialRampToValueAtTime(options.toFrequency, start + duration);
    }

    const peak = Math.max(0.001, options.gain ?? 0.03);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.015, duration * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  private playNoise(start: number, duration: number, gainAmount: number, bandFreq: number): void {
    const ctx = this.context;
    if (!ctx || !this.sfxGain) {
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(Math.max(120, bandFreq), start);
    filter.Q.value = 0.7;

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gainAmount), start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.sfxGain);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private startTurbo(): void {
    const ctx = this.canPlay();
    if (!ctx || !this.sfxGain || this.turboNodes) {
      return;
    }
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(116, ctx.currentTime);

    lfo.type = "sine";
    lfo.frequency.value = 11;
    lfoGain.gain.value = 14;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.038, ctx.currentTime + 0.06);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    lfo.start();
    this.turboNodes = { osc, lfo, lfoGain, gain };
  }

  private stopTurbo(): void {
    const ctx = this.context;
    if (!ctx || !this.turboNodes) {
      return;
    }
    const { osc, lfo, gain } = this.turboNodes;
    const stopAt = ctx.currentTime + 0.12;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.stop(stopAt + 0.02);
    lfo.stop(stopAt + 0.02);
    this.turboNodes = null;
  }

  private startMusicScheduler(reset: boolean): void {
    const ctx = this.canPlay();
    if (!ctx || this.musicMode === "none") {
      return;
    }
    if (reset || this.nextMusicTime === 0) {
      this.nextMusicTime = ctx.currentTime + 0.04;
      this.musicStep = 0;
    }
    if (this.musicTimer !== null) {
      return;
    }
    this.musicTimer = window.setInterval(() => this.tickMusic(), 110);
    this.tickMusic();
  }

  private stopMusicScheduler(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.nextMusicTime = 0;
  }

  private tickMusic(): void {
    const ctx = this.canPlay();
    if (!ctx || this.musicMode === "none") {
      return;
    }

    const stepDuration = 60 / this.musicBpm(this.musicMode) / 2;
    const scheduleAhead = 0.35;

    while (this.nextMusicTime < ctx.currentTime + scheduleAhead) {
      this.scheduleMusicStep(this.musicMode, this.musicStep, this.nextMusicTime);
      this.musicStep = (this.musicStep + 1) % 32;
      this.nextMusicTime += stepDuration;
    }
  }

  private scheduleMusicStep(mode: MusicMode, step: number, time: number): void {
    if (mode === "menu") {
      this.scheduleMenuMusic(step, time);
      return;
    }
    if (mode === "race") {
      this.scheduleRaceMusic(step, time);
      return;
    }
    if (mode === "finish") {
      this.scheduleFinishMusic(step, time);
    }
  }

  private scheduleMenuMusic(step: number, time: number): void {
    const bass = [45, 45, 48, 45, 50, 50, 52, 50];
    const arp = [69, 72, 76, 72, 67, 71, 74, 71];
    if (step % 2 === 0) {
      const bassNote = bass[Math.floor(step / 2) % bass.length];
      this.playTone(this.midiToHz(bassNote), time, 0.2, { type: "triangle", gain: 0.018, bus: "music" });
    }
    const note = arp[step % arp.length];
    this.playTone(this.midiToHz(note), time, 0.1, { type: "square", gain: 0.01, bus: "music" });
  }

  private scheduleRaceMusic(step: number, time: number): void {
    const bassPattern = [40, 40, 40, 43, 45, 43, 40, 38];
    const leadPattern = [64, 67, 71, 67, 62, 66, 69, 66];
    if (step % 2 === 0) {
      const bass = bassPattern[Math.floor(step / 2) % bassPattern.length];
      this.playTone(this.midiToHz(bass), time, 0.16, { type: "sawtooth", gain: 0.016, bus: "music", toFrequency: this.midiToHz(bass - 2) });
    }
    if (step % 4 === 1 || step % 4 === 3) {
      const lead = leadPattern[Math.floor(step / 2) % leadPattern.length];
      this.playTone(this.midiToHz(lead), time, 0.09, { type: "square", gain: 0.011, bus: "music" });
    }
    if (step % 8 === 0) {
      this.playNoise(time, 0.03, 0.008, 900);
    }
  }

  private scheduleFinishMusic(step: number, time: number): void {
    const notes = [72, 76, 79, 84, 79, 76, 72, 76];
    if (step % 2 === 0) {
      const note = notes[Math.floor(step / 2) % notes.length];
      this.playTone(this.midiToHz(note), time, 0.16, { type: "triangle", gain: 0.013, bus: "music" });
    }
  }

  private musicBpm(mode: MusicMode): number {
    if (mode === "menu") {
      return 92;
    }
    if (mode === "race") {
      return 126;
    }
    return 102;
  }

  private midiToHz(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
  }
}

export const audioSystem = new AudioSystem();
