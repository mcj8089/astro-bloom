import { TAU, clamp, rand } from "../core/utils.js";
import { AsteroidArt } from "../art/asteroid.js";
import { GAME_CONFIG } from "../../config/game.config.js";

/** px/s multiplier applied to every asteroid def.speed (tunable in config). */
const SPEED_UNIT = GAME_CONFIG.physics.asteroidSpeedUnit || 54;

export const ROCK_TYPES = {
  rock: {
    radius: 32, hp: 2, speed: 1.0, damage: 13, score: 10, sprites: 2,
    label: "rock"
  },
  rock_small: {
    radius: 19, hp: 1, speed: 1.35, damage: 8, score: 6, sprites: 1,
    label: "rock"
  },
  splitter: {
    radius: 42, hp: 4, speed: 0.88, damage: 17, score: 16, sprites: 1,
    label: "splitter", splitInto: 2
  },
  comet: {
    radius: 23, hp: 2, speed: 1.75, damage: 14, score: 13, sprites: 1,
    label: "comet"
  },
  armored: {
    radius: 37, hp: 5, speed: 0.9, damage: 19, score: 22, sprites: 1,
    label: "armored", shield: true
  },
  crystal: {
    radius: 35, hp: 4, speed: 1.1, damage: 17, score: 19, sprites: 1,
    label: "crystal"
  }
};

export class Asteroid {
  constructor(options) {
    const def = ROCK_TYPES[options.type] || ROCK_TYPES.rock;
    const unit = options.unit || 1;
    this.type = options.type in ROCK_TYPES ? options.type : "rock";
    this.def = def;
    this.x = options.x;
    this.y = options.y;
    const targetAngle = Math.atan2((options.targetY ?? 0) - this.y, (options.targetX ?? 0) - this.x);
    this.angle = targetAngle + rand(-0.1, 0.1);
    this.speed = def.speed * (options.speedMul || 1) * unit * SPEED_UNIT;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.radius = def.radius * unit * (options.radiusMul || 1) * 1.18;
    this.maxHp = Math.max(1, Math.round(def.hp * (options.hpMul || 1)));
    this.hp = this.maxHp;
    this.damage = def.damage * (options.damageMul || 1);
    this.score = def.score;
    this.rotation = rand(0, TAU);
    this.spin = rand(-0.8, 0.8);
    this.flash = 0;
    this.dead = false;
    this.elite = Boolean(options.elite);
    this.variant = Math.floor(rand(0, def.sprites || 1));
    this.seed = Math.random() * 1000;
    this.shield = Boolean(def.shield);
    this.shieldAngle = rand(0, TAU);
    this.shieldSpeed = rand(0.55, 0.95) * (Math.random() > 0.5 ? 1 : -1);
    this.splitInto = def.splitInto || 0;
    this.hpMul = options.hpMul || 1;
    this.unit = unit;
    this.speedMul = options.speedMul || 1;
    this.age = 0;
    if (this.elite) {
      this.radius *= 1.25;
      this.maxHp += 3;
      this.hp = this.maxHp;
      this.score *= 2;
    }
  }

  update(dt, world) {
    this.age += dt;
    if (this.shield) this.shieldAngle += this.shieldSpeed * dt;
    if (world.well) {
      const dx = world.well.x - this.x;
      const dy = world.well.y - this.y;
      const d2 = dx * dx + dy * dy;
      const rr = world.well.radius * 3.1;
      if (d2 < rr * rr && d2 > 100) {
        const d = Math.sqrt(d2);
        const falloff = 1 - d / rr;
        const force = (world.well.strength || 7600) * falloff * falloff * dt / d;
        this.vx += dx * force;
        this.vy += dy * force;
      }
    }
    // gentle homing keeps them on the garden
    const desired = Math.atan2(world.centerY - this.y, world.centerX - this.x);
    const current = Math.atan2(this.vy, this.vx);
    const diff = ((desired - current + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const steer = clamp(diff, -0.35, 0.35) * dt * 0.75;
    const speed = Math.hypot(this.vx, this.vy) || this.speed;
    const a = current + steer;
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.angle = Math.atan2(this.vy, this.vx);
  }

  hit(amount) {
    this.hp -= amount;
    this.flash = 1;
    return this.hp <= 0;
  }

  blocksFrom(bulletX, bulletY, bulletRadius = 0) {
    if (!this.shield) return false;
    const toBullet = Math.atan2(bulletY - this.y, bulletX - this.x);
    const diff = Math.abs(((toBullet - this.shieldAngle + Math.PI) % TAU + TAU) % TAU - Math.PI);
    return diff < 0.92;
  }

  get shielded() {
    return this.shield;
  }
}

/** Renderer adapter used by the game loop. */
export class EnemyRenderer {
  constructor(assets) {
    this.art = new AsteroidArt(assets);
  }

  draw(ctx, scene, asteroid) {
    this.art.draw(ctx, scene, asteroid);
  }
}
