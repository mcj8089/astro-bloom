/**
 * ASTRO BLOOM — GARDEN GUARDIANS
 * Central tuning file: world, physics, camera, economy, UI and share settings.
 * Everything gameplay-related should be editable here without touching systems.
 */
export const GAME_CONFIG = {
  meta: {
    id: "astro-bloom",
    version: "1.0.0",
    titleEn: "Astro Bloom: Garden Guardians",
    titleZh: "星芽守卫：花园星环",
    studio: "Pipy Games",
    site: "https://pipygames.com",
    shareBaseUrl: "https://pipygames.com/astro-bloom/",
    /** Language used when no dev query override is present. */
    defaultLocale: "en",
    maxNameLength: 18
  },

  // ------------------------------------------------------------------ world
  world: {
    planetRadius: 210,          // design units at 1080p
    planetRadiusMin: 132,       // clamp for small screens
    planetRadiusMax: 250,
    planetScale: 0.165,         // planet radius = min(view) * planetScale
    planetScaleMin: 56,
    planetScaleMax: 178,
    orbitFactor: 1.55,          // ship orbit = planetRadius * orbitFactor
    ringTilt: -0.22,
    ringSquash: 0.30,
    orbitRadius: 330,
    orbitLanes: [0.86, 1.0, 1.16],
    startLane: 1,
    shipScale: 0.34,            // relative to min(view) / 1080
    shipHeightFactor: 0.46,     // ship height = planetRadius * shipHeightFactor
    shipBob: 3.2,
    backgroundParallax: 0.012,
    starCount: 130,
    ambientParticles: 46
  },

  // --------------------------------------------------------------- physics
  physics: {
    bulletSpeed: 980,
    bulletRate: 5.2,            // shots per second (upgraded)
    bulletDamage: 1,
    bulletRadius: 7,
    bulletLife: 1.55,
    spread: 0.018,
    aimSmoothing: 0.34,
    asteroidBaseSpeed: 38,      // units per second at 1080 scale
    asteroidSpeedUnit: 64,      // px/s scale for asteroid def.speed (was 54)
    asteroidSpeedPerLevel: 3.4,
    asteroidHpBase: 2,
    asteroidHpPerLevel: 0.55,
    asteroidDamage: 14,
    maxAsteroids: 34,
    planetHpBase: 100,
    comboWindow: 2.6,
    comboMax: 9,
    specialMax: 100,
    specialPerKill: 9,
    specialDamage: 10,
    shakeDecay: 5.5,
    maxShake: 26
  },

  // --------------------------------------------------------------- pacing
  pacing: {
    levelTimeScale: 0.6,        // compress all scripted wave times (smaller = shorter levels)
    bossEnterScale: 0.6,        // boss arrival time scale
    clearDelay: 2.0,            // seconds after last spawn before the level clears
    levelSpeedRamp: 0.22,       // extra speed multiplier gained across a level
    endlessBaseInterval: 1.35,  // endless spawn interval at t=0 (s)
    endlessMinInterval: 0.2,    // fastest endless spawn interval (s)
    endlessPressureTime: 95,    // seconds to reach full pressure
    endlessPressureCap: 2.3,    // max spawn-rate multiplier
    endlessSpeedTime: 170,      // seconds to reach max endless speed bonus
    endlessSpeedCap: 1.1        // max endless speed bonus (multiplier)
  },

  // --------------------------------------------------------------- economy
  economy: {
    stardustPerKill: 2,
    stardustPerBoss: 90,
    stardustPerLevel: 30,
    starBonus: [0, 10, 25, 50],
    reviveCost: 0,
    upgrades: [
      {
        id: "seedPower",
        nameKey: "garden.up.seedPower",
        descKey: "garden.up.seedPowerDesc",
        icon: "bolt",
        max: 5,
        baseCost: 120,
        growth: 1.75,
        effect: "+8% seed damage per level"
      },
      {
        id: "petalArmor",
        nameKey: "garden.up.petalArmor",
        descKey: "garden.up.petalArmorDesc",
        icon: "heart",
        max: 5,
        baseCost: 140,
        growth: 1.75,
        effect: "+18 planet shield per level"
      },
      {
        id: "nectarCore",
        nameKey: "garden.up.nectarCore",
        descKey: "garden.up.nectarCoreDesc",
        icon: "pollen",
        max: 4,
        baseCost: 160,
        growth: 1.8,
        effect: "+15% bloom charge per level"
      },
      {
        id: "bloomLuck",
        nameKey: "garden.up.bloomLuck",
        descKey: "garden.up.bloomLuckDesc",
        icon: "star",
        max: 4,
        baseCost: 180,
        growth: 1.85,
        effect: "+10% stardust per level"
      }
    ]
  },

  // ---------------------------------------------------------------- camera
  camera: {
    fov: 60,
    zoom: 1,
    shakeScale: 1,
    letterbox: 0.0
  },

  // ------------------------------------------------------------------ save
  save: {
    key: "astroBloom.save.v1",
    settings: {
      musicVolume: 0.55,
      sfxVolume: 0.78,
      mute: false,
      screenShake: 1,
      quality: "high"
    }
  },

  // ----------------------------------------------------------------- share
  share: {
    platforms: [
      "facebook", "x", "whatsapp", "telegram", "reddit",
      "linkedin", "youtube", "tiktok", "instagram"
    ],
    cardWidth: 1200,
    cardHeight: 630,
    defaultTextKey: "share.text",
    nativeThreshold: 0
  },

  // --------------------------------------------------------------- colours
  colors: {
    cream: "#fff7e8",
    ink: "#2a2350",
    mint: "#8ff7d4",
    mintDeep: "#2f9d77",
    peach: "#ffb98a",
    coral: "#ff7f9c",
    gold: "#ffd37d",
    sky: "#8fdcff",
    violet: "#8a6bff",
    plum: "#4a3a72"
  },

  // -------------------------------------------------------------- tutorial
  tutorial: {
    steps: ["aim", "fire", "special"],
    autoAdvance: false,
    hintAfterSeconds: 8
  }
};

export default GAME_CONFIG;
