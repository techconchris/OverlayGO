# OverlayGO!

**Design stunning overlays for OBS Studio — right in your browser, for free.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Foverlaygo.techconchris.com&label=overlaygo.techconchris.com)](https://overlaygo.techconchris.com)
[![GitHub stars](https://img.shields.io/github/stars/techconchris/OverlayGO)](https://github.com/techconchris/OverlayGO/stargazers)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#tech-stack)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](#tech-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white)](#tech-stack)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](#tech-stack)
[![OBS Studio](https://img.shields.io/badge/OBS_Studio-302E31?logo=obsstudio&logoColor=white)](https://obsproject.com/)

**English** · [Español](README-es.md)

<img src="src/banner%20OverlayGO.jpg" alt="OverlayGO! — OBS overlay maker" width="100%">

---

## Overview

OverlayGO! is a free, open-source web app that lets you design custom overlays for
**OBS Studio** without installing anything. Pick a shape, tune the border, glow,
colors and animations, add a nickname and a REC indicator, then download a
self-contained HTML file you can load as a **Browser Source** in OBS.

No account, no watermark, no build tools required to use it.

## Live demo

👉 **[overlaygo.techconchris.com](https://overlaygo.techconchris.com)**

Available in **Spanish** and **English**.

## Features

- 🎨 **Fully customizable frame** — size, corner radius, border thickness and glow.
- 🌈 **Gradient colors** and a wide range of **animated effects**: spin, snake,
  double snake, dash, tick-tock, neon flicker, breathing glow, rainbow and pulse.
- 🖼️ **Double border** (outer ring) and **transparent interior** for placing the
  overlay on top of your camera.
- 🔴 **REC indicator** with configurable corner, margin and size.
- ✍️ **Nickname text** above or below the frame, with font, size, color and glow.
- 💾 **Presets** stored locally in your browser.
- 📐 **OBS size helper** — the app tells you the exact browser source size needed
  so the glow and outer ring are never clipped.
- 📥 **One-click HTML export**, plus a **PNG mask** download.
- 🌍 **Spanish / English** interface.
- 🚫 **No tracking, no accounts, no dependencies at runtime.**

## Quick start with OBS

1. Open the [live app](https://overlaygo.techconchris.com) and design your overlay.
2. Look at the **“OBS source size”** box in the **Size** section. It shows the
   width × height to use, already including the border, ring and glow margin.
3. Download the overlay. The file is named after its size, e.g.
   `OverlayGO-950x750.html`.
4. In OBS, add a **Browser Source**, check **Local file**, and select the
   downloaded HTML file.
5. Set the source **width and height** to the values shown in the app. If you use
   the frame size only, the glow will be clipped because OBS does not render
   outside the source area.

A step-by-step guide is built into the app (**OBS Guide**).

## Tech stack

- Static **HTML** pages with **Tailwind CSS**
- Vanilla **JavaScript** — the overlay generator runs entirely in the browser
- A small **Node.js** build script (`tools/build.js`) that produces the bilingual
  static site, injects SEO metadata and compiles Tailwind

## Project structure

```text
OverlayGO/
├── src/                  # Editable source (HTML, images)
│   ├── index.html        # Overlay designer
│   ├── OBS_Guide.html    # Step-by-step OBS guide
│   ├── banner-1200x630.jpg
│   └── obs.png
├── tools/                # Build pipeline
│   ├── build.js          # Static-site generator + i18n + SEO
│   ├── site.config.js    # Pages, languages, metadata
│   ├── tailwind.config.js
│   └── input.css
├── _site/                # Generated output (git-ignored)
├── .gitignore
├── package.json
└── package-lock.json
```

## Local development

Requirements: **Node.js 18+**.

```bash
npm install
npm run build
```

The generated site is written to `_site/`. Serve it with any static server, for
example:

```bash
npx serve _site
```

Edit only the files in `src/` and `tools/`; `_site/` is regenerated on every
build and is never edited by hand.

## Internationalization

The site is built as two fully static language versions:

- Spanish at `/`
- English at `/en/`

Static strings live in `src/` (`data-es` / `data-en` attributes and the
`I18N_PAIRS` tables); the build bakes them into each language at compile time.

## Contributing

Contributions, bug reports and feature ideas are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feat/my-feature`.
3. Make your changes in `src/` or `tools/`.
4. Run `npm run build` and check the output in `_site/`.
5. Open a pull request describing the change.

Please keep comments and documentation in Spanish, code identifiers in English,
and make sure the build stays green.

## License

Released under the [MIT License](LICENSE).

---

Made with ❤️ by [TechConChris](https://github.com/techconchris) for the streaming community.
