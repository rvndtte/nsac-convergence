import { gibsTiles, trekTiles } from "./nasa.js";

// How each stop on the route is drawn. Content (items, announcements) lives in data/lost-and-found.json.
export const bodies = {
  earth: {
    kind: "globe",
    tiles: () => gibsTiles("BlueMarble_NextGeneration"),
    fill: "#16263a",
    atmosphere: 0x7fb2ff,
    startView: { lat: 18, lon: -60 },
    credit: "Surface: Blue Marble Next Generation via NASA GIBS. Earth photo: NASA EPIC on DSCOVR."
  },
  moon: {
    kind: "globe",
    tiles: () => trekTiles("Moon", "LRO_WAC_Mosaic_Global_303ppd_v02"),
    fill: "#77746f",
    atmosphere: null,
    startView: { lat: 8, lon: 0 },
    credit: "Surface: LRO WAC global mosaic via NASA Moon Trek. Photos: NASA Image and Video Library."
  },
  mars: {
    kind: "globe",
    tiles: () => trekTiles("Mars", "Mars_Viking_MDIM21_ClrMosaic_global_232m"),
    fill: "#6b4637",
    atmosphere: 0xd8956a,
    startView: { lat: 10, lon: 300 },
    credit: "Surface: Viking MDIM 2.1 colour mosaic via NASA Mars Trek. Photos: NASA Image and Video Library."
  },
  space: {
    kind: "system",
    credit: "Positions: NASA/JPL Horizons. Distances are drawn on a logarithmic scale."
  }
};
