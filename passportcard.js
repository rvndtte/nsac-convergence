// Draws the shareable passport card (1080x1350 PNG) on a canvas. No dependencies.
const W = 1080;
const H = 1350;
const ACCENT = "#f2a54a";
const TEXT = "#ecebe7";
const MUTED = "#a3a8af";
const DIM = "#70767e";
const DISPLAY = '"Space Grotesk", "IBM Plex Sans", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, font, size, min = 14) {
  let px = size;
  do {
    ctx.font = font(px);
    px -= 1;
  } while (ctx.measureText(text).width > maxWidth && px > min);
}

function stars(count, max) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, max - count));
}

/**
 * @param {object} o
 * @param {string} o.passenger
 * @param {{name:string, items:{name:string, site:string, stars:number|null}[]}[]} o.stops
 * @param {number} o.maxStars  per item
 * @param {string|null} o.rideTime
 * @param {string} o.voyagerLine  e.g. "Voyager 1 · 24.9 billion km from Earth"
 * @param {string} o.dateText
 */
export async function renderPassportCard(o) {
  try {
    await Promise.all([
      document.fonts.load(`600 40px ${DISPLAY}`),
      document.fonts.load(`500 24px ${MONO}`)
    ]);
  } catch { /* fall back to system fonts */ }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background: deep space gradient + stars.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#080c14");
  bg.addColorStop(1, "#04060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const rnd = seeded(2026);
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.15 + rnd() * 0.7;
    ctx.fillStyle = "#fff";
    const r = rnd() < 0.08 ? 1.8 : 0.9;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(W - 120, 140, 0, W - 120, 140, 420);
  glow.addColorStop(0, "rgba(242,165,74,0.22)");
  glow.addColorStop(1, "rgba(242,165,74,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Card frame.
  ctx.strokeStyle = "rgba(242,165,74,0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, W - 80, H - 80, 28);
  ctx.stroke();

  const pad = 90;
  let y = 120;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = ACCENT;
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText("NASA SPACE APPS 2026  ·  PASSPORT", pad, y);
  y += 78;

  ctx.fillStyle = TEXT;
  fitText(ctx, "The Lost & Found Line", W - pad * 2, (px) => `700 ${px}px ${DISPLAY}`, 76, 40);
  ctx.fillText("The Lost & Found Line", pad, y);
  y += 56;
  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${DISPLAY}`;
  ctx.fillText("Machines NASA left behind. Some are still calling home.", pad, y);

  // Passenger block.
  y += 70;
  ctx.fillStyle = DIM;
  ctx.font = `500 20px ${MONO}`;
  ctx.fillText("PASSENGER", pad, y);
  y += 52;
  ctx.fillStyle = TEXT;
  fitText(ctx, o.passenger, W - pad * 2, (px) => `600 ${px}px ${DISPLAY}`, 52);
  ctx.fillText(o.passenger, pad, y);

  // Score summary.
  const total = o.stops.reduce((n, s) => n + s.items.length, 0);
  const claimed = o.stops.reduce((n, s) => n + s.items.filter((i) => i.stars).length, 0);
  const starSum = o.stops.reduce((n, s) => n + s.items.reduce((m, i) => m + (i.stars || 0), 0), 0);
  y += 34;
  ctx.fillStyle = ACCENT;
  ctx.font = `500 26px ${MONO}`;
  const summary = [`${claimed}/${total} recovered`, `${starSum}/${total * o.maxStars} stars`];
  if (o.rideTime) summary.push(`ride ${o.rideTime}`);
  ctx.fillText(summary.join("  ·  "), pad, y);

  // Stops and stamps.
  y += 50;
  const colW = (W - pad * 2 - 24) / 2;
  for (const stop of o.stops) {
    ctx.fillStyle = DIM;
    ctx.font = `500 20px ${MONO}`;
    ctx.fillText(stop.name.toUpperCase(), pad, y);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(pad, y + 12, W - pad * 2, 1);
    y += 34;
    const rows = Math.ceil(stop.items.length / 2);
    stop.items.forEach((item, i) => {
      const x = pad + (i % 2) * (colW + 24);
      const ry = y + Math.floor(i / 2) * 62;
      const got = Boolean(item.stars);
      roundRect(ctx, x, ry - 30, colW, 52, 10);
      ctx.fillStyle = got ? "rgba(242,165,74,0.14)" : "rgba(255,255,255,0.03)";
      ctx.fill();
      ctx.strokeStyle = got ? "rgba(242,165,74,0.6)" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = got ? TEXT : DIM;
      fitText(ctx, got ? item.name : "Not claimed", colW - (got ? 130 : 28), (px) => `500 ${px}px ${DISPLAY}`, 21, 12);
      ctx.fillText(got ? item.name : "Not claimed", x + 14, ry + 2);
      if (got) {
        ctx.fillStyle = ACCENT;
        ctx.font = `500 18px ${MONO}`;
        ctx.textAlign = "right";
        ctx.fillText(stars(item.stars, o.maxStars), x + colW - 12, ry + 2);
        ctx.textAlign = "left";
      }
    });
    y += rows * 62 + 14;
  }

  // Footer: live Voyager line.
  const fy = H - 150;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(pad, fy - 40, W - pad * 2, 1);
  ctx.fillStyle = ACCENT;
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText("● LIVE", pad, fy);
  ctx.fillStyle = TEXT;
  fitText(ctx, o.voyagerLine, W - pad * 2 - 110, (px) => `500 ${px}px ${MONO}`, 22, 13);
  ctx.fillText(o.voyagerLine, pad + 110, fy);
  ctx.fillStyle = DIM;
  ctx.font = `400 20px ${MONO}`;
  ctx.fillText(`${o.dateText}  ·  Data: NASA EPIC, GIBS, Trek, JPL Horizons`, pad, fy + 44);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png")
  );
}
