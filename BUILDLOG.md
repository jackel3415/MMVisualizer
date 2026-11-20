# MMVisualizer Build Log

## 2026-11-19 — scene-based config compatibility

- Fixed JavaScript config serialization and undo/redo so functions inside nested objects and arrays survive visual edits and downloaded exports. Config and CSS track unsaved changes independently.
- Added native-style MagicMirror regions, module headers and CalendarExt3/Agenda markup. CSS is parsed by the browser and scoped per rule; unmatched closing braces are repaired and reported without leaking later rules into the editor.
- Added Open-Meteo current/hourly/daily weather, shared named calendar feeds, day/week/month views, Agenda, legends, weather temperatures and iCalendar recurrence/exception/timezone handling through bundled ICAL.js.
- Added Scenes2 and positional/global/slides Carousel selection and play/pause controls. Role classes missing from the config are reported; original scene assignments are preserved.
- Added Home Assistant template layouts, explicit sample data for sanitized services, local photo uploads, live radar tiles and locally generated news QR codes. Hardware helpers, HA entity connections, Pollen/BMW service backends and upstream animation engines are not executed.
- Added optional loopback-only `serve.py` for public iCal feeds blocked by browser CORS. Feed URLs are never sent through public proxy services or written to request logs.
- Added a synthetic scene example, browser regression tests, Python server checks and bundled dependency licenses. The supplied config/CSS and acceptance screenshots remain local.
- Validation: 13 Chrome browser checks (including all 24 entries in the supplied sanitized config) and 3 Python checks passed. Live browser checks returned Open-Meteo current/hourly weather, radar imagery, a public calendar feed (HTTP 200) and a news article with a locally generated QR; no browser script errors.

---

## 2026-11-15 — custom.css + repeated modules

- Fixed: loading a `custom.css` with normal rules but none of the 19 known `--variables` failed with "No recognised CSS variables". Any valid file now loads
- custom.css rules (`.clock`, `.MMM-xxx`, `body`, `:root`, `@font-face`, `@import`) are now applied to the preview, scoped to the mirror so the editor UI is untouched
- Module wrappers now carry MagicMirror's real classes (`module <name> <classes>`) so custom.css selectors match
- Fixed: modules used more than once shared one width / free position. Each entry now has a hidden id (never written to Config.js); width also survives moving a module between regions
- Free-position CSS export gives repeated modules distinct class names (`free-clock`, `free-clock-2`)
- Known gap: MMM-Carousel / MMM-Scenes2 rotation is not modelled yet (all rotating modules are drawn at once); most third-party modules show as labelled placeholders

---

## 2026-11-15 — Quality-of-life pass

- Fixed: with "Show disabled" off, selecting/moving/deleting a module acted on the wrong one (filtered index used against `cfg.modules`)
- Added undo/redo (100 steps), Ctrl+S / Ctrl+Z / Ctrl+Y / Esc, arrow-key nudge for free-positioned modules
- Removed Backspace-deletes-module (too easy to trigger by accident); Delete remains, and is undoable
- Unsaved-changes marker in the tab title plus a beforeunload warning
- Preferences (resolution, zoom, show disabled, sidebar) persist in localStorage
- Config serializer now keeps unknown top-level and per-module keys and escapes strings properly
- Module names/positions in the sidebar list are HTML-escaped

---

## 2026-04-02 — Public repo prep

- Fixed corrupted `VisualConfig.js` (lines 49-50 had garbled syntax `20px"20px"`)
- Rewrote `README.md` with full feature docs, quick start, VisualConfig reference table, Pi deployment guide, and note that browsed modules must be installed on the Pi separately
- Added `Config.sample.js` — safe template with placeholder API keys/URLs for new users
- Added `.gitignore` — excludes `Config.js` (real API keys), duplicate files, `MagicMirror-master/`
- Added MIT `LICENSE`

---

## Earlier sessions (pre-log)

- Initial build: single-file `MMVisualizer.html` (renamed from `index.html`)
- Live clock rendering with `displaySeconds` support
- Live weather via OpenWeatherMap (current + 5-day forecast)
- MMM-CalendarExt3 week grid renderer with iCal feed parsing
- Compliments and newsfeed module stubs
- All 13 MagicMirror regions rendered accurately
- Drag & drop between regions (event delegation on `#mirror`)
- `VisualConfig.js` system with CSS variable export for Pi `custom.css`
- Per-module detail panel with Config and Visual tabs
- Module width resize via drag handles (right, bottom, corner)
- Free positioning mode — pixel-precise overlay drag, CSS export for Pi
- Module browser pulling from GitHub (`topic:magicmirror-module`)
- Save-to-file via File System Access API (download fallback)
- Delete module with `Delete` key
- Collapsible sidebar (☰ toggle)
- Reset-to-default arrows on all VisualConfig fields
