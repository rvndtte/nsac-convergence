// Real distances from the NASA/JPL Horizons snapshot in data/ephemeris.json.
const DAY_MS = 86_400_000;
const LIGHT_KM_PER_S = 299_792.458;

export function createEphemeris(snapshot) {
  const { kmPerAU } = snapshot.constants;
  const series = new Map(
    Object.entries(snapshot.bodies).map(([id, body]) => [id, body.rangeAU.map(([date, au]) => [Date.parse(`${date}T00:00:00Z`), au])])
  );

  // Linear interpolation between weekly samples; extrapolates from the nearest pair outside the range.
  function rangeAU(id, time) {
    const samples = series.get(id);
    if (!samples?.length) return null;
    let index = samples.findIndex(([at]) => at > time);
    if (index === -1) index = samples.length - 1;
    index = Math.max(index, 1);
    const [t0, a0] = samples[index - 1];
    const [t1, a1] = samples[index];
    return a0 + ((a1 - a0) * (time - t0)) / (t1 - t0);
  }

  return {
    has: (id) => series.has(id),
    distanceKm(id, time = Date.now()) {
      const au = rangeAU(id, time);
      return au === null ? null : au * kmPerAU;
    },
    lightSeconds(id, time = Date.now()) {
      const km = this.distanceKm(id, time);
      return km === null ? null : km / LIGHT_KM_PER_S;
    },
    // Heliocentric ecliptic position in AU, moved along the stored velocity to `time`.
    position(id, time = Date.now()) {
      const state = snapshot.bodies[id]?.heliocentric;
      if (!state) return null;
      const days = (time - Date.parse(`${state.epoch}T00:00:00Z`)) / DAY_MS;
      return state.position.map((value, axis) => value + state.velocity[axis] * days);
    }
  };
}

export function formatDuration(seconds, { parts = 3 } = {}) {
  const units = [["d", 86400], ["h", 3600], ["m", 60], ["s", 1]];
  let rest = Math.max(0, Math.floor(seconds));
  const out = [];
  for (const [label, size] of units) {
    const value = Math.floor(rest / size);
    rest -= value * size;
    if (value || out.length) out.push(`${value}${label}`);
  }
  return (out.length ? out : ["0s"]).slice(0, parts).join(" ");
}
