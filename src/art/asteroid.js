import { TAU, clamp } from "../core/utils.js";

const SPRITES = {
  rock: ["rockA", "rockB"],
  rock_small: ["rockSmall"],
  splitter: ["rockA"],
  comet: ["comet"],
  armored: ["rockC"],
  crystal: ["rockSpike"],
  pollen: ["pollen"],
  heal: ["heal"]
};

/** Painted meteor critter. Gameplay data lives in game/entities. */
export class AsteroidArt {
  constructor(assets) {
    this.assets = assets;
  }

  spriteFor(type, seed = 0) {
    const list = SPRITES[type] || SPRITES.rock;
    return this.assets.image(list[seed % list.length]);
  }

  draw(ctx, scene, rock) {
    if (rock.dead) return;
    const image = this.spriteFor(rock.type, rock.variant || 0);
    if (!image) return;
    const size = rock.radius * 2.75;
    const x = rock.x;
    const y = rock.y;

    // soft shadow/glow under the critter
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(x, y, 0, x, y, rock.radius * 2.1);
    const color = rock.type === "comet" ? "120,220,255"
      : rock.type === "armored" ? "190,160,255"
        : rock.type === "crystal" ? "220,160,255" : "180,200,255";
    glow.addColorStop(0, `rgba(${color},${rock.elite ? 0.22 : 0.10})`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, rock.radius * 2.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    // comet tail
    if (rock.type === "comet") {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const tail = ctx.createLinearGradient(x, y,
        x - Math.cos(rock.angle) * rock.radius * 2.2,
        y - Math.sin(rock.angle) * rock.radius * 2.2);
      tail.addColorStop(0, "rgba(180,245,255,0.65)");
      tail.addColorStop(0.55, "rgba(130,220,255,0.22)");
      tail.addColorStop(1, "rgba(130,220,255,0)");
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(rock.angle + 1.45) * rock.radius * 0.45,
        y - Math.sin(rock.angle + 1.45) * rock.radius * 0.45);
      ctx.lineTo(x - Math.cos(rock.angle) * rock.radius * 2.4,
        y - Math.sin(rock.angle) * rock.radius * 2.4);
      ctx.lineTo(x - Math.cos(rock.angle - 1.45) * rock.radius * 0.45,
        y - Math.sin(rock.angle - 1.45) * rock.radius * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rock.rotation);
    ctx.shadowColor = "rgba(15,10,35,0.45)";
    ctx.shadowBlur = rock.radius * 0.5;
    ctx.shadowOffsetY = rock.radius * 0.22;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();

    // armour shield arc
    if (rock.shield) {
      const shield = this.assets.image("shield");
      if (shield) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rock.shieldAngle);
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.68 + 0.22 * Math.sin(scene.time * 4 + rock.seed);
        const sw = rock.radius * 2.55;
        ctx.drawImage(shield, -sw / 2, -sw / 2, sw, sw);
        ctx.restore();
      }
    }

    // hit flash / armour glow
    if (rock.flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp(rock.flash, 0, 1) * 0.6;
      const flash = ctx.createRadialGradient(x, y, 0, x, y, rock.radius * 1.2);
      flash.addColorStop(0, "rgba(255,255,240,0.9)");
      flash.addColorStop(0.6, "rgba(255,220,180,0.25)");
      flash.addColorStop(1, "rgba(255,220,180,0)");
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(x, y, rock.radius * 1.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // health bar for tougher rocks
    if (rock.maxHp > 2 && rock.hp < rock.maxHp) {
      const w = rock.radius * 1.15;
      const pct = clamp(rock.hp / rock.maxHp, 0, 1);
      ctx.save();
      ctx.translate(x, y - rock.radius * 0.98);
      ctx.fillStyle = "rgba(24,18,48,0.55)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-w / 2, -4, w, 6, 3) : ctx.rect(-w / 2, -4, w, 6);
      ctx.fill();
      ctx.fillStyle = pct > 0.45 ? "#b7ffcf" : "#ffb08a";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-w / 2, -4, w * pct, 6, 3) : ctx.rect(-w / 2, -4, w * pct, 6);
      ctx.fill();
      ctx.restore();
    }

    // elite ring
    if (rock.elite) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(scene.time * 1.4);
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = "rgba(255,215,140,0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius * 1.32, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export default AsteroidArt;
