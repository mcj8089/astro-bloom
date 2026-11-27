import { TAU, clamp, rand } from "../core/utils.js";

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

export function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function angleWithin(angle, center, halfWidth) {
  let diff = ((angle - center + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return Math.abs(diff) <= halfWidth;
}

export function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + diff * t;
}

/** A point just outside one of the four screen edges, aimed near the planet. */
export function edgeSpawn(width, height, padding, aimAngle = null) {
  const angle = aimAngle == null ? rand(0, TAU) : aimAngle;
  const cx = width / 2;
  const cy = height / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const halfW = width / 2 + padding;
  const halfH = height / 2 + padding;
  const tx = Math.abs(dx) < 1e-5 ? Infinity : halfW / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-5 ? Infinity : halfH / Math.abs(dy);
  const t = Math.min(tx, ty);
  return {
    x: cx + dx * t,
    y: cy + dy * t,
    angle: Math.atan2(cy - (cy + dy * t), cx - (cx + dx * t))
  };
}

export function randomEdge(width, height, padding) {
  const side = Math.floor(rand(0, 4));
  if (side === 0) return { x: rand(0, width), y: -padding };
  if (side === 1) return { x: width + padding, y: rand(0, height) };
  if (side === 2) return { x: rand(0, width), y: height + padding };
  return { x: -padding, y: rand(0, height) };
}

export function screenBounce(entity, width, height, margin = 120) {
  return (
    entity.x < -margin ||
    entity.x > width + margin ||
    entity.y < -margin ||
    entity.y > height + margin
  );
}

export function resolveGravity(entity, well, dt, strength = 1) {
  if (!well) return;
  const dx = well.x - entity.x;
  const dy = well.y - entity.y;
  const d2 = dx * dx + dy * dy;
  const radius = well.radius * 3.2;
  if (d2 > radius * radius || d2 < 1) return;
  const d = Math.sqrt(d2);
  const falloff = 1 - d / radius;
  const force = (well.strength || 7000) * falloff * falloff * strength * dt / d;
  entity.vx += dx * force;
  entity.vy += dy * force;
}
