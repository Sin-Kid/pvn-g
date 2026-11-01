# PVN-G · Pavan G's portfolio

[![CI](https://github.com/Sin-Kid/pvn-g/actions/workflows/ci.yml/badge.svg)](https://github.com/Sin-Kid/pvn-g/actions/workflows/ci.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/98981a1b-4491-401f-8406-e6769c5e3226/deploy-status)](https://app.netlify.com/projects/pvn-g/deploys)

**Live:** https://pvn-g.netlify.app

An interactive portfolio built like a circuit board. I'm a final-year Electronics and Communication student at R. V. College of Engineering, Bengaluru. My focus is digital hardware (SystemVerilog RTL, verification with assertions and coverage, FPGA and microcontroller bring-up), and I also build the software around it.

![Preview of the portfolio](site/og.png)

## Projects

| Chip | Project | Links |
| --- | --- | --- |
| U2 | **Smart Parking**: SystemVerilog RTL on a Basys-3 (Artix-7) FPGA with slot allocation and emergency priority, 100% functional coverage in Vivado XSIM | |
| U3 | **Smart Bus**: ESP32 GPS/RFID telemetry into Supabase and PostgreSQL with React and React Native front ends | [code](https://github.com/Sin-Kid/smart-bus-app) · [demo video](https://drive.google.com/drive/folders/1-6QwSIBd1sO_FEfgYHaz-M9BqnWz_YpU) |
| U4 | **TeleBot AI**: local voice assistant in four Indian languages with Whisper, Llama 3.2 and Indic TTS | [code](https://github.com/Sin-Kid/telecom-ai-bot) |
| U5 | **Fire-Fit**: AI personal trainer for Fire TV, built for the Amazon Developer Hackathon | [code](https://github.com/Sin-Kid/fire-fit-tv) · [demo video](https://youtu.be/du_oGdhgtNg) · [browser build](https://fire-fit-tv.netlify.app) |
| U6 | **Portfolio OS**: macOS-style desktop in the browser with live trading apps | [live demo](https://panna-g.netlify.app) |

## What's on the board

| Section | What it does |
| --- | --- |
| **U1** | The hero chip. Its 24 pins are core skills, mostly RTL, VLSI and board-level; hover one to see which projects drive it. |
| **Schematic** | Every project is an IC wired to the skill nets it uses, hardware first. Open a chip for its links, a preview and its numbers, or pick a net to trace every chip that depends on it. Skills without a featured project show a dash instead of a load count. |
| **Logic analyzer** | Roles and schools as digital channels, high while active. Drag the cursor (or use the arrow keys) to read what was running at any month. |
| **Serial monitor** | A working console. Try `help`, `open parking`, `net sva`, `certs` or `sudo hire pavan`. |
| **Solder mask** | Switch the board between green, black, blue and white. The animated signals can be turned off, and they stay off for anyone who prefers reduced motion. |

No framework and no build step: plain HTML, CSS and JavaScript. The copper field is drawn on a canvas, the chips and wires are SVG, and the fonts are self-hosted.

## Project layout

```
site/                 everything that gets deployed
  index.html          page markup
  404.html            "open circuit" page
  css/                fonts, base tokens and components
  js/                 core (data + event bus), field, u1, schematic, analyzer, serial, ui
  img/                project previews (screenshots and diagrams)
  fonts/              Big Shoulders Display, Instrument Sans, Share Tech Mono (OFL)
  _headers            security headers and caching for Netlify
scripts/
  check.mjs           static checks: scripts parse, links and images resolve, nothing external
  smoke.mjs           opens the site in Chromium and exercises every interactive part
  serve.mjs           local server that applies the same headers as Netlify
.github/workflows/
  ci.yml              validation and browser smoke test
```

To change projects, skills, certificates or links, edit the data block in `site/js/core.js`.

## Run it locally

```bash
npm install
npm run serve        # http://localhost:8080
```

## CI/CD

**CI, GitHub Actions** (`.github/workflows/ci.yml`) runs on every push and pull request:

1. **Validate**: `html-validate` on both pages, a syntax check of every script, checks that every referenced file and preview image exists and nothing loads from another origin, and a check that the security headers are still there.
2. **Smoke test**: Playwright opens the site in Chromium with the production Content-Security-Policy and checks that the chips, nets, wires, project links, previews, certificates, logic analyzer, serial monitor and mask switch work, with no console errors and no sideways scrolling on a phone.

**CD, Netlify** is linked to this repo. Every push to `main` builds and deploys to production at pvn-g.netlify.app, and every pull request gets its own deploy preview. The Netlify build runs `npm run check` first (see `netlify.toml`), so a page that fails validation never goes live.

## Credits

Designed and built by Pavan G. Fonts are used under the SIL Open Font License; see `site/fonts/`.
