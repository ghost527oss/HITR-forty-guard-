/**
 * Inline SVG strings for map popups.
 *
 * MapLibre popups take an HTML *string*, not a React node, so lucide components
 * can't be used inside them. These are the real lucide v0.546.0 path data
 * (droplet, trees) rendered as static markup, so the popups share the design
 * language of the rest of the app instead of falling back to emoji.
 *
 * Keep in sync if lucide is upgraded: regenerate from
 * node_modules/lucide-react/dist/esm/icons/<name>.js
 */

const wrap = (paths: string[], stroke: string, size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
  `fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" ` +
  `stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px">` +
  paths.map((d) => `<path d="${d}"/>`).join("") +
  `</svg>`;

const DROPLET_PATHS = [
  "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",
];

const TREES_PATHS = [
  "M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z",
  "M7 16v6",
  "M13 19v3",
  "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5",
];

export const dropletSvg = (stroke = "#0f172a", size = 14) =>
  wrap(DROPLET_PATHS, stroke, size);

export const treesSvg = (stroke = "#0f172a", size = 14) =>
  wrap(TREES_PATHS, stroke, size);
