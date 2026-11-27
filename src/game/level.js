import { GAME_CONFIG } from "../../config/game.config.js";
import { rand } from "../core/utils.js";

const HINT_KEYS = {
  basic: "",
  split: "hint.split",
  lanes: "hint.lanes",
  gravity: "hint.gravity",
  rain: "hint.rain",
  shell: "hint.shell",
  boss: "hint.boss",
  pollen: "hint.pollen",
  portal: "hint.portal",
  bossFinal: "hint.bossFinal"
};

/**
 * Owns the timeline of one level: spawn schedule, special mechanics and the
 * moment the garden counts as saved.
 */
export class LevelRuntime {
  constructor(level, game) {
    this.level = level;
    this.game = game;
    this.elapsed = 0;
    this.schedule = [];
    this.lastSpawnTime = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.finished = false;
    this.finishTimer = 0;
    this.pollenTimer = level.pollenRate ? 1.5 : 0;
    this.portalTimer = level.portals ? 2.5 : 0;
    this.rainTimer = level.rain ? 1 : 0;
    this.nextAttack = 0;

    // compressed timeline: the whole wave schedule is scaled to shorten levels
    const pace = game.config?.pacing?.levelTimeScale ?? 1;
    for (const wave of level.waves || []) {
      for (let i = 0; i < wave.count; i += 1) {
        const at = (wave.at + i * wave.gap) * pace;
        this.schedule.push({ at, type: wave.type, index: i, count: wave.count });
        this.lastSpawnTime = Math.max(this.lastSpawnTime, at);
      }
    }
    this.schedule.sort((a, b) => a.at - b.at);
    this.cursor = 0;
  }

  get hintKey() {
    return HINT_KEYS[this.level.mechanic] || "";
  }

  get clearDelay() {
    return this.game.config?.pacing?.clearDelay ?? 3.2;
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += dt;
    const game = this.game;

    // scripted waves
    while (this.cursor < this.schedule.length && this.schedule[this.cursor].at <= this.elapsed) {
      const entry = this.schedule[this.cursor];
      this.cursor += 1;
      this._spawn(entry);
    }

    // pollen clouds
    if (this.level.pollenRate) {
      this.pollenTimer -= dt;
      if (this.pollenTimer <= 0) {
        this.pollenTimer = this.level.pollenRate * rand(0.75, 1.25);
        game.spawnPollen();
      }
    }

    // portal storms
    if (this.level.portals) {
      this.portalTimer -= dt;
      if (this.portalTimer <= 0) {
        this.portalTimer = this.level.portals.interval * rand(0.8, 1.2);
        game.triggerPortal();
      }
    }

    // rain levels keep the sky full, but stop once the storm has passed
    if (this.level.rain && this.elapsed < this.lastSpawnTime + 1.5) {
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        this.rainTimer = this.level.rain.interval * rand(0.7, 1.3);
        if (game.asteroids.length < this.level.rain.maxAlive) {
          game.spawnAsteroid(Math.random() > 0.82 ? "comet" : "rock_small", {
            speedMul: this.level.speedMul
          });
        }
      }
    }

    // boss arrival (arrival time also compressed by the pacing scale)
    if (this.level.boss && !this.bossSpawned
      && this.elapsed >= this.level.boss.enterAt * (this.game.config?.pacing?.bossEnterScale ?? 1)) {
      this.bossSpawned = true;
      game.spawnBoss(this.level.boss, this.level);
    }

    // level clear
    if (this.level.boss) {
      if (this.bossDefeated) {
        this.finishTimer += dt;
        if (this.finishTimer > 1.8) {
          this.finished = true;
          game.onLevelCleared();
        }
      }
    } else if (this.elapsed > this.lastSpawnTime + this.clearDelay && this.cursor >= this.schedule.length) {
      if (game.asteroids.length === 0 && game.enemyBullets.length === 0) {
        this.finishTimer += dt;
        if (this.finishTimer > 1.1) {
          this.finished = true;
          game.onLevelCleared();
        }
      } else {
        this.finishTimer = 0;
      }
    }
  }

  _spawn(entry) {
    const level = this.level;
    if (entry.type === "pollen") {
      this.game.spawnPollen();
      return;
    }
    // The first few of a wave fan around the screen so the player must sweep.
    const spread = entry.count > 1 ? (entry.index / entry.count) * Math.PI * 1.2 - Math.PI * 0.6 : 0;
    // speed ramps up as the level progresses — late rocks move noticeably faster
    const pacing = this.game.config?.pacing || {};
    const ramp = pacing.levelSpeedRamp ?? 0;
    const progress = this.lastSpawnTime > 0 ? Math.min(1, this.elapsed / this.lastSpawnTime) : 0;
    const speedMul = (level.speedMul || 1) * (1 + ramp * progress);
    this.game.spawnAsteroid(entry.type, {
      speedMul,
      hpMul: level.hpMul,
      angleOffset: spread,
      elite: level.id >= 8 && entry.index === entry.count - 1 && entry.count > 2 && Math.random() < 0.3
    });
  }

  notifyBossDefeated() {
    this.bossDefeated = true;
    this.finishTimer = 0;
  }

  starsFor(hpRatio) {
    const [two, three] = this.level.stars || [0.35, 0.72];
    let stars = 1;
    if (hpRatio >= two) stars += 1;
    if (hpRatio >= three) stars += 1;
    return stars;
  }

  progress() {
    if (this.level.boss) {
      return this.bossSpawned ? 1 : Math.min(0.95, this.elapsed / this.level.boss.enterAt);
    }
    return Math.min(1, this.elapsed / Math.max(1, this.lastSpawnTime + this.clearDelay));
  }

  get nextWaveLabel() {
    const idx = Math.min(this.cursor, this.schedule.length);
    return idx;
  }
}

/** Endless mode: every sky is a little hungrier than the last. */
export class EndlessRuntime {
  constructor(game) {
    this.game = game;
    this.elapsed = 0;
    this.spawnTimer = 1.2;
    this.sky = 1;
    this.finished = false;
    const p = game.config?.pacing || {};
    this.baseInterval = p.endlessBaseInterval ?? 1.55;
    this.minInterval = p.endlessMinInterval ?? 0.34;
    this.pressureTime = p.endlessPressureTime ?? 150;
    this.pressureCap = p.endlessPressureCap ?? 1.6;
    this.speedTime = p.endlessSpeedTime ?? 240;
    this.speedCap = p.endlessSpeedCap ?? 0.6;
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += dt;
    this.sky = 1 + Math.floor(this.elapsed / 24);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const pressure = Math.min(this.pressureCap, 1 + this.elapsed / this.pressureTime);
      this.spawnTimer = Math.max(this.minInterval, this.baseInterval / pressure);
      const roll = Math.random();
      let type = "rock";
      if (this.elapsed > 18 && roll > 0.86) type = "armored";
      else if (this.elapsed > 10 && roll > 0.7) type = "comet";
      else if (this.elapsed > 5 && roll > 0.55) type = "splitter";
      else if (roll > 0.35) type = "rock_small";
      this.game.spawnAsteroid(type, {
        speedMul: 1 + Math.min(this.speedCap, this.elapsed / this.speedTime),
        hpMul: 1 + Math.min(1.4, this.elapsed / 180),
        elite: this.elapsed > 45 && Math.random() < 0.08
      });
    }
  }

  get hintKey() {
    return "";
  }

  get level() {
    return {
      id: 0,
      nameKey: "endless.title",
      descKey: "endless.subtitle",
      mechanic: "endless",
      stars: [0.35, 0.72],
      reward: 0,
      endless: true
    };
  }
}

export default LevelRuntime;
