# MMVisualizer

A browser-based visual editor and live preview tool for [MagicMirror²](https://magicmirror.builders/) configurations. Design your mirror layout, tweak styling, and export ready-to-use config files — all without touching the Raspberry Pi.

---

## Features

- **Live mirror preview** — see your layout at real resolution (e.g. 1920×1080), scaled to fit your browser window
- **Load your own `Config.js`** — import an existing MagicMirror config and see it rendered instantly
- **Load `custom.css`** — load your MagicMirror style file directly to control colors, fonts, and spacing in the preview
- **Live module rendering** — clock (with live tick), weather (current + 5-day via OpenWeatherMap), MMM-CalendarExt3 week grid, compliments, newsfeed
- **Drag & drop between regions** — move modules between any of the 13 MagicMirror positions by dragging
- **Free positioning** — toggle "Free Position" on any module to place it anywhere on the mirror with pixel precision; exports the CSS override needed for the Pi
- **Resize handles** — drag the right edge, bottom edge, or corner of any module to resize it visually
- **Per-module Visual tab** — click any module to open a detail panel with its config fields and visual style controls (font size, cell height, width, etc.)
- **Module browser** — search GitHub for MagicMirror community modules and drag them directly into your layout
- **Save to file** — save changes back to your original `Config.js` and `custom.css` on disk (uses the File System Access API; falls back to download)
- **Delete modules** — select a module on the preview and press `Delete` to remove it
- **Collapsible sidebar** — press ☰ to hide the sidebar and see the full mirror preview

---

## Quick Start

1. **Clone or download this repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/MMVisualizer.git
   cd MMVisualizer
   ```

2. **Open `MMVisualizer.html` in your browser**

   No build step or server required — it's a single HTML file.

   > Chrome or Edge is recommended for full File System Access API support (save-to-file).  
   > Firefox works but will use download-only mode for saving.

3. **Load your config files** (optional)

   - Click **Load Config.js** and select your MagicMirror `Config.js`
   - Click **Load custom.css** and select your `MagicMirror/config/custom.css`

   If you don't have existing files, the visualizer loads with a built-in default config.

4. **Edit and preview**

   - Drag modules between regions
   - Click a module to edit its config and visual settings
   - Resize modules with the drag handles that appear on hover
   - Browse community modules via the **Browse** tab

5. **Save your changes**

   - Click **Save Config.js** to write back to disk
   - Click **Save Visual** to write back to your `custom.css` on disk

---

## Files in This Repository

| File | Purpose |
|---|---|
| `MMVisualizer.html` | The entire application — open this in your browser |
| `Config.sample.js` | Example MagicMirror config with placeholder values — copy to `Config.js` and fill in your own |
| `custom.css` | Visual style settings (colors, fonts, spacing) — mirrors the file MagicMirror reads on the Pi |
| `LICENSE` | MIT License |

---

## Setting Up Your Config

Copy `Config.sample.js` to `Config.js` and fill in your values:

```bash
cp Config.sample.js Config.js
```

Then edit `Config.js`:

- **Weather**: Replace `YOUR_OPENWEATHERMAP_API_KEY` with a free key from [openweathermap.org](https://openweathermap.org/api)
- **Calendar**: Replace `YOUR_ICAL_URL_HERE` with your calendar's iCal/webcal URL (Google Calendar, iCloud, etc.)
- **Location**: Update `location` in the weather modules to your city

> `Config.js` is listed in `.gitignore` so your API keys and private calendar URLs are never committed.

---

## custom.css Reference

`custom.css` is the same file MagicMirror reads on the Pi. Load it into the visualizer to preview your styles, edit via the Visual tab, and save it back — no extra conversion step needed.

| CSS Variable | Default | Description |
|---|---|---|
| `--color-text` | `#999` | Default module text color |
| `--color-text-dimmed` | `#666` | Secondary / subdued text |
| `--color-text-bright` | `#fff` | Highlighted / primary text |
| `--color-background` | `#000` | Mirror background |
| `--font-primary` | `Roboto Condensed` | Main font family |
| `--font-secondary` | `Roboto` | Secondary font (thin/light weights) |
| `--font-size` | `20px` | Root font size (1rem = this value) |
| `--font-size-xsmall` | `0.75rem` | Extra small text |
| `--font-size-small` | `1rem` | Small text |
| `--font-size-medium` | `1.5rem` | Medium text |
| `--font-size-large` | `3.25rem` | Large text (e.g. clock time) |
| `--font-size-xlarge` | `3.75rem` | Extra large text |
| `--gap-body-top` | `60px` | Mirror frame margin — top |
| `--gap-body-right` | `60px` | Mirror frame margin — right |
| `--gap-body-bottom` | `60px` | Mirror frame margin — bottom |
| `--gap-body-left` | `60px` | Mirror frame margin — left |
| `--gap-modules` | `30px` | Vertical gap between stacked modules |

---

## MagicMirror Regions

MagicMirror uses a fixed 13-position region system. MMVisualizer supports all of them:

```
┌─────────────────── top_bar ───────────────────┐
│  top_left      top_center        top_right     │
│                                                │
│              upper_third                       │
│                                                │
│              middle_center                     │
│                                                │
│              lower_third                       │
│                                                │
│  bottom_left  bottom_center  bottom_right      │
└─────────────────── bottom_bar ────────────────┘
       (fullscreen_above / fullscreen_below wrap everything)
```

---

## Free Positioning

The **Free Position** toggle (in a module's Visual tab) lets you drag a module anywhere on the mirror, breaking out of the region grid. When enabled:

1. The module appears as a floating overlay on the preview
2. Drag it to any position
3. The **custom.css** tab shows the generated CSS override
4. Copy that CSS into your Pi's `custom.css`, and add the generated class name to the module's `classes` field in `Config.js`

Example output:
```css
/* Add classes: "free-clock" to this module in Config.js */
.free-clock {
  position: absolute !important;
  top: 42px;
  left: 120px;
}
```

---

## Module Browser

The **Browse** tab searches GitHub for community MagicMirror modules tagged with `magicmirror-module`. You can:

- Search by keyword
- See module name, description, and star count
- Drag a module card directly into any region on the mirror preview

> **Important:** Adding a module in the visualizer only adds it to your `Config.js`. The module software itself must still be installed on the machine running MagicMirror (your Raspberry Pi or wherever MagicMirror is hosted).
>
> To install a community module on your Pi:
> ```bash
> cd ~/MagicMirror/modules
> git clone https://github.com/author/MMM-ModuleName
> cd MMM-ModuleName
> npm install
> ```
> Then restart MagicMirror.

---

## Deploying to the Pi

1. Save your updated `Config.js` via the visualizer
2. Copy `Config.js` to `~/MagicMirror/config/config.js` on your Pi
3. Save `custom.css` via the visualizer and copy it to `~/MagicMirror/config/custom.css` on your Pi
4. If using free positioning, also copy the generated `.free-*` CSS rules into `custom.css`
5. Restart MagicMirror:
   ```bash
   pm2 restart MagicMirror
   # or
   cd ~/MagicMirror && npm run start
   ```

---

## Requirements

- A modern browser (Chrome or Edge recommended for save-to-file support)
- No installation or build step required
- Internet connection for live weather, calendar feeds, and the module browser

---

## License

MIT — see [LICENSE](LICENSE)
