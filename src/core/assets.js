import { lang } from "./i18n.js";

const PLANET_FRAMES = 36;

const IMAGES = {
  bg: "assets/images/bg_space.webp",
  bgSmall: "assets/images/bg_space_small.webp",
  ringBack: "assets/images/planet/ring_back.webp",
  ringFront: "assets/images/planet/ring_front.webp",
  moonA: "assets/images/planet/moon_a.webp",
  moonB: "assets/images/planet/moon_b.webp",
  ship: "assets/images/ship.png",
  rockA: "assets/images/rock_a.png",
  rockB: "assets/images/rock_b.png",
  rockC: "assets/images/rock_c.png",
  rockSmall: "assets/images/rock_small.png",
  rockSpike: "assets/images/rock_spike.png",
  comet: "assets/images/comet.png",
  bossCinder: "assets/images/boss_cinder_body.png",
  bossCinderFist: "assets/images/boss_cinder_fist.png",
  bossMonarch: "assets/images/boss_monarch_body.png",
  bossMonarchFist: "assets/images/boss_monarch_fist.png",
  bolt: "assets/images/fx_bolt.png",
  boltBig: "assets/images/fx_bolt_big.png",
  glob: "assets/images/fx_glob.png",
  explosion: "assets/images/fx_explosion.png",
  hit: "assets/images/fx_hit.png",
  spark: "assets/images/fx_spark.png",
  petal: "assets/images/fx_petal.png",
  star: "assets/images/fx_star.png",
  shockwave: "assets/images/fx_shockwave.png",
  shield: "assets/images/fx_shield.png",
  portal: "assets/images/fx_portal.png",
  pollen: "assets/images/item_pollen.png",
  stardust: "assets/images/item_stardust.png",
  heal: "assets/images/item_heal.png",
  turret: "assets/images/turret.png",
  hand: "assets/images/guide_hand.png",
  arrow: "assets/images/guide_arrow.png",
  qr: "assets/images/ui/qr.png",
  logo: lang === "zh" ? "assets/images/ui/logo_zh.png" : "assets/images/ui/logo_en.png"
};

function resolveAsset(path) {
  const map = typeof window !== "undefined" ? window.__ASTRO_EMBEDDED__ : null;
  return (map && map.images && map.images[path]) || path;
}

function loadImage(path) {
  const source = resolveAsset(path);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.decode) {
        image.decode().then(() => resolve(image)).catch(() => resolve(image));
      } else {
        resolve(image);
      }
    };
    image.onerror = () => reject(new Error(`Image failed: ${path}`));
    image.src = source;
  });
}

export class AssetStore {
  constructor() {
    this.images = {};
    this.planetFrames = [];
    this.ready = false;
    this.progress = 0;
  }

  image(key) {
    return this.images[key] || null;
  }

  frame(time) {
    if (!this.planetFrames.length) return null;
    const index = Math.floor((time * 0.55) % this.planetFrames.length);
    return this.planetFrames[index];
  }

  async load(onProgress) {
    const tasks = [];
    const keys = Object.keys(IMAGES);
    const total = keys.length + PLANET_FRAMES;
    let done = 0;

    const tick = () => {
      done += 1;
      this.progress = done / total;
      if (onProgress) onProgress(this.progress);
    };

    for (const key of keys) {
      tasks.push(
        loadImage(IMAGES[key])
          .then((image) => {
            this.images[key] = image;
          })
          .catch((error) => {
            console.warn("[assets]", error.message);
          })
          .finally(tick)
      );
    }

    for (let i = 0; i < PLANET_FRAMES; i += 1) {
      const path = `assets/images/planet/planet_${String(i).padStart(2, "0")}.webp`;
      tasks.push(
        loadImage(path)
          .then((image) => {
            this.planetFrames[i] = image;
          })
          .catch((error) => {
            console.warn("[assets]", error.message);
          })
          .finally(tick)
      );
    }

    await Promise.all(tasks);
    this.planetFrames = this.planetFrames.filter(Boolean);
    this.ready = true;
    return this;
  }
}

export default AssetStore;
