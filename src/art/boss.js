import { TAU, clamp } from "../core/utils.js";

/** Painted boss renderer with animated fists, core and royal laser. */
export class BossArt {
  constructor(assets) {
    this.assets = assets;
  }

  widthFor(scene) {
    return clamp(Math.min(scene.width, scene.height) * 0.34, 188, 400);
  }

  draw(ctx, scene, boss) {
    if (!boss) return;
    const image = this.assets.image(boss.id === "monarch" ? "bossMonarch" : "bossCinder");
    if (!image) return;
    const w = this.widthFor(scene);
    const h = w * (image.height / image.width);
    const t = scene.time;
    const bob = Math.sin(t * 1.3) * w * 0.018;
    const x = boss.x;
    const y = boss.y + bob;
    const tilt = Math.sin(t * 0.9) * 0.025 + (boss.hurtTilt || 0);

    // arrival scale
    const scale = boss.enterScale == null ? 1 : boss.enterScale;
    const dw = w * scale;
    const dh = h * scale;

    // aura
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const auraColor = boss.id === "monarch" ? "150,255,225" : "255,170,110";
    const aura = ctx.createRadialGradient(x, y, 0, x, y, w * 0.95);
    aura.addColorStop(0, `rgba(${auraColor},0.16)`);
    aura.addColorStop(0.55, `rgba(${auraColor},0.06)`);
    aura.addColorStop(1, `rgba(${auraColor},0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.95, 0, TAU);
    ctx.fill();
    ctx.restore();

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "rgba(8,5,20,0.8)";
    ctx.beginPath();
    ctx.ellipse(x, y + dh * 0.44, dw * 0.3, dh * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // fists behind body while idle; in front while slamming
    for (const fist of boss.fists || []) {
      if (!fist.visible) continue;
      const inFront = fist.z > 0;
      if (!inFront) this._drawFist(ctx, scene, boss, fist, scale);
    }

    // body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.shadowColor = "rgba(8,4,20,0.55)";
    ctx.shadowBlur = w * 0.14;
    ctx.shadowOffsetY = w * 0.05;
    ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    // additive hit flash
    if (boss.flash > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(boss.flash, 0, 1) * 0.55;
      ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();

    for (const fist of boss.fists || []) {
      if (!fist.visible) continue;
      if (fist.z > 0) this._drawFist(ctx, scene, boss, fist, scale);
    }

    // exposed core
    const coreX = x;
    const coreY = y + dh * 0.14;
    boss.corePos = { x: coreX, y: coreY, radius: w * 0.16 };
    const exposed = boss.coreExposed > 0;
    const pulse = 0.55 + 0.45 * Math.sin(t * (exposed ? 8 : 3));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const core = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, w * (exposed ? 0.3 : 0.19));
    const coreColor = boss.id === "monarch" ? "255,160,215" : "255,200,120";
    core.addColorStop(0, `rgba(255,255,255,${exposed ? 0.9 : 0.55})`);
    core.addColorStop(0.3, `rgba(${coreColor},${0.55 * pulse})`);
    core.addColorStop(1, `rgba(${coreColor},0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(coreX, coreY, w * (exposed ? 0.3 : 0.19), 0, TAU);
    ctx.fill();
    if (exposed) {
      ctx.strokeStyle = "rgba(255,240,190,0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -t * 36;
      ctx.beginPath();
      ctx.arc(coreX, coreY, w * 0.23, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // laser
    if (boss.laser && boss.laser.state !== "idle") {
      this._drawLaser(ctx, scene, boss);
    }

    // phase-change shockwave
    if (boss.phaseFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = boss.phaseFlash * 0.8;
      const r = w * (0.5 + (1 - boss.phaseFlash) * 1.2);
      const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.7, "rgba(255,230,180,0.3)");
      g.addColorStop(1, "rgba(255,230,180,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawFist(ctx, scene, boss, fist, bodyScale) {
    const image = this.assets.image(boss.id === "monarch" ? "bossMonarchFist" : "bossCinderFist");
    if (!image) return;
    const base = this.widthFor(scene) * 0.36 * (fist.scale || 1) * bodyScale;
    const size = base * 1.6;
    ctx.save();
    ctx.translate(fist.x, fist.y);
    ctx.rotate(fist.rot || 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = "rgba(8,5,20,0.5)";
    ctx.shadowBlur = base * 0.4;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
    if (fist.glow) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.5;
      const g = ctx.createRadialGradient(fist.x, fist.y, 0, fist.x, fist.y, base);
      g.addColorStop(0, boss.id === "monarch" ? "rgba(160,255,230,0.5)" : "rgba(255,180,110,0.5)");
      g.addColorStop(1, "rgba(255,180,110,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fist.x, fist.y, base, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawLaser(ctx, scene, boss) {
    const laser = boss.laser;
    const start = boss.corePos || { x: boss.x, y: boss.y };
    const angle = laser.angle;
    const end = laser.end || {
      x: start.x + Math.cos(angle) * Math.max(scene.width, scene.height),
      y: start.y + Math.sin(angle) * Math.max(scene.width, scene.height)
    };
    const len = Math.hypot(end.x - start.x, end.y - start.y);
    const telegraph = laser.state === "telegraph";
    const t = scene.time;
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = "screen";
    if (telegraph) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 18);
      ctx.strokeStyle = boss.id === "monarch" ? "#ffb6e8" : "#ffd28a";
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 12]);
      ctx.lineDashOffset = -t * 120;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,220,160,0.8)";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
    } else {
      const width = boss.id === "monarch" ? 30 : 24;
      const g = ctx.createLinearGradient(0, -width, 0, width);
      g.addColorStop(0, "rgba(255,150,220,0)");
      g.addColorStop(0.3, "rgba(255,150,220,0.55)");
      g.addColorStop(0.48, "rgba(255,255,255,0.95)");
      g.addColorStop(0.52, "rgba(255,255,255,0.95)");
      g.addColorStop(0.7, "rgba(160,255,232,0.55)");
      g.addColorStop(1, "rgba(160,255,232,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, -width, len, width * 2);
      const glow = ctx.createLinearGradient(0, 0, len, 0);
      glow.addColorStop(0, "rgba(255,220,180,0.7)");
      glow.addColorStop(0.6, "rgba(255,190,230,0.4)");
      glow.addColorStop(1, "rgba(255,190,230,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, -width * 0.18, len, width * 0.36);
      // travelling sparks
      for (let i = 0; i < 10; i += 1) {
        const px = (t * 460 + i * 63) % len;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = i % 2 ? "#ffffff" : "#ffd6ee";
        ctx.beginPath();
        ctx.arc(px, (i % 3 - 1) * width * 0.25, 1.6 + (i % 2), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

export default BossArt;
