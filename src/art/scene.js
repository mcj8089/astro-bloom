import { GAME_CONFIG } from "../../config/game.config.js";
import { TAU, clamp, lerp, rand } from "../core/utils.js";

const TAU_LOCAL = TAU;

function cover(ctx, image, w, h, offsetX = 0, offsetY = 0) {
  if (!image) return;
  const iw = image.width;
  const ih = image.height;
  const scale = Math.max(w / iw, h / ih) * 1.035;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (w - dw) / 2 + offsetX, (h - dh) / 2 + offsetY, dw, dh);
}

function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

/**
 * The cosmic garden backdrop: painterly nebula, live starfield, a rotating
 * garden planet with petal rings and two small moons, plus ambient pollen.
 */
export class Scene {
  constructor(assets, config = GAME_CONFIG) {
    this.assets = assets;
    this.config = config;
    this.time = 0;
    this.stars = [];
    this.pollen = [];
    this.meteorTrails = [];
    this.width = 1;
    this.height = 1;
    this.center = { x: 0, y: 0 };
    this.radius = 180;
    this.orbit = 290;
    this.planetFlash = 0;
    this.shieldPulse = 0;
    this.pointer = { x: 0, y: 0 };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    const base = Math.min(width, height);
    const world = this.config.world;
    this.radius = clamp(base * (world.planetScale || 0.215), world.planetScaleMin || 72, world.planetScaleMax || 236);
    this.orbit = this.radius * (world.orbitFactor || 1.62);
    this.center.x = width / 2;
    this.center.y = height / 2 + (height > width ? -height * 0.015 : 0);
    this._buildAmbient();
  }

  _buildAmbient() {
    const rng = (() => {
      let seed = 20261030;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
    })();
    this.stars = [];
    const count = Math.round(this.config.world.starCount * (this.width * this.height) / (1920 * 1080));
    for (let i = 0; i < Math.max(60, count); i += 1) {
      this.stars.push({
        x: rng() * this.width,
        y: rng() * this.height,
        r: 0.6 + rng() * 1.8,
        a: 0.25 + rng() * 0.7,
        phase: rng() * TAU_LOCAL,
        speed: 0.4 + rng() * 1.6,
        tint: rng() > 0.6 ? "#ffe6b8" : rng() > 0.4 ? "#b9fff0" : "#ffffff"
      });
    }
    this.pollen = [];
    for (let i = 0; i < 42; i += 1) {
      this.pollen.push({
        x: rng() * this.width,
        y: rng() * this.height,
        r: 1.2 + rng() * 3.4,
        speed: 4 + rng() * 12,
        drift: (rng() - 0.5) * 9,
        phase: rng() * TAU_LOCAL,
        alpha: 0.12 + rng() * 0.3,
        color: rng() > 0.5 ? "#ffd79a" : "#ffb9dd"
      });
    }
    this.meteorTrails = [];
  }

  update(dt, pointer = null) {
    this.time += dt;
    if (pointer) {
      this.pointer.x = lerp(this.pointer.x, pointer.x, 0.06);
      this.pointer.y = lerp(this.pointer.y, pointer.y, 0.06);
    }
    this.planetFlash = Math.max(0, this.planetFlash - dt * 2.2);
    this.shieldPulse = Math.max(0, this.shieldPulse - dt * 1.8);
    for (const p of this.pollen) {
      p.y -= p.speed * dt;
      p.x += Math.sin(this.time * 0.3 + p.phase) * p.drift * dt;
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = rand(0, this.width);
      }
    }
    if (Math.random() < dt * 0.35) {
      this.meteorTrails.push({
        x: rand(0, this.width),
        y: rand(-20, this.height * 0.3),
        life: 0,
        max: 1.4,
        speed: rand(220, 420),
        angle: rand(1.1, 1.6)
      });
    }
    for (const m of this.meteorTrails) {
      m.life += dt;
      m.x += Math.cos(m.angle) * m.speed * dt;
      m.y += Math.sin(m.angle) * m.speed * dt;
    }
    this.meteorTrails = this.meteorTrails.filter((m) => m.life < m.max);
  }

  flashPlanet(amount = 1) {
    this.planetFlash = Math.max(this.planetFlash, amount);
    this.shieldPulse = Math.max(this.shieldPulse, amount);
  }

  drawBackground(ctx) {
    const { width: w, height: h, time } = this;
    const px = (this.pointer.x / Math.max(1, w) - 0.5) * 18;
    const py = (this.pointer.y / Math.max(1, h) - 0.5) * 14;
    ctx.save();
    cover(ctx, this.assets.image("bg"), w, h, px, py);

    // slow aurora veil
    ctx.globalCompositeOperation = "screen";
    const drift = Math.sin(time * 0.06) * w * 0.04;
    const aurora = ctx.createLinearGradient(0, h * 0.1, w, h * 0.7);
    aurora.addColorStop(0, "rgba(70,255,214,0)");
    aurora.addColorStop(0.35, "rgba(70,255,214,0.05)");
    aurora.addColorStop(0.55, "rgba(255,130,200,0.06)");
    aurora.addColorStop(1, "rgba(255,130,200,0)");
    ctx.fillStyle = aurora;
    ctx.fillRect(-w * 0.1 + drift, 0, w * 1.2, h);

    // light bloom from the upper-left sun
    ctx.fillStyle = radial(ctx, w * 0.16, h * 0.12, Math.max(w, h) * 0.45, [
      [0, "rgba(255,216,160,0.16)"],
      [0.4, "rgba(255,160,190,0.06)"],
      [1, "rgba(255,160,190,0)"]
    ]);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // stars
    ctx.save();
    for (const star of this.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(star.x + px * 0.35, star.y + py * 0.35, star.r, 0, TAU_LOCAL);
      ctx.fill();
    }
    ctx.restore();

    // occasional shooting star
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const m of this.meteorTrails) {
      const t = m.life / m.max;
      const alpha = Math.sin(t * Math.PI) * 0.7;
      const len = 90;
      const g = ctx.createLinearGradient(
        m.x, m.y,
        m.x - Math.cos(m.angle) * len, m.y - Math.sin(m.angle) * len
      );
      g.addColorStop(0, `rgba(255,238,204,${alpha})`);
      g.addColorStop(1, "rgba(255,238,204,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - Math.cos(m.angle) * len, m.y - Math.sin(m.angle) * len);
      ctx.stroke();
    }
    ctx.restore();

    // floating pollen dust
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of this.pollen) {
      ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 0.8 + p.phase));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU_LOCAL);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlanetBack(ctx) {
    const { center, radius, time } = this;
    const frame = this.assets.frame(time);
    const ringSize = radius * 2.78;

    // far half of the petal ring
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(this.config.world.ringTilt);
    ctx.scale(1, this.config.world.ringSquash);
    ctx.globalCompositeOperation = "screen";
    // a luminous orbital ribbon behind the painted petals
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#ffd6ea";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.05, radius * 1.05, 0, 0, TAU_LOCAL);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#a8ffe4";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.2, radius * 1.2, 0, 0, TAU_LOCAL);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const ringBack = this.assets.image("ringBack");
    if (ringBack) ctx.drawImage(ringBack, -ringSize / 2, -ringSize / 2, ringSize, ringSize);
    ctx.restore();

    // moons behind
    this._drawMoon(ctx, "moonA", 2.15, time * 0.12 + 0.6, radius * 0.17, true);
    this._drawMoon(ctx, "moonB", 2.65, time * 0.08 + 3.4, radius * 0.12, true);

    if (frame) {
      const size = radius * 2.44;
      // A soft hand-painted halo instead of a canvas shadow: cheaper and it
      // avoids large software-compositor artefacts on some headless GPUs.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const halo = ctx.createRadialGradient(center.x, center.y, radius * 0.9,
        center.x, center.y, radius * 1.36);
      halo.addColorStop(0, "rgba(255,150,215,0)");
      halo.addColorStop(0.55, "rgba(255,150,215,0.10)");
      halo.addColorStop(0.82, "rgba(150,255,230,0.10)");
      halo.addColorStop(1, "rgba(150,255,230,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.36, 0, TAU_LOCAL);
      ctx.fill();
      ctx.restore();
      ctx.drawImage(frame, center.x - size / 2, center.y - size / 2, size, size);

      // damage flash aura
      if (this.planetFlash > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = this.planetFlash * 0.55;
        ctx.fillStyle = radial(ctx, center.x, center.y, radius * 1.22, [
          [0, "rgba(255,120,150,0)"],
          [0.72, "rgba(255,120,150,0.1)"],
          [0.92, "rgba(255,90,120,0.5)"],
          [1, "rgba(255,90,120,0)"]
        ]);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * 1.22, 0, TAU_LOCAL);
        ctx.fill();
        ctx.restore();
      }
    }

    // orbit trail (only when lanes are active, drawn very softly)
    this._drawLaneTrails(ctx);
  }

  drawPlanetFront(ctx) {
    const { center, radius, time } = this;
    const ringSize = radius * 2.78;
    // near half of the ring is drawn above the planet, below gameplay entities
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(this.config.world.ringTilt);
    ctx.scale(1, this.config.world.ringSquash);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.95;
    const ringFront = this.assets.image("ringFront");
    if (ringFront) ctx.drawImage(ringFront, -ringSize / 2, -ringSize / 2, ringSize, ringSize);
    ctx.restore();

    // moons in front
    this._drawMoon(ctx, "moonA", 2.15, time * 0.12 + 0.6, radius * 0.17, false);
    this._drawMoon(ctx, "moonB", 2.65, time * 0.08 + 3.4, radius * 0.12, false);

    // atmosphere fresnel + shield shimmer
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const aura = ctx.createRadialGradient(center.x, center.y, radius * 0.9,
      center.x, center.y, radius * 1.32);
    aura.addColorStop(0, "rgba(140,255,225,0)");
    aura.addColorStop(0.55, "rgba(140,255,225,0.10)");
    aura.addColorStop(0.82, "rgba(170,255,240,0.22)");
    aura.addColorStop(1, "rgba(255,150,215,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 1.32, 0, TAU_LOCAL);
    ctx.fill();
    ctx.restore();

    // petal shield ring
    const pulse = 0.55 + 0.25 * Math.sin(time * 1.4) + this.shieldPulse * 0.6;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(time * 0.05);
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * TAU_LOCAL;
      const len = i % 3 === 0 ? 18 : 8;
      const rr = radius * 1.075;
      ctx.save();
      ctx.rotate(a);
      ctx.globalAlpha = pulse * (i % 3 === 0 ? 0.8 : 0.35);
      ctx.strokeStyle = i % 2 === 0 ? "#a8ffe4" : "#ffc7ea";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rr, 0);
      ctx.lineTo(rr + len, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // menu halo petals
    if (this.menuMode) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 9; i += 1) {
        const a = time * 0.12 + (i / 9) * TAU_LOCAL;
        const rr = radius * (1.45 + 0.06 * Math.sin(time * 0.7 + i));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr * 0.46;
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time + i);
        ctx.fillStyle = i % 2 ? "#ffd2ea" : "#a7ffe6";
        ctx.beginPath();
        ctx.ellipse(x, y, 3.6, 2.2, a, 0, TAU_LOCAL);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawMoon(ctx, key, orbitMul, angle, size, behind) {
    const { center, radius } = this;
    const x = center.x + Math.cos(angle) * radius * orbitMul;
    const y = center.y + Math.sin(angle) * radius * orbitMul * 0.72;
    const isBehind = y < center.y;
    if (isBehind !== behind) return;
    const image = this.assets.image(key);
    if (!image) return;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  _drawLaneTrails(ctx) {
    if (!this.lanes) return;
    const { center, radius, time } = this;
    const lanes = this.config.world.orbitLanes;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    lanes.forEach((factor, index) => {
      const rr = radius * 1.62 * factor;
      const active = index === this.activeLane;
      const dash = 2 + (index % 2);
      ctx.globalAlpha = active ? 0.22 : 0.08;
      ctx.strokeStyle = active ? "#b8ffe8" : "#cfd7ff";
      ctx.lineWidth = active ? 1.4 : 1;
      ctx.setLineDash([dash, 14]);
      ctx.lineDashOffset = time * (active ? 24 : 10) * (index % 2 ? -1 : 1);
      ctx.beginPath();
      ctx.arc(center.x, center.y, rr, 0, TAU_LOCAL);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawVignette(ctx) {
    const { width: w, height: h } = this;
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38,
      w / 2, h / 2, Math.max(w, h) * 0.78);
    vg.addColorStop(0, "rgba(8,5,24,0)");
    vg.addColorStop(0.72, "rgba(8,5,24,0.12)");
    vg.addColorStop(1, "rgba(8,5,24,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  drawGravityWell(ctx, well) {
    if (!well) return;
    const { x, y, radius } = well;
    const t = this.time;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(x, y);
    // warped light rings
    for (let i = 0; i < 3; i += 1) {
      const r = radius * (0.72 + i * 0.24) * (1 + 0.04 * Math.sin(t * 1.3 + i));
      ctx.globalAlpha = 0.14 - i * 0.03;
      ctx.strokeStyle = i === 0 ? "#ffb4e6" : "#9bffe6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.72, t * 0.16 + i, 0, TAU_LOCAL);
      ctx.stroke();
    }
    // dark core
    ctx.globalCompositeOperation = "source-over";
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    core.addColorStop(0, "#08040f");
    core.addColorStop(0.52, "#120a23");
    core.addColorStop(0.8, "rgba(40,20,60,0.9)");
    core.addColorStop(1, "rgba(40,20,60,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU_LOCAL);
    ctx.fill();
    // accretion arc
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 34; i += 1) {
      const a = t * 1.4 + i * 0.7;
      const rr = radius * (0.82 + (i % 5) * 0.06);
      ctx.globalAlpha = 0.5 - (i % 5) * 0.07;
      ctx.fillStyle = i % 2 ? "#ffb0e0" : "#ffe4a8";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.44, 1.6 + (i % 3), 0, TAU_LOCAL);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPortal(ctx, portal) {
    const image = this.assets.image("portal");
    const t = this.time;
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(t * 0.7 + portal.phase);
    ctx.globalCompositeOperation = "screen";
    if (image) {
      const size = portal.radius * 2.5;
      ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 2 + portal.phase);
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }

  drawAimReticle(ctx, pointer, active) {
    if (!active) return;
    const { x, y } = pointer;
    const t = this.time;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 5);
    ctx.strokeStyle = "#c9fff1";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, TAU_LOCAL);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const a = t * 0.8 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 19, Math.sin(a) * 19);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export default Scene;
