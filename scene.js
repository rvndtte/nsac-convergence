import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createMosaic } from "./nasa.js";

const RADIUS = 2;
const EARTH_RADIUS_KM = 6371;
const SYSTEM_RADIUS = 2.7;
const SYSTEM_MAX_AU = 180;
const MAX_PITCH = THREE.MathUtils.degToRad(65);
const MIN_VISIBLE_FACING = 0.12;
const DRAG_SPEED = 0.0045;
const KEY_SPEED = 1.1;
const IDLE_SPIN = 0.05;
const INERTIA_DECAY = 3.5;
const MAX_FLING = 3;
const SMOOTHING = 6;
const TRAVEL_SECONDS = 2.6;
const ORBIT_SECONDS = 48;
const STREAKS = 420;

// Rings on the deep-space map: [AU, label, style, label angle in degrees or null for no label].
const SYSTEM_RINGS = [
  [1, "Earth", "orbit", null],
  [5.2, "Jupiter", "orbit", null],
  [9.58, "Saturn", "orbit", null],
  [30.07, "Neptune", "orbit", 200],
  [121.6, "Heliopause", "edge", 150],
  [173.14, "One light-day", "light-day", 250]
];

export function createScene(canvas, { bodies, items, ephemeris, reducedMotion, onFrame, onZoom = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x04060a, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-3, 2, 5);
  const streaks = createStreaks();
  camera.add(streaks.object);
  scene.add(new THREE.AmbientLight(0xffffff, 0.32), sun, camera, createStars());

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const views = new Map(Object.entries(bodies).map(([id, body]) => [
    id,
    body.kind === "system" ? createSystemView(items, ephemeris) : createGlobeView(id, body, items, anisotropy)
  ]));
  views.forEach((view) => {
    view.group.scale.setScalar(0.001);
    view.group.visible = false;
    scene.add(view.group);
  });

  const frame = {
    center: { x: 0, y: 0 },
    markers: new Map(items.map((item) => [item.id, { id: item.id, x: 0, y: 0, visible: false }])),
    landmarks: new Map()
  };
  views.get("space").landmarks.forEach((landmark) => frame.landmarks.set(landmark.id, { id: landmark.id, label: landmark.label, x: 0, y: 0, visible: false }));

  const state = {
    body: null,
    travel: null,
    yaw: 0,
    pitch: 0,
    target: { yaw: 0, pitch: 0 },
    velocity: { yaw: 0, pitch: 0 },
    axis: { x: 0, y: 0 },
    drag: null,
    idleSpin: true,
    interactive: false,
    zoom: 1,
    layout: { top: 0, right: 0, bottom: 0, left: 0, fit: 1.15 },
    distance: 0,
    offsetX: 0,
    offsetY: 0,
    elapsed: 0
  };

  const viewport = { width: 1, height: 1 };
  const scratch = { point: new THREE.Vector3(), normal: new THREE.Vector3(), toCamera: new THREE.Vector3(), along: new THREE.Vector3() };
  const clock = new THREE.Clock();
  let frameId = 0;

  function resize() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    renderer.setSize(viewport.width, viewport.height, false);
    camera.aspect = viewport.width / viewport.height;
    camera.updateProjectionMatrix();
  }

  function fitDistance(radius) {
    const { top, right, bottom, left, fit } = state.layout;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const available = Math.max(Math.min(viewport.width - left - right, viewport.height - top - bottom), 160);
    const t = (tanHalf * available) / viewport.height;
    return radius * Math.sqrt(1 + 1 / (t * t)) * fit;
  }

  function resetOrientation(id) {
    const view = views.get(id);
    const { yaw, pitch } = view.startOrientation;
    Object.assign(state, { yaw, pitch });
    state.target = { yaw, pitch };
    state.velocity = { yaw: 0, pitch: 0 };
  }

  function updateTravel(dt) {
    const travel = state.travel;
    if (!travel) return 0;
    travel.progress = Math.min(1, travel.progress + dt / TRAVEL_SECONDS);
    const p = travel.progress;
    const outgoing = travel.from ? views.get(travel.from) : null;
    const incoming = views.get(travel.to);

    if (outgoing) {
      const leave = smoothstep(0, 0.42, p);
      outgoing.group.scale.setScalar(Math.max(1 - leave, 0.001));
      outgoing.group.position.z = leave * 6;
      outgoing.group.visible = leave < 0.99;
    }
    if (p >= 0.5 && !travel.swapped) {
      travel.swapped = true;
      state.body = travel.to;
      resetOrientation(travel.to);
      state.distance = fitDistance(incoming.fitRadius);
    }
    const arrive = smoothstep(0.55, 1, p);
    incoming.group.visible = arrive > 0.001;
    incoming.group.scale.setScalar(Math.max(arrive, 0.001));
    incoming.group.position.z = (1 - arrive) * -14;

    if (p >= 1) {
      state.travel = null;
      travel.resolve();
    }
    return Math.sin(Math.PI * p);
  }

  function update(dt) {
    state.elapsed += dt;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * SMOOTHING);
    const warp = updateTravel(dt);
    streaks.update(dt, warp);

    if (!state.drag) {
      const spin = state.idleSpin && !reducedMotion ? IDLE_SPIN : 0;
      state.target.yaw += (state.velocity.yaw - state.axis.x * KEY_SPEED + spin) * dt;
      state.target.pitch = clampPitch(state.target.pitch + (state.velocity.pitch + state.axis.y * KEY_SPEED) * dt);
      const decay = Math.exp(-dt * INERTIA_DECAY);
      state.velocity.yaw *= decay;
      state.velocity.pitch *= decay;
    }
    state.yaw += (state.target.yaw - state.yaw) * ease;
    state.pitch += (state.target.pitch - state.pitch) * ease;

    const view = views.get(state.body);
    if (view) {
      view.content.rotation.set(state.pitch, state.yaw, 0);
      view.animate?.(state.elapsed);
    }

    const { top, right, bottom, left } = state.layout;
    const distance = fitDistance(view?.fitRadius ?? RADIUS) * state.zoom;
    state.distance = state.distance ? state.distance + (distance - state.distance) * ease : distance;
    state.offsetX += ((left - right) / 2 - state.offsetX) * ease;
    state.offsetY += ((top - bottom) / 2 - state.offsetY) * ease;

    const worldPerPixel = (2 * state.distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewport.height;
    camera.position.set(-state.offsetX * worldPerPixel, state.offsetY * worldPerPixel, state.distance);
    camera.lookAt(camera.position.x, camera.position.y, 0);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
  }

  function toScreen(vector, out) {
    scratch.point.copy(vector).project(camera);
    out.x = ((scratch.point.x + 1) / 2) * viewport.width;
    out.y = ((1 - scratch.point.y) / 2) * viewport.height;
  }

  function measure() {
    const view = views.get(state.body);
    const settled = Boolean(view) && !state.travel;
    scratch.toCamera.copy(camera.position).normalize();
    toScreen(new THREE.Vector3(), frame.center);

    frame.markers.forEach((reading) => {
      reading.visible = false;
    });
    frame.landmarks.forEach((reading) => {
      reading.visible = false;
    });
    if (!settled) return;

    const scale = view.group.scale.x;
    view.markers.forEach((marker) => {
      const reading = frame.markers.get(marker.id);
      const world = marker.local.clone().applyMatrix4(view.content.matrixWorld);
      toScreen(world, reading);
      if (marker.kind === "surface") {
        scratch.normal.copy(marker.local).normalize().applyQuaternion(view.content.quaternion);
        reading.visible = scratch.normal.dot(scratch.toCamera) > MIN_VISIBLE_FACING;
      } else if (marker.kind === "orbit") {
        const along = world.dot(scratch.toCamera);
        const perpendicular = scratch.along.copy(scratch.toCamera).multiplyScalar(along).sub(world).length();
        reading.visible = along > 0 || perpendicular > RADIUS * scale;
      } else {
        reading.visible = true;
      }
    });
    view.landmarks?.forEach((landmark) => {
      const reading = frame.landmarks.get(landmark.id);
      toScreen(landmark.local.clone().applyMatrix4(view.content.matrixWorld), reading);
      reading.visible = true;
    });
  }

  function tick() {
    update(Math.min(clock.getDelta(), 0.05));
    measure();
    renderer.render(scene, camera);
    onFrame(frame);
    frameId = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(frameId);
    clock.getDelta();
    tick();
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.interactive || state.drag) return;
    state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
    state.velocity = { yaw: 0, pitch: 0 };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointermove", (event) => {
    const drag = state.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const now = performance.now();
    const seconds = Math.max(now - drag.time, 1) / 1000;
    const deltaYaw = (event.clientX - drag.x) * DRAG_SPEED;
    const deltaPitch = (event.clientY - drag.y) * DRAG_SPEED;
    state.target.yaw += deltaYaw;
    state.target.pitch = clampPitch(state.target.pitch + deltaPitch);
    if (!reducedMotion) {
      state.velocity.yaw = clampFling(state.velocity.yaw * 0.6 + (deltaYaw / seconds) * 0.4);
      state.velocity.pitch = clampFling(state.velocity.pitch * 0.6 + (deltaPitch / seconds) * 0.4);
    }
    Object.assign(drag, { x: event.clientX, y: event.clientY, time: now });
  });

  const endDrag = (event) => {
    if (state.drag?.id !== event.pointerId) return;
    if (performance.now() - state.drag.time > 80) state.velocity = { yaw: 0, pitch: 0 };
    state.drag = null;
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", (event) => {
    if (!state.interactive) return;
    event.preventDefault();
    setZoom(state.zoom * Math.exp(event.deltaY * 0.001));
  }, { passive: false });

  function setZoom(value) {
    state.zoom = THREE.MathUtils.clamp(value, 0.62, 1.8);
    onZoom(state.zoom);
  }
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frameId);
    else start();
  });

  resize();
  start();

  return {
    setLayout(layout) {
      state.layout = { ...state.layout, ...layout };
    },
    // Flies to a body. Resolves when the new body has arrived.
    goTo(id, { instant = false } = {}) {
      if (!views.has(id)) return Promise.resolve();
      views.get(id).load();
      setZoom(1);
      if (id === state.body && !state.travel) return Promise.resolve();
      if (instant || reducedMotion || !state.body) {
        state.travel?.resolve();
        state.travel = null;
        views.forEach((view, key) => {
          view.group.visible = key === id;
          view.group.scale.setScalar(key === id ? 1 : 0.001);
          view.group.position.z = 0;
        });
        state.body = id;
        resetOrientation(id);
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        state.travel?.resolve();
        state.travel = { from: state.body, to: id, progress: 0, swapped: false, resolve };
      });
    },
    preload(id) {
      views.get(id)?.load();
    },
    focus(itemId) {
      const marker = views.get(state.body)?.markers.find((entry) => entry.id === itemId);
      if (!marker || marker.kind !== "surface") return;
      const { yaw, pitch } = orientationFor(marker.local);
      state.target.yaw += wrapAngle(yaw - state.target.yaw);
      state.target.pitch = clampPitch(pitch);
      state.velocity = { yaw: 0, pitch: 0 };
    },
    setAxis(x, y) {
      state.axis.x = x;
      state.axis.y = y;
    },
    setIdleSpin(on) {
      state.idleSpin = on;
    },
    setInteractive(on) {
      state.interactive = on;
      canvas.classList.toggle("is-interactive", on);
      if (!on && state.drag) {
        state.drag = null;
        canvas.classList.remove("is-dragging");
      }
    },
    adjustZoom(factor) {
      setZoom(state.zoom * factor);
    },
    resetZoom() {
      setZoom(1);
    },
    getZoom() {
      return state.zoom;
    }
  };
}

/* ---------- Globes: Earth, Moon, Mars ---------- */

function createGlobeView(id, body, items, anisotropy) {
  const mosaic = createMosaic(body.tiles(), body.fill);
  const texture = new THREE.CanvasTexture(mosaic.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;

  const content = new THREE.Group();
  content.add(new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, 128, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 })
  ));
  const group = new THREE.Group();
  group.add(content);
  if (body.atmosphere) group.add(createAtmosphere(body.atmosphere));

  const markers = [];
  let animate = null;
  let fitRadius = RADIUS;
  items.filter((item) => item.location.body === id).forEach((item) => {
    const { lat, lon, orbit } = item.location;
    if (orbit) {
      const satellite = createOrbiter(orbit);
      content.add(satellite.object);
      markers.push({ id: item.id, kind: "orbit", local: satellite.position });
      animate = satellite.animate;
      fitRadius = RADIUS * 1.32;
    } else {
      markers.push({ id: item.id, kind: "surface", local: latLonToVector(lat, lon).multiplyScalar(RADIUS * 1.004) });
    }
  });

  const start = orientationFor(latLonToVector(body.startView.lat, body.startView.lon));
  let loading = null;
  return {
    group,
    content,
    markers,
    animate,
    fitRadius,
    startOrientation: start,
    load: () => {
      loading ??= mosaic.load(() => {
        texture.needsUpdate = true;
      });
      return loading;
    }
  };
}

// A small satellite on a real-proportion elliptical orbit (perigee/apogee in km above the surface).
function createOrbiter({ perigeeKm, apogeeKm, inclinationDeg }) {
  const scale = RADIUS / EARTH_RADIUS_KM;
  const rp = (EARTH_RADIUS_KM + perigeeKm) * scale;
  const ra = (EARTH_RADIUS_KM + apogeeKm) * scale;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const b = a * Math.sqrt(1 - e * e);

  const plane = new THREE.Group();
  plane.rotation.set(THREE.MathUtils.degToRad(inclinationDeg), 0, THREE.MathUtils.degToRad(-20));

  const path = new THREE.EllipseCurve(-a * e, 0, a, b).getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y));
  plane.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(path),
    new THREE.LineBasicMaterial({ color: 0xf2a54a, transparent: true, opacity: 0.35 })
  ));

  const craft = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf4f1ea }));
  plane.add(craft);

  const position = new THREE.Vector3();
  return {
    object: plane,
    position,
    animate(elapsed) {
      // Kepler's equation, solved by a few Newton steps: faster near perigee, slower near apogee.
      const mean = ((elapsed / ORBIT_SECONDS) % 1) * Math.PI * 2;
      let anomaly = mean;
      for (let i = 0; i < 4; i += 1) anomaly -= (anomaly - e * Math.sin(anomaly) - mean) / (1 - e * Math.cos(anomaly));
      craft.position.set(a * (Math.cos(anomaly) - e), 0, b * Math.sin(anomaly));
      plane.updateMatrix();
      position.copy(craft.position).applyMatrix4(plane.matrix);
    }
  };
}

function createAtmosphere(color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.035, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(color) } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          gl_FragColor = vec4(glowColor, pow(rim, 4.0) * 0.5);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
}

/* ---------- Deep space: the outer solar system on a log scale ---------- */

function createSystemView(items, ephemeris) {
  const content = new THREE.Group();
  const group = new THREE.Group();
  group.add(content);

  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd7a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunGlow.scale.setScalar(0.42);
  content.add(sunGlow);

  const landmarks = [{ id: "sun", label: "Sun", local: new THREE.Vector3() }];
  SYSTEM_RINGS.forEach(([au, label, style, labelDegrees]) => {
    const radius = systemRadius(au);
    const points = new THREE.EllipseCurve(0, 0, radius, radius).getPoints(192).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const color = style === "light-day" ? 0xf2a54a : 0x9aa4b2;
    const opacity = { orbit: 0.22, edge: 0.3, "light-day": 0.75 }[style];
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    content.add(ring);
    if (labelDegrees !== null) {
      const angle = THREE.MathUtils.degToRad(labelDegrees);
      landmarks.push({ id: `ring-${label}`, label, local: new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius) });
    }
  });

  const markers = [];
  items.filter((item) => item.location.body === "space").forEach((item) => {
    const position = ephemeris.position(item.location.horizons);
    if (!position) return;
    const local = systemVector(position);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf4f1ea }));
    dot.position.copy(local);
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), local]),
      new THREE.LineDashedMaterial({ color: 0x9aa4b2, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.45 })
    );
    trail.computeLineDistances();
    // A stem down to the ecliptic plane shows how far above or below the planets' orbits the probe is.
    const foot = new THREE.Vector3(local.x, 0, local.z);
    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([foot, local]),
      new THREE.LineBasicMaterial({ color: 0xf2a54a, transparent: true, opacity: 0.5 })
    );
    const footDot = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xf2a54a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    footDot.rotation.x = -Math.PI / 2;
    footDot.position.copy(foot);
    content.add(dot, trail, stem, footDot);
    markers.push({ id: item.id, kind: "point", local });
  });

  return {
    group,
    content,
    markers,
    landmarks,
    fitRadius: SYSTEM_RADIUS,
    startOrientation: { yaw: 0.5, pitch: 0.45 },
    load: () => Promise.resolve()
  };
}

function systemRadius(au) {
  return (SYSTEM_RADIUS * Math.log10(1 + au)) / Math.log10(1 + SYSTEM_MAX_AU);
}

// Heliocentric ecliptic (x, y, z in AU) to scene space (y up), with the distance log-scaled.
function systemVector([x, y, z]) {
  const au = Math.hypot(x, y, z);
  return new THREE.Vector3(x, z, -y).multiplyScalar(systemRadius(au) / au);
}

function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.15, "rgba(255,236,200,0.9)");
  gradient.addColorStop(0.5, "rgba(255,190,110,0.18)");
  gradient.addColorStop(1, "rgba(255,190,110,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/* ---------- Backdrop: stars and travel streaks ---------- */

function createStars() {
  const group = new THREE.Group();
  [[1400, 1.1, 0.5], [260, 1.9, 0.85]].forEach(([count, size, opacity]) => {
    const positions = new Float32Array(count * 3);
    const direction = new THREE.Vector3();
    for (let i = 0; i < count; i += 1) {
      direction.randomDirection().multiplyScalar(150 + Math.random() * 80);
      direction.toArray(positions, i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false })));
  });
  return group;
}

// Light streaks in camera space that rush past while the line is between stops.
function createStreaks() {
  const positions = new Float32Array(STREAKS * 6);
  const seeds = Array.from({ length: STREAKS }, () => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 14;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: -Math.random() * 90 };
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xdfe6f0, transparent: true, opacity: 0, depthWrite: false });
  const object = new THREE.LineSegments(geometry, material);
  object.frustumCulled = false;

  return {
    object,
    update(dt, warp) {
      material.opacity = warp * 0.55;
      object.visible = warp > 0.01;
      if (!object.visible) return;
      const speed = 160 * warp;
      const length = 0.4 + warp * 9;
      seeds.forEach((seed, index) => {
        seed.z += speed * dt;
        if (seed.z > -2) seed.z -= 90;
        positions.set([seed.x, seed.y, seed.z, seed.x, seed.y, seed.z - length], index * 6);
      });
      geometry.attributes.position.needsUpdate = true;
    }
  };
}

/* ---------- Geometry helpers ---------- */

// Matches THREE.SphereGeometry's UV layout for an equirectangular map spanning -180°..180° longitude.
function latLonToVector(lat, lon) {
  const phi = THREE.MathUtils.degToRad(lon + 180);
  const theta = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(-Math.cos(phi) * Math.cos(theta), Math.sin(theta), Math.sin(phi) * Math.cos(theta));
}

// Rotation (Euler XYZ: pitch about X, yaw about Y) that turns `local` toward the camera.
function orientationFor(local) {
  return { yaw: Math.atan2(-local.x, local.z), pitch: Math.atan2(local.y, Math.hypot(local.x, local.z)) };
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clampPitch(pitch) {
  return THREE.MathUtils.clamp(pitch, -MAX_PITCH, MAX_PITCH);
}

function clampFling(velocity) {
  return THREE.MathUtils.clamp(velocity, -MAX_FLING, MAX_FLING);
}
