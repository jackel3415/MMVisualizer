# Bundled dependencies

These browser scripts are included so opening `MMVisualizer.html` does not require npm, a build, or a CDN.

- `ical.js`: ICAL.js 2.2.1, Mozilla Public License 2.0. Unmodified UMD release `ical.es5.cjs` from https://github.com/kewisch/ical.js/releases/tag/v2.2.1, renamed for loading through a script tag. Source tag commit: `277d52c8db379f133a88957793e03997a65307f4`. License: `ICAL-LICENSE`.
- `qrcode.js`: QR Code Generator for JavaScript by Kazuhiko Arase, MIT. Source: https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/dist/qrcode.js. License: `QR-LICENSE`.

ICAL.js handles recurrence, recurrence exceptions and feed-provided timezone definitions. QR Code Generator creates the news article QR locally; article URLs are not sent to an image-generation service.
