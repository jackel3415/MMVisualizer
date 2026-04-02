# MMVisualizer Build Log

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
