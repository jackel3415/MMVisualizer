/* MagicMirror² Visual Config
 *
 * This file controls the visual appearance of both:
 *   1. The MagicMirror² display on the Raspberry Pi  (via custom.css variables)
 *   2. The MMVisualizer preview in the browser        (loaded alongside Config.js)
 *
 * To use on the Pi:
 *   Copy the CSS variables block below into your MagicMirror/config/custom.css
 *
 * To use in the Visualizer:
 *   Click "Load VisualConfig.js" and select this file. It applies instantly.
 *
 * Reference: https://docs.magicmirror.builders/configuration/introduction.html
 */

let visualConfig = {

  // ── Colors ─────────────────────────────────────────────────────────────────
  colorText:        "#999",       // Default module text
  colorTextDimmed:  "#666",       // Secondary / subdued text
  colorTextBright:  "#fff",       // Highlighted / primary text
  colorBackground:  "#000",       // Mirror background

  // ── Typography ─────────────────────────────────────────────────────────────
  fontPrimary:   "Roboto Condensed",  // Main font (used for most modules)
  fontSecondary: "Roboto",            // Secondary font (thin/light weights)

  // Font scale — all module sizes are relative to this base
  fontSize:       "20px",   // Root font size (1rem = this value)
  fontSizeXSmall: "0.75rem",
  fontSizeSmall:  "1rem",
  fontSizeMedium: "1.5rem",
  fontSizeLarge:  "3.25rem",
  fontSizeXLarge: "3.75rem",

  // ── Spacing ─────────────────────────────────────────────────────────────────
  gapBodyTop:    "60px",   // Margin inside the mirror frame — top
  gapBodyRight:  "60px",   // Margin inside the mirror frame — right
  gapBodyBottom: "60px",   // Margin inside the mirror frame — bottom
  gapBodyLeft:   "60px",   // Margin inside the mirror frame — left
  gapModules:    "30px",   // Vertical gap between stacked modules

  // ── Visualizer-only settings ────────────────────────────────────────────────
  // These have no effect on the Pi — they only control the preview window.
  resolution: "1920x1080",  // Mirror resolution preset
  zoom:       0.55,         // Preview zoom level (0.35 – 1.0)

  // ── Calendar (MMM-CalendarExt3) ─────────────────────────────────────────────
  calendarFontSize:   "20px",   // Base font size for the week grid
  calendarCellHeight: "113px",  // Min height of each day cell

};

/* ─────────────────────────────────────────────────────────────────────────────
 * CUSTOM.CSS EQUIVALENT
 * Copy this block into MagicMirror/config/custom.css on the Pi to match.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * :root {
 *   --color-text:        #999;
 *   --color-text-dimmed: #666;
 *   --color-text-bright: #fff;
 *   --color-background:  #000;
 *
 *   --font-primary:   "Roboto Condensed";
 *   --font-secondary: "Roboto";
 *
 *   --font-size:        20px;
 *   --font-size-xsmall: 0.75rem;
 *   --font-size-small:  1rem;
 *   --font-size-medium: 1.5rem;
 *   --font-size-large:  3.25rem;
 *   --font-size-xlarge: 3.75rem;
 *
 *   --gap-body-top:    60px;
 *   --gap-body-right:  60px;
 *   --gap-body-bottom: 60px;
 *   --gap-body-left:   60px;
 *   --gap-modules:     30px;
 * }
 */

if (typeof module !== "undefined") { module.exports = visualConfig; }
