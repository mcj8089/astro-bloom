import { GAME_CONFIG } from "../../config/game.config.js";
import { LEVELS } from "../../config/levels.js";
import { lang, n, t } from "./i18n.js";
import { clamp } from "./utils.js";

const FONT_ROUND = '"Arial Rounded MT Bold", "Trebuchet MS", "Microsoft YaHei", sans-serif';
const FONT_BODY = '"Trebuchet MS", "Segoe UI", "Microsoft YaHei", sans-serif';

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand("copy");
  } catch (e) {
    /* ignore */
  }
  area.remove();
}

function cover(ctx, image, x, y, w, h) {
  if (!image) return false;
  const iw = image.width || image.videoWidth || 1;
  const ih = image.height || image.videoHeight || 1;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Social share service:
 *  • native Web Share (files when supported)
 *  • official desktop share URLs
 *  • canvas share-card generation + copy link for TikTok / Instagram / YouTube
 *  • analytics for every attempt
 */
export class ShareService {
  constructor({ save, sdk, assets, game, config = GAME_CONFIG, audio = null } = {}) {
    this.save = save;
    this.sdk = sdk;
    this.assets = assets;
    this.game = game;
    this.config = config;
    this.audio = audio;
    this.lastResult = null;
    this.lastBlob = null;
  }

  resultContext(result) {
    if (result) this.lastResult = { ...result };
    return this.lastResult || {
      kind: "menu",
      levelId: this.save?.data.lastLevel || 1,
      score: this.save?.data.bestScore || 0,
      stars: 0,
      kills: 0
    };
  }

  payload(result) {
    const context = this.resultContext(result);
    const levelId = clamp(Number(context.levelId) || 1, 1, LEVELS.length);
    const level = LEVELS.find((entry) => entry.id === levelId) || LEVELS[0];
    const playerName =
      (this.save?.data.playerName || "").trim() || t("share.defaultName");
    const base = GAME_CONFIG.meta.shareBaseUrl;
    const url = `${base}?lang=${lang}&ref=share&level=${levelId}`;
    const isLose = context.kind === "lose";
    const key = isLose ? "share.textLose" : context.kind === "win" ? "share.textWin" : "share.text";
    const text = t(key, {
      name: playerName,
      score: n(context.score || 0),
      level: levelId,
      kills: n(context.kills || 0),
      stars: context.stars || 0
    });
    return {
      result: context,
      kind: context.kind || "menu",
      levelId,
      level,
      playerName,
      url,
      text,
      title: t("meta.title"),
      invite: t("share.invite", { name: playerName })
    };
  }

  platformUrl(platform) {
    const { text, url } = this.payload();
    const eu = encodeURIComponent(url);
    const et = encodeURIComponent(text);
    switch (platform) {
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${eu}`;
      case "x":
        return `https://twitter.com/intent/tweet?url=${eu}&text=${et}`;
      case "reddit":
        return `https://www.reddit.com/submit?url=${eu}&title=${encodeURIComponent(this.payload().invite)}`;
      case "whatsapp":
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`;
      case "telegram":
        return `https://t.me/share/url?url=${eu}&text=${et}`;
      case "linkedin":
        return `https://www.linkedin.com/sharing/share-offsite/?url=${eu}`;
      default:
        return "";
    }
  }

  async shareTo(platform) {
    const payload = this.payload();
    if (["tiktok", "instagram", "youtube"].includes(platform)) {
      await this.copyLink();
      this._track("card", platform, "prepared");
      return { mode: "card", payload };
    }
    const url = this.platformUrl(platform);
    if (!url) return { mode: "none", payload };
    const popup = window.open(url, "_blank", "noopener,noreferrer,width=720,height=620");
    if (!popup) {
      await this.copyLink();
      this._track("popup-blocked", platform, "copied");
      return { mode: "copied", payload };
    }
    this._track("platform", platform, "opened");
    this.save?.recordShare();
    return { mode: "opened", payload };
  }

  async copyLink() {
    const { text, url } = this.payload();
    await copyText(`${text}\n${url}`);
    this.save?.recordShare();
    this._track("copy", "", "copied");
    return true;
  }

  async native() {
    if (typeof navigator.share !== "function") return { ok: false, mode: "unsupported" };
    const payload = this.payload();
    try {
      const snapshot = this.game?.canvas || null;
      let file = null;
      if (snapshot && navigator.canShare) {
        const blob = await this.cardBlob(payload.result);
        if (blob) {
          file = new File([blob], "astro-bloom.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: payload.title,
              text: payload.invite,
              url: payload.url,
              files: [file]
            });
            this.save?.recordShare();
            this._track("native", "files", "shared");
            return { ok: true, mode: "files" };
          }
        }
      }
      await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
      this.save?.recordShare();
      this._track("native", "text", "shared");
      return { ok: true, mode: "text" };
    } catch (error) {
      return { ok: false, mode: "dismissed" };
    }
  }

  async cardBlob(result) {
    const canvas = document.createElement("canvas");
    canvas.width = GAME_CONFIG.share.cardWidth;
    canvas.height = GAME_CONFIG.share.cardHeight;
    this.drawCard(canvas.getContext("2d"), result);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  }

  async downloadCard(result) {
    const blob = await this.cardBlob(result);
    if (!blob) return false;
    this.lastBlob = blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `astro-bloom-${this.save?.data.playerName || "garden"}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    this.save?.recordShare();
    this._track("download", "", "saved");
    return true;
  }

  _track(method, platform, result) {
    const payload = this.payload();
    this.sdk?.trackShare?.(platform || method, result, {
      method,
      kind: payload.kind,
      levelId: payload.levelId,
      nameProvided: Boolean((this.save?.data.playerName || "").trim())
    });
  }

  /** Paints the branded 1200×630 share card from the live game canvas. */
  drawCard(ctx, result) {
    const W = GAME_CONFIG.share.cardWidth;
    const H = GAME_CONFIG.share.cardHeight;
    const payload = this.payload(result);
    const snapshot = this.game?.canvas || null;
    const accent = "#ffcf7d";
    const cream = "#fff7e8";
    const mint = "#8ff7d4";
    const ink = "#211b42";

    ctx.clearRect(0, 0, W, H);

    // Live gameplay frame, cover-cropped.
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a1d44");
    bg.addColorStop(1, "#2a1c46");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (snapshot) {
      ctx.save();
      ctx.filter = "saturate(1.08) contrast(1.03)";
      cover(ctx, snapshot, 0, 0, W, H);
      ctx.restore();
    } else if (this.assets?.image("bg")) {
      cover(ctx, this.assets.image("bg"), 0, 0, W, H);
    }

    // Readability scrims.
    const left = ctx.createLinearGradient(0, 0, W * 0.78, 0);
    left.addColorStop(0, "rgba(20,14,44,0.92)");
    left.addColorStop(0.48, "rgba(20,14,44,0.55)");
    left.addColorStop(1, "rgba(20,14,44,0.06)");
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, W, H);
    const bottom = ctx.createLinearGradient(0, H * 0.45, 0, H);
    bottom.addColorStop(0, "rgba(15,10,34,0)");
    bottom.addColorStop(1, "rgba(15,10,34,0.86)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, W, H);

    // Glow accents.
    const glow = ctx.createRadialGradient(W * 0.82, H * 0.24, 20, W * 0.82, H * 0.24, 380);
    glow.addColorStop(0, "rgba(255,196,214,0.22)");
    glow.addColorStop(1, "rgba(255,196,214,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Card border.
    ctx.save();
    roundRect(ctx, 22, 22, W - 44, H - 44, 30);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,226,170,0.55)";
    ctx.stroke();
    roundRect(ctx, 32, 32, W - 64, H - 64, 24);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.stroke();
    ctx.restore();

    // Logo.
    const logo = this.assets?.image("logo");
    let logoBottom = 90;
    if (logo) {
      const maxW = 360;
      const maxH = 185;
      const scale = Math.min(maxW / logo.width, maxH / logo.height);
      const lw = logo.width * scale;
      const lh = logo.height * scale;
      ctx.drawImage(logo, 58, 38, lw, lh);
      logoBottom = 38 + lh;
    } else {
      ctx.fillStyle = cream;
      ctx.font = `700 52px ${FONT_ROUND}`;
      ctx.fillText("ASTRO BLOOM", 64, 120);
      logoBottom = 150;
    }

    // Player name + invite.
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = mint;
    ctx.font = `700 23px ${FONT_BODY}`;
    const handle = `@${payload.playerName}`;
    const nameY = Math.max(logoBottom + 18, 248);
    ctx.fillText(handle, 64, nameY);

    ctx.fillStyle = cream;
    ctx.font = `700 36px ${FONT_ROUND}`;
    this._wrapText(ctx, payload.invite, 64, nameY + 44, 610, 42, 2);

    // Stat chips.
    const chipY = 424;
    this._chip(ctx, 64, chipY, 222, 70, t("share.cardScore"), n(payload.result.score || 0), "#ffd37d");
    this._chip(ctx, 300, chipY, 190, 70, t("share.cardLevel"), String(payload.levelId), mint);

    // Site URL + tagline.
    ctx.fillStyle = "rgba(255,247,232,0.78)";
    ctx.font = `600 22px ${FONT_BODY}`;
    ctx.fillText("pipygames.com", 64, H - 46);
    ctx.fillStyle = "rgba(255,247,232,0.5)";
    ctx.font = `500 17px ${FONT_BODY}`;
    ctx.fillText(t("share.cardTitle"), 64, H - 78);

    // QR block.
    const qr = this.assets?.image("qr");
    const qrSize = 158;
    const qx = W - qrSize - 74;
    const qy = H - qrSize - 62;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "rgba(255,247,232,0.96)";
    roundRect(ctx, qx - 14, qy - 14, qrSize + 28, qrSize + 28, 18);
    ctx.fill();
    ctx.restore();
    if (qr) ctx.drawImage(qr, qx, qy, qrSize, qrSize);
    ctx.fillStyle = "rgba(255,247,232,0.72)";
    ctx.font = `600 17px ${FONT_BODY}`;
    ctx.textAlign = "center";
    ctx.fillText("pipygames.com", qx + qrSize / 2, qy + qrSize + 30);
    ctx.textAlign = "left";

    // Decorative sparkles.
    const rng = (() => {
      let seed = 1337;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
    })();
    for (let i = 0; i < 26; i += 1) {
      const x = W * 0.52 + rng() * W * 0.46;
      const y = 42 + rng() * H * 0.5;
      const r = 1 + rng() * 2.6;
      ctx.globalAlpha = 0.25 + rng() * 0.5;
      ctx.fillStyle = rng() > 0.5 ? "#ffe6b4" : "#b8ffe8";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Vignette.
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(8,5,22,0.4)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    return payload;
  }

  _chip(ctx, x, y, w, h, label, value, color) {
    ctx.save();
    ctx.fillStyle = "rgba(255,247,232,0.10)";
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,247,232,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,247,232,0.6)";
    ctx.font = `700 15px ${FONT_BODY}`;
    ctx.fillText(String(label).toUpperCase(), x + 18, y + 25);
    ctx.fillStyle = color;
    ctx.font = `700 34px ${FONT_ROUND}`;
    ctx.fillText(String(value), x + 18, y + 60);
    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text).split(/\s+/);
    let line = "";
    let lines = 0;
    for (let i = 0; i < words.length; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + lines * lineHeight);
        lines += 1;
        line = words[i];
        if (lines >= maxLines - 1) break;
      } else {
        line = test;
      }
    }
    if (lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
  }
}

export default ShareService;
