/** Shared theme keys — Settings + boot (main.tsx) must stay in sync. */

export const THEME_KEY = "hitr.theme";
export const PALETTE_KEY = "hitr.palette";

export type ColorPalette =
  | "soft-classic"
  | "warm-amber"
  | "slate-crisp"
  | "emerald-mint"
  | "ocean-cool";

export const PALETTE_IDS: ColorPalette[] = [
  "soft-classic",
  "warm-amber",
  "slate-crisp",
  "emerald-mint",
  "ocean-cool",
];

export function readStoredTheme(): "light" | "dark" {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function readStoredPalette(): ColorPalette {
  const stored = localStorage.getItem(PALETTE_KEY) as ColorPalette | null;
  return stored && PALETTE_IDS.includes(stored) ? stored : "soft-classic";
}

export function applyTheme(theme: "light" | "dark", palette: ColorPalette): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-palette", palette);
  localStorage.setItem(THEME_KEY, theme);
  localStorage.setItem(PALETTE_KEY, palette);
}

export function applyStoredTheme(): void {
  applyTheme(readStoredTheme(), readStoredPalette());
}
