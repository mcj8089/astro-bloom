import { GAME_CONFIG } from "../../config/game.config.js";
import { LEVELS } from "../../config/levels.js";
import { clamp } from "./utils.js";

const STORAGE_KEY = GAME_CONFIG.save.key;

function defaults() {
  const upgrades = {};
  for (const def of GAME_CONFIG.economy.upgrades) upgrades[def.id] = 0;
  return {
    version: 1,
    unlockedLevel: 1,
    lastLevel: 1,
    stars: {},
    coins: 0,
    upgrades,
    settings: { ...GAME_CONFIG.save.settings },
    playerName: "",
    bestScore: 0,
    endlessBest: 0,
    totalKills: 0,
    totalRuns: 0,
    shares: 0,
    tutorialDone: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function mergeSettings(base, incoming) {
  const out = { ...base };
  if (!incoming || typeof incoming !== "object") return out;
  for (const key of Object.keys(base)) {
    if (incoming[key] == null) continue;
    if (typeof base[key] === "number") {
      const value = Number(incoming[key]);
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof base[key] === "boolean") {
      out[key] = Boolean(incoming[key]);
    } else if (typeof base[key] === "string") {
      out[key] = String(incoming[key]);
    }
  }
  return out;
}

export class SaveStore {
  constructor(sdk = null) {
    this.sdk = sdk;
    this.data = this._load();
    this.lastUnlock = false;
    this._validate();
  }

  _load() {
    const base = defaults();
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) return base;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return base;
      const data = { ...base, ...parsed };
      data.upgrades = { ...base.upgrades, ...(parsed.upgrades || {}) };
      data.settings = mergeSettings(base.settings, parsed.settings);
      data.stars = parsed.stars && typeof parsed.stars === "object" ? parsed.stars : {};
      if (this.sdk && this.sdk.shield && this.sdk.shield.verify) {
        try {
          this.sdk.shield.verify(data, STORAGE_KEY);
        } catch (e) {
          /* non fatal */
        }
      }
      return data;
    } catch (e) {
      return base;
    }
  }

  _validate() {
    const data = this.data;
    const maxLevel = LEVELS.length;
    data.unlockedLevel = clamp(Math.round(Number(data.unlockedLevel) || 1), 1, maxLevel);
    data.lastLevel = clamp(Math.round(Number(data.lastLevel) || 1), 1, maxLevel);
    data.coins = clamp(Math.floor(Number(data.coins) || 0), 0, 99999999);
    data.bestScore = clamp(Math.floor(Number(data.bestScore) || 0), 0, 999999999);
    data.endlessBest = clamp(Math.floor(Number(data.endlessBest) || 0), 0, 999999999);
    data.totalKills = clamp(Math.floor(Number(data.totalKills) || 0), 0, 999999999);
    data.totalRuns = clamp(Math.floor(Number(data.totalRuns) || 0), 0, 999999999);
    data.shares = clamp(Math.floor(Number(data.shares) || 0), 0, 999999999);
    data.playerName = String(data.playerName || "").slice(0, GAME_CONFIG.meta.maxNameLength);
    data.tutorialDone = Boolean(data.tutorialDone);
    for (const def of GAME_CONFIG.economy.upgrades) {
      data.upgrades[def.id] = clamp(
        Math.round(Number(data.upgrades[def.id]) || 0),
        0,
        def.max
      );
    }
    for (const key of Object.keys(data.stars)) {
      const id = Number(key);
      if (!Number.isFinite(id) || id < 1 || id > maxLevel) {
        delete data.stars[key];
        continue;
      }
      const stars = clamp(Math.round(Number(data.stars[key]) || 0), 0, 3);
      if (stars <= 0) delete data.stars[key];
      else data.stars[key] = stars;
    }
    data.settings.musicVolume = clamp(Number(data.settings.musicVolume) || 0, 0, 1);
    data.settings.sfxVolume = clamp(Number(data.settings.sfxVolume) || 0, 0, 1);
    data.settings.screenShake = clamp(Number(data.settings.screenShake) || 0, 0, 1.5);
    if (!["low", "medium", "high"].includes(data.settings.quality)) {
      data.settings.quality = "high";
    }
  }

  persist() {
    this.data.updatedAt = Date.now();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      /* storage unavailable */
    }
    if (this.sdk && this.sdk.shield && this.sdk.shield.save) {
      try {
        this.sdk.shield.save(this.data, STORAGE_KEY);
      } catch (e) {
        /* non fatal */
      }
    }
    return this;
  }

  get settings() {
    return this.data.settings;
  }

  get coins() {
    return this.data.coins;
  }

  get starsTotal() {
    return Object.values(this.data.stars).reduce((sum, value) => sum + value, 0);
  }

  starsFor(levelId) {
    return this.data.stars[levelId] || 0;
  }

  isLevelUnlocked(levelId) {
    return levelId <= this.data.unlockedLevel;
  }

  setSettings(partial) {
    this.data.settings = mergeSettings(this.data.settings, partial);
    this._validate();
    this.persist();
  }

  setPlayerName(name) {
    const cleaned = String(name || "")
      .replace(/[\u0000-\u001f\u007f<>]/g, "")
      .trim()
      .slice(0, GAME_CONFIG.meta.maxNameLength);
    this.data.playerName = cleaned;
    this.persist();
    return cleaned;
  }

  addCoins(amount) {
    this.data.coins = clamp(this.data.coins + Math.round(amount || 0), 0, 99999999);
    this.persist();
    return this.data.coins;
  }

  spendCoins(amount) {
    const cost = Math.max(0, Math.round(amount || 0));
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.persist();
    return true;
  }

  upgradeLevel(id) {
    return this.data.upgrades[id] || 0;
  }

  upgradeCost(def) {
    const level = this.upgradeLevel(def.id);
    if (level >= def.max) return null;
    return Math.round((def.baseCost * Math.pow(def.growth, level)) / 10) * 10;
  }

  purchaseUpgrade(def) {
    if (!def) return { ok: false, reason: "missing" };
    const level = this.upgradeLevel(def.id);
    if (level >= def.max) return { ok: false, reason: "max" };
    const cost = this.upgradeCost(def);
    if (!this.spendCoins(cost)) return { ok: false, reason: "coins" };
    this.data.upgrades[def.id] = level + 1;
    this.persist();
    return { ok: true, cost, level: level + 1 };
  }

  get upgradeEffects() {
    const lvl = (id) => this.upgradeLevel(id);
    return {
      damage: 1 + lvl("seedPower") * 0.08,
      planetHp: lvl("petalArmor") * 18,
      charge: 1 + lvl("nectarCore") * 0.15,
      luck: 1 + lvl("bloomLuck") * 0.1
    };
  }

  recordWin(levelId, result) {
    const before = this.data.unlockedLevel;
    const stars = clamp(Math.round(result.stars || 1), 1, 3);
    this.data.stars[levelId] = Math.max(this.data.stars[levelId] || 0, stars);
    this.data.coins = clamp(this.data.coins + Math.round(result.coins || 0), 0, 99999999);
    this.data.bestScore = Math.max(this.data.bestScore, Math.round(result.score || 0));
    this.data.totalKills += Math.max(0, Math.round(result.kills || 0));
    this.data.totalRuns += 1;
    this.data.unlockedLevel = clamp(
      Math.max(this.data.unlockedLevel, levelId + 1),
      1,
      LEVELS.length
    );
    this.data.lastLevel = clamp(levelId + 1, 1, LEVELS.length);
    this.lastUnlock = this.data.unlockedLevel > before;
    this.persist();
    return {
      newUnlock: this.lastUnlock,
      unlockedLevel: this.data.unlockedLevel,
      newBest: this.data.bestScore === Math.round(result.score || 0)
    };
  }

  recordLoss(result = {}) {
    this.data.totalRuns += 1;
    this.data.totalKills += Math.max(0, Math.round(result.kills || 0));
    this.data.bestScore = Math.max(this.data.bestScore, Math.round(result.score || 0));
    this.persist();
  }

  recordEndless(score, kills) {
    const previous = this.data.endlessBest;
    this.data.endlessBest = Math.max(previous, Math.round(score || 0));
    this.data.bestScore = Math.max(this.data.bestScore, Math.round(score || 0));
    this.data.totalKills += Math.max(0, Math.round(kills || 0));
    this.data.totalRuns += 1;
    this.persist();
    return this.data.endlessBest > previous;
  }

  recordShare() {
    this.data.shares += 1;
    this.persist();
  }

  markTutorialDone() {
    this.data.tutorialDone = true;
    this.persist();
  }

  setLastLevel(levelId) {
    this.data.lastLevel = clamp(Math.round(levelId), 1, LEVELS.length);
    this.persist();
  }

  resetProgress() {
    const settings = this.data.settings;
    const playerName = this.data.playerName;
    this.data = defaults();
    this.data.settings = settings;
    this.data.playerName = playerName;
    this.persist();
  }

  summary() {
    return {
      unlockedLevel: this.data.unlockedLevel,
      lastLevel: this.data.lastLevel,
      stars: this.starsTotal,
      maxStars: LEVELS.length * 3,
      coins: this.data.coins,
      bestScore: this.data.bestScore,
      endlessBest: this.data.endlessBest
    };
  }
}

export default SaveStore;
