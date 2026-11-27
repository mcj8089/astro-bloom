import { TAU } from "../core/utils.js";

/**
 * First-run interactive lesson. The DOM hand/arrow animation lives in ui.js;
 * this class owns the steps and paints the matching world highlights
 * (soft orbit spotlight + petals) on the canvas. Spawning stays parked until
 * the lesson ends, but aiming and firing stay live so each step can be
 * practised for real.
 */
export class Guide {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.step = 0;
    this.steps = ["aim", "fire", "special"];
    this.done = true;
    this.holdTimer = 0;
  }

  maybeStart(level) {
    const save = this.game.save;
    if (!level || !level.tutorial) return false;
    if (save && save.data.tutorialDone) return false;
    this.active = true;
    this.done = false;
    this.step = 0;
    this.holdTimer = 0;
    this.game.ui?.showGuide?.(this.step, this.steps);
    return true;
  }

  /** Called by the world whenever the player performs one of the taught actions. */
  notify(action) {
    if (!this.active) return;
    if (this.steps[this.step] !== action) return;
    this.next();
  }

  next() {
    if (!this.active) return;
    this.step += 1;
    if (this.step >= this.steps.length) {
      this.finish();
      return;
    }
    this.holdTimer = 0;
    if (this.steps[this.step] === "special") {
      // The last step asks for a Bloom Burst, so hand over a full meter.
      this.game.special = 100;
    }
    this.game.ui?.showGuide?.(this.step, this.steps);
    this.game.audio?.play("click");
  }

  skip() {
    this.finish();
  }

  finish() {
    this.active = false;
    this.done = true;
    this.game.ui?.hideGuide?.();
    this.game.save?.markTutorialDone?.();
  }

  update(dt) {
    if (!this.active) return;
    this.holdTimer += dt;
    // After a few seconds of idling, gently pulse the primary action.
    if (this.step === 2 && this.holdTimer > 3) {
      this.game.ui?.pulseBloom?.();
      this.holdTimer = 0;
    }
  }

  draw(ctx, scene) {
    if (!this.active) return;
    const { center, radius, time } = scene;
    const t = time;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    // soft orbit spotlight
    const glow = ctx.createRadialGradient(center.x, center.y, radius * 0.9,
      center.x, center.y, radius * 1.9);
    glow.addColorStop(0, "rgba(160,255,226,0)");
    glow.addColorStop(0.55, "rgba(160,255,226,0.05)");
    glow.addColorStop(0.78, "rgba(255,200,240,0.12)");
    glow.addColorStop(1, "rgba(255,200,240,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 1.9, 0, TAU);
    ctx.fill();

    // orbiting guide petals
    for (let i = 0; i < 10; i += 1) {
      const a = t * 0.5 + (i / 10) * TAU;
      const rr = radius * 1.62;
      const x = center.x + Math.cos(a) * rr;
      const y = center.y + Math.sin(a) * rr;
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 2 + i);
      ctx.fillStyle = i % 2 ? "#ffe3f2" : "#b6ffe6";
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 2.4, a, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // progress ring around the planet for step 1
    if (this.step === 0) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(t * 0.8);
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = "rgba(180,255,232,0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.62, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export default Guide;
