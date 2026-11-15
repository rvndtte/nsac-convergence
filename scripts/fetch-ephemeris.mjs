// Snapshot real distances from NASA/JPL Horizons into data/ephemeris.json.
// Horizons sends no CORS header, so the browser cannot call it directly;
// run this script (Node 18+) whenever the snapshot should be refreshed:
//   node scripts/fetch-ephemeris.mjs
import { writeFile } from "node:fs/promises";

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const START = "2026-01-01";
const STOP = "2028-01-01";
const STEP = "7d";

// Horizons command IDs. Negative IDs are spacecraft.
const TARGETS = [
  { id: "moon", command: "301", name: "Moon" },
  { id: "mars", command: "499", name: "Mars" },
  { id: "pioneer-10", command: "-23", name: "Pioneer 10" },
  { id: "voyager-1", command: "-31", name: "Voyager 1" }
];

function query(params) {
  const search = new URLSearchParams({ format: "json", OBJ_DATA: "NO", MAKE_EPHEM: "YES", CSV_FORMAT: "YES" });
  Object.entries(params).forEach(([key, value]) => search.set(key, `'${value}'`));
  return fetch(`${API}?${search}`).then(async (response) => {
    if (!response.ok) throw new Error(`Horizons ${response.status}`);
    const { result } = await response.json();
    const table = result.split("$$SOE")[1]?.split("$$EOE")[0];
    if (!table) throw new Error(`No ephemeris table in Horizons reply:\n${result.slice(0, 400)}`);
    return table.trim().split("\n").map((line) => line.split(",").map((cell) => cell.trim()));
  });
}

// Weekly distance from Earth's centre (AU), for interpolation in the browser.
async function rangeSeries(command) {
  const rows = await query({ COMMAND: command, EPHEM_TYPE: "OBSERVER", CENTER: "500@399", START_TIME: START, STOP_TIME: STOP, STEP_SIZE: STEP, QUANTITIES: "20" });
  return rows.map(([date, , , delta]) => [new Date(`${date.replace(/-(\w{3})-/, " $1 ")} UTC`).toISOString().slice(0, 10), Number(delta)]);
}

// Heliocentric ecliptic position (AU) and velocity (AU/day), for placing objects in 3D.
async function stateVector(command, date) {
  const next = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  const [row] = await query({ COMMAND: command, EPHEM_TYPE: "VECTORS", CENTER: "500@10", REF_PLANE: "ECLIPTIC", START_TIME: date, STOP_TIME: next, STEP_SIZE: "1d", VEC_TABLE: "2", OUT_UNITS: "AU-D" });
  const [x, y, z, vx, vy, vz] = row.slice(2, 8).map(Number);
  return { epoch: date, position: [x, y, z], velocity: [vx, vy, vz] };
}

const today = new Date().toISOString().slice(0, 10);
const bodies = {};
for (const target of TARGETS) {
  const [range, state] = await Promise.all([rangeSeries(target.command), stateVector(target.command, today)]);
  bodies[target.id] = { name: target.name, horizonsId: target.command, rangeAU: range, heliocentric: state };
  console.log(`${target.name}: ${range.length} samples, ${range.find(([d]) => d >= today)?.[1].toFixed(3)} AU from Earth`);
}

const snapshot = {
  source: "NASA/JPL Horizons API (https://ssd.jpl.nasa.gov/api/horizons.api)",
  generated: new Date().toISOString(),
  units: { rangeAU: "[ISO date, distance from Earth centre in AU]", position: "AU, heliocentric ecliptic J2000", velocity: "AU per day" },
  constants: { kmPerAU: 149597870.7, lightDayAU: 173.1446 },
  bodies
};

await writeFile(new URL("../data/ephemeris.json", import.meta.url), `${JSON.stringify(snapshot)}\n`);
console.log("Wrote data/ephemeris.json");
