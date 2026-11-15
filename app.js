import { createAudio } from "./audio.js";
import { createEphemeris, formatDuration } from "./ephemeris.js";
import { html } from "./html.js";
import { playIntro } from "./intro.js";
import { renderPassportCard } from "./passportcard.js";
import { getImage, getLatestEarth, loadJson, searchImages } from "./nasa.js";
import { getCapeCanaveralImage } from "./planetary.js";
import { bodies } from "./worlds.js";
import {
  archiveView, finaleView, freeView, landmarksView, markersView, passportView,
  recordView, routeView, stationClearedView, tagView
} from "./views.js";

const MAX_STARS = 3;
const ARCHIVE_SIZE = 8;
const ANNOUNCE_MS = 8000;
const LIVE_REFRESH_MS = 200;
const NO_SCENE_RIDE_MS = 600;
const PANEL_GAP = 24;
const AXIS_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const INTERACTIVE_MODES = new Set(["stop", "record", "finale", "free"]);
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const ETA_FORMAT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wideLayout = window.matchMedia("(min-width: 900px), (min-width: 550px) and (max-height: 560px)");

const ui = {
  canvas: document.getElementById("scene"),
  topbar: document.getElementById("topbar"),
  route: document.getElementById("route"),
  passportButton: document.getElementById("passport-button"),
  passportCount: document.getElementById("passport-count"),
  soundButton: document.getElementById("sound-button"),
  boarding: document.getElementById("boarding"),
  passForm: document.getElementById("pass-form"),
  passenger: document.getElementById("passenger"),
  passStops: document.getElementById("pass-stops"),
  passItems: document.getElementById("pass-items"),
  passDate: document.getElementById("pass-date"),
  countdown: document.getElementById("countdown"),
  countdownTime: document.getElementById("countdown-time"),
  countdownSub: document.getElementById("countdown-sub"),
  passEarth: document.getElementById("pass-earth"),
  announcement: document.getElementById("announcement"),
  announcementLabel: document.getElementById("announcement-label"),
  announcementText: document.getElementById("announcement-text"),
  announcementMeta: document.getElementById("announcement-meta"),
  markers: document.getElementById("markers"),
  landmarks: document.getElementById("landmarks"),
  reticle: document.getElementById("window-reticle"),
  windowControls: document.getElementById("window-controls"),
  zoomLevel: document.getElementById("zoom-level"),
  hud: document.getElementById("mission-hud"),
  hudStop: document.getElementById("hud-stop"),
  hudPlace: document.getElementById("hud-place"),
  hudDistance: document.getElementById("hud-distance"),
  hudObjective: document.getElementById("hud-objective"),
  hudCount: document.getElementById("hud-count"),
  hudTotal: document.getElementById("hud-total"),
  hudProgress: document.getElementById("hud-progress"),
  hudProgressFill: document.getElementById("hud-progress-fill"),
  claimFlash: document.getElementById("claim-flash"),
  claimFlashName: document.getElementById("claim-flash-name"),
  scanner: document.getElementById("scanner"),
  scannerBearing: document.getElementById("scanner-bearing"),
  scannerLevel: document.getElementById("scanner-level"),
  scannerNote: document.getElementById("scanner-note"),
  tag: document.getElementById("tag"),
  record: document.getElementById("record"),
  finale: document.getElementById("finale"),
  credits: document.getElementById("credits"),
  loadError: document.getElementById("load-error"),
  passportDialog: document.getElementById("passport-dialog"),
  passport: document.getElementById("passport"),
  earthWindowDialog: document.getElementById("earth-window-dialog"),
  earthWindowContent: document.getElementById("earth-window-content")
};

const audio = createAudio();
const state = {
  mode: "loading",
  passenger: "Passenger",
  stationIndex: 0,
  furthestStationIndex: 0,
  tag: null,
  stationProgress: new Map(),
  feedback: "",
  claims: new Map(),
  revealed: new Set(),
  recordId: null,
  recordReturn: "stop",
  photo: 0,
  archives: new Map(),
  postcard: null,
  scanning: false,
  scannerLocked: false,
  rideStart: 0,
  rideEnd: 0
};

let data = null;
let ephemeris = null;
let scene = null;
let itemById = new Map();
let markerNodes = new Map();
let landmarkNodes = new Map();
let announceTimer = 0;
let liveTimer = 0;
let claimFlashTimer = 0;
const earthWindow = { view: "orbit", epic: null, cape: null, epicStatus: "idle", capeStatus: "idle" };
let earthWindowReturnFocus = null;
const heldKeys = new Set();

/* ---------- Lookups ---------- */

const stations = () => data.route;
const currentStation = () => data.route[state.stationIndex];
const nextStation = () => data.route[state.stationIndex + 1] ?? null;
const itemsAt = (stationId) => data.route.find((station) => station.id === stationId).items.map((id) => itemById.get(id));
const stationOf = (itemId) => data.route.find((station) => station.items.includes(itemId));
const finaleId = () => data.route.at(-1).items.at(-1);
const tagStars = (tag) => Math.max(1, MAX_STARS - (tag.cluesShown - 1) - tag.wrong.size);

/* ---------- Mode and chrome ---------- */

function setMode(mode) {
  state.mode = mode;
  syncChrome();
  if (mode === "boarding") startCountdown();
  else window.clearInterval(countdownTimer);
}

/* ---------- Boarding countdown: Voyager 1 reaches one light-day ---------- */
let countdownTimer = 0;

function startCountdown() {
  window.clearInterval(countdownTimer);
  const item = data && itemById.get(finaleId());
  if (!item?.timeline?.oneLightDay) return;
  const milestone = Date.parse(item.timeline.oneLightDay);
  const tick = () => {
    const seconds = Math.floor((milestone - Date.now()) / 1000);
    ui.countdown.hidden = false;
    if (seconds > 0) {
      const d = Math.floor(seconds / 86400);
      const h = String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0");
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      ui.countdownTime.textContent = `${d}d ${h}h ${m}m ${s}s`;
      ui.countdownSub.textContent = "The first human-made object a full light-day from Earth · NASA/JPL Horizons";
    } else {
      ui.countdownTime.textContent = "Milestone reached";
      ui.countdownSub.textContent = `Voyager 1 crossed one light-day ${formatDuration(-seconds, { parts: 2 })} ago, and it is still answering.`;
      window.clearInterval(countdownTimer);
    }
  };
  tick();
  countdownTimer = window.setInterval(tick, 1000);
}

function syncChrome() {
  const { mode } = state;
  document.body.dataset.mode = mode;
  if (data) {
    document.body.dataset.body = currentStation().body;
    audio.ambient.mood(currentStation().body);
  }
  document.body.classList.toggle("is-scanning", mode === "stop" && state.scanning);
  ui.boarding.hidden = mode !== "boarding";
  ui.hud.hidden = mode === "boarding" || mode === "loading";
  ui.reticle.hidden = !scene || (mode !== "stop" && mode !== "free");
  ui.windowControls.hidden = ui.reticle.hidden;
  ui.zoomLevel.textContent = `${Math.round((scene?.getZoom?.() ?? 1) * 100)}%`;
  ui.tag.hidden = !(mode === "stop" || mode === "free");
  ui.record.hidden = mode !== "record";
  ui.finale.hidden = mode !== "finale";
  ui.scanner.hidden = mode !== "stop" || !state.tag || !state.scanning || !scene;
  ui.passportButton.hidden = mode === "loading" || mode === "boarding" || mode === "ride";
  if (mode === "boarding" || mode === "loading") hideAnnouncement();

  scene?.setInteractive(INTERACTIVE_MODES.has(mode));
  scene?.setIdleSpin(mode === "boarding");
  renderRoute();
  renderCredits();
  updateMarkerStates();
  applyLayout();
}

function applyLayout() {
  if (!scene) return;
  const top = ui.topbar.offsetHeight;
  const panel = [ui.tag, ui.record, ui.finale].find((node) => !node.hidden);

  if (!wideLayout.matches) {
    const bottom = panel ? panel.offsetHeight : 0;
    scene.setLayout(state.mode === "boarding"
      ? { top: top + Math.min(ui.boarding.offsetHeight, window.innerHeight * 0.55), right: 0, bottom: 0, left: 0, fit: 1.05 }
      : { top, right: 0, bottom, left: 0, fit: 1.12 });
    return;
  }

  if (state.mode === "boarding") {
    scene.setLayout({ top, right: 0, bottom: 0, left: Math.min(window.innerWidth * 0.46, 640), fit: 1.02 });
  } else if (panel) {
    scene.setLayout({ top: top + 8, right: panel.offsetWidth + PANEL_GAP * 2, bottom: 0, left: 0, fit: 1.12 });
  } else {
    scene.setLayout({ top, right: 0, bottom: 0, left: 0, fit: 1.15 });
  }
}

function renderRoute() {
  if (!data) return;
  ui.route.innerHTML = routeView({
    stations: stations(),
    currentIndex: state.stationIndex,
    furthestIndex: state.furthestStationIndex,
    claims: state.claims,
    itemsAt,
    canNavigate: state.mode === "stop" || state.mode === "finale" || state.mode === "free"
  });
  ui.passportCount.textContent = `${state.claims.size}/${data.items.length}`;
  renderHud();
}

function renderHud() {
  if (!data) return;
  const station = currentStation();
  const items = itemsAt(station.id);
  const recovered = items.filter((item) => state.claims.has(item.id)).length;
  ui.hudStop.textContent = `STOP ${String(state.stationIndex + 1).padStart(2, "0")} / ${String(stations().length).padStart(2, "0")}`;
  ui.hudPlace.textContent = station.name;
  ui.hudDistance.textContent = distanceLine(station).split(" · ")[0];
  ui.hudObjective.textContent = state.mode === "free" ? "Explore the recovered route"
    : state.mode === "finale" ? "Send a message into the dark"
      : state.mode === "record" ? "Reading the recovered record"
      : state.mode === "ride" ? "Approaching the next stop"
        : recovered === items.length ? "All tags returned at this stop"
          : `Match tag ${recovered + 1} with a marker`;
  ui.hudCount.textContent = `${recovered} / ${items.length} recovered`;
  ui.hudTotal.textContent = `${state.claims.size} / ${data.items.length} total`;
  ui.hudProgress.setAttribute("aria-valuemax", String(items.length));
  ui.hudProgress.setAttribute("aria-valuenow", String(recovered));
  ui.hudProgressFill.style.transform = `scaleX(${recovered / items.length})`;
}

function renderCredits() {
  if (!data) return;
  ui.credits.textContent = bodies[currentStation().body].credit;
}

function markerState(id) {
  if (state.claims.has(id)) return "claimed";
  if (state.mode === "free") return "known";
  if (state.revealed.has(id)) return "revealed";
  return "unknown";
}

function updateMarkerStates() {
  markerNodes.forEach((node, id) => {
    const status = markerState(id);
    const item = itemById.get(id);
    node.dataset.state = status;
    node.setAttribute("aria-label", status === "unknown" ? `Unclaimed item at ${item.location.site}` : `${item.name}, ${item.location.site}`);
  });
}

/* ---------- Per-frame overlay positions ---------- */

function handleFrame(frame) {
  const interactive = INTERACTIVE_MODES.has(state.mode);
  if (interactive) ui.reticle.style.transform = `translate3d(${frame.center.x.toFixed(1)}px, ${frame.center.y.toFixed(1)}px, 0)`;

  frame.markers.forEach((reading, id) => {
    const node = markerNodes.get(id);
    const show = interactive && reading.visible;
    if (node.classList.contains("is-shown") !== show) {
      node.classList.toggle("is-shown", show);
      node.tabIndex = show ? 0 : -1;
    }
    if (show) node.style.transform = `translate3d(${reading.x.toFixed(1)}px, ${reading.y.toFixed(1)}px, 0)`;
  });

  if (!landmarkNodes.size && frame.landmarks.size) {
    ui.landmarks.innerHTML = landmarksView([...frame.landmarks.values()]);
    landmarkNodes = new Map([...ui.landmarks.querySelectorAll(".landmark")].map((node) => [node.dataset.id, node]));
  }
  frame.landmarks.forEach((reading, id) => {
    const node = landmarkNodes.get(id);
    if (!node) return;
    node.classList.toggle("is-shown", reading.visible);
    if (reading.visible) node.style.transform = `translate3d(${reading.x.toFixed(1)}px, ${reading.y.toFixed(1)}px, 0)`;
  });
  if (state.mode === "stop" && state.tag && state.scanning) updateScanner(frame);
}

function updateScanner(frame) {
  const target = frame.markers.get(state.tag.itemId);
  if (!target) return;
  const distance = Math.hypot(target.x - frame.center.x, target.y - frame.center.y);
  const reach = Math.max(120, Math.min(window.innerWidth, window.innerHeight) * 0.42);
  const strength = target.visible ? Math.max(0.08, 1 - distance / reach) : 0.06;
  const locked = target.visible && strength > 0.82;
  ui.scannerLevel.style.transform = `scaleX(${strength.toFixed(3)})`;
  ui.scanner.dataset.lock = String(locked);
  ui.reticle.dataset.lock = String(locked);
  if (locked && !state.scannerLocked) audio.lock();
  state.scannerLocked = locked;
  if (!target.visible) {
    setIfChanged(ui.scannerBearing, "Signal behind the horizon");
    ui.scannerNote.textContent = "Rotate the world to bring it into view.";
  } else if (strength > 0.82) {
    setIfChanged(ui.scannerBearing, "Signal lock acquired");
    ui.scannerNote.textContent = "Check the nearby marker against your tag.";
  } else {
    const horizontal = target.x < frame.center.x - 30 ? "left" : target.x > frame.center.x + 30 ? "right" : "center";
    const vertical = target.y < frame.center.y - 30 ? "upper" : target.y > frame.center.y + 30 ? "lower" : "middle";
    setIfChanged(ui.scannerBearing, `Bearing: ${vertical} ${horizontal}`);
    ui.scannerNote.textContent = strength > 0.45 ? "Signal rising. Keep turning." : "Weak echo. Follow the bearing.";
  }
}

function setIfChanged(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

/* ---------- Announcements ---------- */

function announce({ label, text, meta = "" }, { persist = false } = {}) {
  window.clearTimeout(announceTimer);
  ui.announcementLabel.textContent = label;
  ui.announcementText.textContent = text;
  ui.announcementMeta.textContent = meta;
  ui.announcement.hidden = false;
  if (!persist) announceTimer = window.setTimeout(hideAnnouncement, ANNOUNCE_MS);
}

function hideAnnouncement() {
  window.clearTimeout(announceTimer);
  ui.announcement.hidden = true;
}

function distanceLine(station) {
  if (station.horizons && ephemeris.has(station.horizons)) {
    return `${formatKm(ephemeris.distanceKm(station.horizons))} from Earth today · NASA/JPL Horizons`;
  }
  if (station.body === "space") {
    const billions = ephemeris.distanceKm(itemById.get(finaleId()).location.horizons) / 1e9;
    return `Voyager 1 is ${billions.toFixed(2)} billion km from Earth today · NASA/JPL Horizons`;
  }
  return "A few thousand kilometres above Earth";
}

function formatKm(km) {
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

/* ---------- The ride ---------- */

function board(event) {
  event.preventDefault();
  audio.unlock();
  state.passenger = ui.passenger.value.trim() || "Passenger";
  state.rideStart = Date.now();
  rideTo(0);
}

async function rideTo(index) {
  const previousStation = currentStation();
  if (state.mode === "stop" && state.tag) {
    state.stationProgress.set(previousStation.id, { tag: state.tag, feedback: state.feedback });
  }
  state.stationIndex = index;
  state.furthestStationIndex = Math.max(state.furthestStationIndex, index);
  state.tag = null;
  state.feedback = "";
  state.scanning = false;
  state.scannerLocked = false;
  ui.reticle.dataset.lock = "false";
  ui.reticle.dataset.scanning = "false";
  const station = currentStation();
  setMode("ride");
  announce({ label: "Next stop", text: station.name, meta: distanceLine(station) }, { persist: true });
  audio.travel();

  const following = data.route[index + 1];
  if (following) scene?.preload(following.body);
  await (scene ? scene.goTo(station.body) : wait(NO_SCENE_RIDE_MS));
  if (state.mode !== "ride" || state.stationIndex !== index) return;

  itemsAt(station.id).forEach((item) => loadArchive(item.id));
  audio.chime();
  announce({ label: `Now arriving · ${station.name}`, text: station.announcement, meta: distanceLine(station) });
  if (index === data.route.length - 1 && state.claims.has(finaleId())) {
    openFinale(finaleId());
    return;
  }
  setMode("stop");
  nextTag();
}

function nextTag() {
  const station = currentStation();
  const item = itemsAt(station.id).find((entry) => !state.claims.has(entry.id));
  const progress = state.stationProgress.get(station.id);
  if (item && progress?.tag.itemId === item.id) {
    state.tag = progress.tag;
    state.feedback = progress.feedback;
  } else {
    state.tag = item ? { itemId: item.id, cluesShown: 1, wrong: new Set() } : null;
    state.feedback = "";
    state.stationProgress.delete(station.id);
  }
  state.scanning = false;
  state.scannerLocked = false;
  ui.reticle.dataset.lock = "false";
  ui.reticle.dataset.scanning = "false";
  renderTag();
}

function renderTag() {
  const station = currentStation();
  const items = itemsAt(station.id);

  if (state.mode === "free") {
    ui.tag.innerHTML = freeView(scene ? null : items.map((entry) => ({ id: entry.id, label: `${entry.name} · ${entry.location.site}` })));
  } else if (!state.tag) {
    ui.tag.innerHTML = stationClearedView({
      station,
      nextStation: nextStation(),
      claimed: items.filter((item) => state.claims.has(item.id)).length,
      total: items.length
    });
  } else {
    const item = itemById.get(state.tag.itemId);
    ui.tag.innerHTML = tagView({
      item,
      station,
      number: items.indexOf(item) + 1,
      total: items.length,
      cluesShown: state.tag.cluesShown,
      stars: tagStars(state.tag),
      feedback: state.feedback,
      scanning: state.scanning,
      nextStation: nextStation(),
      choices: scene ? null : items.map((entry) => ({ id: entry.id, label: entry.location.site, done: state.claims.has(entry.id) }))
    });
  }
  applyLayout();
}

function showClue() {
  if (!state.tag) return;
  const item = itemById.get(state.tag.itemId);
  state.tag.cluesShown = Math.min(state.tag.cluesShown + 1, item.claimTag.length);
  audio.reveal();
  renderTag();
}

function toggleScanner() {
  if (state.mode !== "stop" || !state.tag || !scene) return;
  state.scanning = !state.scanning;
  state.scannerLocked = false;
  document.body.classList.toggle("is-scanning", state.scanning);
  ui.reticle.dataset.scanning = String(state.scanning);
  ui.reticle.dataset.lock = "false";
  if (state.scanning) audio.reveal();
  ui.scanner.hidden = !state.scanning;
  renderTag();
}

function selectItem(id) {
  if (state.claims.has(id) || state.mode === "free") {
    openRecord(id, { returnTo: state.mode === "record" ? state.recordReturn : state.mode });
    return;
  }
  if (state.mode !== "stop" || !state.tag) return;
  if (id === state.tag.itemId) {
    claim(id);
    return;
  }

  const item = itemById.get(id);
  state.tag.wrong.add(id);
  state.revealed.add(id);
  state.feedback = `Not this one. That marker is ${item.name}. Keep looking.`;
  audio.wrong();
  shake(markerNodes.get(id));
  updateMarkerStates();
  renderTag();
}

function claim(id) {
  state.claims.set(id, tagStars(state.tag));
  state.stationProgress.delete(currentStation().id);
  state.tag = null;
  state.feedback = "";
  state.scanning = false;
  state.scannerLocked = false;
  ui.reticle.dataset.scanning = "false";
  ui.reticle.dataset.lock = "false";
  audio.stamp();
  showClaimFlash(itemById.get(id).name);
  renderRoute();
  if (id === finaleId()) openFinale(id);
  else openRecord(id, { returnTo: "stop" });
}

function showClaimFlash(name) {
  window.clearTimeout(claimFlashTimer);
  ui.claimFlashName.textContent = name;
  ui.claimFlash.hidden = false;
  ui.claimFlash.classList.remove("is-entering");
  void ui.claimFlash.offsetWidth;
  ui.claimFlash.classList.add("is-entering");
  claimFlashTimer = window.setTimeout(() => { ui.claimFlash.hidden = true; }, reducedMotion ? 1400 : 2200);
}

function rideOn() {
  if (nextStation()) rideTo(state.stationIndex + 1);
}

function shake(node) {
  if (!node || reducedMotion) return;
  node.classList.remove("is-wrong");
  void node.offsetWidth;
  node.classList.add("is-wrong");
  window.setTimeout(() => node.classList.remove("is-wrong"), 600);
}

/* ---------- Records and the NASA archive ---------- */

function openRecord(id, { returnTo }) {
  const item = itemById.get(id);
  const fromStop = returnTo === "stop";
  const remaining = itemsAt(currentStation().id).some((entry) => !state.claims.has(entry.id));
  state.recordId = id;
  state.recordReturn = returnTo;
  state.photo = 0;
  ui.record.innerHTML = recordView(item, {
    station: stationOf(id),
    stars: state.claims.get(id),
    claimedOn: DATE_FORMAT.format(new Date()),
    footerLabel: fromStop ? (state.tag || remaining ? "Next tag" : "Back to the window") : "Back"
  });
  ui.record.scrollTop = 0;
  setMode("record");
  renderArchive();
  loadArchive(id);
  if (stationOf(id) === currentStation()) scene?.focus(id);
  ui.record.querySelector("#record-title")?.focus({ preventScroll: true });
}

function closeRecord() {
  const back = state.recordReturn;
  state.recordId = null;
  setMode(back);
  if (back === "stop") {
    if (state.tag) renderTag();
    else nextTag();
  } else if (back === "free") {
    renderTag();
  } else if (back === "finale") {
    startLive();
  }
  syncChrome();
}

async function loadArchive(id) {
  const cached = state.archives.get(id);
  if (cached && cached.status !== "error") return;

  const item = itemById.get(id);
  state.archives.set(id, { status: "loading", items: [], total: 0, query: item.images.query });
  if (state.recordId === id) renderArchive();

  const [featured, search] = await Promise.allSettled([
    item.featured ? getImage(item.featured.nasaId) : Promise.resolve(null),
    searchImages({ query: item.images.query, match: item.images.match, limit: ARCHIVE_SIZE })
  ]);

  const seen = new Set();
  const photos = [featured.value, ...(search.value?.records ?? [])].filter((photo) => {
    if (!photo || seen.has(photo.nasaId)) return false;
    seen.add(photo.nasaId);
    return true;
  });

  state.archives.set(id, {
    status: search.status === "fulfilled" ? "ready" : "error",
    items: photos.slice(0, ARCHIVE_SIZE),
    total: search.value?.total ?? 0,
    query: item.images.query
  });
  if (state.recordId === id) renderArchive();
}

function renderArchive() {
  const container = ui.record.querySelector("#record-archive");
  const archive = state.archives.get(state.recordId);
  if (container && archive) container.innerHTML = archiveView(archive, state.photo);
}

function selectPhoto(index) {
  state.photo = index;
  renderArchive();
  ui.record.querySelector(`.thumb[data-index="${index}"]`)?.focus({ preventScroll: true });
}

/* ---------- Finale: Voyager 1 and the postcard ---------- */

function openFinale(id) {
  const item = itemById.get(id);
  ui.finale.innerHTML = finaleView(item, { stars: state.claims.get(id) });
  if (state.postcard) {
    ui.finale.querySelector("#postcard-form").hidden = true;
    ui.finale.querySelector("#postcard-status").hidden = false;
    setText("#postcard-quote", `“${state.postcard.text}” — ${state.passenger}`);
  }
  setMode("finale");
  startLive();
  ui.finale.querySelector("#finale-title")?.focus({ preventScroll: true });
}

function startLive() {
  window.clearInterval(liveTimer);
  updateLive();
  liveTimer = window.setInterval(updateLive, LIVE_REFRESH_MS);
}

function updateLive() {
  if (state.mode !== "finale" && !ui.passportDialog.open) {
    window.clearInterval(liveTimer);
    return;
  }
  const item = itemById.get(finaleId());
  const target = item.location.horizons;
  const now = Date.now();
  const seconds = ephemeris.lightSeconds(target, now);
  const milestone = Date.parse(item.timeline.oneLightDay);
  const toMilestone = (milestone - now) / 1000;

  setText("#live-distance", formatKm(ephemeris.distanceKm(target, now)));
  setText("#live-light", formatDuration(seconds));
  setText("#live-milestone", toMilestone > 0
    ? `In ${formatDuration(toMilestone)}`
    : `Reached ${formatDuration(-toMilestone, { parts: 2 })} ago`);

  const { postcard } = state;
  if (!postcard) return;
  const progress = Math.min(1, (now - postcard.sentAt) / (postcard.arrivesAt - postcard.sentAt));
  const bar = ui.finale.querySelector("#postcard-progress");
  if (bar) bar.style.transform = `scaleX(${progress})`;
  setText("#postcard-eta", progress < 1
    ? `In flight · ${(progress * 100).toFixed(4)}% of the way · arrives ${ETA_FORMAT.format(postcard.arrivesAt)}`
    : "Arrived. Voyager 1 is still listening.");
}

function sendPostcard(event) {
  event.preventDefault();
  const form = event.target;
  const text = form.elements.postcard.value.trim();
  if (!text) return;
  const now = Date.now();
  const travel = ephemeris.lightSeconds(itemById.get(finaleId()).location.horizons, now) * 1000;
  state.postcard = { text, sentAt: now, arrivesAt: now + travel };
  form.hidden = true;
  ui.finale.querySelector("#postcard-status").hidden = false;
  setText("#postcard-quote", `“${text}” — ${state.passenger}`);
  audio.send();
  updateLive();
}

function setText(selector, text) {
  const node = ui.finale.querySelector(selector);
  if (node) node.textContent = text;
}

/* ---------- Passport, free ride, replay ---------- */

function openPassport({ final = false } = {}) {
  ui.passport.innerHTML = passportView({
    passenger: state.passenger,
    stations: stations(),
    itemsAt,
    claims: state.claims,
    time: final ? formatDuration((state.rideEnd - state.rideStart) / 1000, { parts: 2 }) : null,
    final
  });
  if (!ui.passportDialog.open) ui.passportDialog.showModal();
}

async function sharePassportCard() {
  const status = ui.passport.querySelector("#share-status");
  const say = (text) => { if (status) status.textContent = text; };
  say("Drawing your card…");
  try {
    const voyager = itemById.get(finaleId());
    const km = ephemeris.distanceKm(voyager.location.horizons);
    const blob = await renderPassportCard({
      passenger: state.passenger,
      maxStars: MAX_STARS,
      rideTime: state.rideEnd > state.rideStart ? formatDuration((state.rideEnd - state.rideStart) / 1000, { parts: 2 }) : null,
      voyagerLine: `Voyager 1 is ${(km / 1e9).toFixed(2)} billion km from Earth today`,
      dateText: DATE_FORMAT.format(new Date()),
      stops: stations().map((station) => ({
        name: station.name,
        items: itemsAt(station.id).map((item) => ({ name: item.name, site: item.location.site, stars: state.claims.get(item.id) || 0 }))
      }))
    });
    const file = new File([blob], "lost-and-found-passport.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My Lost & Found Line passport" });
        say("Shared.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") { say(""); return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: "lost-and-found-passport.png" });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say("Saved as lost-and-found-passport.png.");
  } catch {
    say("Could not create the card. Please try again.");
  }
}

function openEarthWindow() {
  earthWindowReturnFocus = document.activeElement;
  renderEarthWindow();
  if (!ui.earthWindowDialog.open) ui.earthWindowDialog.showModal();
  if (earthWindow.epicStatus === "idle" || earthWindow.epicStatus === "error") loadEarthWindowEpic();
  if (earthWindow.capeStatus === "idle" || earthWindow.capeStatus === "error") loadEarthWindowCape();
}

function closeEarthWindow() {
  ui.earthWindowDialog.close();
  earthWindowReturnFocus?.focus({ preventScroll: true });
}

function setEarthWindowView(view) {
  if (view !== "orbit" && view !== "coast") return;
  earthWindow.view = view;
  renderEarthWindow();
  ui.earthWindowContent.querySelector(`[data-view="${view}"]`)?.focus({ preventScroll: true });
}

function renderEarthWindow() {
  const coast = earthWindow.view === "coast";
  const image = coast ? earthWindow.cape : earthWindow.epic;
  const status = coast ? earthWindow.capeStatus : earthWindow.epicStatus;
  const date = image ? DATE_FORMAT.format(new Date(`${image.date}T00:00:00Z`)) : "";
  ui.earthWindowContent.innerHTML = html`
    <header class="record-header">
      <p class="label">Earth Window · two scales, one planet</p>
      <button class="icon-button" type="button" data-action="close-earth-window" aria-label="Close Earth Window">✕</button>
    </header>
    <h2 class="dialog-title" id="earth-window-title">Look closer at home.</h2>
    <p class="dialog-text">From the whole Earth to the coast where Vanguard 1 began its journey.</p>
    <div class="earth-window-switch" role="group" aria-label="Earth imagery scale">
      <button type="button" data-action="earth-view" data-view="orbit" aria-pressed="${!coast}"><span>01 / From afar</span><small>NASA EPIC</small></button>
      <button type="button" data-action="earth-view" data-view="coast" aria-pressed="${coast}"><span>02 / Launch coast</span><small>ESA Sentinel-2</small></button>
    </div>
    <figure class="earth-window-figure" aria-busy="${status === "loading"}">
      <div class="earth-window-image">
        ${image ? html`<img src="${image.image}" alt="${coast ? "Recent satellite view of the Cape Canaveral region" : "Full-disc view of Earth from NASA EPIC"}" decoding="async">`
          : html`<div class="earth-window-placeholder">${status === "error" ? "Signal unavailable" : "Receiving Earth imagery…"}</div>`}
        <span class="earth-window-coordinate">${coast ? "28.5° N / 80.6° W · CAPE CANAVERAL REGION" : "FULL DISC / APPROX. 1.5 MILLION KM"}</span>
      </div>
      <figcaption>
        <strong>${coast ? "Cape Canaveral, now" : "Earth, from afar"}</strong>
        <span>${image ? html`${date}${coast && image.cloud !== null ? ` · ${image.cloud.toFixed(1)}% cloud cover across tile` : ""}`
          : status === "error" ? html`Could not retrieve imagery. <button class="link-button" type="button" data-action="retry-earth-window">Retry</button>` : "Connecting to the image archive…"}</span>
      </figcaption>
    </figure>
    <p class="earth-window-context">${coast
      ? "A present-day Sentinel-2 view of the Cape Canaveral region. Vanguard 1 launched from Cape Canaveral on 17 March 1958; this image does not show its launch or its location in orbit. The preview covers a satellite tile, not the exact launch pad."
      : "NASA's EPIC camera photographs the sunlit Earth from DSCOVR. Switch scale to see the modern launch coast from a European Space Agency satellite."}</p>
    ${coast ? html`<p class="earth-window-credit">Imagery: ESA Sentinel-2 · catalog and preview: Microsoft Planetary Computer.</p>` : ""}
    <div class="earth-window-sources">
      <a href="${coast ? image?.source ?? "https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a" : "https://epic.gsfc.nasa.gov/"}" target="_blank" rel="noreferrer">${coast ? "View Sentinel-2 source" : "NASA EPIC"} ↗</a>
      ${coast ? html`<a href="https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a" target="_blank" rel="noreferrer">About the dataset ↗</a>` : ""}
    </div>`;
  const img = ui.earthWindowContent.querySelector(".earth-window-image img");
  img?.addEventListener("error", () => {
    img.replaceWith(Object.assign(document.createElement("div"), { className: "earth-window-placeholder", textContent: "Image preview unavailable. Open the source below." }));
  }, { once: true });
}

async function loadEarthWindowEpic() {
  earthWindow.epicStatus = "loading";
  if (ui.earthWindowDialog.open) renderEarthWindow();
  try {
    earthWindow.epic = await getLatestEarth();
    earthWindow.epicStatus = "ready";
  } catch {
    earthWindow.epicStatus = "error";
  }
  if (ui.earthWindowDialog.open) renderEarthWindow();
}

async function loadEarthWindowCape() {
  earthWindow.capeStatus = "loading";
  if (ui.earthWindowDialog.open) renderEarthWindow();
  try {
    earthWindow.cape = await getCapeCanaveralImage();
    earthWindow.capeStatus = "ready";
  } catch {
    earthWindow.capeStatus = "error";
  }
  if (ui.earthWindowDialog.open) renderEarthWindow();
}

function retryEarthWindow() {
  if (earthWindow.view === "coast") loadEarthWindowCape();
  else loadEarthWindowEpic();
}

function finishRide() {
  state.rideEnd ||= Date.now();
  audio.complete();
  openPassport({ final: true });
}

function startFreeRide() {
  ui.passportDialog.close();
  setMode("free");
  state.scanning = false;
  renderTag();
}

async function freeRideTo(index) {
  if (state.mode !== "free" || index === state.stationIndex) return;
  state.stationIndex = index;
  syncChrome();
  renderTag();
  audio.travel();
  await scene?.goTo(currentStation().body);
}

function replay() {
  ui.passportDialog.close();
  window.clearTimeout(claimFlashTimer);
  ui.claimFlash.hidden = true;
  state.claims.clear();
  state.revealed.clear();
  state.stationProgress.clear();
  Object.assign(state, { stationIndex: 0, furthestStationIndex: 0, tag: null, feedback: "", postcard: null, scanning: false, scannerLocked: false, rideStart: 0, rideEnd: 0 });
  window.clearInterval(liveTimer);
  scene?.goTo(currentStation().body);
  setMode("boarding");
}

function toggleSound() {
  const on = audio.toggle();
  ui.soundButton.setAttribute("aria-pressed", String(on));
  ui.soundButton.setAttribute("aria-label", on ? "Sound on" : "Sound off");
}

function changeZoom(factor) {
  scene?.adjustZoom?.(factor);
}

/* ---------- Events ---------- */

const actions = {
  station: (target) => state.mode === "free"
    ? freeRideTo(Number(target.dataset.index))
    : rideTo(Number(target.dataset.index)),
  clue: showClue,
  scan: toggleScanner,
  choose: (target) => selectItem(target.dataset.id),
  "ride-on": rideOn,
  "close-record": closeRecord,
  photo: (target) => selectPhoto(Number(target.dataset.index)),
  "retry-archive": () => loadArchive(state.recordId),
  finish: finishRide,
  "open-passport": () => openPassport(),
  "open-earth-window": openEarthWindow,
  "close-earth-window": closeEarthWindow,
  "earth-view": (target) => setEarthWindowView(target.dataset.view),
  "retry-earth-window": retryEarthWindow,
  "close-passport": () => ui.passportDialog.close(),
  "share-card": sharePassportCard,
  "open-record": (target) => {
    ui.passportDialog.close();
    selectItem(target.dataset.id);
  },
  "free-ride": startFreeRide,
  replay,
  sound: toggleSound,
  "zoom-in": () => changeZoom(0.8),
  "zoom-out": () => changeZoom(1.25),
  "reset-view": () => scene?.resetZoom?.()
};

document.addEventListener("click", (event) => {
  const marker = event.target.closest(".marker");
  if (marker) {
    selectItem(marker.dataset.id);
    return;
  }
  const target = event.target.closest("[data-action]");
  if (target && !target.disabled) actions[target.dataset.action]?.(target);
});

document.addEventListener("submit", (event) => {
  if (event.target === ui.passForm) board(event);
  else if (event.target.id === "postcard-form") sendPostcard(event);
});

function isTyping(event) {
  return event.target.closest?.("input, textarea") || ui.passportDialog.open || ui.earthWindowDialog.open;
}

function updateAxis() {
  let x = 0;
  let y = 0;
  heldKeys.forEach((key) => {
    x += AXIS_KEYS[key][0];
    y += AXIS_KEYS[key][1];
  });
  scene?.setAxis(x, y);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.mode === "record" && !ui.passportDialog.open && !ui.earthWindowDialog.open) {
    closeRecord();
    return;
  }
  if (!AXIS_KEYS[event.key] || isTyping(event) || !INTERACTIVE_MODES.has(state.mode)) return;
  event.preventDefault();
  heldKeys.add(event.key);
  updateAxis();
});

document.addEventListener("keyup", (event) => {
  if (!heldKeys.delete(event.key)) return;
  updateAxis();
});

ui.earthWindowDialog.addEventListener("close", () => earthWindowReturnFocus?.focus({ preventScroll: true }));

window.addEventListener("blur", () => {
  heldKeys.clear();
  updateAxis();
});
window.addEventListener("resize", applyLayout);

/* ---------- Boot ---------- */

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function initScene() {
  try {
    const { createScene } = await import("./scene.js?window-lens=1");
    return createScene(ui.canvas, {
      bodies, items: data.items, ephemeris, reducedMotion, onFrame: handleFrame,
      onZoom: (zoom) => { ui.zoomLevel.textContent = `${Math.round(zoom * 100)}%`; }
    });
  } catch (error) {
    console.warn("3D view unavailable, continuing with lists.", error);
    document.body.classList.add("no-3d");
    return null;
  }
}

async function loadEarthPhoto() {
  try {
    const earth = await getLatestEarth();
    earthWindow.epic = earth;
    earthWindow.epicStatus = "ready";
    ui.passEarth.innerHTML = html`
      <div class="pass-earth-frame"><img src="${earth.image}" alt="Earth photographed by NASA's EPIC camera" decoding="async"></div>
      <figcaption>Earth on ${DATE_FORMAT.format(new Date(`${earth.date}T00:00:00Z`))}, photographed by NASA's EPIC camera from about 1.5 million km away.</figcaption>`;
  } catch {
    ui.passEarth.querySelector("figcaption").textContent = "NASA EPIC is unreachable right now.";
  }
}

async function boot() {
  try {
    const [stories, snapshot] = await Promise.all([loadJson("data/lost-and-found.json"), loadJson("data/ephemeris.json")]);
    data = stories;
    ephemeris = createEphemeris(snapshot);
  } catch (error) {
    console.error(error);
    ui.loadError.textContent = "Could not load the route data. Serve this folder over HTTP, for example with: python3 -m http.server 8000";
    ui.loadError.hidden = false;
    return;
  }

  itemById = new Map(data.items.map((item) => [item.id, item]));
  ui.markers.innerHTML = markersView(data.items);
  markerNodes = new Map([...ui.markers.querySelectorAll(".marker")].map((node) => [node.dataset.id, node]));
  ui.passStops.textContent = String(data.route.length);
  ui.passItems.textContent = String(data.items.length);
  ui.passDate.textContent = DATE_FORMAT.format(new Date());

  setMode("boarding");
  const voyagerTarget = itemById.get(finaleId()).location.horizons;
  const intro = playIntro({
    distanceKm: ephemeris.distanceKm(voyagerTarget),
    lightSeconds: ephemeris.lightSeconds(voyagerTarget),
    otherCount: data.items.length - 1,
    dateText: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date())
  });
  loadEarthPhoto();
  scene = await initScene();
  if (scene) await scene.goTo(currentStation().body, { instant: true });
  syncChrome();
  await intro;
  ui.passenger?.focus({ preventScroll: true });
}

boot();
