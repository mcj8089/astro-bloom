import { GAME_CONFIG } from "../../config/game.config.js";
import { LEVELS, getLevel } from "../../config/levels.js";
import { t } from "../core/i18n.js";
import { TAU, clamp, lerp, rand, dist, choice } from "../core/utils.js";
import { lerpAngle, pointSegmentDistance, edgeSpawn, randomEdge } from "./physics.js";
import { Asteroid, EnemyRenderer } from "./enemy.js";
import { LevelRuntime, EndlessRuntime } from "./level.js";
import { Guide } from "./guide.js";
import { Scene } from "../art/scene.js";
import { ShipArt } from "../art/ship.js";
import { BossArt } from "../art/boss.js";
import { Effects } from "../art/effects.js";

const BULLET_TRAIL_COLORS = ["#b6ffe6", "#ffe8b0", "#ffc6e2"];

export class Game {
  constructor({ canvas, assets, save, audio, ads, ui, sdk, config = GAME_CONFIG }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.assets = assets;
    this.save = save;
    this.audio = audio;
    this.ads = ads;
    this.ui = ui;
    this.sdk = sdk;
    this.config = config;

    this.scene = new Scene(assets, config);
    this.shipArt = new ShipArt(assets, config);
    this.enemyRenderer = new EnemyRenderer(assets);
    this.bossArt = new BossArt(assets);
    this.effects = new Effects(assets);
    this.guide = new Guide(this);

    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.lastFrame = 0;
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this._bindInput();

    this.mode = "menu";
    this.status = "menu";
    this.playing = false;
    this.simulationPaused = false;
    this.timeScale = 1;
    this.time = 0;
    this.aim = -Math.PI / 2;
    this.lane = this.config.world.startLane;
    this.pointer = { x: 0, y: 0, down: false, inside: false };
    this.menuRocks = [];
    this._setupMenuAmbience();

    this.resetRunState();
    this.resize();
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.status === "playing") this.pause();
    });
    this.raf = requestAnimationFrame(this.loop);
  }

  // ------------------------------------------------------------------ setup
  resetRunState() {
    this.asteroids = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.turrets = [];
    this.portals = [];
    this.blackhole = null;
    this.boss = null;
    this.level = null;
    this.levelRuntime = null;
    this.endlessRuntime = null;
    this.planetMax = this.config.physics.planetHpBase;
    this.planetHp = this.planetMax;
    this.score = 0;
    this.kills = 0;
    this.stardustEarned = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.special = 0;
    this.pollenCount = 0;
    this.shootTimer = 0;
    this.shotCount = 0;
    this.shake = 0;
    this.levelTime = 0;
    this.dyingTimer = 0;
    this.winTimer = 0;
    this.bossWarningShown = false;
    this.revived = false;
    this.resultData = null;
    this.lossCommitted = false;
    this.growGoal = 6;
    this.growProgress = 0;
    this.firing = false;
    this.aim = -Math.PI / 2;
    this.lane = this.config.world.startLane;
    this.effects.reset();
    this.shipArt.reset();
  }

  _setupMenuAmbience() {
    this.menuRocks = [];
    for (let i = 0; i < 4; i += 1) {
      this.menuRocks.push({
        x: 0.15 + Math.random() * 0.7,
        y: 0.15 + Math.random() * 0.7,
        r: 0.035 + Math.random() * 0.04,
        a: Math.random() * TAU,
        speed: 0.008 + Math.random() * 0.012,
        type: ["rock", "rock_small", "comet", "rock"][i]
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || window.innerWidth);
    const height = Math.max(320, rect.height || window.innerHeight);
    this.width = width;
    this.height = height;
    const quality = this.save?.settings?.quality || "high";
    const cap = quality === "high" ? 2 : quality === "medium" ? 1.5 : 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.scene.resize(width, height);
    if (this.status === "menu") {
      this.scene.center.x = width > 760 ? width * 0.64 : width / 2;
    } else {
      this.scene.center.x = width / 2;
    }
    this.scene.center.y = height / 2;
    if (this.pointer.x === 0 && this.pointer.y === 0) {
      this.pointer.x = width / 2;
      this.pointer.y = height * 0.3;
    }
  }

  applySettings(settings) {
    if (!settings) return;
    this.config.camera.shakeScale = settings.screenShake == null ? 1 : settings.screenShake;
    this.audio?.setSettings?.(settings);
    this.resize();
  }

  // ------------------------------------------------------------------ input
  _bindInput() {
    const canvas = this.canvas;
    const toLocal = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    };

    this._onPointerMove = (event) => {
      const point = toLocal(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.inside = true;
      if (this.status !== "playing" || this.simulationPaused) return;
      const dx = point.x - this.scene.center.x;
      const dy = point.y - this.scene.center.y;
      if (dx * dx + dy * dy > Math.pow(this.scene.radius * 1.04, 2)) {
        this.aimTarget = Math.atan2(dy, dx);
        this.guide?.notify?.("aim");
      }
    };

    this._onPointerDown = (event) => {
      const point = toLocal(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.down = true;
      this.pointer.inside = true;
      this.audio?.unlock?.();
      if (this.status !== "playing" || this.simulationPaused) return;
      event.preventDefault();
      this.firing = true;
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch (e) {
        /* ignore */
      }
      if (event.pointerType !== "mouse") {
        const dx = point.x - this.scene.center.x;
        const dy = point.y - this.scene.center.y;
        if (dx * dx + dy * dy > Math.pow(this.scene.radius * 1.04, 2)) {
          this.aimTarget = Math.atan2(dy, dx);
          this.guide?.notify?.("aim");
        }
      }
    };

    this._onPointerUp = () => {
      this.pointer.down = false;
      this.firing = false;
    };

    this._onPointerLeave = () => {
      this.pointer.inside = false;
      this.firing = false;
    };

    canvas.addEventListener("pointermove", this._onPointerMove, { passive: true });
    canvas.addEventListener("pointerdown", this._onPointerDown, { passive: false });
    canvas.addEventListener("pointerup", this._onPointerUp, { passive: true });
    canvas.addEventListener("pointercancel", this._onPointerUp, { passive: true });
    canvas.addEventListener("pointerleave", this._onPointerLeave, { passive: true });

    this._onKeyDown = (event) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "p" || key === "escape") {
        if (this.status === "playing") this.pause();
        else if (this.status === "paused") this.resume();
        event.preventDefault();
        return;
      }
      if (key === "m") {
        const muted = this.audio?.toggleMute?.();
        this.ui?.setMuted?.(muted);
        this.ui?.toast?.(muted ? t("toast.muted") : t("toast.soundOn"));
        return;
      }
      if (this.status !== "playing" || this.simulationPaused) return;
      if (key === " ") {
        event.preventDefault();
        this.useSpecial();
      } else if (key === "a" || key === "arrowleft" || key === "q") {
        this.changeLane(-1);
      } else if (key === "d" || key === "arrowright" || key === "e") {
        this.changeLane(1);
      } else if (key === "1" || key === "2" || key === "3") {
        this.setLane(Number(key) - 1);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  // --------------------------------------------------------------- lifecycle
  startMenu() {
    this.mode = "menu";
    this.status = "menu";
    this.playing = false;
    this.simulationPaused = false;
    this.level = null;
    this.boss = null;
    this.asteroids = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.turrets = [];
    this.portals = [];
    this.blackhole = null;
    this.scene.menuMode = true;
    this.scene.lanes = false;
    this.scene.center.x = this.width > 760 ? this.width * 0.64 : this.width / 2;
    this.audio?.playMusic?.("menu");
    this.ui?.showMenu?.();
  }

  startCampaign() {
    const id = clamp(this.save?.data.lastLevel || this.save?.data.unlockedLevel || 1, 1, LEVELS.length);
    this.startLevel(id);
  }

  startLevel(levelId) {
    const level = getLevel(levelId);
    this.mode = "campaign";
    this.level = level;
    this.status = "playing";
    this.playing = true;
    this.simulationPaused = false;
    this.timeScale = 1;
    this.scene.menuMode = false;
    this.scene.center.x = this.width / 2;
    this.scene.center.y = this.height / 2;
    this.scene.lanes = Boolean(level.lanes);
    this.scene.activeLane = this.lane;
    this.resetRunState();
    this.level = level;
    this.lane = this.config.world.startLane;
    this.scene.activeLane = this.lane;
    this.planetMax = (level.planetHp || 100) + (this.save?.upgradeEffects?.planetHp || 0);
    this.planetHp = this.planetMax;
    this.aim = -Math.PI / 2;
    this.pointer.x = this.width / 2;
    this.pointer.y = this.height * 0.2;
    this.aimTarget = this.aim;
    this.growGoal = level.turretGoal || 6;
    this.growProgress = 0;
    this.ambientTimer = 4.5;
    this.levelRuntime = new LevelRuntime(level, this);
    this.endlessRuntime = null;
    this.audio?.playMusic?.(level.music || "battle");
    this.save?.setLastLevel?.(level.id);
    this.sdk?.trackStart?.({ level: level.id, mode: "campaign" });
    this.ui?.hideAll?.();
    this.ui?.showHUD?.(level);
    this.ui?.onLevelStart?.(level);
    const hint = this.levelRuntime.hintKey;
    if (hint && !level.tutorial) {
      this.ui?.showHint?.(t(hint), 5.2);
    }
    if (!this.skipTutorial) this.guide.maybeStart(level);
    this._updateHUD();
  }

  startEndless() {
    this.mode = "endless";
    this.level = null;
    this.status = "playing";
    this.playing = true;
    this.simulationPaused = false;
    this.timeScale = 1;
    this.scene.menuMode = false;
    this.scene.center.x = this.width / 2;
    this.scene.center.y = this.height / 2;
    this.scene.lanes = false;
    this.resetRunState();
    this.planetMax = this.config.physics.planetHpBase + (this.save?.upgradeEffects?.planetHp || 0);
    this.planetHp = this.planetMax;
    this.aim = -Math.PI / 2;
    this.aimTarget = this.aim;
    this.endlessRuntime = new EndlessRuntime(this);
    this.levelRuntime = null;
    this.growGoal = 6;
    this.audio?.playMusic?.("battle");
    this.sdk?.trackStart?.({ mode: "endless" });
    this.ui?.hideAll?.();
    this.ui?.showHUD?.({ id: 0, nameKey: "endless.title", mechanic: "endless", endless: true });
    this.ui?.onLevelStart?.({
      id: 0,
      nameKey: "endless.title",
      descKey: "endless.subtitle",
      tagKey: "",
      mechanic: "endless"
    });
    this._updateHUD();
  }

  restart() {
    if (this.status === "result") this.finalizeLoss();
    if (this.mode === "endless") {
      this.startEndless();
      return;
    }
    if (this.level) this.startLevel(this.level.id);
    else this.startCampaign();
  }

  retryLevel() {
    if (this.status === "result") this.finalizeLoss();
    this.restart();
  }

  nextLevel() {
    if (!this.level) {
      this.startCampaign();
      return;
    }
    if (this.level.id >= LEVELS.length) {
      this.quitToMenu();
      return;
    }
    this.startLevel(this.level.id + 1);
  }

  pause() {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.firing = false;
    this.ui?.showPause?.();
    this.sdk?.trackCustom?.("pause", { level: this.level?.id || 0 });
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.ui?.hidePause?.();
    this.audio?.unlock?.();
  }

  quitToMenu() {
    if (this.status === "result") this.finalizeLoss();
    this.resetRunState();
    this.startMenu();
    this.ui?.showMenu?.();
    this.scene.menuMode = true;
    this.scene.lanes = false;
    this.scene.center.x = this.width > 760 ? this.width * 0.64 : this.width / 2;
  }

  onAdStart() {
    if (this.status === "playing") {
      this._adResume = true;
      this.status = "paused";
      this.firing = false;
    }
    this.audio?.setAdMuted?.(true);
  }

  onAdEnd() {
    this.audio?.setAdMuted?.(false);
    if (this._adResume && this.status === "paused") {
      this.status = "playing";
      this._adResume = false;
    }
  }

  // ------------------------------------------------------------------ actions
  changeLane(direction) {
    if (this.status !== "playing" || !this.scene.lanes) return;
    const lanes = this.config.world.orbitLanes.length;
    this.setLane(clamp(this.lane + direction, 0, lanes - 1));
  }

  setLane(index) {
    const lanes = this.config.world.orbitLanes.length;
    const next = clamp(index, 0, lanes - 1);
    if (next === this.lane) return;
    this.lane = next;
    this.scene.activeLane = next;
    this.audio?.play?.("lane", { volume: 0.5 });
    this.effects.ring(
      this.scene.center.x + Math.cos(this.aim) * this.shipOrbit,
      this.scene.center.y + Math.sin(this.aim) * this.shipOrbit,
      40, "#b9ffe8", 0.4
    );
    this.ui?.updateLane?.(this.lane);
  }

  useSpecial() {
    if (this.status !== "playing" || this.simulationPaused) return false;
    if (this.special < 100) {
      this.audio?.play?.("click");
      return false;
    }
    this.special = 0;
    const { center, radius } = this.scene;
    this.effects.bloomBurst(center.x, center.y, radius * 2.1);
    this.audio?.play?.("burst", { volume: 1 });
    this.shake = Math.max(this.shake, 16);
    for (const rock of this.asteroids) {
      if (rock.dead) continue;
      const d = dist(rock.x, rock.y, center.x, center.y);
      if (d > radius * 3.4) continue;
      rock.hp -= 6;
      rock.flash = 1;
      if (rock.hp <= 0) this.destroyAsteroid(rock, { specialKill: true });
    }
    this.enemyBullets.forEach((bullet) => {
      bullet.dead = true;
      this.effects.hit(bullet.x, bullet.y, 0.8, "#ffd6ea");
    });
    if (this.boss) {
      this.damageBoss(22, false);
    }
    this.damagePlanet(0);
    this.sdk?.trackCustom?.("special", { level: this.level?.id || 0 });
    this.ui?.setSpecial?.(0);
    this.ui?.toast?.(t("hud.burst"));
    this.guide?.notify?.("special");
    return true;
  }

  // ------------------------------------------------------------------ helpers
  get shipOrbit() {
    const lanes = this.scene.lanes ? this.config.world.orbitLanes : [1];
    const factor = lanes[this.lane] || 1;
    return this.scene.orbit * factor;
  }

  get shipPosition() {
    const orbit = this.shipOrbit;
    return {
      x: this.scene.center.x + Math.cos(this.aim) * orbit,
      y: this.scene.center.y + Math.sin(this.aim) * orbit
    };
  }

  get shipRadius() {
    return this.scene.radius * 0.3;
  }

  _spawnFromAngle(type, angle, options = {}) {
    const spawn = edgeSpawn(this.width, this.height, this.scene.radius * 0.9, angle);
    return this.spawnAsteroid(type, {
      ...options,
      x: spawn.x,
      y: spawn.y,
      angleOffset: 0
    });
  }

  spawnAsteroid(type, options = {}) {
    if (this.asteroids.length > this.config.physics.maxAsteroids) return null;
    const unit = this.scene.radius / 210;
    let x = options.x;
    let y = options.y;
    if (x == null || y == null) {
      const spawn = randomEdge(this.width, this.height, this.scene.radius * 0.8);
      x = spawn.x;
      y = spawn.y;
    }
    const level = this.level;
    const angleOffset = options.angleOffset || 0;
    const targetX = this.scene.center.x + Math.cos(angleOffset) * this.scene.radius * 0.3;
    const targetY = this.scene.center.y + Math.sin(angleOffset) * this.scene.radius * 0.3;
    const rock = new Asteroid({
      type,
      x,
      y,
      targetX,
      targetY,
      unit,
      speedMul: options.speedMul ?? (level?.speedMul || 1),
      hpMul: options.hpMul ?? (level?.hpMul || 1),
      damageMul: options.damageMul || 1,
      elite: Boolean(options.elite),
      radiusMul: options.radiusMul || 1
    });
    if (options.velocity) {
      rock.vx = options.velocity.x;
      rock.vy = options.velocity.y;
      rock.angle = Math.atan2(rock.vy, rock.vx);
    }
    this.asteroids.push(rock);
    return rock;
  }

  spawnPollen() {
    const angle = rand(0, TAU);
    const lane = Math.floor(rand(0, 3));
    const rr = this.scene.radius * (1.25 + lane * 0.22);
    const pickup = {
      kind: "pollen",
      x: this.scene.center.x + Math.cos(angle) * rr,
      y: this.scene.center.y + Math.sin(angle) * rr,
      vx: Math.cos(angle + Math.PI / 2) * rand(8, 26),
      vy: Math.sin(angle + Math.PI / 2) * rand(8, 26) - 6,
      radius: this.scene.radius * 0.11,
      life: 0,
      max: 16,
      phase: rand(0, TAU),
      dead: false
    };
    this.pickups.push(pickup);
  }

  spawnHeal(x, y) {
    this.pickups.push({
      kind: "heal",
      x, y,
      vx: rand(-20, 20),
      vy: rand(-30, -6),
      radius: this.scene.radius * 0.1,
      life: 0,
      max: 12,
      phase: rand(0, TAU),
      dead: false
    });
  }

  triggerPortal() {
    const active = this.asteroids.filter((rock) => !rock.dead);
    if (!active.length) {
      for (let i = 0; i < 2; i += 1) {
        const p = randomEdge(this.width, this.height, 30);
        this.portals.push({
          x: clamp(p.x, 40, this.width - 40),
          y: clamp(p.y, 60, this.height - 60),
          radius: this.scene.radius * 0.42,
          phase: rand(0, TAU),
          life: 0,
          max: 2.6
        });
      }
      return;
    }
    const rock = choice(active);
    const from = { x: rock.x, y: rock.y };
    const p = randomEdge(this.width, this.height, 20);
    const to = { x: clamp(p.x, 50, this.width - 50), y: clamp(p.y, 70, this.height - 70) };
    this.portals.push({
      x: from.x, y: from.y, radius: this.scene.radius * 0.5,
      phase: rand(0, TAU), life: 0, max: 1.8
    });
    this.portals.push({
      x: to.x, y: to.y, radius: this.scene.radius * 0.5,
      phase: rand(0, TAU), life: 0, max: 1.8
    });
    rock.x = to.x;
    rock.y = to.y;
    const angle = Math.atan2(this.scene.center.y - to.y, this.scene.center.x - to.x);
    rock.vx = Math.cos(angle) * rock.speed;
    rock.vy = Math.sin(angle) * rock.speed;
    this.effects.ring(from.x, from.y, this.scene.radius * 0.8, "#c9b6ff", 0.5);
    this.effects.ring(to.x, to.y, this.scene.radius * 0.8, "#a9ffe8", 0.5);
    this.audio?.play?.("portal", { volume: 0.65 });
  }

  spawnBoss(def, level) {
    const width = this.bossArt.widthFor(this.scene);
    this.boss = {
      id: def.id,
      def,
      level,
      nameKey: def.nameKey,
      titleKey: def.titleKey,
      x: this.scene.center.x + this.scene.radius * 1.7,
      y: this.scene.center.y - this.scene.radius * 1.4 - width * 0.5,
      targetX: this.scene.center.x + this.scene.radius * 1.9,
      targetY: this.scene.center.y - this.scene.radius * 0.45,
      width,
      hp: def.hp,
      maxHp: def.hp,
      phase: 1,
      state: "enter",
      enterT: 0,
      enterScale: 0.35,
      flash: 0,
      phaseFlash: 0,
      coreExposed: 0,
      attackTimer: 2.2,
      attack: null,
      attackIndex: 0,
      fists: [],
      laser: { state: "idle", angle: 0, end: null, t: 0, hitTimer: 0 },
      defeated: false,
      deathTimer: 0,
      hurtTilt: 0
    };
    this.ui?.showBossWarning?.(t(def.nameKey));
    this.ui?.showBoss?.({
      name: t(def.nameKey),
      title: t(def.titleKey),
      hp: def.hp,
      maxHp: def.hp
    });
    this.audio?.play?.("boss_roar", { volume: 0.9 });
    this.shake = 12;
    this.sdk?.trackCustom?.("boss_spawn", { boss: def.id, level: level.id });
  }

  // ------------------------------------------------------------------ update
  loop(timestamp) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.lastFrame) this.lastFrame = timestamp;
    const raw = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;
    const dt = clamp(raw, 0, 0.05);
    this.update(dt);
    this.render();
  }

  update(dt) {
    this.time += dt;
    this.scene.update(dt, this.pointer);
    this.effects.update(dt);
    this.shake = Math.max(0, this.shake - dt * this.config.physics.shakeDecay);

    if (this.status === "menu") {
      this.aim = -Math.PI / 2 + Math.sin(this.time * 0.35) * 0.45;
      this.scene.planetFlash = Math.max(0, this.scene.planetFlash - dt);
      return;
    }

    if (this.status === "paused" || this.simulationPaused) {
      return;
    }

    if (this.status === "playing") {
      this.updatePlaying(dt);
    } else if (this.status === "dying") {
      this.dyingTimer -= dt;
      this.updateEntities(dt, true);
      if (this.dyingTimer <= 0) this.showResult(false);
    } else if (this.status === "won") {
      this.winTimer -= dt;
      this.timeScale = lerp(this.timeScale, 0.35, dt * 3);
      this.updateEntities(dt * this.timeScale, true);
      if (this.winTimer <= 0) this.showResult(true);
    } else if (this.status === "result") {
      this.updateEntities(dt, true);
    }
  }

  setDemo(enabled) {
    this.demo = Boolean(enabled);
    if (this.demo) {
      this.firing = true;
      this._demoSpecialAt = this.time + 6;
    }
  }

  updatePlaying(dt) {
    this.levelTime += dt;
    if (this.demo) this._updateDemo(dt);
    this.aimTarget = this.aimTarget == null ? this.aim : this.aimTarget;
    this.aim = lerpAngle(this.aim, this.aimTarget, 1 - Math.pow(0.002, dt));
    this.scene.activeLane = this.lane;

    // The lesson holds the waves back so the sky stays safe while it runs.
    const lesson = this.guide.active;
    if (lesson) this.guide.update(dt);
    if (this.levelRuntime && !lesson) this.levelRuntime.update(dt);
    if (this.endlessRuntime) this.endlessRuntime.update(dt);

    if (this.scene.lanes) {
      this.scene.lanes = true;
    }

    this.updateWells(dt);
    this.updateBoss(dt);
    this.updateEntities(dt, false);
    if (!lesson) this.updateSpawning(dt);

    if (this.firing) {
      this.shootTimer -= dt;
      const rate = this.config.physics.bulletRate;
      while (this.shootTimer <= 0) {
        this.fireBullet();
        this.shootTimer += 1 / rate;
      }
    } else {
      this.shootTimer = Math.max(0, this.shootTimer - dt);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this._updateHUD();
  }

  /** Deterministic-ish attract mode used for real screen recordings / QA. */
  _updateDemo(dt) {
    this.firing = true;
    let target = null;
    let best = Infinity;
    for (const rock of this.asteroids) {
      if (rock.dead) continue;
      const d = dist(rock.x, rock.y, this.scene.center.x, this.scene.center.y);
      if (d < best) {
        best = d;
        target = rock;
      }
    }
    if (this.boss && !this.boss.defeated) {
      const dBoss = dist(this.boss.x, this.boss.y, this.scene.center.x, this.scene.center.y);
      if (!target || dBoss < best * 1.6) target = this.boss;
    }
    if (target) {
      const angle = Math.atan2(target.y - this.scene.center.y, target.x - this.scene.center.x);
      this.aimTarget = angle + Math.sin(this.time * 1.8) * 0.045;
    } else {
      this.aimTarget = -Math.PI / 2 + Math.sin(this.time * 0.5) * 0.9;
    }
    if (this.special >= 100 && this.time > (this._demoSpecialAt || 0) &&
      this.asteroids.length > 6) {
      this.useSpecial();
      this._demoSpecialAt = this.time + 11;
    }
    // Pick up pollen by drifting lanes occasionally (level 3/8).
    if (this.scene.lanes && this.pickups.length && Math.random() < dt * 0.7) {
      const pickup = this.pickups.find((p) => p.kind === "pollen");
      if (pickup) {
        const laneAngle = Math.atan2(
          pickup.y - this.scene.center.y,
          pickup.x - this.scene.center.x
        );
        this.aimTarget = laneAngle;
      }
    }
  }

  updateWells(dt) {
    if (!this.level || !this.level.gravity) {
      this.blackhole = null;
      return;
    }
    if (!this.blackhole) {
      this.blackhole = {
        x: this.scene.center.x + rand(-1, 1) * this.scene.radius * 1.25,
        y: this.scene.center.y + rand(-1, 1) * this.scene.radius * 0.9,
        radius: this.scene.radius * 0.34,
        strength: this.level.gravity.strength,
        angle: rand(0, TAU),
        drift: this.level.gravity.drift
      };
    }
    const well = this.blackhole;
    well.angle += dt * 0.22;
    well.x = this.scene.center.x + Math.cos(well.angle) * this.scene.radius * 1.35;
    well.y = this.scene.center.y + Math.sin(well.angle * 0.8) * this.scene.radius * 1.0;
  }

  updateEntities(dt, decorativeOnly) {
    const world = {
      centerX: this.scene.center.x,
      centerY: this.scene.center.y,
      well: this.blackhole
    };

    // asteroids
    for (const rock of this.asteroids) {
      if (rock.dead) continue;
      rock.update(dt, world);
      if (dist(rock.x, rock.y, this.scene.center.x, this.scene.center.y) <
        this.scene.radius * 0.96 + rock.radius * 0.35) {
        rock.dead = true;
        this.damagePlanet(rock.damage, rock.x, rock.y);
        this.effects.explosion(rock.x, rock.y, 1.1, { petals: 12 });
        this.audio?.play?.("planet");
      } else if (
        this.blackhole &&
        dist(rock.x, rock.y, this.blackhole.x, this.blackhole.y) < this.blackhole.radius * 0.35
      ) {
        rock.dead = true;
        this.effects.ring(this.blackhole.x, this.blackhole.y, 90, "#d6b6ff", 0.5);
        this.audio?.play?.("hit");
      }
    }

    // player bullets
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      if (this.blackhole) {
        const dx = this.blackhole.x - bullet.x;
        const dy = this.blackhole.y - bullet.y;
        const d2 = dx * dx + dy * dy;
        const rr = this.blackhole.radius * 3;
        if (d2 < rr * rr && d2 > 40) {
          const d = Math.sqrt(d2);
          const f = 9000 * (1 - d / rr) * dt / d;
          bullet.vx += dx * f;
          bullet.vy += dy * f;
        }
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -80 || bullet.y < -80 ||
        bullet.x > this.width + 80 || bullet.y > this.height + 80) {
        bullet.dead = true;
      }
      if (Math.random() < 0.55) {
        this.effects.trail(bullet.x, bullet.y, bullet.big ? "#ffd6a0" : "#b8ffe6",
          bullet.big ? 4 : 2.4);
      }
    }

    // enemy bullets
    for (const bullet of this.enemyBullets) {
      if (bullet.dead) continue;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (this.blackhole) {
        const dx = this.blackhole.x - bullet.x;
        const dy = this.blackhole.y - bullet.y;
        const d2 = dx * dx + dy * dy;
        const rr = this.blackhole.radius * 2.4;
        if (d2 < rr * rr && d2 > 60) {
          const d = Math.sqrt(d2);
          const f = 2600 * (1 - d / rr) * dt / d;
          bullet.vx += dx * f;
          bullet.vy += dy * f;
        }
      }
      if (dist(bullet.x, bullet.y, this.scene.center.x, this.scene.center.y) <
        this.scene.radius * 0.94) {
        bullet.dead = true;
        this.damagePlanet(bullet.damage, bullet.x, bullet.y);
        this.effects.hit(bullet.x, bullet.y, 1.2, "#ffb6d6");
        continue;
      }
      const ship = this.shipPosition;
      if (dist(bullet.x, bullet.y, ship.x, ship.y) < this.shipRadius * 0.7) {
        bullet.dead = true;
        this.special = clamp(this.special + 3, 0, 100);
        this.effects.hit(bullet.x, bullet.y, 0.9, "#b9ffe8");
        this.audio?.play?.("shield", { volume: 0.4 });
        continue;
      }
      if (bullet.life <= 0 || bullet.x < -60 || bullet.y < -60 ||
        bullet.x > this.width + 60 || bullet.y > this.height + 60) {
        bullet.dead = true;
      }
    }

    if (!decorativeOnly) {
      this.resolveCollisions(dt);
      this.updatePickups(dt);
      this.updateTurrets(dt);
    } else {
      this.updatePickups(dt);
    }

    for (const portal of this.portals) {
      portal.life += dt;
    }
    this.portals = this.portals.filter((p) => p.life < p.max);

    this.asteroids = this.asteroids.filter((rock) => !rock.dead);
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.enemyBullets = this.enemyBullets.filter((bullet) => !bullet.dead);
    this.pickups = this.pickups.filter((pickup) => !pickup.dead);
  }

  updateSpawning(dt) {
    // Keep a gentle trickle of critters between scripted waves so the sky never
    // feels empty on a small screen.
    if (!this.level || this.level.boss) return;
    if (this.level.mechanic === "rain") return;
    if (!this.levelRuntime || this.levelRuntime.elapsed < 6) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = clamp(5.5 - (this.level.id || 1) * 0.22, 2.6, 5.5) * rand(0.75, 1.25);
      if (this.asteroids.length < 7) {
        this.spawnAsteroid(this.level.id > 5 ? "comet" : "rock", {
          speedMul: (this.level.speedMul || 1) * 0.92
        });
      }
    }
  }

  resolveCollisions() {
    const ship = this.shipPosition;

    for (const bullet of this.bullets) {
      if (bullet.dead) continue;

      // boss fists are shootable
      if (this.boss && !this.boss.defeated) {
        for (const fist of this.boss.fists) {
          if (!fist.visible || fist.state === "dead") continue;
          const radius = this.boss.width * 0.12;
          if (dist(bullet.x, bullet.y, fist.x, fist.y) < radius + bullet.radius) {
            fist.hp -= bullet.damage;
            bullet.dead = true;
            this.effects.hit(bullet.x, bullet.y, 1, "#ffd6a0");
            this.audio?.play?.("boss_hit", { volume: 0.35 });
            if (fist.hp <= 0) {
              fist.state = "dead";
              fist.visible = false;
              this.effects.explosion(fist.x, fist.y, 1.1, { petals: 12 });
              this.audio?.play?.("explode");
            }
            break;
          }
        }
        if (bullet.dead) continue;
      }

      for (const rock of this.asteroids) {
        if (rock.dead) continue;
        if (!this._circleHit(bullet.x, bullet.y, bullet.radius, rock.x, rock.y, rock.radius * 0.92)) {
          continue;
        }
        if (rock.blocksFrom(bullet.x, bullet.y)) {
          bullet.dead = true;
          this.effects.hit(bullet.x, bullet.y, 0.9, "#cfb6ff");
          this.audio?.play?.("shield", { volume: 0.35 });
          break;
        }
        bullet.dead = true;
        const dead = rock.hit(bullet.damage);
        this.effects.hit(bullet.x, bullet.y, rock.radius > 30 ? 1.05 : 0.8);
        this.audio?.play?.("hit", { volume: 0.3, rate: rand(0.9, 1.15) });
        if (dead) this.destroyAsteroid(rock);
        break;
      }
      if (bullet.dead) continue;

      // enemy projectiles can be shot down
      for (const ball of this.enemyBullets) {
        if (ball.dead) continue;
        if (this._circleHit(bullet.x, bullet.y, bullet.radius, ball.x, ball.y, ball.radius * 1.2)) {
          ball.dead = true;
          bullet.dead = true;
          this.special = clamp(this.special + 2, 0, 100);
          this.effects.hit(ball.x, ball.y, 1, "#ffc6e4");
          this.audio?.play?.("hit", { volume: 0.25 });
          break;
        }
      }
      if (bullet.dead) continue;

      if (this.boss && !this.boss.defeated) {
        const boss = this.boss;
        const radius = Math.min(boss.width * 0.38, boss.width * 0.5);
        if (this._circleHit(bullet.x, bullet.y, bullet.radius, boss.x, boss.y, radius)) {
          bullet.dead = true;
          const core = boss.corePos;
          const crit = boss.coreExposed > 0 && core &&
            dist(bullet.x, bullet.y, core.x, core.y) < boss.width * 0.2;
          this.damageBoss(bullet.damage * (crit ? 2 : 1), crit);
          this.effects.hit(bullet.x, bullet.y, 1.1, crit ? "#ffe2a0" : "#ffd6d6");
        }
      }
    }
  }

  _circleHit(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const rr = ar + br;
    return dx * dx + dy * dy <= rr * rr;
  }

  updatePickups(dt) {
    const ship = this.shipPosition;
    for (const pickup of this.pickups) {
      pickup.life += dt;
      pickup.phase += dt;
      // drift gently toward the planet then get pulled to the guardian
      const d = dist(pickup.x, pickup.y, ship.x, ship.y);
      if (d < this.scene.radius * 1.7) {
        const pull = 340 * dt;
        pickup.x += (ship.x - pickup.x) / d * pull;
        pickup.y += (ship.y - pickup.y) / d * pull;
      } else {
        pickup.x += pickup.vx * dt;
        pickup.y += pickup.vy * dt;
        pickup.vx *= 0.995;
        pickup.vy *= 0.995;
      }
      if (d < this.shipRadius * 1.1 + pickup.radius) {
        pickup.dead = true;
        this.collectPickup(pickup);
      }
      if (pickup.life > pickup.max) pickup.dead = true;
      if (dist(pickup.x, pickup.y, this.scene.center.x, this.scene.center.y) <
        this.scene.radius * 0.95) {
        pickup.dead = true;
      }
    }
  }

  collectPickup(pickup) {
    if (pickup.kind === "pollen") {
      this.pollenCount += 1;
      this.growProgress += 1;
      this.special = clamp(this.special + 14 * (this.save?.upgradeEffects?.charge || 1), 0, 100);
      this.effects.pickupBurst(pickup.x, pickup.y, "#ffe39c");
      this.audio?.play?.("pickup", { volume: 0.55 });
      if (this.growProgress >= this.growGoal && this.turrets.length < 3) {
        this.growProgress = 0;
        this.addTurret();
      }
      this.stardustEarned += 3;
      this.sdk?.trackCustom?.("pollen", { count: this.pollenCount });
    } else if (pickup.kind === "heal") {
      this.planetHp = Math.min(this.planetMax, this.planetHp + this.planetMax * 0.1);
      this.effects.pickupBurst(pickup.x, pickup.y, "#b6ffe6");
      this.effects.text(pickup.x, pickup.y - 10, `+${Math.round(this.planetMax * 0.1)}`, { color: "#b6ffe6" });
      this.audio?.play?.("grow", { volume: 0.6 });
      this.ui?.flashHeal?.();
    }
  }

  addTurret() {
    const index = this.turrets.length;
    this.turrets.push({
      angle: (index / 3) * TAU + 0.6,
      radius: this.scene.radius * 1.42,
      cooldown: 0.4,
      phase: rand(0, TAU)
    });
    this.effects.ring(this.scene.center.x, this.scene.center.y, this.scene.radius * 2.2, "#b9ffe8", 0.8);
    this.audio?.play?.("grow");
    this.ui?.toast?.(t("hud.turrets", { n: this.turrets.length }));
    this.sdk?.trackCustom?.("turret_grown", { count: this.turrets.length });
  }

  updateTurrets(dt) {
    if (!this.turrets.length) return;
    for (const turret of this.turrets) {
      turret.angle += dt * 0.12;
      turret.cooldown -= dt;
      const x = this.scene.center.x + Math.cos(turret.angle) * turret.radius;
      const y = this.scene.center.y + Math.sin(turret.angle) * turret.radius;
      if (turret.cooldown > 0) continue;
      let target = null;
      let best = Infinity;
      for (const rock of this.asteroids) {
        const d = dist(x, y, rock.x, rock.y);
        if (d < best) {
          best = d;
          target = rock;
        }
      }
      if (!target && this.boss && !this.boss.defeated) {
        target = this.boss;
        best = dist(x, y, target.x, target.y);
      }
      if (!target || best > this.scene.radius * 4.6) continue;
      turret.cooldown = 1.15;
      const angle = Math.atan2(target.y - y, target.x - x);
      this.bullets.push({
        x, y,
        vx: Math.cos(angle) * this.config.physics.bulletSpeed * 0.9,
        vy: Math.sin(angle) * this.config.physics.bulletSpeed * 0.9,
        radius: this.config.physics.bulletRadius * 0.8,
        damage: 1,
        life: 1.4,
        dead: false,
        angle,
        big: false
      });
      this.audio?.play?.("shoot", { volume: 0.18, rate: 1.35 });
      turret.flash = 1;
    }
  }

  fireBullet() {
    this.guide?.notify?.("fire");
    const ship = this.shipPosition;
    const shipLength = this.scene.radius * 0.32;
    const x = ship.x + Math.cos(this.aim) * shipLength * 0.55;
    const y = ship.y + Math.sin(this.aim) * shipLength * 0.55;
    const big = this.shotCount % 7 === 6;
    const spread = rand(-this.config.physics.spread, this.config.physics.spread);
    const angle = this.aim + spread;
    const speed = this.config.physics.bulletSpeed * (this.scene.radius / 210) * (big ? 0.94 : 1);
    this.bullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: this.config.physics.bulletRadius * (big ? 1.9 : 1) * (this.scene.radius / 210),
      damage: this.config.physics.bulletDamage * (this.save?.upgradeEffects?.damage || 1) * (big ? 2.2 : 1),
      life: this.config.physics.bulletLife,
      dead: false,
      angle,
      big
    });
    this.shotCount += 1;
    this.special = clamp(this.special + 0.9 * (this.save?.upgradeEffects?.charge || 1), 0, 100);
    this.audio?.play?.(big ? "shoot_big" : "shoot", {
      volume: big ? 0.55 : 0.34,
      rate: rand(0.96, 1.06),
      minGap: big ? 80 : 38
    });
    this.effects.trail(x, y, BULLET_TRAIL_COLORS[this.shotCount % 3], big ? 5 : 3);
  }

  damagePlanet(amount, x = null, y = null) {
    if (this.status !== "playing" || amount <= 0) return;
    this.planetHp = Math.max(0, this.planetHp - amount);
    this.scene.flashPlanet(Math.min(1, amount / 18));
    this.shake = Math.min(this.config.physics.maxShake, this.shake + Math.min(18, 6 + amount * 0.35));
    const impact = x == null
      ? { x: this.scene.center.x + this.scene.radius * 0.9, y: this.scene.center.y }
      : { x, y };
    this.effects.explosion(impact.x, impact.y, 1.2, { petals: 8 });
    this.audio?.play?.("planet", { volume: 0.9 });
    this.ui?.flashPlanet?.();
    this.ui?.updatePlanet?.(this.planetHp, this.planetMax);
    if (this.planetHp <= 0) this.triggerGameOver();
  }

  destroyAsteroid(rock, options = {}) {
    if (rock.dead) return;
    rock.dead = true;
    const scale = clamp(rock.radius / (this.scene.radius * 0.16), 0.7, 1.6);
    this.effects.explosion(rock.x, rock.y, scale, { petals: rock.elite ? 18 : 12 });
    this.audio?.play?.("explode", { volume: 0.55, rate: rand(0.92, 1.08) });
    this.kills += 1;
    this.combo = Math.min(this.config.physics.comboMax, this.combo + 1);
    this.comboTimer = this.config.physics.comboWindow;
    const mult = 1 + (this.combo - 1) * 0.22;
    const gained = Math.round(rock.score * 8 * mult);
    this.score += gained;
    this.special = clamp(
      this.special + this.config.physics.specialPerKill * (this.save?.upgradeEffects?.charge || 1),
      0, 100
    );
    const dust = Math.max(1, Math.round(
      this.config.economy.stardustPerKill * (rock.elite ? 3 : 1) *
      (this.save?.upgradeEffects?.luck || 1)
    ));
    this.stardustEarned += dust;
    if (this.combo >= 3) {
      this.effects.text(rock.x, rock.y - rock.radius, `+${gained}`, {
        color: this.combo >= 6 ? "#ffd37d" : "#fff2cc",
        size: this.combo >= 6 ? 28 : 22
      });
    }
    if (rock.splitInto) {
      for (let i = 0; i < rock.splitInto; i += 1) {
        const child = this.spawnAsteroid("rock_small", {
          x: rock.x + Math.cos(i * Math.PI + 0.4) * rock.radius * 0.5,
          y: rock.y + Math.sin(i * Math.PI + 0.4) * rock.radius * 0.5,
          speedMul: 1.18,
          hpMul: 1,
          radiusMul: 1
        });
        if (child) {
          child.vx = Math.cos(i * Math.PI + 0.4) * child.speed * 1.3;
          child.vy = Math.sin(i * Math.PI + 0.4) * child.speed * 1.3;
        }
      }
    }
    if (!options.specialKill && Math.random() < 0.055 && this.planetHp < this.planetMax) {
      this.spawnHeal(rock.x, rock.y);
    }
    this.sdk?.trackCustom?.("kill", {
      type: rock.type,
      combo: this.combo,
      level: this.level?.id || 0
    });
  }

  // ------------------------------------------------------------------- boss
  _bossCore() {
    const boss = this.boss;
    if (!boss) return null;
    return boss.corePos || { x: boss.x, y: boss.y + boss.width * 0.155, radius: boss.width * 0.16 };
  }

  updateBoss(dt) {
    const boss = this.boss;
    if (!boss) return;
    boss.flash = Math.max(0, boss.flash - dt * 4);
    boss.phaseFlash = Math.max(0, boss.phaseFlash - dt * 1.5);
    boss.coreExposed = Math.max(0, boss.coreExposed - dt);
    boss.hurtTilt = lerp(boss.hurtTilt || 0, 0, dt * 6);

    if (boss.defeated) {
      boss.deathTimer += dt;
      if (Math.random() < dt * 10) {
        this.effects.explosion(
          boss.x + rand(-boss.width * 0.3, boss.width * 0.3),
          boss.y + rand(-boss.width * 0.25, boss.width * 0.25),
          rand(1, 2), { petals: 10 }
        );
        this.audio?.play?.("explode", { volume: 0.3 });
      }
      return;
    }

    if (boss.state === "enter") {
      boss.enterT += dt;
      const k = clamp(boss.enterT / 2.2, 0, 1);
      boss.y = lerp(-boss.width * 0.8, boss.targetY, 1 - Math.pow(1 - k, 3));
      boss.enterScale = lerp(0.35, 1, 1 - Math.pow(1 - k, 3));
      if (k >= 1) {
        boss.state = "active";
        boss.enterScale = 1;
        this.audio?.play?.("wave");
      }
      return;
    }

    // Hover in the upper-right sky, beside the garden (clear of the HUD bar).
    const t = this.time;
    const halfW = boss.width * 0.55;
    boss.targetX = clamp(
      this.scene.center.x + this.scene.radius * 1.9 + Math.sin(t * 0.42) * this.scene.radius * 0.16,
      this.width * 0.55,
      this.width - halfW - 10
    );
    boss.targetY = clamp(
      this.scene.center.y - this.scene.radius * 0.45 + Math.sin(t * 0.7) * this.scene.radius * 0.05,
      boss.width * 0.38,
      this.height * 0.56
    );
    boss.x = lerp(boss.x, boss.targetX, dt * 0.9);
    boss.y = lerp(boss.y, boss.targetY, dt * 0.9);

    // fists idle positions
    const bodyW = boss.width;
    const fistBase = boss.fists.length ? boss.fists : [
      { side: -1 }, { side: 1 }
    ];
    if (!boss.fists.length) {
      boss.fists = fistBase.map((entry) => ({
        side: entry.side,
        state: "idle",
        x: boss.x + entry.side * bodyW * 0.55,
        y: boss.y + bodyW * 0.08,
        rot: entry.side * 0.2,
        z: -1,
        visible: true,
        hp: 14,
        glow: false,
        t: 0
      }));
    }
    for (const fist of boss.fists) {
      if (fist.state === "dead") {
        fist.visible = false;
        continue;
      }
      if (fist.state === "idle") {
        fist.x = lerp(fist.x, boss.x + fist.side * bodyW * 0.58, dt * 4);
        fist.y = lerp(fist.y, boss.y + bodyW * 0.1 + Math.sin(t * 1.7 + fist.side) * bodyW * 0.03, dt * 4);
        fist.rot = Math.sin(t * 1.2 + fist.side) * 0.2;
        fist.z = -1;
        fist.glow = false;
        fist.visible = true;
        fist.hp = Math.max(fist.hp, 10);
      } else if (fist.state === "slam") {
        fist.t += dt;
        const k = clamp(fist.t / 1.35, 0, 1);
        const start = fist.start;
        const end = fist.target;
        fist.x = lerp(start.x, end.x, 1 - Math.pow(1 - k, 3));
        fist.y = lerp(start.y, end.y, 1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * bodyW * 0.1;
        fist.z = 1;
        fist.glow = true;
        fist.rot = k * 1.2 * fist.side;
        if (k >= 1) {
          fist.state = "return";
          fist.t = 0;
          if (fist.visible) {
            this.damagePlanet(16, fist.x, fist.y);
            this.effects.explosion(fist.x, fist.y, 1.4, { petals: 14 });
            this.audio?.play?.("planet");
          }
        }
      } else if (fist.state === "return") {
        fist.t += dt;
        const k = clamp(fist.t / 0.9, 0, 1);
        fist.x = lerp(fist.x, boss.x + fist.side * bodyW * 0.58, k);
        fist.y = lerp(fist.y, boss.y + bodyW * 0.1, k);
        fist.z = 0;
        fist.glow = false;
        if (k >= 1) fist.state = "idle";
      }
    }

    this.updateBossLaser(dt);

    if (boss.attack) {
      this.updateBossAttack(dt);
    } else {
      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) this.startBossAttack();
    }
  }

  startBossAttack() {
    const boss = this.boss;
    if (!boss) return;
    const attacks = boss.def.attacks || ["volley"];
    const name = attacks[boss.attackIndex % attacks.length];
    boss.attackIndex += 1;
    boss.attack = {
      name,
      phase: "telegraph",
      t: 0,
      duration: name === "laser" ? 1.35 : name === "slam" ? 0.65 : 0.7,
      fired: false
    };
    if (name === "laser") {
      const core = this._bossCore();
      boss.laser.state = "telegraph";
      boss.laser.t = 0;
      boss.laser.angle = Math.atan2(
        this.scene.center.y - core.y,
        this.scene.center.x - core.x
      );
      boss.laser.end = {
        x: core.x + Math.cos(boss.laser.angle) * Math.max(this.width, this.height) * 1.4,
        y: core.y + Math.sin(boss.laser.angle) * Math.max(this.width, this.height) * 1.4
      };
      boss.laser.end.x = this.scene.center.x + Math.cos(boss.laser.angle) * Math.max(this.width, this.height);
      boss.laser.end.y = this.scene.center.y + Math.sin(boss.laser.angle) * Math.max(this.width, this.height);
      boss.laser.hitTimer = 0;
      this.audio?.play?.("charge", { volume: 0.7 });
    } else if (name === "slam") {
      const startFist = boss.fists.find((fist) => fist.state === "idle" && fist.visible);
      if (startFist) {
        startFist.state = "slam";
        startFist.t = 0;
        startFist.start = { x: startFist.x, y: startFist.y };
        startFist.target = {
          x: this.scene.center.x + rand(-0.35, 0.35) * this.scene.radius,
          y: this.scene.center.y + rand(-0.35, 0.35) * this.scene.radius
        };
      }
    }
    this.audio?.play?.("wave", { volume: 0.4 });
  }

  updateBossAttack(dt) {
    const boss = this.boss;
    const attack = boss.attack;
    if (!attack) return;
    attack.t += dt;
    if (attack.phase === "telegraph") {
      if (attack.t >= attack.duration) {
        attack.phase = "fire";
        attack.t = 0;
        this.fireBossAttack(attack.name);
      }
      return;
    }
    if (attack.name === "laser") {
      if (attack.phase === "fire") {
        if (attack.t > 1.7) {
          boss.laser.state = "idle";
          this.endBossAttack();
        }
      }
      return;
    }
    if (attack.name === "slam") {
      const done = boss.fists.every((fist) => fist.state === "idle" || fist.state === "dead");
      if (done && attack.t > 1.0) this.endBossAttack();
      return;
    }
    if (attack.t > (attack.name === "barrage" ? 1.1 : 1.3)) {
      this.endBossAttack();
    }
  }

  fireBossAttack(name) {
    const boss = this.boss;
    if (!boss) return;
    const core = this._bossCore();
    const toPlanet = Math.atan2(this.scene.center.y - core.y, this.scene.center.x - core.x);
    if (name === "volley") {
      const count = boss.phase >= 2 ? 6 : 4;
      for (let i = 0; i < count; i += 1) {
        const a = toPlanet + (i / Math.max(1, count - 1) - 0.5) * 1.5;
        this.spawnAsteroid(boss.id === "monarch" ? "crystal" : "rock_small", {
          x: boss.x + Math.cos(a) * boss.width * 0.62,
          y: boss.y + Math.sin(a) * boss.width * 0.45,
          speedMul: 1.05,
          hpMul: boss.phase >= 2 ? 1.4 : 1,
          angleOffset: 0
        });
      }
      this.audio?.play?.("boss_hit", { volume: 0.5 });
    } else if (name === "barrage") {
      const count = boss.phase >= 2 ? 15 : 11;
      const spread = 1.15;
      for (let i = 0; i < count; i += 1) {
        const a = toPlanet + (i / (count - 1) - 0.5) * spread;
        const speed = 150 * (this.scene.radius / 210) * (boss.phase >= 2 ? 1.15 : 1);
        this.enemyBullets.push({
          x: core.x + Math.cos(a) * boss.width * 0.2,
          y: core.y + Math.sin(a) * boss.width * 0.2,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: this.scene.radius * 0.045,
          damage: 7,
          angle: a,
          life: 7,
          dead: false
        });
      }
      this.audio?.play?.("charge", { volume: 0.6 });
    } else if (name === "laser") {
      boss.laser.state = "fire";
      boss.laser.t = 0;
      boss.laser.hitTimer = 0;
      this.audio?.play?.("laser", { volume: 0.9 });
      this.shake = Math.max(this.shake, 8);
    }
    this.ui?.bossAttack?.(name);
  }

  updateBossLaser(dt) {
    const boss = this.boss;
    if (!boss || boss.laser.state === "idle") return;
    boss.laser.t += dt;
    const laser = boss.laser;
    const core = this._bossCore();
    const far = {
      x: core.x + Math.cos(laser.angle) * Math.max(this.width, this.height) * 1.5,
      y: core.y + Math.sin(laser.angle) * Math.max(this.width, this.height) * 1.5
    };
    const ship = this.shipPosition;
    const intercepted = pointSegmentDistance(ship.x, ship.y, core.x, core.y, far.x, far.y) <
      this.shipRadius * 0.75;
    laser.end = intercepted ? ship : far;
    if (laser.state === "fire") {
      if (intercepted) {
        this.effects.hit(ship.x, ship.y, 1.2, "#b9ffe8");
        if (laser.hitTimer <= 0) {
          this.audio?.play?.("shield", { volume: 0.5 });
          laser.hitTimer = 0.18;
        }
        laser.hitTimer -= dt;
        this.special = clamp(this.special + dt * 18, 0, 100);
      } else {
        laser.hitTimer -= dt;
        if (laser.hitTimer <= 0) {
          laser.hitTimer = 0.42;
          this.damagePlanet(4.5, this.scene.center.x, this.scene.center.y - this.scene.radius * 0.6);
          this.shake = Math.max(this.shake, 5);
        }
      }
    }
  }

  endBossAttack() {
    const boss = this.boss;
    if (!boss) return;
    boss.attack = null;
    boss.laser.state = "idle";
    boss.coreExposed = 3.0;
    boss.attackTimer = boss.def.cycle * (boss.phase >= 2 ? 0.72 : 1);
    this.ui?.bossExposed?.(true);
  }

  damageBoss(amount, crit = false) {
    const boss = this.boss;
    if (!boss || boss.defeated) return;
    boss.hp = Math.max(0, boss.hp - amount);
    boss.flash = 1;
    boss.hurtTilt = crit ? 0.08 : 0.04;
    this.ui?.updateBoss?.(boss.hp, boss.maxHp);
    this.audio?.play?.("boss_hit", { volume: crit ? 0.7 : 0.35 });
    if (crit) {
      this.effects.text(
        boss.x + rand(-30, 30), boss.y + rand(-20, 20), t("hud.crit"),
        { color: "#ffe08a", size: 26 }
      );
      this.shake = Math.max(this.shake, 5);
    }
    if (boss.hp <= 0) {
      this.defeatBoss();
      return;
    }
    const ratio = boss.hp / boss.maxHp;
    if (boss.phase === 1 && ratio <= 0.5) {
      boss.phase = 2;
      this.bossPhaseChange();
    } else if (boss.phase === 2 && boss.id === "monarch" && ratio <= 0.22) {
      boss.phase = 3;
      this.bossPhaseChange();
    }
  }

  bossPhaseChange() {
    const boss = this.boss;
    boss.phaseFlash = 1;
    boss.coreExposed = 2;
    boss.attackTimer = 1.2;
    boss.flash = 1;
    this.shake = 18;
    this.effects.bloomBurst(boss.x, boss.y, boss.width * 1.2);
    this.audio?.play?.("boss_roar", { volume: 0.9 });
    this.ui?.bossPhase?.(boss.phase);
    this.sdk?.trackCustom?.("boss_phase", { boss: boss.id, phase: boss.phase });
  }

  defeatBoss() {
    const boss = this.boss;
    if (!boss || boss.defeated) return;
    boss.defeated = true;
    boss.state = "defeated";
    boss.attack = null;
    boss.laser.state = "idle";
    boss.deathTimer = 0;
    this.effects.bloomBurst(boss.x, boss.y, boss.width);
    this.audio?.play?.("win", { volume: 0.9 });
    this.shake = 24;
    this.stardustEarned += this.config.economy.stardustPerBoss;
    this.score += boss.maxHp * 4;
    this.ui?.bossDefeated?.();
    this.sdk?.trackCustom?.("boss_defeated", { boss: boss.id, level: this.level?.id || 0 });
    if (this.levelRuntime) this.levelRuntime.notifyBossDefeated();
    if (this.endlessRuntime) this.endlessRuntime.finished = true;
    window.setTimeout(() => {
      if (this.boss) this.ui?.hideBoss?.();
    }, 1300);
  }

  onLevelCleared() {
    if (this.status !== "playing") return;
    const level = this.level;
    const hpRatio = this.planetMax ? this.planetHp / this.planetMax : 0;
    const stars = this.levelRuntime ? this.levelRuntime.starsFor(hpRatio) : 1;
    const starBonus = this.config.economy.starBonus[stars] || 0;
    const totalCoins = Math.round(
      this.stardustEarned + (level.reward || 0) + starBonus
    );
    const newBestBefore = this.save?.data.bestScore || 0;
    const record = this.save
      ? this.save.recordWin(level.id, {
        stars,
        coins: totalCoins,
        score: this.score,
        kills: this.kills
      })
      : { newUnlock: false };
    this.stardustEarned = 0;
    this.status = "won";
    this.playing = false;
    this.winTimer = 1.6;
    this.firing = false;
    this.resultData = {
      win: true,
      kind: "win",
      levelId: level.id,
      stars,
      score: this.score,
      kills: this.kills,
      coins: totalCoins,
      starBonus,
      newBest: this.score > newBestBefore,
      newUnlock: Boolean(record?.newUnlock),
      bossDefeated: Boolean(level.boss),
      endless: false
    };
    this.audio?.play?.("win");
    this.audio?.stopMusic?.(1.4);
    this.sdk?.trackWin?.({
      level: level.id,
      score: this.score,
      kills: this.kills,
      stars,
      coins: totalCoins
    });
    this.effects.bloomBurst(this.scene.center.x, this.scene.center.y, this.scene.radius * 2);
  }

  triggerGameOver() {
    if (this.status !== "playing") return;
    this.status = "dying";
    this.playing = false;
    this.firing = false;
    this.dyingTimer = 1.6;
    this.shake = 22;
    this.audio?.play?.("lose");
    this.audio?.stopMusic?.(1.2);
    this.effects.bloomBurst(this.scene.center.x, this.scene.center.y, this.scene.radius * 2.3);
    this.effects.flash = 0.6;
    this.sdk?.trackFail?.({
      level: this.level?.id || 0,
      score: this.score,
      kills: this.kills,
      mode: this.mode
    });
  }

  showResult(win) {
    this.status = "result";
    this.playing = false;
    if (win) {
      this.ui?.showResult?.(this.resultData);
      this.ui?.hideBoss?.();
      this.ui?.hideHUD?.();
      return;
    }
    if (this.mode === "endless") {
      const stardust = this.stardustEarned;
      const newBest = this.save?.recordEndless?.(this.score, this.kills);
      this.save?.addCoins?.(stardust);
      this.stardustEarned = 0;
      this.resultData = {
        win: false,
        kind: "endless",
        endless: true,
        levelId: 0,
        score: this.score,
        kills: this.kills,
        coins: stardust,
        best: this.save?.data.endlessBest || this.score,
        newBest: Boolean(newBest),
        stars: 0
      };
      this.ui?.showResult?.(this.resultData);
      this.ui?.hideBoss?.();
      this.ui?.hideHUD?.();
      return;
    }
    const stardust = this.stardustEarned;
    const level = this.level;
    const canRevive = this.ads?.enabled && !this.revived && this.ads.canShow("revive");
    this.resultData = {
      win: false,
      kind: "lose",
      levelId: level?.id || 1,
      score: this.score,
      kills: this.kills,
      coins: stardust,
      stars: 0,
      canRevive,
      enemy: level?.boss ? t(level.boss.nameKey) : ""
    };
    this.ui?.showResult?.(this.resultData);
    this.ui?.hideBoss?.();
    this.ui?.hideHUD?.();
  }

  finalizeLoss() {
    if (!this.resultData || this.resultData.win || this.resultData.endless) return;
    if (this.lossCommitted) return;
    this.lossCommitted = true;
    const stardust = this.resultData.coins || 0;
    if (stardust > 0) this.save?.addCoins?.(stardust);
    this.save?.recordLoss?.({
      score: this.resultData.score,
      kills: this.resultData.kills
    });
    this.stardustEarned = 0;
  }

  revive() {
    if (!this.resultData || this.status !== "result") return false;
    this.revived = true;
    this.status = "playing";
    this.playing = true;
    this.planetHp = Math.max(1, Math.round(this.planetMax * 0.55));
    this.asteroids.forEach((rock) => {
      if (dist(rock.x, rock.y, this.scene.center.x, this.scene.center.y) < this.scene.radius * 2.5) {
        rock.dead = true;
        this.effects.explosion(rock.x, rock.y, 1, { petals: 8 });
      }
    });
    this.asteroids = this.asteroids.filter((rock) => !rock.dead);
    this.enemyBullets.forEach((ball) => { ball.dead = true; });
    this.enemyBullets = [];
    if (this.boss) {
      this.boss.attack = null;
      this.boss.laser.state = "idle";
      this.boss.attackTimer = 3;
      this.boss.coreExposed = 0;
    }
    this.lossCommitted = false;
    this.resultData = null;
    this.effects.bloomBurst(this.scene.center.x, this.scene.center.y, this.scene.radius * 2);
    this.ui?.hideResult?.();
    this.ui?.showHUD?.(this.level || { id: 0, nameKey: "endless.title", endless: true });
    this.audio?.play?.("win", { volume: 0.7 });
    this.audio?.playMusic?.(this.level?.music || "battle", { force: true });
    this.sdk?.trackRevive?.({ level: this.level?.id || 0, ok: true });
    this._updateHUD();
    return true;
  }

  // ------------------------------------------------------------------ render
  render() {
    const ctx = this.ctx;
    const { width, height } = this;
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const shake = this.shake * (this.config.camera.shakeScale ?? 1);
    if (shake > 0.05) {
      ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);
    }

    this.scene.menuMode = this.status === "menu";
    this.scene.drawBackground(ctx);
    this.scene.drawPlanetBack(ctx);
    this.scene.drawPlanetFront(ctx);
    if (this.scene.menuMode) this._drawMenuRocks(ctx);

    for (const portal of this.portals) this.scene.drawPortal(ctx, portal);
    if (this.blackhole) this.scene.drawGravityWell(ctx, this.blackhole);

    for (const rock of this.asteroids) this.enemyRenderer.draw(ctx, this.scene, rock);

    if (this.boss) this.bossArt.draw(ctx, this.scene, this.boss);

    for (const pickup of this.pickups) this._drawPickup(ctx, pickup);
    for (const turret of this.turrets) this._drawTurret(ctx, turret);
    for (const bullet of this.enemyBullets) this._drawEnemyBullet(ctx, bullet);

    if (this.status !== "menu" || this.scene.menuMode) {
      this._drawShip(ctx);
    }

    for (const bullet of this.bullets) this._drawBullet(ctx, bullet);
    this.effects.draw(ctx, this.scene);
    this.guide.draw(ctx, this.scene);

    this.scene.drawVignette(ctx);
    this.effects.drawFlash(ctx, width, height);
    if (this.status === "dying" || this.status === "result") {
      const fade = this.status === "dying" ? clamp(1 - this.dyingTimer / 1.6, 0, 1) : 1;
      ctx.fillStyle = `rgba(16,8,30,${0.35 * fade})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  _drawShip(ctx) {
    this.shipArt.draw(ctx, this.scene, {
      angle: this.aim,
      orbit: this.shipOrbit,
      firing: this.firing,
      charge: this.special,
      moving: this.pointer.inside
    });
  }

  _drawBullet(ctx, bullet) {
    const image = this.assets.image(bullet.big ? "boltBig" : "bolt");
    const size = bullet.radius * (bullet.big ? 7.5 : 6.5);
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle + Math.PI / 2);
    ctx.globalCompositeOperation = "screen";
    if (image) {
      ctx.drawImage(image, -size * 0.28, -size * 0.62, size * 0.56, size * 1.24);
    } else {
      ctx.fillStyle = "#b9ffe8";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.2, size * 0.6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawEnemyBullet(ctx, bullet) {
    const image = this.assets.image("glob");
    const size = bullet.radius * 4.2;
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle + this.time * 1.4);
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.8);
    glow.addColorStop(0, "rgba(255,160,220,0.55)");
    glow.addColorStop(1, "rgba(255,160,220,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.8, 0, TAU);
    ctx.fill();
    if (image) ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  _drawPickup(ctx, pickup) {
    const image = this.assets.image(pickup.kind === "heal" ? "heal" : "pollen");
    const bob = Math.sin(this.time * 3 + pickup.phase) * pickup.radius * 0.14;
    const s = pickup.radius * 2.6;
    ctx.save();
    ctx.translate(pickup.x, pickup.y + bob);
    ctx.rotate(Math.sin(this.time * 1.3 + pickup.phase) * 0.2);
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.75);
    glow.addColorStop(0, pickup.kind === "heal" ? "rgba(150,255,220,0.45)" : "rgba(255,220,140,0.4)");
    glow.addColorStop(1, "rgba(255,220,140,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.75, 0, TAU);
    ctx.fill();
    if (image) ctx.drawImage(image, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  _drawTurret(ctx, turret) {
    const image = this.assets.image("turret");
    const x = this.scene.center.x + Math.cos(turret.angle) * turret.radius;
    const y = this.scene.center.y + Math.sin(turret.angle) * turret.radius;
    const size = this.scene.radius * 0.36;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turret.angle + Math.PI / 2 + Math.sin(this.time * 2) * 0.1);
    if (image) {
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#ffd37d";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawMenuRocks(ctx) {
    for (const rock of this.menuRocks) {
      const x = rock.x * this.width + Math.sin(this.time * 0.3 + rock.a) * 18;
      const y = rock.y * this.height + Math.cos(this.time * 0.26 + rock.a) * 12;
      const radius = Math.min(this.width, this.height) * rock.r;
      this.enemyRenderer.draw(ctx, this.scene, {
        type: rock.type,
        variant: 0,
        x,
        y,
        radius,
        rotation: this.time * rock.speed * 4 + rock.a,
        shield: false,
        shieldAngle: 0,
        flash: 0,
        maxHp: 1,
        hp: 1,
        elite: false,
        angle: rock.a,
        dead: false
      });
    }
  }

  _updateHUD() {
    this.ui?.updateHUD?.({
      score: this.score,
      kills: this.kills,
      combo: this.combo,
      comboTimer: this.comboTimer,
      special: this.special,
      planetHp: this.planetHp,
      planetMax: this.planetMax,
      stardust: this.stardustEarned,
      level: this.level,
      endless: this.mode === "endless",
      sky: this.endlessRuntime?.sky || 1,
      boss: this.boss,
      lane: this.lane,
      lanes: Boolean(this.scene.lanes),
      turrets: this.turrets.length
    });
  }

  getSnapshot() {
    return this.canvas;
  }
}

export default Game;
