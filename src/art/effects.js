import { TAU, clamp, rand } from "../core/utils.js";

/** Particle, explosion, petal and floating-text effects. */
export class Effects {
  constructor(assets) {
    this.assets = assets;
    this.particles = [];
    this.animations = [];
    this.texts = [];
    this.flash = 0;
    this.maxParticles = 420;
  }

  reset() {
    this.particles.length = 0;
    this.animations.length = 0;
    this.texts.length = 0;
    this.flash = 0;
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 2.8);
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + (p.gravity || 0) * dt;
      p.rot += p.spin * dt;
      if (p.kind === "trail") p.vx *= 0.92;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const a of this.animations) {
      a.life += dt;
    }
    this.animations = this.animations.filter((a) => a.life < a.max);
    for (const t of this.texts) {
      t.life += dt;
      t.y -= 38 * dt;
    }
    this.texts = this.texts.filter((t) => t.life < t.max);
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  _add(particle) {
    this.particles.push({
      life: 0,
      max: 0.8,
      size: 4,
      vx: 0,
      vy: 0,
      drag: 0.98,
      gravity: 0,
      rot: 0,
      spin: 0,
      alpha: 1,
      color: "#ffffff",
      kind: "dot",
      ...particle
    });
  }

  explosion(x, y, scale = 1, options = {}) {
    const sheet = this.assets.image("explosion");
    if (sheet) {
      this.animations.push({
        type: "explosion",
        x, y,
        life: 0,
        max: (options.duration || 0.62),
        scale,
        rot: rand(0, TAU),
        alpha: 1
      });
    }
    const petals = options.petals == null ? 10 : options.petals;
    for (let i = 0; i < petals; i += 1) {
      const a = rand(0, TAU);
      const speed = rand(60, 230) * scale;
      this._add({
        kind: Math.random() > 0.45 ? "petal" : "star",
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - rand(20, 80),
        drag: 0.94,
        gravity: 140,
        rot: rand(0, TAU),
        spin: rand(-6, 6),
        size: rand(8, 18) * scale,
        max: rand(0.6, 1.3),
        alpha: 1,
        color: ["#ffd0e8", "#ffeed0", "#b9ffe8", "#d8c4ff"][i % 4]
      });
    }
    for (let i = 0; i < 6; i += 1) {
      this._add({
        kind: "puff",
        x: x + rand(-8, 8) * scale,
        y: y + rand(-8, 8) * scale,
        vx: rand(-30, 30) * scale,
        vy: rand(-60, 10) * scale,
        size: rand(30, 60) * scale,
        max: rand(0.4, 0.8),
        alpha: 0.65,
        color: options.color || "#ffe2c4"
      });
    }
    this.flash = Math.max(this.flash, 0.14 * scale);
    if (options.ring) this.ring(x, y, 70 * scale, options.ring);
  }

  hit(x, y, scale = 1, color = "#ffeec8") {
    const sheet = this.assets.image("hit");
    if (sheet) {
      this.animations.push({
        type: "hit",
        x, y,
        life: 0,
        max: 0.26,
        scale,
        rot: rand(0, TAU),
        alpha: 1
      });
    }
    for (let i = 0; i < 5; i += 1) {
      const a = rand(0, TAU);
      this._add({
        kind: "spark",
        x, y,
        vx: Math.cos(a) * rand(40, 170),
        vy: Math.sin(a) * rand(40, 170),
        size: rand(4, 9) * scale,
        max: rand(0.18, 0.4),
        color
      });
    }
  }

  ring(x, y, size = 60, color = "#b9ffe8", max = 0.55) {
    this.animations.push({
      type: "ring",
      x, y,
      life: 0,
      max,
      scale: size / 256,
      color,
      alpha: 0.85
    });
  }

  trail(x, y, color = "#b9ffe8", size = 3) {
    this._add({
      kind: "trail",
      x, y,
      vx: rand(-8, 8),
      vy: rand(-8, 8),
      size,
      max: rand(0.25, 0.5),
      alpha: 0.5,
      color
    });
  }

  pickupBurst(x, y, color = "#ffd37d") {
    this.ring(x, y, 40, color, 0.4);
    for (let i = 0; i < 8; i += 1) {
      const a = rand(0, TAU);
      this._add({
        kind: "star",
        x, y,
        vx: Math.cos(a) * rand(30, 110),
        vy: Math.sin(a) * rand(30, 110) - 40,
        size: rand(6, 12),
        max: rand(0.4, 0.8),
        color: i % 2 ? color : "#fff4cd"
      });
    }
  }

  text(x, y, value, options = {}) {
    this.texts.push({
      x, y,
      value: String(value),
      life: 0,
      max: options.max || 0.95,
      color: options.color || "#fff6dc",
      size: options.size || 22,
      weight: options.weight || 800,
      alpha: 1,
      rise: options.rise || 38
    });
  }

  bloomBurst(x, y, radius = 300) {
    this.flash = Math.max(this.flash, 0.55);
    this.ring(x, y, radius * 2, "#ffe4a8", 0.9);
    this.ring(x, y, radius * 1.3, "#b9ffe8", 0.7);
    for (let i = 0; i < 46; i += 1) {
      const a = rand(0, TAU);
      const speed = rand(120, 460);
      this._add({
        kind: ["petal", "star", "spark"][i % 3],
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.95,
        gravity: 20,
        rot: rand(0, TAU),
        spin: rand(-9, 9),
        size: rand(7, 16),
        max: rand(0.6, 1.4),
        color: ["#ffd4ec", "#fff0c4", "#aaffe2", "#d6c4ff"][i % 4]
      });
    }
  }

  draw(ctx, scene) {
    // additive layers
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of this.particles) {
      if (p.kind === "petal" || p.kind === "star" || p.kind === "spark") {
        const img = this.assets.image(p.kind === "petal" ? "petal" : p.kind === "star" ? "star" : "spark");
        const t = p.life / p.max;
        const alpha = clamp(1 - t, 0, 1) * p.alpha;
        if (img) {
          ctx.globalAlpha = alpha;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const s = p.size * (1 - t * 0.25);
          ctx.drawImage(img, -s / 2, -s / 2, s, s);
          ctx.restore();
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.4, 0, TAU);
          ctx.fill();
        }
      } else if (p.kind === "trail") {
        const t = p.life / p.max;
        ctx.globalAlpha = (1 - t) * p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t), 0, TAU);
        ctx.fill();
      } else if (p.kind === "puff") {
        const t = p.life / p.max;
        ctx.globalAlpha = (1 - t) * p.alpha * 0.6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, p.color);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // sprite animations
    for (const a of this.animations) {
      const t = clamp(a.life / a.max, 0, 1);
      if (a.type === "ring") {
        const img = this.assets.image("shockwave");
        const size = 256 * a.scale * (0.4 + t * 1.7);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (1 - t) * 0.85;
        if (img) {
          ctx.drawImage(img, a.x - size / 2, a.y - size / 2, size, size);
        } else {
          ctx.strokeStyle = a.color;
          ctx.lineWidth = 4 * (1 - t);
          ctx.beginPath();
          ctx.arc(a.x, a.y, size / 2, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }
      const sheet = this.assets.image(a.type === "explosion" ? "explosion" : "hit");
      if (!sheet) continue;
      const frames = a.type === "explosion" ? 8 : 5;
      const fw = sheet.width / frames;
      const index = Math.min(frames - 1, Math.floor(t * frames));
      const drawSize = (a.type === "explosion" ? 260 : 96) * a.scale;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = (1 - t * 0.4);
      ctx.drawImage(sheet, index * fw, 0, fw, sheet.height,
        -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }

    // floating text
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.texts) {
      const k = t.life / t.max;
      const scale = k < 0.18 ? 0.6 + (k / 0.18) * 0.55 : 1.05 - (k - 0.18) * 0.1;
      ctx.save();
      ctx.translate(t.x, t.y - k * t.rise);
      ctx.scale(scale, scale);
      ctx.globalAlpha = clamp(1 - k, 0, 1);
      ctx.font = `${t.weight} ${t.size}px "Arial Rounded MT Bold", "Trebuchet MS", "Microsoft YaHei", sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(34,24,66,0.65)";
      ctx.strokeText(t.value, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  drawFlash(ctx, w, h) {
    if (this.flash <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(this.flash, 0, 0.7);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(255,248,230,0.9)");
    g.addColorStop(0.5, "rgba(255,230,200,0.25)");
    g.addColorStop(1, "rgba(255,230,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export default Effects;
