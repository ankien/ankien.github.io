/**
 * Flat, cartoon-leaning color palette. Kept in one place so the whole scene
 * shares a cohesive look and is easy to retheme later.
 */
export const palette = {
  // Room
  wallBack: "#caa982",
  wallSide: "#b8946a",
  floor: "#7c5a3c",
  trim: "#e8dcc8",

  // Desk
  deskTop: "#c98a4b",
  deskTopDark: "#a9703a",
  deskLeg: "#e9e9ee",

  // Monitor
  monitorBody: "#2b2f36",
  monitorBezel: "#1a1d22",
  screenGlow: "#0c1a2b",

  // PC tower
  towerBody: "#23262c",
  towerPanel: "#15171b",
  rgb: "#5ad1ff",

  // Glass (PC tower side panel, pencil cup)
  glass: "#bfe9ff",

  // Teddy bear
  bearFur: "#c98a52",
  bearFurDark: "#a86f3e",
  bearSnout: "#e8c79a",
  bearNose: "#3a2a20",
  bearEye: "#241a14",

  // Keyboard
  kbBase: "#23262c",
  kbBaseDark: "#15171b",
  keycap: "#9aa0a8",

  // Plants
  leaf: "#5fae57",
  leafDark: "#3f8a47",
  pot: "#d9744f",
  potDark: "#bb5d3c",
  soil: "#4a3526",
  flower: "#ff6f9c",
  flowerAlt: "#ffd23f",
  flowerCenter: "#ffe9a8",

  // Outdoors
  sky: "#bfe6ff",
  grass: "#86c765",
  grassDark: "#6bb24c",
  foliage: "#4f9d54",
  trunk: "#8a6240",
} as const;
