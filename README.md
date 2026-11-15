# The Lost & Found Line

**Abandoned but not Forgotten: storytelling about NASA's discarded equipment.** Built for NASA Space Apps Challenge 2026.

A night service through the solar system that stops wherever NASA left something behind. You ride as a passenger. At every stop the lost-property desk hands you a tag with clues, and you find the machine it belongs to, out of the window, on real NASA maps. The line ends at Voyager 1, which is not lost at all: it is still answering, and on November 18, 2026 it becomes the first human-made object a full light-day from Earth.

## How to play

1. **Board.** Fill in your boarding pass. The Earth photo on it is the latest available image from NASA's EPIC camera, about 1.5 million km away.
   - Open the **Earth Window** from the boarding pass, Earth Orbit tag, or Vanguard 1 record to switch between the full-disc EPIC photo and a recent Sentinel-2 view of the Cape Canaveral region. The latter is live imagery from Microsoft Planetary Computer's STAC catalog.
2. **Ride.** The line runs Earth Orbit → The Moon → Mars → Deep Space. The captain announces each stop with its real distance from Earth today.
   - The cabin display shows the current stop, objective, and recovery progress. Its colour changes with each destination.
3. **Claim.** Read the tag's clue, turn the globe (drag or arrow keys), and select the marker it belongs to.
   - Zoom the window with its `+`, `−`, and Reset controls, or with the mouse wheel.
   - Tune the **signal scanner** for a live bearing and signal strength as you rotate the world. A signal lock means the matching marker is near the center of your view. The scanner does not spend stars or reveal the item's name.
   - The window reticle marks the center of the view and lights up on a signal lock. Recovering a record triggers a visual confirmation before the archive opens.
   - A correct pick stamps your passport and opens the record: the story, a live NASA photo gallery, facts, a myth check, and sources.
   - Each extra clue or wrong guess costs a star. A wrong guess still tells you what that marker is.
4. **Finale.** At Voyager 1, watch its distance tick live and send it a postcard that travels at the speed of light (simulated).
5. **Passport.** See your stamps and stars, then explore the whole line freely or ride again.

You can skip ahead at any stop. A full ride takes about 8 minutes.

## The 12 items

| Stop | Items |
| --- | --- |
| Earth Orbit | Vanguard 1 |
| The Moon | Apollo 11 Laser Ranging Retroreflector, Surveyor 3, Lunar Roving Vehicle (Apollo 17) |
| Mars | Viking 1 Lander, Sojourner, Spirit, Opportunity, InSight, Ingenuity |
| Deep Space | Pioneer 10, Voyager 1 |

All content lives in [`data/lost-and-found.json`](data/lost-and-found.json). Each item has its position, timeline, four facts, three tag clues, a story, sources, and an image query, plus an optional myth check. Positions marked `approx` are landing sites or estimates rather than exact resting points.

## NASA data

| Source | Used for | Called from |
| --- | --- | --- |
| [NASA Image and Video Library API](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf) | Photo gallery in every record | Browser (CORS open, no key) |
| [NASA EPIC API](https://epic.gsfc.nasa.gov/about/api) | Latest available Earth photo on the boarding pass and in the Earth Window | Browser |
| [Microsoft Planetary Computer STAC API](https://planetarycomputer.microsoft.com/api/stac/v1/docs) / [ESA Sentinel-2 L2A](https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a) | Recent Cape Canaveral regional image in the Earth Window | Browser (public STAC search and rendered preview, no key) |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) WMTS | Earth surface (Blue Marble Next Generation) | Browser |
| [NASA Moon Trek / Mars Trek](https://trek.nasa.gov/) WMTS | Moon (LRO WAC) and Mars (Viking MDIM 2.1) surfaces | Browser |
| [NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Real distances to the Moon, Mars, Pioneer 10 and Voyager 1, and probe positions on the deep-space map | Snapshot script (Horizons has no CORS) |

Horizons data is stored in [`data/ephemeris.json`](data/ephemeris.json) as weekly samples for 2026–2027. The browser interpolates them, so distances tick live. To refresh it:

```bash
node scripts/fetch-ephemeris.mjs
```

Not used: the Mars Rover Photos API returned 404, and APOD returned 500 with `DEMO_KEY`, when both were checked on November 15, 2026.

## Run locally

There is no build step, framework, or backend. The page loads JSON with `fetch`, so it must be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. An internet connection is needed for Three.js (jsDelivr), fonts, and NASA data.

## Code layout

| File | Role |
| --- | --- |
| `index.html` | Page structure: top bar with route, boarding pass, tag, record and finale panels, passport dialog |
| `styles.css` | Visual system and responsive layout (bottom sheets on phones) |
| `app.js` | Game controller: boarding → ride → stop → record → finale → passport → free ride |
| `views.js` | HTML templates. Every interpolated value is escaped by `html.js` |
| `scene.js` | Three.js: textured globes, Vanguard's Kepler orbit, the log-scale deep-space map, travel streaks |
| `worlds.js` | How each stop is drawn (tile source, colours, start view, credit) |
| `nasa.js` | All NASA calls: Image Library, EPIC, GIBS and Trek tile mosaics |
| `planetary.js` | Planetary Computer STAC search for a recent, relatively clear Sentinel-2 scene near Cape Canaveral |
| `ephemeris.js` | Interpolates the Horizons snapshot into live distances and light times |
| `audio.js` | Announcement chime, stamp, travel, and send tones via Web Audio (can be muted) |
| `scripts/fetch-ephemeris.mjs` | Refreshes `data/ephemeris.json` from JPL Horizons |

## Accessibility

- Markers are labelled buttons; arrow keys turn the globe; `Esc` closes a record; the passport uses the native `<dialog>` element.
- Captain announcements and tag feedback are announced through live regions.
- `prefers-reduced-motion` turns off travel animation, idle spin, inertia and transitions.
- Without WebGL, each tag lists its stop's places as buttons, and free exploration lists its items, so the whole game remains playable.

## Credits and honesty notes

- Surfaces: NASA GIBS Blue Marble, NASA Moon Trek (LRO WAC), NASA Mars Trek (Viking MDIM 2.1). Earth photo: NASA EPIC on DSCOVR. Photos: NASA Image and Video Library, each linked to its page.
- Earth Window Sentinel-2 imagery is from the European Space Agency, served by Microsoft Planetary Computer. It shows the present-day Cape Canaveral region, not Vanguard 1's 1958 launch, its exact launch pad, or its position in orbit. The cloud percentage applies to the selected satellite tile. Vanguard 1's Cape Canaveral launch is documented by [NASA](https://ntrs.nasa.gov/api/citations/19800019885/downloads/19800019885.pdf).
- Facts are sourced per item in the data file.
- The tag clues, stories and captain lines were written for this project from those facts.
- Vanguard 1 was built by the U.S. Naval Research Laboratory; Project Vanguard moved to NASA in 1958.
- The postcard to Voyager 1 is a simulation. Real commands go through NASA's Deep Space Network.
