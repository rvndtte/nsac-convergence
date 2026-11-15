// Cinematic opening: a short sequence over the night sky before boarding.
// Any key or click moves on at once; it plays once per browser session and
// is skipped entirely for visitors who prefer reduced motion.
const SEEN_KEY = "lfl-intro-seen";
const TOTAL_MS = 19000;

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage unavailable */ }
}

export function playIntro({ distanceKm, lightSeconds, otherCount, dateText }) {
  if (alreadySeen() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }
  const billions = distanceKm ? (distanceKm / 1e9).toFixed(2) : "25.9";
  const hours = lightSeconds ? Math.floor(lightSeconds / 3600) : 23;
  const minutes = lightSeconds ? Math.floor((lightSeconds % 3600) / 60) : 59;

  const root = document.createElement("section");
  root.className = "intro";
  root.setAttribute("aria-label", "Opening");
  root.innerHTML = `
    <div class="intro-rings" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="intro-lines">
      <p class="intro-line" style="--at:0.8s;--for:3.6s">${dateText}.<br>Somewhere past the planets, a machine is still answering.</p>
      <p class="intro-line" style="--at:5.2s;--for:4s"><span class="intro-big">${billions} billion km</span>Voyager 1 is this far from home.<br>A radio signal needs ${hours} h ${minutes} m to reach it.</p>
      <p class="intro-line" style="--at:10s;--for:3.6s">NASA left ${otherCount} more machines behind on the way.<br>Nobody is coming to collect them.</p>
      <p class="intro-line" style="--at:14.2s;--for:3.4s">Tonight the lost-property desk is open.</p>
      <h1 class="intro-title" style="--at:17s">The Lost &amp; Found Line</h1>
    </div>
    <p class="intro-hint" aria-hidden="true">Press any key or click to board</p>`;
  document.body.append(root);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      markSeen();
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey, true);
      root.removeEventListener("click", finish);
      root.classList.add("is-leaving");
      window.setTimeout(() => { root.remove(); resolve(); }, 700);
    };
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      finish();
    };
    const timer = window.setTimeout(finish, TOTAL_MS);
    document.addEventListener("keydown", onKey, true);
    root.addEventListener("click", finish);
  });
}
