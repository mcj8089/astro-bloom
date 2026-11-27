import { TAU } from "../core/utils.js";

/** The living seed guardian that orbits the garden planet. */
export class ShipArt {
  constructor(assets, config) {
    this.assets = assets;
    this.config = config;
    this.trail = [];
    this.trailTimer = 0;
  }

  reset() {
    this.trail.length = 0;
    this.trailTimer = 0;
  }

  draw(ctx, scene, state) {
    const image = this.assets.image("ship");
    if (!image) return;
    const { center } = scene;
    const orbit = state.orbit || scene.orbit;
    const angle = state.angle || 0;
    const bob = Math.sin(scene.time * 2.2 + 1.2) * scene.radius * 0.018;
    const x = center.x + Math.cos(angle) * (orbit + bob);
    const y = center.y + Math.sin(angle) * (orbit + bob);
    const height = scene.radius * (this.config.world.shipHeightFactor || 0.56);
    const width = height * (image.width / image.height);
    const rotation = angle + Math.PI / 2;

    const firing = Boolean(state.firing);
    const charge = state.charge || 0;

    // orbit glow / pad
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.72);
    glow.addColorStop(0, `rgba(140,255,220,${0.12 + charge * 0.0012})`);
    glow.addColorStop(0.65, "rgba(140,255,220,0.05)");
    glow.addColorStop(1, "rgba(140,255,220,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, width * 0.72, 0, TAU);
    ctx.fill();
    ctx.restore();

    // thruster flame (behind the guardian, aimed at the planet)
    const flicker = 0.72 + Math.random() * 0.38;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalCompositeOperation = "screen";
    const flameH = height * (0.35 + (firing ? 0.28 : 0.08)) * flicker;
    const flame = ctx.createLinearGradient(0, height * 0.22, 0, height * 0.22 + flameH);
    flame.addColorStop(0, "rgba(255,255,255,0.95)");
    flame.addColorStop(0.25, "rgba(150,255,238,0.9)");
    flame.addColorStop(0.6, "rgba(90,210,255,0.45)");
    flame.addColorStop(1, "rgba(90,210,255,0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-width * 0.14, height * 0.2);
    ctx.quadraticCurveTo(0, height * 0.2 + flameH * 1.2, width * 0.14, height * 0.2);
    ctx.closePath();
    ctx.fill();
    // little petals in the exhaust
    for (let i = 0; i < 3; i += 1) {
      const t = (scene.time * 2.4 + i * 0.33) % 1;
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.fillStyle = i % 2 ? "#ffd2e8" : "#b6ffe6";
      ctx.beginPath();
      ctx.ellipse(
        Math.sin(scene.time * 5 + i * 2) * width * 0.1,
        height * 0.2 + t * flameH * 0.9,
        2.4, 4.2, t * 2, 0, TAU
      );
      ctx.fill();
    }
    ctx.restore();

    // trail
    this.trailTimer += 1;
    if (state.moving || firing) {
      if (this.trailTimer % 2 === 0) {
        this.trail.push({
          x: x - Math.cos(angle) * height * 0.2,
          y: y - Math.sin(angle) * height * 0.2,
          life: 0,
          max: 0.55,
          size: 3 + Math.random() * 3
        });
      }
    }
    this.trail = this.trail.filter((p) => {
      p.life += 1 / 60;
      return p.life < p.max;
    });
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of this.trail) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = t * 0.35;
      ctx.fillStyle = "#b7ffe6";
      ctx.beginPath();
      ctx.arc(p.x - Math.cos(angle) * p.life * 60, p.y - Math.sin(angle) * p.life * 60,
        p.size * t, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // guardian
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = "rgba(120,255,214,0.28)";
    ctx.shadowBlur = height * 0.28;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();

    // charge halo
    if (charge > 2) {
      const pct = Math.min(1, charge / 100);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(scene.time * 0.9);
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = pct >= 1 ? "rgba(255,220,140,0.9)" : "rgba(168,255,232,0.6)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -scene.time * 26;
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.64, 0, TAU * pct);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export default ShipArt;
