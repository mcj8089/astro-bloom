import { GAME_CONFIG } from "../../config/game.config.js";
import { LEVELS } from "../../config/levels.js";
import { lang, n, t } from "../core/i18n.js";
import { clamp, isTouchDevice } from "../core/utils.js";

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const PLATFORM_ICONS = {
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 8.1h2.3V4.9c-.4-.1-1.7-.2-3.2-.2-3.2 0-5.3 1.9-5.3 5.4v3H5v3.6h3v9.1h4.4v-9.1h3.3l.5-3.6h-3.8V10c0-1 .3-1.9 1.8-1.9Z" fill="currentColor"/></svg>`,
  x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.1h1.7L7.5 4.8H5.7l11 14.3Z" fill="currentColor"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.2 22l5.2-1.4A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.3 0-.5.1-.6l.5-.6c.1-.1.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.8 2.1.8 2.6.7 3.1.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1Z" fill="currentColor"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 4.2 2.9 11.4c-.9.3-.9.9-.2 1.1l4.8 1.5 1.8 5.6c.2.6.5.7 1 .3l2.9-2.1 4.8 3.5c.7.4 1.2.2 1.4-.7l3-14.3c.2-1-.4-1.5-1.1-1.2ZM7.8 13.9l9.8-6.2c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.2-1.8-4.6Z" fill="currentColor"/></svg>`,
  reddit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12.1c0-1.3-1-2.3-2.3-2.3-.6 0-1.2.2-1.6.6a11 11 0 0 0-5.6-1.7l1-4.1 3 .7a1.7 1.7 0 1 0 .3-1.3l-3.8-.9-.1.3-1.1 4.9c-2.2.1-4.2.8-5.8 1.8-.4-.4-1-.6-1.6-.6A2.3 2.3 0 0 0 1.3 12c0 .9.5 1.7 1.3 2.1v.6c0 3.3 3.7 6 8.5 6 4.8 0 8.5-2.7 8.5-6v-.6c.8-.4 1.4-1.2 1.4-2Zm-14.8 1.3a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm7.5 4.3c-.8.8-2.1 1.2-3.7 1.2s-2.9-.4-3.7-1.2a.5.5 0 0 1 .7-.7c.6.6 1.7.9 3 .9s2.4-.3 3-.9a.5.5 0 1 1 .7.7Zm.2-2.9a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" fill="currentColor"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 3.5a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2ZM3.2 9.3h3.4V21H3.2V9.3Zm5.6 0h3.3v1.6h.1c.5-.8 1.6-1.9 3.5-1.9 3.7 0 4.4 2.3 4.4 5.3V21h-3.5v-6c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H8.8V9.3Z" fill="currentColor"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.5 7.2a2.7 2.7 0 0 0-1.9-1.9C19 4.8 12 4.8 12 4.8s-7 0-8.6.5A2.7 2.7 0 0 0 1.5 7.2 28 28 0 0 0 1 12a28 28 0 0 0 .5 4.8 2.7 2.7 0 0 0 1.9 1.9c1.6.5 8.6.5 8.6.5s7 0 8.6-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 23 12a28 28 0 0 0-.5-4.8ZM9.8 15.4V8.6l6 3.4-6 3.4Z" fill="currentColor"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 3c.3 2.2 1.6 3.5 3.8 3.7v3c-1.4 0-2.7-.4-3.8-1.2v6.1c0 3.5-2.4 5.8-5.8 5.8-3.1 0-5.6-2.2-5.6-5.4 0-3.3 2.7-5.8 6.2-5.3v3.1c-.4-.1-.8-.2-1.2-.2-1.5 0-2.6 1-2.6 2.4 0 1.5 1.2 2.5 2.7 2.5 1.7 0 2.8-1.2 2.8-3V3h3.5Z" fill="currentColor"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6c-2.6 0-2.9 0-3.9.1-1 0-1.7.2-2.3.4a4.6 4.6 0 0 0-1.7 1.1A4.6 4.6 0 0 0 3 5.9c-.2.6-.4 1.3-.4 2.3-.1 1-.1 1.3-.1 3.9s0 2.9.1 3.9c0 1 .2 1.7.4 2.3.2.6.6 1.2 1.1 1.7.5.5 1 .9 1.7 1.1.6.2 1.3.4 2.3.4 1 .1 1.3.1 3.9.1s2.9 0 3.9-.1c1 0 1.7-.2 2.3-.4a4.6 4.6 0 0 0 1.7-1.1 4.6 4.6 0 0 0 1.1-1.7c.2-.6.4-1.3.4-2.3.1-1 .1-1.3.1-3.9s0-2.9-.1-3.9c0-1-.2-1.7-.4-2.3a4.6 4.6 0 0 0-1.1-1.7A4.6 4.6 0 0 0 18.1 3c-.6-.2-1.3-.4-2.3-.4-1-.1-1.3-.1-3.8-.1Zm0 1.8c2.5 0 2.8 0 3.8.1.9 0 1.4.2 1.7.3.4.2.7.4 1 .7.3.3.5.6.7 1 .1.3.3.8.3 1.7.1 1 .1 1.3.1 3.8s0 2.8-.1 3.8c0 .9-.2 1.4-.3 1.7-.2.4-.4.7-.7 1-.3.3-.6.5-1 .7-.3.1-.8.3-1.7.3-1 .1-1.3.1-3.8.1s-2.8 0-3.8-.1c-.9 0-1.4-.2-1.7-.3-.4-.2-.7-.4-1-.7a2.8 2.8 0 0 1-.7-1c-.1-.3-.3-.8-.3-1.7-.1-1-.1-1.3-.1-3.8s0-2.8.1-3.8c0-.9.2-1.4.3-1.7.2-.4.4-.7.7-1 .3-.3.6-.5 1-.7.3-.1.8-.3 1.7-.3 1-.1 1.3-.1 3.8-.1Zm0 3.1a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 7.4a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Zm5.7-7.6a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z" fill="currentColor"/></svg>`
};

const PLATFORM_COLORS = {
  facebook: "#1877f2",
  x: "#16181c",
  whatsapp: "#25d366",
  telegram: "#2aabee",
  reddit: "#ff4500",
  linkedin: "#0a66c2",
  youtube: "#ff2d2d",
  tiktok: "#111318",
  instagram: "#d6338f"
};

const UPGRADE_ICONS = {
  bolt: `<svg viewBox="0 0 48 48"><path d="M27 4 12 27h9l-2 17 17-25h-10l1-15Z" fill="url(#gBolt)"/><defs><linearGradient id="gBolt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4c8"/><stop offset="1" stop-color="#ff9f5f"/></linearGradient></defs></svg>`,
  heart: `<svg viewBox="0 0 48 48"><path d="M24 41S7 31 7 19a9 9 0 0 1 17-4 9 9 0 0 1 17 4c0 12-17 22-17 22Z" fill="url(#gHeart)"/><defs><linearGradient id="gHeart" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd3e4"/><stop offset="1" stop-color="#ff6f9c"/></linearGradient></defs></svg>`,
  pollen: `<svg viewBox="0 0 48 48"><g fill="url(#gPol)"><ellipse cx="24" cy="12" rx="9" ry="7"/><ellipse cx="36" cy="21" rx="9" ry="7"/><ellipse cx="31" cy="34" rx="8" ry="7"/><ellipse cx="17" cy="34" rx="8" ry="7"/><ellipse cx="12" cy="21" rx="9" ry="7"/><circle cx="24" cy="24" r="7"/></g><defs><linearGradient id="gPol" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2b0"/><stop offset="1" stop-color="#ffab5f"/></linearGradient></defs></svg>`,
  star: `<svg viewBox="0 0 48 48"><path d="m24 5 5.6 12.2 13.4 1.5-10 9.3 2.7 13.3L24 34.7 12.3 41.3 15 28 5 18.7l13.4-1.5L24 5Z" fill="url(#gStar)"/><defs><linearGradient id="gStar" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8d8"/><stop offset="1" stop-color="#ffb648"/></linearGradient></defs></svg>`
};

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17.4 6.4 20l1.2-6.2L3 9.5l6.3-.8L12 3Z" fill="currentColor"/></svg>`;
const LOCK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10V7.7a4.5 4.5 0 0 1 9 0V10H18a1.8 1.8 0 0 1 1.8 1.8v7A1.8 1.8 0 0 1 18 20.6H6a1.8 1.8 0 0 1-1.8-1.8v-7A1.8 1.8 0 0 1 6 10h1.5Zm2 0h5V7.7a2.5 2.5 0 0 0-5 0V10Z" fill="currentColor"/></svg>`;
const CROWN_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 8 4.6 3.2L12 5l4.4 6.2L21 8l-1.6 10.2H4.6L3 8Z" fill="currentColor"/></svg>`;

export class UI {
  constructor({ save, audio, ads, sdk, config = GAME_CONFIG }) {
    this.save = save;
    this.audio = audio;
    this.ads = ads;
    this.sdk = sdk;
    this.config = config;
    this.assets = null;
    this.game = null;
    this.share = null;
    this.isTouch = isTouchDevice();
    this.currentLevel = 1;
    this.lastResult = null;
    this.cache = {};
    this._toastTimer = null;
    this._hintTimer = null;
    this._domainTotal = 3000;
    this._sharePaused = false;
    this._adResolve = null;
    this._adTimer = null;
    this._bindActions();
    document.body.classList.toggle("is-touch", this.isTouch);
  }

  setAssets(assets) {
    this.assets = assets;
    const logo = assets?.image("logo");
    if (logo) {
      const menuLogo = $("menu-logo");
      const loadLogo = $("loading-logo");
      if (menuLogo) menuLogo.src = logo.src;
      if (loadLogo) loadLogo.src = logo.src;
      const shareLogo = $("share-logo");
      if (shareLogo) shareLogo.src = logo.src;
      $$(".domain-logo").forEach((img) => { img.src = logo.src; });
    }
    const hand = assets?.image("hand");
    if (hand) {
      $$(".guide-hand").forEach((img) => { img.src = hand.src; });
    }
    const arrow = assets?.image("arrow");
    if (arrow) {
      $$(".guide-arrow").forEach((img) => { img.src = arrow.src; });
    }
    this.buildLevels();
    this.updateMenu();
  }

  init(game) {
    this.game = game;
    this.currentLevel = this.save?.data.lastLevel || 1;
    this.buildGarden();
    this.buildPlatforms();
    this.syncSettings();
    this.setMuted(Boolean(this.save?.settings?.mute));
    this.updateMenu();
  }

  setShare(share) {
    this.share = share;
  }

  // ------------------------------------------------------------------ helpers
  _on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  _bindActions() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      this._handleAction(action, target, event);
    });

    document.addEventListener("click", (event) => {
      const platform = event.target.closest("[data-platform]");
      if (!platform) return;
      this._shareTo(platform.getAttribute("data-platform"));
    });

    document.addEventListener("pointerover", (event) => {
      const button = event.target.closest("button");
      if (!button || button.disabled) return;
      this.audio?.play?.("hover", { volume: 0.18, minGap: 80 });
    });

    this._on("share-name", "input", () => {
      window.clearTimeout(this._nameTimer);
      this._nameTimer = window.setTimeout(() => {
        const value = $("share-name")?.value || "";
        this.save?.setPlayerName(value);
        this.drawSharePreview();
      }, 120);
    });

    this._on("setting-music", "input", (event) => {
      this._setSetting("musicVolume", Number(event.target.value) / 100);
    });
    this._on("setting-sfx", "input", (event) => {
      this._setSetting("sfxVolume", Number(event.target.value) / 100);
    });
    this._on("setting-shake", "input", (event) => {
      this._setSetting("screenShake", Number(event.target.value) / 100);
    });
    $$("[data-quality]").forEach((button) => {
      button.addEventListener("click", () => {
        this._setSetting("quality", button.getAttribute("data-quality"));
        this.syncSettings();
      });
    });
  }

  _handleAction(action, target) {
    this.audio?.play?.("click", { volume: 0.4 });
    switch (action) {
      case "start":
      case "campaign":
        this.game?.startCampaign();
        break;
      case "endless":
        this.game?.startEndless();
        break;
      case "levels":
        this.showLevels();
        break;
      case "garden":
        this.showGarden();
        break;
      case "howto":
        this.showHowTo();
        break;
      case "settings":
        this.showSettings();
        break;
      case "close-settings":
        this.hideSettings();
        break;
      case "share":
        this.openShare();
        break;
      case "close-share":
        this.closeShare();
        break;
      case "pause":
        this.game?.pause();
        break;
      case "resume":
        this.game?.resume();
        break;
      case "retry":
      case "restart":
        this.hideResult();
        this.game?.retryLevel?.();
        break;
      case "next":
        this.hideResult();
        this.game?.nextLevel?.();
        break;
      case "menu":
      case "quit":
        this.hideResult();
        this.hidePause();
        this.game?.quitToMenu?.();
        break;
      case "levels-back":
        this.showMenu();
        break;
      case "garden-back":
        this.showMenu();
        break;
      case "howto-back":
        this.showMenu();
        break;
      case "bloom":
        this.game?.useSpecial?.();
        break;
      case "lane-0":
        this.game?.setLane?.(0);
        break;
      case "lane-1":
        this.game?.setLane?.(1);
        break;
      case "lane-2":
        this.game?.setLane?.(2);
        break;
      case "sound":
        this.toggleSound();
        break;
      case "guide-next":
        this.game?.guide?.next?.();
        break;
      case "guide-skip":
        this.game?.guide?.skip?.();
        break;
      case "revive":
        this._revive();
        break;
      case "double":
        this._doubleStardust();
        break;
      case "copy-link":
        this._copyLink();
        break;
      case "download-card":
        this._downloadCard();
        break;
      case "native-share":
        this._nativeShare();
        break;
      case "reset-progress":
        this._resetProgress();
        break;
      case "close-level":
        this.showLevels();
        break;
      case "ad-claim":
        this._finishAd(true);
        break;
      case "ad-skip":
        this._finishAd(false);
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ loading
  setLoading(progress, key) {
    const pct = clamp(progress, 0, 1);
    const fill = $("loading-fill");
    if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
    const value = $("loading-percent");
    if (value) value.textContent = `${Math.round(pct * 100)}%`;
    if (key) {
      const text = $("loading-caption");
      if (text) text.textContent = t(key);
    }
    this.startLoadingTips();
  }

  startLoadingTips() {
    if (this._tipTimer) return;
    const keys = ["loading.tip1", "loading.tip2", "loading.tip3"];
    let index = 0;
    const tip = $("loading-tip");
    if (tip) tip.textContent = t(keys[0]);
    this._tipTimer = window.setInterval(() => {
      index = (index + 1) % keys.length;
      const el = $("loading-tip");
      if (el) {
        el.classList.add("fade");
        window.setTimeout(() => {
          el.textContent = t(keys[index]);
          el.classList.remove("fade");
        }, 260);
      }
    }, 4200);
  }

  loadingDone() {
    const screen = $("loading-screen");
    if (screen) {
      screen.classList.add("is-done");
      window.setTimeout(() => screen.classList.add("hidden"), 650);
    }
    if (this._tipTimer) window.clearInterval(this._tipTimer);
    this._tipTimer = null;
    document.body.classList.remove("is-loading");
  }

  showLoadingError(message) {
    const box = $("loading-error");
    const detail = $("loading-error-detail");
    if (box) box.classList.remove("hidden");
    if (detail) detail.textContent = String(message || "").slice(0, 400);
    this.loadingDone();
  }

  // ------------------------------------------------------------------ screens
  _hideScreens() {
    $$(".screen").forEach((el) => el.classList.add("hidden"));
  }

  showMenu() {
    this._hideScreens();
    $("menu-screen")?.classList.remove("hidden");
    $("hud")?.classList.add("hidden");
    $("guide")?.classList.add("hidden");
    document.body.classList.add("in-menu");
    this.updateMenu();
    this.currentLevel = this.save?.data.lastLevel || 1;
  }

  hideAll() {
    this._hideScreens();
    $("hud")?.classList.add("hidden");
  }

  updateMenu() {
    if (!this.save) return;
    const summary = this.save.summary();
    const level = clamp(summary.lastLevel || 1, 1, LEVELS.length);
    const label = $("menu-level");
    if (label) label.textContent = t("menu.levelFmt", { n: level, total: LEVELS.length });
    const stars = $("menu-stars");
    if (stars) stars.textContent = `${summary.stars} / ${summary.maxStars}`;
    const best = $("menu-best");
    if (best) best.textContent = n(summary.bestScore);
    const dust = $("menu-dust");
    if (dust) dust.textContent = n(summary.coins);
    const play = $("menu-play-label");
    if (play) play.textContent = summary.unlockedLevel > 1 ? t("menu.continue") : t("menu.play");
    const endlessBest = $("menu-endless-best");
    if (endlessBest) endlessBest.textContent = n(summary.endlessBest);
    const dustTop = $("garden-dust-top");
    if (dustTop) dustTop.textContent = n(summary.coins);
    const progress = $("menu-progress-fill");
    if (progress) {
      progress.style.width = `${(summary.unlockedLevel / LEVELS.length) * 100}%`;
    }
    this.updateLevels();
  }

  onLevelStart(level) {
    this._hideScreens();
    $("hud")?.classList.remove("hidden");
    $("guide")?.classList.add("hidden");
    $("result-screen")?.classList.add("hidden");
    $("pause-screen")?.classList.add("hidden");
    document.body.classList.remove("in-menu");
    this.currentLevel = level?.id || 0;
    const name = level?.endless ? t("endless.title") : t(level?.nameKey || "level.1.name");
    const tag = level?.tagKey ? t(level.tagKey) : level?.endless ? t("menu.modeEndless") : "";
    if ($("hud-level-name")) $("hud-level-name").textContent = name;
    if ($("hud-level-tag")) $("hud-level-tag").textContent = tag;
    if ($("hud-level-number")) {
      $("hud-level-number").textContent = level?.endless ? "∞" : String(level?.id || 1).padStart(2, "0");
    }
    this._showLevelIntro(name, tag);
    $("combo")?.classList.remove("is-on");
    $("boss-wrap")?.classList.add("hidden");
    $("hint-bar")?.classList.add("hidden");
    this.cache = {};
    this.buildLaneChip(level);
    this.setSpecial(0);
    this.setMuted(Boolean(this.save?.settings?.mute));
    if (level?.endless) {
      $("hud-wave-label")?.classList.add("hidden");
    } else {
      $("hud-wave-label")?.classList.remove("hidden");
    }
  }

  _showLevelIntro(name, tag) {
    const intro = $("level-intro");
    if (!intro) return;
    intro.innerHTML = `<span class="intro-tag">${tag || ""}</span><b>${name}</b>`;
    intro.classList.remove("hidden");
    intro.classList.remove("play");
    void intro.offsetWidth;
    intro.classList.add("play");
    window.setTimeout(() => intro.classList.add("hidden"), 2700);
  }

  hideHUD() {
    $("hud")?.classList.add("hidden");
    $("guide")?.classList.add("hidden");
  }

  buildLaneChip(level) {
    const chip = $("lane-chip");
    if (!chip) return;
    const lanes = Boolean(level?.lanes);
    chip.classList.toggle("hidden", !lanes);
    if (!lanes) return;
    chip.innerHTML = `<span class="lane-label">${t("hud.lane")}</span><div class="lane-dots">
      ${[0, 1, 2].map((i) => `<button class="lane-dot${i === this.game?.lane ? " is-active" : ""}" data-action="lane-${i}" aria-label="${t("hud.lane")} ${i + 1}"><i></i></button>`).join("")}
    </div>`;
  }

  updateHUD(state) {
    if (!state) return;
    const cache = this.cache;
    if (cache.score !== state.score) {
      cache.score = state.score;
      if ($("hud-score")) $("hud-score").textContent = n(state.score);
    }
    if (cache.dust !== state.stardust) {
      cache.dust = state.stardust;
      if ($("hud-stardust")) $("hud-stardust").textContent = n(state.stardust);
    }
    const hp = Math.round(state.planetHp);
    if (cache.hp !== hp) {
      cache.hp = hp;
      if ($("hud-planet-value")) $("hud-planet-value").textContent = String(hp);
      const fill = $("hud-planet-fill");
      if (fill) fill.style.width = `${clamp(state.planetHp / Math.max(1, state.planetMax), 0, 1) * 100}%`;
      const vital = $("vital-planet");
      if (vital) vital.classList.toggle("is-low", state.planetHp / Math.max(1, state.planetMax) < 0.3);
    }
    const special = Math.floor(state.special);
    if (cache.special !== special) {
      cache.special = special;
      this.setSpecial(special);
    }
    const combo = state.combo >= 2 ? state.combo : 0;
    if (cache.combo !== combo) {
      cache.combo = combo;
      const comboEl = $("combo");
      if (comboEl) {
        comboEl.classList.toggle("is-on", combo > 0);
        const value = $("combo-value");
        if (value) value.textContent = `×${combo}`;
      }
    }
    if (cache.lane !== state.lane) {
      cache.lane = state.lane;
      $$(".lane-dot").forEach((el, index) => el.classList.toggle("is-active", index === state.lane));
    }
    if (state.lanes) {
      if ($("lane-chip")) $("lane-chip").classList.remove("hidden");
    }
    let waveText = "";
    if (state.endless) {
      waveText = t("endless.wave", { n: state.sky || 1 });
    } else if (state.level?.boss && state.boss) {
      waveText = t("common.boss");
    } else if (state.level) {
      const runtime = this.game?.levelRuntime;
      const total = runtime?.schedule?.length || 0;
      const current = runtime?.cursor || 0;
      waveText = total
        ? `${Math.min(Math.ceil(total / 5), Math.max(1, Math.ceil(current / 5)))}/${Math.ceil(total / 5)}`
        : "1/1";
    }
    if (cache.wave !== waveText) {
      cache.wave = waveText;
      if ($("hud-wave")) $("hud-wave").textContent = waveText;
    }
    if (state.turrets != null && cache.turrets !== state.turrets) {
      cache.turrets = state.turrets;
      const chip = $("turret-chip");
      if (chip) {
        chip.classList.toggle("hidden", state.turrets <= 0);
        const label = chip.querySelector("b");
        if (label) label.textContent = n(state.turrets);
      }
    }
    if (state.boss && !state.boss.defeated) {
      this.updateBoss(state.boss.hp, state.boss.maxHp);
    }
  }

  setSpecial(value) {
    const special = clamp(value, 0, 100);
    const button = $("bloom-btn");
    if (button) {
      button.style.setProperty("--charge", `${special * 3.6}deg`);
      button.classList.toggle("is-ready", special >= 100);
      button.setAttribute("aria-label", t("hud.special"));
    }
    const label = $("bloom-value");
    if (label) label.textContent = special >= 100 ? t("hud.burst") : `${Math.round(special)}%`;
  }

  updateLane(lane) {
    $$(".lane-dot").forEach((el, index) => el.classList.toggle("is-active", index === lane));
  }

  // ------------------------------------------------------------------ boss UI
  showBoss(data) {
    const wrap = $("boss-wrap");
    if (!wrap) return;
    wrap.classList.remove("hidden");
    wrap.classList.remove("boss-defeated");
    if ($("boss-name")) $("boss-name").textContent = data.name;
    if ($("boss-title")) $("boss-title").textContent = data.title;
    if ($("boss-phase")) $("boss-phase").textContent = t("boss.phase", { n: 1 });
    this.updateBoss(data.hp, data.maxHp);
  }

  updateBoss(hp, maxHp) {
    const fill = $("boss-fill");
    if (fill) fill.style.width = `${clamp(hp / Math.max(1, maxHp), 0, 1) * 100}%`;
  }

  showBossWarning(name) {
    const warning = $("boss-warning");
    if (!warning) return;
    const label = warning.querySelector("b");
    if (label) label.textContent = name;
    warning.classList.remove("hidden");
    warning.classList.remove("play");
    void warning.offsetWidth;
    warning.classList.add("play");
    window.setTimeout(() => warning.classList.add("hidden"), 3000);
  }

  bossExposed(exposed) {
    $("boss-wrap")?.classList.toggle("is-exposed", Boolean(exposed));
  }

  bossPhase(phase) {
    if ($("boss-phase")) $("boss-phase").textContent = t("boss.phase", { n: phase });
    $("boss-wrap")?.classList.add("phase-up");
    window.setTimeout(() => $("boss-wrap")?.classList.remove("phase-up"), 900);
  }

  bossDefeated() {
    $("boss-wrap")?.classList.add("boss-defeated");
    const title = $("boss-title");
    if (title) title.textContent = t("boss.defeated");
  }

  hideBoss() {
    $("boss-wrap")?.classList.add("hidden");
    $("boss-wrap")?.classList.remove("is-exposed");
  }

  bossAttack(name) {
    const wrap = $("boss-wrap");
    if (!wrap) return;
    wrap.classList.add("is-attacking");
    window.setTimeout(() => wrap.classList.remove("is-attacking"), 700);
  }

  // ------------------------------------------------------------------ result
  showResult(data) {
    this.lastResult = data;
    const screen = $("result-screen");
    if (!screen) return;
    screen.classList.remove("hidden");
    screen.classList.toggle("is-win", Boolean(data.win));
    screen.classList.toggle("is-lose", !data.win);
    if ($("result-title")) $("result-title").textContent = data.win ? t("result.winTitle") : t("result.loseTitle");
    let sub = "";
    if (data.endless) sub = t("endless.over");
    else if (data.win) sub = t("result.levelComplete");
    else sub = t("result.loseSub") || t("howto.tip");
    if ($("result-sub")) $("result-sub").textContent = sub;
    if ($("result-level")) {
      $("result-level").textContent = data.endless
        ? t("endless.title")
        : t("result.levelLabel", { n: data.levelId });
    }
    if ($("result-score")) $("result-score").textContent = n(data.score);
    if ($("result-kills")) $("result-kills").textContent = n(data.kills);
    if ($("result-coins")) $("result-coins").textContent = n(data.coins || 0);
    if ($("result-best")) $("result-best").textContent = n(this.save?.data.bestScore || data.score);
    if ($("result-badge")) {
      $("result-badge").classList.toggle("hidden", !data.newBest);
      $("result-badge").textContent = t("result.newBest");
    }
    const stars = $("result-stars");
    if (stars) {
      stars.innerHTML = [1, 2, 3].map((i) =>
        `<span class="result-star${i <= (data.stars || 0) ? " on" : ""}">${STAR_SVG}</span>`
      ).join("");
      stars.classList.toggle("hidden", data.endless || !data.win);
    }
    const next = $("result-next");
    if (next) {
      next.classList.toggle("hidden", !data.win);
      const label = next.querySelector("[data-i18n='result.next']");
      if (label) label.textContent = data.levelId >= LEVELS.length ? t("result.menu") : t("result.next");
    }
    const revive = $("result-revive");
    if (revive) revive.classList.toggle("hidden", !data.canRevive);
    const double = $("result-double");
    if (double) {
      double.classList.toggle("hidden", !(this.ads?.enabled && !data.doubled && (data.coins || 0) > 0));
    }
    const share = $("result-share");
    if (share) share.classList.toggle("hidden", false);
    this.hideHUD();
    this.audio?.play?.(data.win ? "win" : "lose", { volume: 0.7 });
  }

  hideResult() {
    $("result-screen")?.classList.add("hidden");
  }

  // ------------------------------------------------------------------ pause
  showPause() {
    $("pause-screen")?.classList.remove("hidden");
  }

  hidePause() {
    $("pause-screen")?.classList.add("hidden");
  }

  // ------------------------------------------------------------------ levels
  buildLevels() {
    const grid = $("levels-grid");
    if (!grid) return;
    grid.innerHTML = LEVELS.map((level) => {
      const frame = this.assets?.planetFrames?.[(level.id * 3) % Math.max(1, this.assets.planetFrames.length)];
      const image = frame ? frame.src : "";
      return `
      <button class="level-card theme-${level.theme}" data-action="open-level" data-level="${level.id}">
        <div class="level-thumb" style="--hue:${(level.id * 29) % 360}deg">
          ${image ? `<img src="${image}" alt="" loading="lazy">` : ""}
          <span class="level-index">${String(level.id).padStart(2, "0")}</span>
          ${level.boss ? `<span class="level-crown">${CROWN_SVG}</span>` : ""}
        </div>
        <div class="level-copy">
          <b>${t(level.nameKey)}</b>
          <span>${t(level.tagKey)}</span>
        </div>
        <div class="level-stars" data-level-stars="${level.id}"></div>
        <span class="level-lock">${LOCK_SVG}<em>${t("level.select.locked")}</em></span>
      </button>`;
    }).join("");
    grid.querySelectorAll(".level-card").forEach((card) => {
      card.addEventListener("click", () => this._openLevel(Number(card.getAttribute("data-level"))));
    });
    this.updateLevels();
  }

  updateLevels() {
    if (!this.save) return;
    $$(".level-card").forEach((card) => {
      const id = Number(card.getAttribute("data-level"));
      const unlocked = this.save.isLevelUnlocked(id);
      const stars = this.save.starsFor(id);
      card.classList.toggle("is-locked", !unlocked);
      const starBox = card.querySelector(".level-stars");
      if (starBox) {
        starBox.innerHTML = [1, 2, 3].map((i) =>
          `<span class="mini-star${i <= stars ? " on" : ""}">${STAR_SVG}</span>`
        ).join("");
      }
    });
  }

  showLevels() {
    this._hideScreens();
    $("levels-screen")?.classList.remove("hidden");
    const dustTop = $("garden-dust-top");
    if (dustTop) dustTop.textContent = n(this.save?.coins || 0);
    this.updateLevels();
  }

  _openLevel(id) {
    if (!this.save?.isLevelUnlocked(id)) {
      this.toast(t("toast.locked"));
      return;
    }
    this.game?.startLevel(id);
  }

  // ------------------------------------------------------------------ garden
  buildGarden() {
    const grid = $("garden-grid");
    if (!grid) return;
    grid.innerHTML = this.config.economy.upgrades.map((up) => `
      <article class="upgrade-card" data-upgrade="${up.id}">
        <div class="upgrade-icon">${UPGRADE_ICONS[up.icon] || UPGRADE_ICONS.star}</div>
        <div class="upgrade-copy">
          <b>${t(up.nameKey)}</b>
          <p>${t(up.descKey)}</p>
          <span class="upgrade-level"></span>
        </div>
        <button class="upgrade-buy" data-action="buy-upgrade" data-upgrade="${up.id}">
          <span class="cost-ico">✦</span><span class="cost">0</span>
        </button>
      </article>
    `).join("");
    grid.querySelectorAll("[data-action='buy-upgrade']").forEach((button) => {
      button.addEventListener("click", () => this._buyUpgrade(button.getAttribute("data-upgrade")));
    });
    this.updateGarden();
  }

  updateGarden() {
    if (!this.save) return;
    const dust = $("garden-dust");
    if (dust) dust.textContent = n(this.save.coins);
    $$(".upgrade-card").forEach((card) => {
      const id = card.getAttribute("data-upgrade");
      const def = this.config.economy.upgrades.find((up) => up.id === id);
      if (!def) return;
      const level = this.save.upgradeLevel(id);
      const cost = this.save.upgradeCost(def);
      const costEl = card.querySelector(".cost");
      const levelEl = card.querySelector(".upgrade-level");
      const button = card.querySelector(".upgrade-buy");
      if (levelEl) levelEl.textContent = t("garden.owned", { n: level, max: def.max });
      if (level >= def.max) {
        if (costEl) costEl.textContent = t("garden.max");
        if (button) button.classList.add("is-max");
        if (button) button.disabled = true;
      } else {
        if (costEl) costEl.textContent = n(cost);
        if (button) button.classList.remove("is-max");
        if (button) button.disabled = false;
      }
      card.classList.toggle("is-max", level >= def.max);
      const pips = card.querySelector(".upgrade-pips");
      if (pips) pips.remove();
    });
  }

  showGarden() {
    this._hideScreens();
    $("garden-screen")?.classList.remove("hidden");
    this.updateGarden();
  }

  _buyUpgrade(id) {
    const def = this.config.economy.upgrades.find((up) => up.id === id);
    if (!def) return;
    const result = this.save?.purchaseUpgrade(def);
    if (!result || !result.ok) {
      this.toast(t("toast.nostardust"));
      return;
    }
    this.audio?.play?.("grow");
    this.toast(t("toast.purchased"));
    this.updateGarden();
    this.updateMenu();
    this.game?.applySettings?.(this.save.settings);
  }

  // ------------------------------------------------------------------ howto
  showHowTo() {
    this._hideScreens();
    $("howto-screen")?.classList.remove("hidden");
  }

  // ------------------------------------------------------------------ settings
  showSettings() {
    this.syncSettings();
    $("settings-modal")?.classList.remove("hidden");
  }

  hideSettings() {
    $("settings-modal")?.classList.add("hidden");
  }

  syncSettings() {
    const settings = this.save?.settings || this.config.save.settings;
    const music = $("setting-music");
    const sfx = $("setting-sfx");
    const shake = $("setting-shake");
    if (music) music.value = String(Math.round((settings.musicVolume || 0) * 100));
    if (sfx) sfx.value = String(Math.round((settings.sfxVolume || 0) * 100));
    if (shake) shake.value = String(Math.round((settings.screenShake == null ? 1 : settings.screenShake) * 100));
    $$("[data-quality]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-quality") === settings.quality);
    });
  }

  _setSetting(key, value) {
    this.save?.setSettings({ [key]: value });
    this.audio?.setSettings?.(this.save.settings);
    this.game?.applySettings?.(this.save.settings);
    this.syncSettings();
  }

  toggleSound() {
    const muted = this.audio?.toggleMute?.();
    this.save?.setSettings({ mute: Boolean(muted) });
    this.setMuted(Boolean(muted));
    this.toast(muted ? t("toast.muted") : t("toast.soundOn"));
  }

  setMuted(muted) {
    document.body.classList.toggle("is-muted", Boolean(muted));
    const icon = $("sound-icon");
    if (icon) {
      icon.innerHTML = muted
        ? `<path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
        : `<path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.6 6a9 9 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
  }

  _resetProgress() {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    this.save?.resetProgress();
    this.updateMenu();
    this.updateGarden();
    this.updateLevels();
    this.toast(t("toast.saved"));
    this.hideSettings();
  }

  // ------------------------------------------------------------------ share
  buildPlatforms() {
    const grid = $("share-platforms");
    if (!grid) return;
    grid.innerHTML = this.config.share.platforms.map((platform) => `
      <button class="share-platform" data-platform="${platform}" title="${t(`share.platform.${platform}`)}" aria-label="${t(`share.platform.${platform}`)}" style="--brand:${PLATFORM_COLORS[platform]}">
        <span class="platform-ico">${PLATFORM_ICONS[platform] || ""}</span>
        <span class="platform-name">${t(`share.platform.${platform}`)}</span>
      </button>
    `).join("");
    const native = $("btn-share-native");
    if (native) native.classList.toggle("hidden", typeof navigator.share !== "function");
  }

  openShare(kind = null, result = null) {
    if (!this.share) return;
    if (result) this.lastResult = result;
    if (!this.lastResult) {
      this.lastResult = {
        kind: "menu",
        levelId: this.save?.data.lastLevel || 1,
        score: this.save?.data.bestScore || 0,
        stars: 0,
        kills: 0
      };
    }
    if (kind) this.lastResult.kind = kind;
    const input = $("share-name");
    if (input) input.value = this.save?.data.playerName || "";
    this.drawSharePreview();
    $("share-modal")?.classList.remove("hidden");
    if (this.game?.status === "playing") {
      this._sharePaused = true;
      this.game.simulationPaused = true;
      this.game.firing = false;
    }
  }

  closeShare() {
    $("share-modal")?.classList.add("hidden");
    if (this._sharePaused && this.game) {
      this.game.simulationPaused = false;
      this._sharePaused = false;
    }
    $("share-tip")?.classList.add("hidden");
  }

  drawSharePreview() {
    if (!this.share) return;
    const canvas = $("share-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const result = this.lastResult || {
      kind: "menu",
      levelId: this.save?.data.lastLevel || 1,
      score: this.save?.data.bestScore || 0,
      kills: 0
    };
    this.share.drawCard(ctx, result);
  }

  async _shareTo(platform) {
    if (!this.share) return;
    // Mobile rule: prefer the native Web Share sheet, which covers all apps.
    if (this.isTouch && typeof navigator.share === "function" &&
      !["tiktok", "instagram", "youtube"].includes(platform)) {
      const native = await this.share.native();
      if (native.ok) return;
    }
    const result = await this.share.shareTo(platform);
    if (result?.mode === "card") {
      const tip = $("share-tip");
      if (tip) {
        tip.textContent = platform === "tiktok"
          ? t("share.tipTikTok")
          : platform === "instagram" ? t("share.tipInstagram") : t("share.tipYouTube");
        tip.classList.remove("hidden");
      }
      this.toast(t("share.copied"));
    } else if (result?.mode === "copied") {
      this.toast(t("share.copied"));
    }
  }

  async _nativeShare() {
    if (!this.share) return;
    const result = await this.share.native();
    if (result.ok) this.toast(t("share.copied"));
  }

  async _copyLink() {
    if (!this.share) return;
    await this.share.copyLink();
    this.toast(t("share.copied"));
  }

  async _downloadCard() {
    if (!this.share) return;
    const ok = await this.share.downloadCard(this.lastResult || undefined);
    this.toast(ok ? t("share.downloaded") : t("share.failed"));
  }

  // ------------------------------------------------------------------ guide
  showGuide(step, steps) {
    const overlay = $("guide");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.classList.remove("step-0", "step-1", "step-2");
    overlay.classList.add(`step-${step}`);
    const key = steps[step] || "aim";
    if ($("guide-title")) $("guide-title").textContent = t(`tutorial.${key}.title`);
    if ($("guide-body")) $("guide-body").textContent = t(`tutorial.${key}.body`);
    if ($("guide-step")) $("guide-step").textContent = `${step + 1} / ${steps.length}`;
    if ($("guide-next-label")) {
      $("guide-next-label").textContent = step >= steps.length - 1 ? t("tutorial.done") : t("tutorial.next");
    }
    const dots = $("guide-dots");
    if (dots) {
      dots.innerHTML = steps.map((_, i) => `<span class="${i === step ? "on" : ""}"></span>`).join("");
    }
  }

  hideGuide() {
    $("guide")?.classList.add("hidden");
  }

  pulseBloom() {
    const button = $("bloom-btn");
    if (!button) return;
    button.classList.add("pulse");
    window.setTimeout(() => button.classList.remove("pulse"), 900);
  }

  // ------------------------------------------------------------------ domain
  showDomainLock({ host, url, delay, currentHost }) {
    this._hideScreens();
    this.loadingDone();
    $("domain-screen")?.classList.remove("hidden");
    this._domainTotal = delay || 3000;
    if ($("domain-host")) $("domain-host").textContent = host || "pipygames.com";
    if ($("domain-site")) $("domain-site").textContent = "pipygames.com";
    if ($("domain-current")) $("domain-current").textContent = currentHost || location.hostname;
    this.updateDomainLock(this._domainTotal);
  }

  updateDomainLock(leftMs) {
    const left = Math.max(0, Number(leftMs) || 0);
    const seconds = Math.ceil(left / 1000);
    if ($("domain-seconds")) $("domain-seconds").textContent = String(seconds);
    if ($("domain-fill")) $("domain-fill").style.width = `${clamp(left / (this._domainTotal || 3000), 0, 1) * 100}%`;
    if ($("domain-caption")) $("domain-caption").textContent = left > 0 ? t("domain.redirect", { host: "pipygames.com", n: seconds }) : t("domain.now");
  }

  // ------------------------------------------------------------------ ads
  showAd(options) {
    const screen = $("ad-screen");
    if (!screen) {
      options.resolve?.(false);
      return Promise.resolve(false);
    }
    screen.classList.remove("hidden");
    const note = screen.querySelector(".ad-note");
    if (note) note.textContent = options.text || t("ads.mockBody");
    const timer = $("ad-timer");
    const claim = $("ad-claim");
    const skip = $("ad-skip");
    if (claim) claim.classList.add("hidden");
    if (skip) skip.classList.remove("hidden");
    const duration = Math.max(1600, options.duration || 1600);
    const started = Date.now();
    this._adResolve = options.resolve;
    window.clearInterval(this._adTimer);
    this._adTimer = window.setInterval(() => {
      const left = Math.max(0, duration - (Date.now() - started));
      if (timer) timer.textContent = `${Math.ceil(left / 1000)}s`;
      if (left <= 0) {
        window.clearInterval(this._adTimer);
        if (skip) skip.classList.add("hidden");
        if (claim) claim.classList.remove("hidden");
        if (options.format === "interstitial") {
          window.setTimeout(() => this._finishAd(true), 350);
        }
      }
    }, 120);
    return new Promise((resolve) => {
      const previous = this._adResolve;
      this._adResolve = (ok) => {
        if (previous) previous(ok);
        resolve(ok);
      };
    });
  }

  _finishAd(ok) {
    window.clearInterval(this._adTimer);
    $("ad-screen")?.classList.add("hidden");
    const resolve = this._adResolve;
    this._adResolve = null;
    if (resolve) resolve(Boolean(ok));
  }

  // ------------------------------------------------------------------ result ads
  async _revive() {
    if (!this.game || !this.ads) return;
    if (!this.ads.enabled) {
      this.game.revive();
      return;
    }
    const ok = await this.ads.showRewarded("revive");
    if (ok) this.game.revive();
    else this.toast(t("share.failed"));
  }

  async _doubleStardust() {
    if (!this.game || !this.ads) return;
    if (!this.ads.enabled) {
      this.toast(t("toast.adsOff"));
      return;
    }
    const ok = await this.ads.showRewarded("doubleStardust");
    if (ok) {
      const data = this.game.resultData;
      if (data) {
        const extra = data.coins || 0;
        this.save?.addCoins(extra);
        data.coins = extra * 2;
        data.doubled = true;
        if ($("result-coins")) $("result-coins").textContent = n(data.coins);
        $("result-double")?.classList.add("hidden");
        this.toast(t("ads.rewardBody"));
      }
    }
  }

  // ------------------------------------------------------------------ misc
  toast(message, type = "") {
    const layer = $("toast-layer");
    if (!layer || !message) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    layer.appendChild(el);
    window.setTimeout(() => el.classList.add("show"), 20);
    window.setTimeout(() => {
      el.classList.remove("show");
      window.setTimeout(() => el.remove(), 350);
    }, 2600);
  }

  showHint(message, seconds = 4) {
    const bar = $("hint-bar");
    if (!bar || !message) return;
    bar.textContent = message;
    bar.classList.remove("hidden");
    bar.classList.remove("show");
    void bar.offsetWidth;
    bar.classList.add("show");
    window.clearTimeout(this._hintTimer);
    this._hintTimer = window.setTimeout(() => {
      bar.classList.remove("show");
      bar.classList.add("hidden");
    }, seconds * 1000);
  }

  flashPlanet() {
    const el = $("vital-planet");
    if (!el) return;
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
    window.setTimeout(() => el.classList.remove("hit"), 500);
  }

  flashHeal() {
    const el = $("vital-planet");
    if (!el) return;
    el.classList.add("heal");
    window.setTimeout(() => el.classList.remove("heal"), 600);
  }
}

export default UI;
