const IMAGE_API = "https://images-api.nasa.gov";
const IMAGE_DETAILS = "https://images.nasa.gov/details";
const TREK_TILES = "https://trek.nasa.gov/tiles";
const GIBS_TILES = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best";
const EPIC_API = "https://epic.gsfc.nasa.gov/api/natural";
const EPIC_ARCHIVE = "https://epic.gsfc.nasa.gov/archive/natural";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_FULL_IMAGE_BYTES = 1_500_000;
const SUMMARY_LENGTH = 220;

const requests = new Map();

export function searchImages({ query, match, yearStart, yearEnd, limit = 8 }) {
  const params = new URLSearchParams({ q: query, media_type: "image", page_size: "60" });
  if (yearStart) params.set("year_start", String(yearStart));
  if (yearEnd) params.set("year_end", String(yearEnd));
  const url = `${IMAGE_API}/search?${params}`;

  return once(url, async () => {
    const { collection } = await fetchJson(url);
    const pattern = match ? new RegExp(match, "i") : null;
    const records = collection.items
      .map(toRecord)
      .filter((record) => record && (!pattern || pattern.test(`${record.title} ${record.keywords.join(" ")} ${record.summary}`)));
    return {
      query,
      total: collection.metadata?.total_hits ?? records.length,
      records: records.slice(0, limit)
    };
  });
}

export function getImage(nasaId) {
  const url = `${IMAGE_API}/search?${new URLSearchParams({ nasa_id: nasaId })}`;

  return once(url, async () => {
    const { collection } = await fetchJson(url);
    const record = collection.items.map(toRecord).find(Boolean);
    if (!record) throw new Error(`NASA Image Library has no record ${nasaId}`);
    return record;
  });
}

// Equirectangular map tiles from NASA Trek (Moon, Mars): level z is 2^(z+1) × 2^z tiles of 256 px.
export function trekTiles(body, layer, level = 2) {
  const columns = 2 ** (level + 1);
  const rows = 2 ** level;
  const base = `${TREK_TILES}/${body}/EQ/${layer}/1.0.0/default/default028mm/${level}`;
  return { columns, rows, size: 256, width: columns * 256, height: rows * 256, url: (row, column) => `${base}/${row}/${column}.jpg` };
}

// NASA GIBS EPSG:4326 tiles (Earth): 512 px tiles where level 2 covers 360° in 5 columns; the last row overflows the map.
export function gibsTiles(layer, level = 2) {
  const degreesPerTile = 288 / 2 ** level;
  const columns = Math.ceil(360 / degreesPerTile);
  const rows = Math.ceil(180 / degreesPerTile);
  const width = Math.round((360 / degreesPerTile) * 512);
  const base = `${GIBS_TILES}/${layer}/default/500m/${level}`;
  return { columns, rows, size: 512, width, height: width / 2, url: (row, column) => `${base}/${row}/${column}.jpeg` };
}

// Stitches a tile grid into one canvas that is full size from the start, so a texture built on it never resizes.
export function createMosaic({ columns, rows, size, width, height, url }, fill) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);
  let loading = null;

  return {
    canvas,
    load(onTile) {
      loading ??= Promise.allSettled(
        Array.from({ length: rows * columns }, (_, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          return loadImage(url(row, column)).then((image) => {
            context.drawImage(image, column * size, row * size, size, size);
            onTile();
          });
        })
      );
      return loading;
    }
  };
}

// Latest full-disc photo of Earth from the EPIC camera on DSCOVR, about 1.5 million km away.
export function getLatestEarth() {
  return once(EPIC_API, async () => {
    const [latest] = await fetchJson(EPIC_API);
    if (!latest) throw new Error("EPIC returned no images");
    const [date] = latest.date.split(" ");
    const [year, month, day] = date.split("-");
    return {
      date,
      caption: latest.caption,
      image: `${EPIC_ARCHIVE}/${year}/${month}/${day}/jpg/${latest.image}.jpg`,
      thumb: `${EPIC_ARCHIVE}/${year}/${month}/${day}/thumbs/${latest.image}.jpg`
    };
  });
}

export function loadJson(url) {
  return fetchJson(url);
}

function once(key, task) {
  if (!requests.has(key)) {
    requests.set(key, task().catch((error) => {
      requests.delete(key);
      throw error;
    }));
  }
  return requests.get(key);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`NASA API returned ${response.status} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function toRecord(item) {
  const data = item.data?.[0];
  const links = item.links ?? [];
  const preview = links.find((link) => link.rel === "preview")?.href;
  if (!data?.nasa_id || !preview) return null;

  const canonical = links.find((link) => link.rel === "canonical");
  const full = canonical && canonical.size && canonical.size < MAX_FULL_IMAGE_BYTES ? canonical.href : preview;
  const description = plainText(data.description ?? "");

  return {
    nasaId: data.nasa_id,
    title: data.title || data.nasa_id,
    date: data.date_created ? data.date_created.slice(0, 10) : "",
    center: data.center ?? "",
    summary: description.length > SUMMARY_LENGTH ? `${description.slice(0, SUMMARY_LENGTH).trimEnd()}…` : description,
    keywords: data.keywords ?? [],
    preview: toHttps(preview),
    image: toHttps(full),
    detailsUrl: `${IMAGE_DETAILS}/${encodeURIComponent(data.nasa_id)}`
  };
}

function plainText(markup) {
  const text = new DOMParser().parseFromString(markup, "text/html").body.textContent ?? "";
  return text.replace(/\s+/g, " ").trim();
}

function toHttps(url) {
  return url.replace(/^http:/, "https:");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}
