/**
 * Campaign layout, difficulty curve and per-level mechanics.
 *
 * Each level is genuinely different:
 *  1 basic defence / tutorial      6 crystal shields (angle-based armour)
 *  2 splitting meteors             7 BOSS: Cinder King
 *  3 orbit lanes + pollen          8 pollen turrets
 *  4 gravity well                  9 portal storm
 *  5 meteor rain / combo           10 BOSS: Meteor Monarch
 */
export const LEVELS = [
  {
    id: 1,
    nameKey: "level.1.name",
    descKey: "level.1.desc",
    tagKey: "level.1.tag",
    theme: "aurora",
    mechanic: "basic",
    planetHp: 100,
    speedMul: 0.85,
    hpMul: 0.9,
    music: "battle",
    waves: [
      { at: 1.5, type: "rock", count: 3, gap: 1.8 },
      { at: 13, type: "rock", count: 4, gap: 1.5 },
      { at: 27, type: "rock", count: 5, gap: 1.25 },
      { at: 43, type: "rock", count: 6, gap: 1.05 }
    ],
    tutorial: true,
    stars: [0.35, 0.72],
    reward: 40
  },
  {
    id: 2,
    nameKey: "level.2.name",
    descKey: "level.2.desc",
    tagKey: "level.2.tag",
    theme: "coral",
    mechanic: "split",
    planetHp: 100,
    speedMul: 0.92,
    hpMul: 1.0,
    music: "battle",
    waves: [
      { at: 1.5, type: "splitter", count: 3, gap: 2.2 },
      { at: 14, type: "rock", count: 4, gap: 1.4 },
      { at: 24, type: "splitter", count: 4, gap: 1.8 },
      { at: 38, type: "splitter", count: 5, gap: 1.5 },
      { at: 52, type: "rock", count: 6, gap: 1.1 }
    ],
    stars: [0.38, 0.75],
    reward: 55
  },
  {
    id: 3,
    nameKey: "level.3.name",
    descKey: "level.3.desc",
    tagKey: "level.3.tag",
    theme: "mint",
    mechanic: "lanes",
    planetHp: 110,
    speedMul: 1.0,
    hpMul: 1.05,
    music: "battle",
    lanes: true,
    pollenRate: 4.2,
    waves: [
      { at: 1.5, type: "rock", count: 4, gap: 1.6 },
      { at: 12, type: "pollen", count: 3, gap: 2.4 },
      { at: 18, type: "rock", count: 5, gap: 1.3 },
      { at: 31, type: "comet", count: 3, gap: 2.0 },
      { at: 42, type: "rock", count: 6, gap: 1.1 },
      { at: 55, type: "splitter", count: 4, gap: 1.6 }
    ],
    stars: [0.38, 0.74],
    reward: 65
  },
  {
    id: 4,
    nameKey: "level.4.name",
    descKey: "level.4.desc",
    tagKey: "level.4.tag",
    theme: "violet",
    mechanic: "gravity",
    planetHp: 110,
    speedMul: 1.02,
    hpMul: 1.12,
    music: "battle",
    gravity: { strength: 7800, radius: 430, drift: 26 },
    waves: [
      { at: 1.5, type: "rock", count: 4, gap: 1.6 },
      { at: 13, type: "comet", count: 4, gap: 1.6 },
      { at: 26, type: "rock", count: 5, gap: 1.3 },
      { at: 39, type: "splitter", count: 4, gap: 1.8 },
      { at: 52, type: "comet", count: 5, gap: 1.4 }
    ],
    stars: [0.4, 0.76],
    reward: 80
  },
  {
    id: 5,
    nameKey: "level.5.name",
    descKey: "level.5.desc",
    tagKey: "level.5.tag",
    theme: "sunset",
    mechanic: "rain",
    planetHp: 120,
    speedMul: 1.06,
    hpMul: 1.05,
    music: "battle",
    rain: { interval: 0.55, maxAlive: 30 },
    waves: [
      { at: 1.5, type: "rock_small", count: 8, gap: 0.55 },
      { at: 12, type: "rock_small", count: 12, gap: 0.48 },
      { at: 24, type: "rock_small", count: 16, gap: 0.42 },
      { at: 37, type: "rock_small", count: 20, gap: 0.38 },
      { at: 51, type: "rock_small", count: 24, gap: 0.34 }
    ],
    stars: [0.42, 0.78],
    reward: 95
  },
  {
    id: 6,
    nameKey: "level.6.name",
    descKey: "level.6.desc",
    tagKey: "level.6.tag",
    theme: "ice",
    mechanic: "shell",
    planetHp: 120,
    speedMul: 1.06,
    hpMul: 1.18,
    music: "battle",
    shells: true,
    waves: [
      { at: 1.5, type: "armored", count: 3, gap: 2.0 },
      { at: 12, type: "rock", count: 4, gap: 1.4 },
      { at: 22, type: "armored", count: 4, gap: 1.8 },
      { at: 34, type: "comet", count: 4, gap: 1.5 },
      { at: 45, type: "armored", count: 5, gap: 1.5 },
      { at: 58, type: "rock", count: 6, gap: 1.0 }
    ],
    stars: [0.42, 0.8],
    reward: 110
  },
  {
    id: 7,
    nameKey: "level.7.name",
    descKey: "level.7.desc",
    tagKey: "level.7.tag",
    theme: "ember",
    mechanic: "boss",
    planetHp: 130,
    speedMul: 0.95,
    hpMul: 1.1,
    music: "boss",
    boss: {
      id: "cinder",
      nameKey: "boss.cinder.name",
      titleKey: "boss.cinder.title",
      hp: 540,
      sprite: "boss_cinder_body",
      fistSprite: "boss_cinder_fist",
      enterAt: 9,
      attacks: ["volley", "barrage", "slam"],
      cycle: 4.2,
      enrage: 0.5
    },
    waves: [
      { at: 1.5, type: "rock", count: 3, gap: 1.6 },
      { at: 12, type: "rock", count: 4, gap: 1.4 }
    ],
    stars: [0.45, 0.78],
    reward: 180
  },
  {
    id: 8,
    nameKey: "level.8.name",
    descKey: "level.8.desc",
    tagKey: "level.8.tag",
    theme: "garden",
    mechanic: "pollen",
    planetHp: 130,
    speedMul: 1.1,
    hpMul: 1.15,
    music: "battle",
    pollenRate: 3.0,
    turretGoal: 6,
    waves: [
      { at: 1.5, type: "rock", count: 4, gap: 1.5 },
      { at: 12, type: "pollen", count: 4, gap: 2.0 },
      { at: 18, type: "splitter", count: 3, gap: 1.9 },
      { at: 30, type: "armored", count: 3, gap: 2.0 },
      { at: 41, type: "pollen", count: 5, gap: 1.8 },
      { at: 48, type: "rock", count: 7, gap: 1.0 },
      { at: 60, type: "comet", count: 5, gap: 1.3 }
    ],
    stars: [0.44, 0.8],
    reward: 130
  },
  {
    id: 9,
    nameKey: "level.9.name",
    descKey: "level.9.desc",
    tagKey: "level.9.tag",
    theme: "void",
    mechanic: "portal",
    planetHp: 140,
    speedMul: 1.12,
    hpMul: 1.2,
    music: "battle",
    portals: { interval: 4.6, life: 3.2 },
    waves: [
      { at: 1.5, type: "rock", count: 4, gap: 1.4 },
      { at: 12, type: "armored", count: 3, gap: 1.9 },
      { at: 23, type: "comet", count: 5, gap: 1.3 },
      { at: 34, type: "splitter", count: 4, gap: 1.7 },
      { at: 46, type: "rock", count: 7, gap: 0.95 },
      { at: 58, type: "armored", count: 4, gap: 1.6 }
    ],
    stars: [0.46, 0.82],
    reward: 155
  },
  {
    id: 10,
    nameKey: "level.10.name",
    descKey: "level.10.desc",
    tagKey: "level.10.tag",
    theme: "royal",
    mechanic: "bossFinal",
    planetHp: 150,
    speedMul: 1.05,
    hpMul: 1.15,
    music: "boss",
    boss: {
      id: "monarch",
      nameKey: "boss.monarch.name",
      titleKey: "boss.monarch.title",
      hp: 880,
      sprite: "boss_monarch_body",
      fistSprite: "boss_monarch_fist",
      enterAt: 9,
      attacks: ["barrage", "slam", "laser", "volley"],
      cycle: 3.5,
      enrage: 0.35
    },
    waves: [
      { at: 1.5, type: "rock", count: 3, gap: 1.5 },
      { at: 12, type: "armored", count: 3, gap: 1.9 }
    ],
    stars: [0.5, 0.84],
    reward: 240
  }
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(id) {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

export default LEVELS;
