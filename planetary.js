const STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
const CAPE_BBOX = "-80.65,28.35,-80.45,28.55";
const REQUEST_TIMEOUT_MS = 12000;

let pending;

export function getCapeCanaveralImage() {
  pending ??= search().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function search() {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 86400000);
  const params = new URLSearchParams({
    collections: "sentinel-2-l2a",
    bbox: CAPE_BBOX,
    datetime: `${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`,
    limit: "20"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${STAC_SEARCH}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Planetary Computer returned ${response.status}`);
    const result = await response.json();
    const candidates = (result.features ?? []).filter((feature) => {
      return trustedUrl(feature.assets?.rendered_preview?.href) && feature.properties?.datetime;
    });
    // Prefer a relatively clear recent scene, then the lowest cloud cover in the returned set.
    candidates.sort((a, b) => {
      const aClear = (a.properties["eo:cloud_cover"] ?? 100) <= 25;
      const bClear = (b.properties["eo:cloud_cover"] ?? 100) <= 25;
      if (aClear !== bClear) return aClear ? -1 : 1;
      if (aClear) return b.properties.datetime.localeCompare(a.properties.datetime);
      return (a.properties["eo:cloud_cover"] ?? 100) - (b.properties["eo:cloud_cover"] ?? 100);
    });
    const feature = candidates[0];
    if (!feature) throw new Error("No Sentinel-2 preview found for Cape Canaveral");
    const source = feature.links?.find((link) => link.rel === "self")?.href;
    return {
      image: feature.assets.rendered_preview.href,
      date: feature.properties.datetime.slice(0, 10),
      cloud: Number.isFinite(feature.properties["eo:cloud_cover"]) ? feature.properties["eo:cloud_cover"] : null,
      source: trustedUrl(source) ? source : "https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a"
    };
  } finally {
    clearTimeout(timer);
  }
}

function trustedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "planetarycomputer.microsoft.com";
  } catch {
    return false;
  }
}
