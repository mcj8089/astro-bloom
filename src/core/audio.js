import { clamp } from "./utils.js";

/**
 * Original soundtrack manifest. Every file is synthesised from scratch by
 * tools/gen_audio.py — no third-party samples are used.
 */
export const AUDIO_MANIFEST = {
  music: {
    menu: "assets/audio/bgm_menu.ogg",
    battle: "assets/audio/bgm_battle.ogg",
    boss: "assets/audio/bgm_boss.ogg"
  },
  sfx: {
    shoot: "assets/audio/sfx_shoot.wav",
    shoot_big: "assets/audio/sfx_shoot_big.wav",
    hit: "assets/audio/sfx_hit.wav",
    explode: "assets/audio/sfx_explode.wav",
    planet: "assets/audio/sfx_planet.wav",
    click: "assets/audio/sfx_click.wav",
    hover: "assets/audio/sfx_hover.wav",
    charge: "assets/audio/sfx_charge.wav",
    burst: "assets/audio/sfx_burst.wav",
    boss_roar: "assets/audio/sfx_boss_roar.wav",
    boss_hit: "assets/audio/sfx_boss_hit.wav",
    laser: "assets/audio/sfx_laser.wav",
    pickup: "assets/audio/sfx_pickup.wav",
    win: "assets/audio/sfx_level_win.wav",
    lose: "assets/audio/sfx_level_lose.wav",
    wave: "assets/audio/sfx_wave.wav",
    shield: "assets/audio/sfx_shield.wav",
    lane: "assets/audio/sfx_lane.wav",
    portal: "assets/audio/sfx_portal.wav",
    grow: "assets/audio/sfx_grow.wav"
  }
};

export class AudioEngine {
  constructor(settings = {}) {
    this.settings = { musicVolume: 0.55, sfxVolume: 0.78, mute: false, ...settings };
    this.ctx = null;
    this.buffers = new Map();
    this.musicBuffers = new Map();
    this.currentMusic = null;
    this.musicSource = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.master = null;
    this.adMuted = false;
    this.unlocked = false;
    this.ready = false;
    this._musicToken = 0;
    this._lastPlay = new Map();
  }

  get supported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    if (!this.supported) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.settings.sfxVolume;
    this.sfxGain.connect(this.master);
    return this.ctx;
  }

  async unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      this.unlocked = true;
      if (this.currentMusic && !this.musicSource) this.playMusic(this.currentMusic, { force: true });
      return true;
    } catch (e) {
      return false;
    }
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    const vol = this.settings.mute ? 0 : this.settings.sfxVolume;
    if (this.sfxGain) this.sfxGain.gain.value = vol;
    this._applyMusicVolume();
  }

  setAdMuted(muted) {
    this.adMuted = Boolean(muted);
    this._applyMusicVolume();
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.adMuted || this.settings.mute ? 0 : this.settings.sfxVolume;
    }
  }

  _applyMusicVolume() {
    if (!this.musicGain || !this.ctx) return;
    const target = this.settings.mute || this.adMuted ? 0 : this.settings.musicVolume;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(target, now, 0.18);
  }

  async loadAll(onProgress) {
    if (!this.supported) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const entries = [];
    for (const [name, path] of Object.entries(AUDIO_MANIFEST.music)) entries.push(["music", name, path]);
    for (const [name, path] of Object.entries(AUDIO_MANIFEST.sfx)) entries.push(["sfx", name, path]);
    let done = 0;
    const embedded = typeof window !== "undefined" ? window.__ASTRO_EMBEDDED__ : null;
    const tasks = entries.map(async ([kind, name, path]) => {
      try {
        const source = (embedded && embedded.audio && embedded.audio[path]) || path;
        const response = await fetch(source, { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(data.slice(0));
        if (kind === "music") this.musicBuffers.set(name, buffer);
        else this.buffers.set(name, buffer);
      } catch (error) {
        // Non-fatal: procedural fallback keeps the game audible.
        console.warn(`[audio] ${name} unavailable`, error && error.message);
      } finally {
        done += 1;
        if (onProgress) onProgress(done / entries.length);
      }
    });
    await Promise.all(tasks);
    this.ready = true;
  }

  play(name, options = {}) {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.mute || this.adMuted) return;
    if (!this.unlocked) return;
    const now = Date.now();
    const minGap = options.minGap == null ? 26 : options.minGap;
    if (this._lastPlay.has(name) && now - this._lastPlay.get(name) < minGap) return;
    this._lastPlay.set(name, now);

    const buffer = this.buffers.get(name);
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      const volume = (options.volume == null ? 1 : options.volume) * this.settings.sfxVolume;
      gain.gain.value = clamp(volume, 0, 1.5);
      if (options.rate) source.playbackRate.value = options.rate;
      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
      return;
    }
    this._synth(name, options);
  }

  _synth(name, options = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = {
      shoot: 720, hit: 380, explode: 140, planet: 90, click: 560, hover: 880,
      pickup: 1100, burst: 240, win: 660, lose: 180, boss_hit: 120
    }[name] || 440;
    oscillator.type = name === "explode" || name === "planet" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(base, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, base * (name === "pickup" || name === "win" ? 1.8 : 0.45)),
      ctx.currentTime + 0.16
    );
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.24);
  }

  playMusic(name, { force = false } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.currentMusic === name && this.musicSource && !force) return;
    this.currentMusic = name;
    this._musicToken += 1;
    const token = this._musicToken;
    const buffer = this.musicBuffers.get(name);
    if (!buffer) {
      // Retry once the asset has loaded.
      window.setTimeout(() => {
        if (token === this._musicToken && this.musicBuffers.has(name)) this.playMusic(name, { force: true });
      }, 450);
      return;
    }
    if (!this.unlocked) return;
    if (this.musicSource) {
      try {
        const old = this.musicSource;
        this.musicSource = null;
        old.stop(ctx.currentTime + 0.25);
      } catch (e) {
        /* already stopped */
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start();
    this.musicSource = source;
    this._applyMusicVolume();
  }

  stopMusic(fade = 0.3) {
    if (!this.ctx || !this.musicSource) return;
    try {
      this.musicSource.stop(this.ctx.currentTime + fade);
    } catch (e) {
      /* ignore */
    }
    this.musicSource = null;
    this.currentMusic = null;
  }

  toggleMute() {
    this.settings.mute = !this.settings.mute;
    this.setSettings(this.settings);
    return this.settings.mute;
  }
}

export default AudioEngine;
