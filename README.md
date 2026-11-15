# Abandoned but not Forgotten

**Storytelling about NASA's Discarded Equipment on the Moon and Mars**

Website interaktif untuk NASA Space Apps 2026 yang menggabungkan **Galactic Artifact Explorer** dan **Buku Catatan Misi**. Pengunjung menyaring dan memilih berkas artefak, lalu membaca cerita bergaya jurnal beserta fakta dan sumber NASA.

## Fitur

- Tiga berkas artefak: rover Opportunity, Lunar Roving Vehicle Apollo 17, dan rover Sojourner.
- Filter lokasi (Bulan/Mars), pencarian, serta tampilan detail bergaya logbook.
- Konten dalam Bahasa Indonesia dan English melalui tombol bahasa.
- Tata letak responsif untuk desktop dan ponsel.
- Tautan sumber misi NASA dan kredit foto pada tiap berkas.

Cerita bergaya jurnal adalah rekonstruksi kreatif, bukan catatan asli astronaut atau rover. Fakta misi dan foto diberi sumber terpisah.

## Menjalankan secara lokal

Tidak perlu instalasi dependency atau backend.

1. Clone atau unduh repositori.
2. Buka `index.html` di browser.

Jika browser membatasi file lokal, jalankan server statis dari folder proyek:

```bash
python3 -m http.server 8000
```

Kemudian buka <http://localhost:8000>. Foto NASA dimuat dari internet, jadi koneksi internet diperlukan untuk melihatnya.

## Teknologi

HTML, CSS, dan JavaScript murni. Tidak memerlukan build step, framework, maupun backend.

## Data dan kredit

Sumber fakta misi:

- [NASA Open Data catalog — Mars Rover Photos API](https://data.nasa.gov/api/3/action/package_show?id=mars-rover-photos-api), referensi dataset publik untuk arsip foto rover Mars.
- [NASA — Mars Exploration Rovers: Spirit and Opportunity](https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/)
- [NASA — Mars Pathfinder](https://science.nasa.gov/mission/mars-pathfinder/)
- [NASA — Apollo 17](https://www.nasa.gov/mission/apollo-17/)

Website ini memakai konten yang telah dikurasi dan tidak memanggil Mars Rover Photos API secara langsung. Foto yang ditampilkan dimuat dari NASA Image and Video Library.

Foto dari NASA Image and Video Library:

- Opportunity — [PIA20285](https://images-assets.nasa.gov/image/PIA20285/collection.json), NASA/JPL-Caltech.
- Lunar Roving Vehicle — [AS17-146-22367](https://images-assets.nasa.gov/image/as17-146-22367/collection.json), NASA.
- Sojourner — [PIA00623](https://images-assets.nasa.gov/image/PIA00623/collection.json), NASA/JPL.

Foto dan sumber misi juga dapat dibuka dari bagian **Sumber** dan setiap detail artefak di website.

Contoh produk untuk inspirasi:

- [Contoh produk interaktif](https://sl1nk.com/80sl0s6)
- [Contoh aplikasi dan logbook](https://sites.google.com/view/contoh-app-dan-logbook/full-page-embed)

## English

An interactive NASA Space Apps 2026 project combining the **Galactic Artifact Explorer** with a **Mission Logbook**. Visitors can filter and select artifact files, then explore journal-style stories alongside mission facts and NASA sources.

### Features

- Three artifact files: the Opportunity rover, Apollo 17's Lunar Roving Vehicle, and the Sojourner rover.
- Moon/Mars filters, search, and logbook-style artifact details.
- Indonesian and English content using the language toggle.
- Responsive layout for desktop and mobile.
- NASA mission references and photo credits on each artifact file.
- NASA Open Data catalog reference for the Mars Rover Photos API.

Journal-style stories are creative reconstructions, not actual astronaut or rover logs. Mission facts and photographs are separately sourced.

### Run locally

No dependencies or backend are required. Open `index.html` in a browser. If local-file restrictions apply, run `python3 -m http.server 8000` in the project folder and visit <http://localhost:8000>. An internet connection is needed to load NASA-hosted images.

### Technology

Vanilla HTML, CSS, and JavaScript. No build step, framework, or backend is required.

The site uses curated content and does not call the Mars Rover Photos API at runtime. Displayed photographs are loaded from the NASA Image and Video Library.

### Inspiration

- [Interactive product example](https://sl1nk.com/80sl0s6)
- [App and logbook examples](https://sites.google.com/view/contoh-app-dan-logbook/full-page-embed)
