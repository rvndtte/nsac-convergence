const copy = {
  id: {
    skipLink: "Langsung ke artefak",
    navExplore: "Jelajahi",
    navLogbook: "Buku misi",
    navSources: "Sumber",
    eyebrow: "ARSIP EKSPLORASI ANTARIKSA",
    heroTitle: "Mereka pergi jauh.<br><em>Jejaknya tertinggal.</em>",
    heroDescription: "Setiap benda yang ditinggalkan di dunia lain menyimpan kisah tentang keberanian, rasa ingin tahu, dan manusia yang membangunnya.",
    heroCta: "Mulai penyelidikan",
    heroMeta1: "3 berkas artefak",
    heroMeta2: "Bulan &amp; Mars",
    heroMeta3: "Data NASA",
    visualCaption: "CATATAN DARI DUNIA LAIN",
    archiveKicker: "ARSIP LAPANGAN",
    archiveTitle: "Pilih sebuah jejak",
    archiveIntro: "Buka berkasnya. Temukan misinya.<br> Dengarkan ceritanya.",
    filterAll: 'Semua berkas <span>03</span>',
    filterMars: "Mars",
    filterMoon: "Bulan",
    searchLabel: "Cari artefak",
    searchPlaceholder: "Cari nama atau misi...",
    emptyState: "Tidak ada berkas yang cocok. Coba kata kunci lain.",
    logbookVisualNote: "JURNAL LAPANGAN<br>CATATAN NO. <span id=\"entry-number\">01</span>",
    logbookKicker: "BUKU CATATAN MISI",
    sourcesKicker: "BUKTI &amp; REFERENSI",
    sourcesTitle: "Cerita yang berpijak pada data.",
    sourcesDescription: "Fakta misi dan foto pada halaman ini bersumber dari NASA. Narasi bergaya jurnal adalah rekonstruksi kreatif, bukan kutipan atau catatan asli astronaut/rover.",
    sourceOpportunity: "Mars Exploration Rovers: Spirit and Opportunity",
    sourcePathfinder: "Mars Pathfinder",
    sourceApollo: "Apollo 17",
    sourceImageLibrary: "NASA Image and Video Library",
    sourceOpenData: "NASA Open Data — Mars Rover Photos API",
    imageCredit: "Kredit gambar tercantum pada setiap berkas artefak. Gambar dilayani oleh NASA Image and Video Library.",
    footerText: "Dibuat untuk para penjelajah kecil yang penuh rasa ingin tahu.",
    location: "LOKASI",
    mission: "MISI",
    lastSignal: "KONTAK TERAKHIR",
    missionLegacy: "JEJAK MISI",
    readFile: "BUKA BUKU MISI",
    selected: "DIBUKA",
    entryLabel: "CATATAN IMAGINATIF — BUKAN LOG ASLI",
    nasaMission: "FAKTA MISI NASA",
    nasaImage: "FOTO NASA",
    nasaSource: "SUMBER MISI"
  },
  en: {
    skipLink: "Skip to artifacts",
    navExplore: "Explore",
    navLogbook: "Mission log",
    navSources: "Sources",
    eyebrow: "SPACE EXPLORATION ARCHIVE",
    heroTitle: "They traveled far.<br><em>Their traces remain.</em>",
    heroDescription: "Every object left behind on another world holds a story of courage, curiosity, and the people who built it.",
    heroCta: "Begin the investigation",
    heroMeta1: "3 artifact files",
    heroMeta2: "Moon &amp; Mars",
    heroMeta3: "NASA data",
    visualCaption: "NOTES FROM ANOTHER WORLD",
    archiveKicker: "FIELD ARCHIVE",
    archiveTitle: "Choose a trace",
    archiveIntro: "Open the file. Find the mission.<br> Hear its story.",
    filterAll: 'All files <span>03</span>',
    filterMars: "Mars",
    filterMoon: "Moon",
    searchLabel: "Search artifacts",
    searchPlaceholder: "Search a name or mission...",
    emptyState: "No files match. Try another search.",
    logbookVisualNote: "FIELD JOURNAL<br>ENTRY NO. <span id=\"entry-number\">01</span>",
    logbookKicker: "MISSION LOGBOOK",
    sourcesKicker: "EVIDENCE &amp; REFERENCES",
    sourcesTitle: "Stories grounded in data.",
    sourcesDescription: "Mission facts and photographs on this page come from NASA. Journal-style storytelling is a creative reconstruction, not an actual astronaut/rover quote or log.",
    sourceOpportunity: "Mars Exploration Rovers: Spirit and Opportunity",
    sourcePathfinder: "Mars Pathfinder",
    sourceApollo: "Apollo 17",
    sourceImageLibrary: "NASA Image and Video Library",
    sourceOpenData: "NASA Open Data — Mars Rover Photos API",
    imageCredit: "Image credits are listed in each artifact file. Images are served by the NASA Image and Video Library.",
    footerText: "Made for curious young explorers.",
    location: "LOCATION",
    mission: "MISSION",
    lastSignal: "LAST CONTACT",
    missionLegacy: "MISSION TRACE",
    readFile: "OPEN MISSION LOG",
    selected: "OPEN",
    entryLabel: "IMAGINED ENTRY — NOT AN ORIGINAL LOG",
    nasaMission: "NASA MISSION FACTS",
    nasaImage: "NASA PHOTOGRAPH",
    nasaSource: "MISSION SOURCE"
  }
};

const artifacts = [
  {
    id: "opportunity",
    number: "01",
    place: "mars",
    names: { id: "Opportunity", en: "Opportunity" },
    nicknames: { id: "Oppy", en: "Oppy" },
    category: { id: "ROVER PENJELAJAH", en: "EXPLORATION ROVER" },
    subtitle: {
      id: "Penjelajah tangguh yang menemukan jejak air kuno di Mars.",
      en: "A resilient explorer that found traces of ancient water on Mars."
    },
    era: { id: "2004 — 2018", en: "2004 — 2018" },
    location: { id: "Meridiani Planum, Mars", en: "Meridiani Planum, Mars" },
    mission: { id: "Mars Exploration Rover-B", en: "Mars Exploration Rover-B" },
    contact: { id: "10 Juni 2018", en: "June 10, 2018" },
    legacy: {
      id: "Dirancang untuk 90 sol; bekerja lebih dari 14 tahun.",
      en: "Designed for 90 sols; worked for more than 14 years."
    },
    story: {
      id: "Bayangkan langit Meridiani Planum perlahan meredup oleh debu. Panel surya Opportunity kehilangan cahaya yang dibutuhkan untuk mengisi daya. Setelah lebih dari 14 tahun menjelajah, rover ini mengirim kontak terakhirnya pada 10 Juni 2018. Di tanah Mars, ia meninggalkan jejak roda dan bukti bahwa air pernah mengubah batuan.",
      en: "Imagine the sky over Meridiani Planum slowly dimming with dust. Opportunity's solar panels lost the sunlight needed to recharge. After more than 14 years of exploration, the rover sent its last communication on June 10, 2018. On Martian soil, it left wheel tracks and evidence that water once altered the rocks."
    },
    facts: {
      id: [
        ["Tiba di Mars", "24 Januari 2004"],
        ["Dirancang untuk", "90 sol (hari Mars)"]
      ],
      en: [
        ["Landed on Mars", "January 24, 2004"],
        ["Designed for", "90 sols (Martian days)"]
      ]
    },
    image: "https://images-assets.nasa.gov/image/PIA20285/PIA20285~orig.jpg",
    imageAlt: {
      id: "Rover Opportunity memeriksa batuan di Mars.",
      en: "Opportunity rover examines a rock on Mars."
    },
    imageCredit: "NASA/JPL-Caltech",
    imageSource: "https://images-assets.nasa.gov/image/PIA20285/collection.json",
    missionSource: "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/",
    searchTerms: "opportunity oppy mars rover meridiani"
  },
  {
    id: "lunar-rover",
    number: "02",
    place: "moon",
    names: { id: "Lunar Roving Vehicle", en: "Lunar Roving Vehicle" },
    nicknames: { id: "Kendaraan Bulan Apollo 17", en: "Apollo 17 Moon Buggy" },
    category: { id: "KENDARAAN BULAN", en: "LUNAR VEHICLE" },
    subtitle: {
      id: "Kereta listrik yang membawa astronaut melintasi Taurus-Littrow.",
      en: "An electric vehicle that carried astronauts across Taurus-Littrow."
    },
    era: { id: "1972", en: "1972" },
    location: { id: "Taurus-Littrow, Bulan", en: "Taurus-Littrow, Moon" },
    mission: { id: "Apollo 17", en: "Apollo 17" },
    contact: { id: "Ditinggalkan setelah misi", en: "Left behind after the mission" },
    legacy: {
      id: "Membantu kru menjelajahi area Bulan yang lebih luas.",
      en: "Helped the crew explore a wider area of the Moon."
    },
    story: {
      id: "Di lembah Taurus-Littrow, kendaraan kecil ini membawa Eugene Cernan dan Harrison Schmitt melintasi permukaan Bulan untuk mengumpulkan sampel dan mengamati geologi. Saat Apollo 17 pulang ke Bumi, Lunar Roving Vehicle tetap terparkir di Bulan—sebuah kendaraan yang menunggu di bawah langit tanpa suara.",
      en: "In the Taurus-Littrow valley, this small vehicle carried Eugene Cernan and Harrison Schmitt across the lunar surface to collect samples and study its geology. When Apollo 17 returned to Earth, the Lunar Roving Vehicle remained parked on the Moon—a vehicle waiting beneath a silent sky."
    },
    facts: {
      id: [
        ["Misi", "Pendaratan Bulan terakhir Apollo"],
        ["Foto NASA", "Lokasi parkir terakhir LRV"]
      ],
      en: [
        ["Mission", "The final Apollo lunar landing"],
        ["NASA photo", "LRV's final parking place"]
      ]
    },
    image: "https://images-assets.nasa.gov/image/as17-146-22367/as17-146-22367~large.jpg",
    imageAlt: {
      id: "Lunar Roving Vehicle di tempat parkir terakhirnya di Bulan.",
      en: "The Lunar Roving Vehicle in its final parking place on the Moon."
    },
    imageCredit: "NASA",
    imageSource: "https://images-assets.nasa.gov/image/as17-146-22367/collection.json",
    missionSource: "https://www.nasa.gov/mission/apollo-17/",
    searchTerms: "lunar roving vehicle lrv apollo 17 moon buggy bulan"
  },
  {
    id: "sojourner",
    number: "03",
    place: "mars",
    names: { id: "Sojourner", en: "Sojourner" },
    nicknames: { id: "Penjelajah mungil Pathfinder", en: "Pathfinder's tiny rover" },
    category: { id: "ROVER PERTAMA", en: "FIRST ROVER" },
    subtitle: {
      id: "Robot mungil yang membuka jalan bagi penjelajah Mars berikutnya.",
      en: "A tiny robot that paved the way for later Mars explorers."
    },
    era: { id: "1997", en: "1997" },
    location: { id: "Ares Vallis, Mars", en: "Ares Vallis, Mars" },
    mission: { id: "Mars Pathfinder", en: "Mars Pathfinder" },
    contact: { id: "Misi berakhir 27 September 1997", en: "Mission ended September 27, 1997" },
    legacy: {
      id: "Rover pertama yang beroperasi di permukaan Mars.",
      en: "The first rover to operate on the Martian surface."
    },
    story: {
      id: "Pada 4 Juli 1997, Sojourner menuruni lander Pathfinder dan mulai menjelajah Mars. Beratnya hanya sekitar 10,6 kilogram, tetapi ia memeriksa batuan dan tanah dengan instrumen sainsnya. Misi Pathfinder berakhir pada September tahun itu; Sojourner menjadi bukti bahwa rover kecil dapat bekerja di dunia lain.",
      en: "On July 4, 1997, Sojourner rolled down from the Pathfinder lander and began exploring Mars. It weighed only about 10.6 kilograms, yet it studied rocks and soil with its science instruments. The Pathfinder mission ended that September; Sojourner showed that a small rover could work on another world."
    },
    facts: {
      id: [
        ["Mendarat", "4 Juli 1997"],
        ["Berat rover", "Sekitar 10,6 kg"]
      ],
      en: [
        ["Landed", "July 4, 1997"],
        ["Rover weight", "About 10.6 kg"]
      ]
    },
    image: "https://images-assets.nasa.gov/image/PIA00623/PIA00623~orig.jpg",
    imageAlt: {
      id: "Rover Sojourner berada di permukaan Mars setelah turun dari Pathfinder.",
      en: "Sojourner rover on Mars after driving down from Pathfinder."
    },
    imageCredit: "NASA/JPL",
    imageSource: "https://images-assets.nasa.gov/image/PIA00623/collection.json",
    missionSource: "https://science.nasa.gov/mission/mars-pathfinder/",
    searchTerms: "sojourner mars pathfinder rover"
  }
];

const elements = {
  artifactGrid: document.querySelector("#artifact-grid"),
  artifactDetail: document.querySelector("#artifact-detail"),
  emptyState: document.querySelector("#empty-state"),
  search: document.querySelector("#artifact-search"),
  languageSwitch: document.querySelector("#language-switch")
};

let language = "id";
let activeFilter = "all";
let selectedId = artifacts[0].id;

function applyTranslations() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (copy[language][key]) {
      element.innerHTML = copy[language][key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = copy[language][key];
  });

  elements.languageSwitch.querySelectorAll("span[aria-hidden]").forEach((option) => {
    option.removeAttribute("aria-current");
  });
  elements.languageSwitch.querySelector(`span[aria-hidden]:nth-child(${language === "id" ? 1 : 3})`)
    ?.setAttribute("aria-current", "true");
  elements.languageSwitch.setAttribute("aria-label", language === "id" ? "Switch to English" : "Beralih ke Bahasa Indonesia");

  renderArtifacts();
  renderDetail();
}

function getVisibleArtifacts() {
  const query = elements.search.value.trim().toLocaleLowerCase(language);
  return artifacts.filter((artifact) => {
    const matchesPlace = activeFilter === "all" || artifact.place === activeFilter;
    const searchable = [
      artifact.names[language],
      artifact.nicknames[language],
      artifact.subtitle[language],
      artifact.searchTerms
    ].join(" ").toLocaleLowerCase(language);
    return matchesPlace && searchable.includes(query);
  });
}

function renderArtifacts() {
  const visibleArtifacts = getVisibleArtifacts();
  elements.emptyState.hidden = visibleArtifacts.length > 0;
  elements.artifactGrid.innerHTML = visibleArtifacts.map((artifact) => {
    const place = artifact.place === "moon"
      ? (language === "id" ? "BULAN" : "MOON")
      : "MARS";
    const isSelected = artifact.id === selectedId;
    return `
      <button class="artifact-card${isSelected ? " is-selected" : ""}" type="button"
        data-artifact-id="${artifact.id}" aria-pressed="${isSelected}"
        aria-label="${language === "id" ? "Buka berkas" : "Open file"}: ${artifact.names[language]}">
        <span class="artifact-image-wrap">
          <img class="artifact-image" src="${artifact.image}" alt="${artifact.imageAlt[language]}" loading="lazy">
          <span class="artifact-index">${artifact.number} / 03</span>
          <span class="artifact-location">${place}</span>
        </span>
        <span class="artifact-copy">
          <span class="artifact-type">${artifact.category[language]}</span>
          <span class="artifact-title"><strong>${artifact.names[language]}</strong></span>
          <span class="artifact-subtitle">${artifact.subtitle[language]}</span>
          <span class="artifact-footer"><span>${artifact.era[language]}</span><span aria-hidden="true">↗</span></span>
        </span>
      </button>`;
  }).join("");
}

function renderDetail() {
  const artifact = artifacts.find((item) => item.id === selectedId) ?? artifacts[0];
  const place = artifact.place === "moon"
    ? (language === "id" ? "Bulan" : "Moon")
    : "Mars";
  const facts = artifact.facts[language].map(([label, value]) => `
    <div class="fact-item">
      <span class="fact-label">${label}</span>
      <span class="fact-value">${value}</span>
    </div>`).join("");

  document.querySelector("#entry-number").textContent = artifact.number;
  elements.artifactDetail.innerHTML = `
    <h2>${artifact.names[language]}</h2>
    <div class="logbook-meta">
      <span>${artifact.nicknames[language]}</span>
      <span>${place}</span>
      <span>${artifact.era[language]}</span>
    </div>
    <p class="logbook-story">${artifact.story[language]}</p>
    <p class="fiction-note">${copy[language].entryLabel}</p>
    <div class="fact-strip">
      ${facts}
      <div class="fact-item">
        <span class="fact-label">${copy[language].lastSignal}</span>
        <span class="fact-value">${artifact.contact[language]}</span>
      </div>
      <div class="fact-item">
        <span class="fact-label">${copy[language].missionLegacy}</span>
        <span class="fact-value">${artifact.legacy[language]}</span>
      </div>
    </div>
    <div class="artifact-source">
      <a href="${artifact.missionSource}" target="_blank" rel="noreferrer">${copy[language].nasaMission} ↗</a>
      <a href="${artifact.imageSource}" target="_blank" rel="noreferrer">${copy[language].nasaImage}: ${artifact.imageCredit} ↗</a>
    </div>`;
}

document.querySelector(".filter-group").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-button").forEach((filterButton) => {
    const isActive = filterButton === button;
    filterButton.classList.toggle("is-active", isActive);
    filterButton.setAttribute("aria-pressed", String(isActive));
  });
  renderArtifacts();
});

elements.artifactGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-artifact-id]");
  if (!card) return;

  selectedId = card.dataset.artifactId;
  renderArtifacts();
  renderDetail();
  document.querySelector("#logbook").scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.search.addEventListener("input", renderArtifacts);
elements.languageSwitch.addEventListener("click", () => {
  language = language === "id" ? "en" : "id";
  applyTranslations();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey
    && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
});

applyTranslations();
