import { createAudio } from "./audio.js";
import { createEphemeris, formatDuration } from "./ephemeris.js";
import { html } from "./html.js";
import { getImage, getLatestEarth, loadJson, searchImages } from "./nasa.js";
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
const wideLayout = window.matchMedia("(min-width: 900px)");

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
  passEarth: document.getElementById("pass-earth"),
  announcement: document.getElementById("announcement"),
  announcementLabel: document.getElementById("announcement-label"),
  announcementText: document.getElementById("announcement-text"),
  announcementMeta: document.getElementById("announcement-meta"),
  markers: document.getElementById("markers"),
  landmarks: document.getElementById("landmarks"),
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
  passport: document.getElementById("passport")
};

const audio = createAudio();
const state = {
  mode: "loading",
  passenger: "Passenger",
  stationIndex: 0,
  tag: null,
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
}

function syncChrome() {
  const { mode } = state;
  document.body.dataset.mode = mode;
  ui.boarding.hidden = mode !== "boarding";
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
    claims: state.claims,
    itemsAt,
    free: state.mode === "free"
  });
  ui.passportCount.textContent = `${state.claims.size}/${data.items.length}`;
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
  state.stationIndex = index;
  state.tag = null;
  state.feedback = "";
  state.scanning = false;
  state.scannerLocked = false;
  const station = currentStation();
  setMode("ride");
  announce({ label: "Next stop", text: station.name, meta: distanceLine(station) }, { persist: true });
  audio.travel();

  const following = data.route[index + 1];
  if (following) scene?.preload(following.body);
  await (scene ? scene.goTo(station.body) : wait(NO_SCENE_RIDE_MS));
  if (state.mode !== "ride" || state.stationIndex !== index) return;

  itemsAt(station.id).forEach((item) => loadArchive(item.id));
  setMode("stop");
  audio.chime();
  announce({ label: `Now arriving · ${station.name}`, text: station.announcement, meta: distanceLine(station) });
  nextTag();
}

function nextTag() {
  const item = itemsAt(currentStation().id).find((entry) => !state.claims.has(entry.id));
  state.tag = item ? { itemId: item.id, cluesShown: 1, wrong: new Set() } : null;
  state.feedback = "";
  state.scanning = false;
  state.scannerLocked = false;
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
  state.tag = null;
  state.feedback = "";
  state.scanning = false;
  state.scannerLocked = false;
  audio.stamp();
  renderRoute();
  if (id === finaleId()) openFinale(id);
  else openRecord(id, { returnTo: "stop" });
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
  state.postcard = null;
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
  state.claims.clear();
  state.revealed.clear();
  Object.assign(state, { stationIndex: 0, tag: null, feedback: "", postcard: null, scanning: false, scannerLocked: false, rideStart: 0, rideEnd: 0 });
  window.clearInterval(liveTimer);
  scene?.goTo(currentStation().body);
  setMode("boarding");
}

function toggleSound() {
  const on = audio.toggle();
  ui.soundButton.setAttribute("aria-pressed", String(on));
  ui.soundButton.setAttribute("aria-label", on ? "Sound on" : "Sound off");
}

/* ---------- Events ---------- */

const actions = {
  station: (target) => freeRideTo(Number(target.dataset.index)),
  clue: showClue,
  scan: toggleScanner,
  choose: (target) => selectItem(target.dataset.id),
  "ride-on": rideOn,
  "close-record": closeRecord,
  photo: (target) => selectPhoto(Number(target.dataset.index)),
  "retry-archive": () => loadArchive(state.recordId),
  finish: finishRide,
  "open-passport": () => openPassport(),
  "close-passport": () => ui.passportDialog.close(),
  "open-record": (target) => {
    ui.passportDialog.close();
    selectItem(target.dataset.id);
  },
  "free-ride": startFreeRide,
  replay,
  sound: toggleSound
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
  return event.target.closest?.("input, textarea") || ui.passportDialog.open;
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
  if (event.key === "Escape" && state.mode === "record" && !ui.passportDialog.open) {
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
    const { createScene } = await import("./scene.js");
    return createScene(ui.canvas, { bodies, items: data.items, ephemeris, reducedMotion, onFrame: handleFrame });
  } catch (error) {
    console.warn("3D view unavailable, continuing with lists.", error);
    document.body.classList.add("no-3d");
    return null;
  }
}

async function loadEarthPhoto() {
  try {
    const earth = await getLatestEarth();
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
  loadEarthPhoto();
  scene = await initScene();
  if (scene) await scene.goTo(currentStation().body, { instant: true });
  syncChrome();
}

boot();
