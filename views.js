import { html } from "./html.js";

const MAX_STARS = 3;
const closeIcon = html`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

export function starsView(count) {
  return html`<span class="stars" aria-label="${count} of ${MAX_STARS} stars">${Array.from({ length: MAX_STARS }, (_, index) => html`<span class="${index < count ? "star is-on" : "star"}" aria-hidden="true">★</span>`)}</span>`;
}

export function routeView({ stations, currentIndex, furthestIndex, claims, itemsAt, canNavigate }) {
  return html`${stations.map((station, index) => {
    const items = itemsAt(station.id);
    const claimed = items.filter((item) => claims.has(item.id)).length;
    const status = index === currentIndex ? "current" : index <= furthestIndex ? "past" : "ahead";
    return html`
      <li class="route-stop" data-status="${status}">
        <button class="route-button" type="button" data-action="station" data-index="${index}" aria-label="${station.name}" ${canNavigate && index <= furthestIndex && index !== currentIndex ? "" : "disabled"}
          aria-current="${index === currentIndex ? "step" : "false"}">
          <span class="route-dot" aria-hidden="true"></span>
          <span class="route-name">${station.name}</span>
          <span class="route-count">${claimed}/${items.length}</span>
        </button>
      </li>`;
  })}`;
}

export function markersView(items) {
  return html`${items.map((item) => html`
    <button class="marker" type="button" data-id="${item.id}" data-state="unknown" aria-label="Item at ${item.location.site}">
      <span class="marker-dot" aria-hidden="true"></span>
      <span class="marker-label" aria-hidden="true">
        <span class="marker-site">${item.location.site}</span>
        <span class="marker-name">${item.name}</span>
      </span>
    </button>`)}`;
}

export function landmarksView(landmarks) {
  return html`${landmarks.map((landmark) => html`<span class="landmark" data-id="${landmark.id}">${landmark.label}</span>`)}`;
}

export function tagView({ item, station, number, total, cluesShown, stars, feedback, nextStation, choices, scanning }) {
  const body = { earth: "Earth", moon: "Moon", mars: "planet", space: "map" }[item.location.body];
  return html`
    <div class="tag-card">
      <header class="tag-header">
        <p class="label">Lost property · ${station.name}</p>
        <p class="tag-count">Tag ${number} of ${total}</p>
      </header>
      <h2 class="tag-title" id="tag-title" tabindex="-1">Who does this belong to?</h2>
      <ol class="clues">
        ${item.claimTag.map((clue, index) => index < cluesShown
          ? html`<li class="clue">${clue}</li>`
          : html`<li class="clue is-hidden" aria-label="Hidden clue">Hidden clue</li>`)}
      </ol>
      <div class="tag-worth">
        <span class="label">Worth</span> ${starsView(stars)}
        ${cluesShown < item.claimTag.length
          ? html`<button class="link-button" type="button" data-action="clue">Show another clue (−1 star)</button>`
          : ""}
      </div>
      <p class="tag-help">${choices
        ? "Choose the place this tag belongs to."
        : html`Turn the ${body} by dragging, or with the arrow keys, then select the marker this tag belongs to.`}</p>
      ${station.body === "earth" ? html`<button class="earth-window-trigger" type="button" data-action="open-earth-window"><span aria-hidden="true">◉</span> Open Earth Window <span aria-hidden="true">↗</span><small>From orbit to the launch coast</small></button>` : ""}
      ${choices ? "" : html`<button class="button scanner-button" type="button" data-action="scan" aria-pressed="${scanning}">
        <span class="scanner-button-icon" aria-hidden="true">◎</span>${scanning ? "Switch off signal scanner" : "Tune signal scanner"}
      </button>`}
      ${choices ? html`
        <ul class="choices">
          ${choices.map((choice) => html`
            <li><button class="button" type="button" data-action="choose" data-id="${choice.id}" ${choice.done ? "disabled" : ""}>${choice.label}</button></li>`)}
        </ul>` : ""}
      <p class="tag-feedback" role="status">${feedback}</p>
    </div>
    ${nextStation ? html`<button class="link-button tag-skip" type="button" data-action="ride-on">Skip ahead to ${nextStation.name}</button>` : ""}`;
}

export function stationClearedView({ station, nextStation, claimed, total }) {
  return html`
    <div class="tag-card">
      <p class="label">Lost property · ${station.name}</p>
      <h2 class="tag-title" id="tag-title" tabindex="-1">${claimed === total ? "Every tag claimed" : "Tags handed back"}</h2>
      <p class="tag-help">${claimed} of ${total} items claimed at this stop. Select any claimed marker to read its record again.</p>
      ${station.body === "earth" ? html`<button class="earth-window-trigger" type="button" data-action="open-earth-window"><span aria-hidden="true">◉</span> Open Earth Window <span aria-hidden="true">↗</span><small>From orbit to the launch coast</small></button>` : ""}
      <button class="button button-primary" type="button" data-action="ride-on">Ride on to ${nextStation.name}</button>
    </div>`;
}

export function freeView(choices = null) {
  return html`
    <div class="tag-card">
      <p class="label">Free ride</p>
      <h2 class="tag-title" id="tag-title" tabindex="-1">The whole line is open</h2>
      <p class="tag-help">${choices ? "Pick a stop on the route, then choose an item to open its record." : "Pick a stop on the route, then select any marker to open its record."}</p>
      ${choices ? html`<ul class="choices">${choices.map((choice) => html`<li><button class="button" type="button" data-action="choose" data-id="${choice.id}">${choice.label}</button></li>`)}</ul>` : ""}
    </div>`;
}

export function recordView(item, { station, stars, claimedOn, footerLabel }) {
  return html`
    <header class="record-header">
      <p class="label">${station.name} · ${item.kind}</p>
      <button class="icon-button" type="button" data-action="close-record" aria-label="Close record">${closeIcon}</button>
    </header>
    <div class="record-heading">
      <div>
        <h2 class="record-title" id="record-title" tabindex="-1">${item.name}</h2>
        <p class="record-subtitle">${item.location.label}</p>
      </div>
      ${stars ? html`
        <div class="stamp" aria-label="Claimed with ${stars} of 3 stars">
          <span class="stamp-top">Claimed</span>
          ${starsView(stars)}
          <span class="stamp-date">${claimedOn}</span>
        </div>` : ""}
    </div>

    <p class="record-story">${item.story}</p>

    ${item.id === "vanguard-1" ? html`<button class="earth-window-trigger" type="button" data-action="open-earth-window"><span aria-hidden="true">◉</span> Open Earth Window <span aria-hidden="true">↗</span><small>Explore the coast Vanguard launched from</small></button>` : ""}

    <section class="archive" id="record-archive" aria-label="Photos from the NASA archive"></section>

    <dl class="facts">
      ${item.facts.map(([label, value]) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`)}
      ${item.location.lat !== undefined ? html`
        <div class="facts-wide"><dt>Position</dt><dd>${formatPosition(item.location)}${item.location.approx ? html` <span class="fact-note">approximate</span>` : ""}</dd></div>` : ""}
    </dl>

    ${item.myth ? html`
      <section class="myth" aria-labelledby="myth-title">
        <h3 class="label" id="myth-title">Myth check</h3>
        <p class="myth-claim">“${item.myth.claim}”</p>
        <p class="myth-truth">${item.myth.truth}</p>
      </section>` : ""}

    ${item.note ? html`<p class="record-note">${item.note}</p>` : ""}

    <section class="sources" aria-labelledby="sources-title">
      <h3 class="label" id="sources-title">Sources</h3>
      <ul>${item.sources.map((source) => html`<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.title} ↗</a></li>`)}</ul>
    </section>

    <div class="record-footer">
      <button class="button button-primary" type="button" data-action="close-record">${footerLabel}</button>
    </div>`;
}

export function archiveView(archive, selected) {
  if (archive.status === "loading") {
    return html`
      <div class="viewer is-loading" aria-busy="true"><div class="viewer-frame"></div></div>
      <p class="archive-status">Searching images-api.nasa.gov…</p>`;
  }
  if (!archive.items.length) {
    return html`<p class="archive-status">The NASA archive is unreachable right now. <button class="link-button" type="button" data-action="retry-archive">Retry</button></p>`;
  }

  const item = archive.items[selected] ?? archive.items[0];
  const meta = [item.date, item.center, item.nasaId].filter(Boolean).join(" · ");
  return html`
    <figure class="viewer">
      <div class="viewer-frame"><img src="${item.image}" alt="${item.title}" decoding="async"></div>
      <figcaption>
        <span class="viewer-title">${item.title}</span>
        ${item.summary ? html`<span class="viewer-summary">${item.summary}</span>` : ""}
        <span class="viewer-meta">${meta}</span>
        <a href="${item.detailsUrl}" target="_blank" rel="noreferrer">View on images.nasa.gov ↗</a>
      </figcaption>
    </figure>
    ${archive.items.length > 1 ? html`
      <ul class="thumbs" aria-label="More photos from NASA">
        ${archive.items.map((photo, index) => html`
          <li>
            <button class="thumb" type="button" data-action="photo" data-index="${index}" aria-pressed="${index === selected}" aria-label="${photo.title}">
              <img src="${photo.preview}" alt="" loading="lazy">
            </button>
          </li>`)}
      </ul>` : ""}
    <p class="archive-status">
      ${archive.status === "error"
        ? html`Search failed, showing the saved photo. <button class="link-button" type="button" data-action="retry-archive">Retry</button>`
        : html`Live from images-api.nasa.gov · ${archive.total.toLocaleString("en-US")} results for “${archive.query}”`}
    </p>`;
}

export function finaleView(item, { stars }) {
  return html`
    <header class="record-header">
      <p class="label">Final stop · ${item.name}</p>
      ${stars ? starsView(stars) : ""}
    </header>
    <h2 class="finale-title" id="finale-title" tabindex="-1">Not lost. Still answering.</h2>
    <p class="record-story">${item.story}</p>

    <dl class="live">
      <div class="live-wide"><dt>Distance from Earth, now</dt><dd class="live-big" id="live-distance">–</dd></div>
      <div><dt>A radio signal takes</dt><dd id="live-light">–</dd></div>
      <div><dt>One light-day from Earth</dt><dd class="live-accent" id="live-milestone">–</dd></div>
    </dl>
    <p class="live-source">Computed from a NASA/JPL Horizons snapshot of Voyager 1's position.</p>

    <form class="postcard" id="postcard-form">
      <label class="label" for="postcard-text">Send a postcard to Voyager 1</label>
      <textarea id="postcard-text" name="postcard" maxlength="160" rows="3" placeholder="Write a few words…" required></textarea>
      <div class="postcard-row">
        <span class="postcard-hint">Travels at the speed of light.</span>
        <button class="button button-primary" type="submit">Send</button>
      </div>
    </form>
    <div class="postcard-status" id="postcard-status" hidden>
      <p class="postcard-quote" id="postcard-quote"></p>
      <div class="progress" aria-hidden="true"><span id="postcard-progress"></span></div>
      <p class="postcard-eta" id="postcard-eta" role="status"></p>
      <p class="postcard-hint">A simulation. Real commands to Voyager go out through NASA's Deep Space Network.</p>
    </div>

    <div class="record-footer">
      <button class="button" type="button" data-action="finish">See my passport</button>
    </div>`;
}

export function passportView({ passenger, stations, itemsAt, claims, time, final }) {
  const total = stations.reduce((sum, station) => sum + itemsAt(station.id).length, 0);
  const stars = [...claims.values()].reduce((sum, value) => sum + value, 0);
  return html`
    <header class="record-header">
      <p class="label">Passport · ${passenger}</p>
      <button class="icon-button" type="button" data-action="close-passport" aria-label="Close passport">${closeIcon}</button>
    </header>
    <h2 class="dialog-title" id="passport-title">${final ? "End of the line" : "Your passport"}</h2>
    <p class="dialog-text">
      ${claims.size} of ${total} items claimed · ${stars} of ${total * MAX_STARS} stars${time ? html` · ride time ${time}` : ""}
    </p>
    ${stations.map((station) => html`
      <section class="passport-stop">
        <h3 class="label">${station.name}</h3>
        <ul class="passport-grid">
          ${itemsAt(station.id).map((item) => {
            const earned = claims.get(item.id);
            return html`
              <li>
                <button class="passport-stamp" type="button" data-action="open-record" data-id="${item.id}" ${earned ? "" : "disabled"} data-claimed="${Boolean(earned)}">
                  <span class="passport-name">${earned ? item.name : item.location.site}</span>
                  ${earned ? starsView(earned) : html`<span class="passport-missing">Not claimed</span>`}
                </button>
              </li>`;
          })}
        </ul>
      </section>`)}
    <div class="dialog-actions">
      ${final ? html`<button class="button button-primary" type="button" data-action="free-ride">Explore the whole line</button>` : ""}
      <button class="button ${final ? "" : "button-primary"}" type="button" data-action="share-card">Save passport card (PNG)</button>
      ${final ? html`<button class="button" type="button" data-action="replay">Ride again</button>` : ""}
    </div>
    <p class="dialog-text" id="share-status" role="status" aria-live="polite"></p>`;
}

function formatPosition({ lat, lon }) {
  const latText = `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"}`;
  const east = ((lon % 360) + 360) % 360;
  const lonText = east > 180 ? `${(360 - east).toFixed(2)}° W` : `${east.toFixed(2)}° E`;
  return `${latText}, ${lonText}`;
}
