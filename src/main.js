import { GAME_CONFIG } from "../config/game.config.js";
import { LEVELS } from "../config/levels.js";
import { DOMAINS } from "../config/domains.config.js";
import { ADS } from "../config/ads.config.js";
import { applyDocumentMeta, applyStaticTranslations, lang, t } from "./core/i18n.js";
import { SaveStore } from "./core/save.js";
import { AudioEngine } from "./core/audio.js";
import { AdService } from "./core/ads.js";
import { DomainGuard } from "./core/domain.js";
import { AssetStore } from "./core/assets.js";
import { ShareService } from "./core/share.js";
import { UI } from "./ui/ui.js";
import { Game } from "./game/game.js";
import { clamp, getQuery, isDebug } from "./core/utils.js";

const query = getQuery();
const debug = isDebug();
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

let ui = null;
let booted = false;

function reportFatal(error) {
  console.error("[AstroBloom] boot failed", error);
  try {
    if (ui) ui.showLoadingError(error && (error.message || String(error)));
  } catch (e) {
    /* last resort */
  }
}

window.addEventListener("error", (event) => {
  if (booted) return;
  reportFatal(event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  if (booted) return;
  reportFatal(event.reason);
});

function sdkOverrides() {
  return {
    appId: GAME_CONFIG.meta.id,
    appName: GAME_CONFIG.meta.titleEn,
    version: GAME_CONFIG.meta.version,
    domain: { ...DOMAINS },
    ads: {
      ...ADS,
      mockText: ADS.mockText
    },
    protect: {
      enabled: true,
      devtoolsAction: "off",
      devtoolsTrap: false,
      disableContextMenu: true,
      disableDevtoolsShortcuts: false,
      integrity: false,
      heartbeatMs: 0
    },
    tracking: {
      enabled: true,
      bufferSize: 240,
      endpoint: "",
      debug,
      autoEnv: true,
      storageKey: "astroBloom.events.v1"
    },
    save: { enabled: true, key: GAME_CONFIG.save.key }
  };
}

async function boot() {
  applyDocumentMeta();
  applyStaticTranslations();

  const sdk = typeof window !== "undefined" ? window.GameSDK : null;
  if (sdk && typeof sdk.init === "function") {
    try {
      sdk.init(sdkOverrides());
    } catch (error) {
      console.warn("[AstroBloom] SDK init failed — continuing", error);
    }
  }

  const save = new SaveStore(sdk);
  const audio = new AudioEngine(save.settings);
  // Browsers require a gesture before Web Audio can start. Unlock on the first
  // interaction anywhere (menu buttons included), not only on the canvas.
  window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
  window.addEventListener("keydown", () => audio.unlock(), { once: true });
  const ads = new AdService(sdk, ADS);
  ui = new UI({ save, audio, ads, sdk, config: GAME_CONFIG });
  ui.setLoading(0.04, "loading.assets");
  await frame();

  const assets = new AssetStore();
  const assetProgress = (p) => {
    ui.setLoading(0.06 + p * 0.72, "loading.assets");
  };
  try {
    await assets.load(assetProgress);
  } catch (error) {
    reportFatal(error);
    return;
  }
  ui.setAssets(assets);
  ui.setLoading(0.8, "loading.assets");
  await frame();

  try {
    await audio.loadAll((p) => ui.setLoading(0.8 + p * 0.16, "loading.assets"));
  } catch (error) {
    console.warn("[AstroBloom] audio preload issue", error);
  }
  ui.setLoading(0.97, "loading.ready");
  await frame();

  const canvas = document.getElementById("game-canvas");
  const game = new Game({ canvas, assets, save, audio, ads, ui, sdk, config: GAME_CONFIG });
  const share = new ShareService({ save, sdk, assets, game, config: GAME_CONFIG, audio });
  ui.init(game);
  ui.setShare(share);

  ads.bindOverlay({ show: (options) => ui.showAd(options) });
  ads.setHooks({
    onStart: () => game.onAdStart(),
    onEnd: () => game.onAdEnd()
  });

  try {
    if (sdk?.protect?.onPauseRequest) sdk.protect.onPauseRequest(() => game.pause());
  } catch (e) {
    /* optional */
  }

  const guard = new DomainGuard({ sdk, config: DOMAINS, ui });
  const inspection = guard.inspect();
  if (!inspection.allowed) {
    guard.guard({
      show: (options) => ui.showDomainLock(options),
      update: (left) => ui.updateDomainLock(left)
    });
    ui.loadingDone();
    booted = true;
    if (debug) window.__ASTRO__ = { game, ui, save, audio, ads, sdk, guard, share, assets };
    sdk?.trackLoad?.({
      app: GAME_CONFIG.meta.id,
      lang,
      blocked: true,
      host: inspection.host
    });
    return;
  }

  game.startMenu();
  game.applySettings(save.settings);
  audio.setSettings(save.settings);
  audio.playMusic("menu");
  ui.showMenu();
  ui.loadingDone();
  booted = true;

  const demo = query.get("demo") === "1";
  game.skipTutorial = demo || query.get("notut") === "1";
  const requestedLevel = Number(query.get("level"));
  const autoStart = query.get("autostart") === "1" || query.get("play") === "1" ||
    demo || (Number.isFinite(requestedLevel) && requestedLevel > 0);
  if (autoStart) {
    const levelId = clamp(
      Number.isFinite(requestedLevel) && requestedLevel > 0 ? requestedLevel : 1,
      1,
      LEVELS.length
    );
    ui.loadingDone();
    game.startLevel(levelId);
    if (demo) game.setDemo(true);
    sdk?.trackLoad?.({
      app: GAME_CONFIG.meta.id,
      lang,
      level: levelId,
      demo
    });
  } else {
    sdk?.trackLoad?.({
      app: GAME_CONFIG.meta.id,
      lang,
      levels: LEVELS.length,
      touch: ui.isTouch,
      ads: ads.enabled ? ads.provider : "off"
    });
  }

  if (debug) {
    window.__ASTRO__ = { game, ui, save, audio, ads, sdk, guard, share, assets };
    console.info("[AstroBloom] debug handle at window.__ASTRO__");
    if (query.get("reset") === "1") {
      save.resetProgress();
      ui.refreshAll?.();
    }
  }
}

boot().catch((error) => {
  reportFatal(error);
  try {
    document.body.classList.remove("is-loading");
    if (ui) ui.showLoadingError(t("error.body"));
  } catch (e) {
    /* ignored */
  }
});
