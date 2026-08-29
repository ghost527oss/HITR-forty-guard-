import { useEffect, useState } from "react";
import type { Units } from "../App";
import { Moon, Sun, TriangleAlert, Palette, Check } from "lucide-react";

interface SettingsScreenProps {
  location: string;
  onSearch: (q: string) => void;
  units: Units;
  onToggleUnits: () => void;
  webSearchEnabled: boolean;
  onWebSearchEnabledChange: (enabled: boolean) => void;
  allowMockHeat: boolean;
  onAllowMockHeatChange: (enabled: boolean) => void;
}

const THEME_KEY = "hitr.theme";
const PALETTE_KEY = "hitr.palette";
const NOTIF_KEY = "hitr.notifications";

export type ColorPalette = "soft-classic" | "warm-amber" | "slate-crisp" | "emerald-mint" | "ocean-cool";

interface PaletteOption {
  id: ColorPalette;
  name: string;
  desc: string;
  previewClass: string;
  badgeColor: string;
}

const PALETTES: PaletteOption[] = [
  {
    id: "soft-classic",
    name: "Soft Classic",
    desc: "Clean neutral slate with soft orange heat accents",
    previewClass: "bg-slate-100 border-orange-400",
    badgeColor: "bg-orange-500",
  },
  {
    id: "warm-amber",
    name: "Warm Amber",
    desc: "Sunlit amber hues inspired by thermal comfort",
    previewClass: "bg-amber-50 border-amber-500",
    badgeColor: "bg-amber-500",
  },
  {
    id: "slate-crisp",
    name: "Crisp Slate",
    desc: "Modern low-contrast slate grey & zinc",
    previewClass: "bg-zinc-100 border-zinc-600",
    badgeColor: "bg-zinc-700",
  },
  {
    id: "emerald-mint",
    name: "Emerald Mint",
    desc: "Cooling botanical green and mint accents",
    previewClass: "bg-emerald-50 border-emerald-500",
    badgeColor: "bg-emerald-500",
  },
  {
    id: "ocean-cool",
    name: "Ocean Cool",
    desc: "Soothing sky blue and oceanic cooling tones",
    previewClass: "bg-sky-50 border-sky-500",
    badgeColor: "bg-sky-500",
  },
];

export default function SettingsScreen({
  location,
  onSearch,
  units,
  onToggleUnits,
  webSearchEnabled,
  onWebSearchEnabledChange,
  allowMockHeat,
  onAllowMockHeatChange,
}: SettingsScreenProps) {
  const [theme, setTheme] = useState<"light" | "dark">((): "light" | "dark" => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "dark" ? "dark" : "light";
  });

  const [palette, setPalette] = useState<ColorPalette>((): ColorPalette => {
    const stored = localStorage.getItem(PALETTE_KEY) as ColorPalette;
    return stored && PALETTES.some((p) => p.id === stored) ? stored : "soft-classic";
  });

  const [notifications, setNotifications] = useState<boolean>(() => {
    const stored = localStorage.getItem(NOTIF_KEY);
    return stored === null ? true : stored === "true";
  });
  const [loc, setLoc] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem(PALETTE_KEY, palette);
  }, [palette]);

  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, notifications ? "true" : "false");
  }, [notifications]);

  const applyLocation = () => {
    const requested = loc.trim();
    if (requested) {
      onSearch(requested);
      setLoc("");
    }
  };

  const handleNotificationsToggle = async () => {
    if (!notifications) {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch {
        // Ignored
      }
    }
    setNotifications((n) => !n);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900 overflow-y-auto pb-20 pt-10 text-slate-800 dark:text-slate-100">
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">System & Design Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-light mt-0.5">
          Customize themes, temperature units, location, and telemetry preferences.
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
        {/* Soft Theme Palette Selector */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-orange-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aesthetic & Soft Color Palette
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PALETTES.map((p) => {
              const active = palette === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={`flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all ${
                    active
                      ? "bg-white dark:bg-slate-800 ring-2 ring-orange-500 shadow-md"
                      : "bg-white/80 dark:bg-slate-800/60 ring-1 ring-slate-200/80 dark:ring-slate-700/60 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${p.previewClass}`}>
                    <span className={`h-3 w-3 rounded-full ${p.badgeColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</span>
                      {active && <Check className="h-4 w-4 text-orange-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-0.5 leading-tight">
                      {p.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mode Toggle (Light / Dark) */}
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Appearance Mode</h3>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-2xl p-3 text-xs font-bold transition-all ${
                  theme === t
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {t === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {t === "light" ? "Light Mode" : "Dark Mode"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Location Selector */}
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Target Region</h3>
          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-sm">
            <div className="mb-2 text-xs text-slate-700 dark:text-slate-300">
              Active Focus: <span className="font-bold text-slate-900 dark:text-white">{location}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLocation()}
                placeholder="Search city or location name…"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <button
                onClick={applyLocation}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors"
              >
                Set Target
              </button>
            </div>
          </div>
        </section>

        {/* Temperature Unit */}
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Measurement Scale</h3>
          <button
            onClick={onToggleUnits}
            className="w-full flex items-center justify-between rounded-2xl bg-white dark:bg-slate-800/80 p-4 ring-1 ring-slate-200/80 dark:ring-slate-700/60 text-left hover:shadow-sm transition-all"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Temperature Unit</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Currently {units === "imperial" ? "°F (Fahrenheit)" : "°C (Celsius)"}
              </div>
            </div>
            <span className="rounded-xl bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Switch to {units === "imperial" ? "°C" : "°F"}
            </span>
          </button>
        </section>

        {/* Fallbacks & Alerts */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Telemetry & Notifications</h3>

          <button
            onClick={() => {
              const next = !webSearchEnabled;
              localStorage.setItem("hitr.google-search", String(next));
              onWebSearchEnabledChange(next);
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-white dark:bg-slate-800/80 p-4 ring-1 ring-slate-200/80 dark:ring-slate-700/60 text-left shadow-sm"
          >
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Web Search Assistant Fallback</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Offer Google web search option after AI responses.</span>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${webSearchEnabled ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${webSearchEnabled ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>

          <button
            onClick={() => {
              const next = !allowMockHeat;
              localStorage.setItem("hitr.allow-mock-heat", String(next));
              onAllowMockHeatChange(next);
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-white dark:bg-slate-800/80 p-4 ring-1 ring-slate-200/80 dark:ring-slate-700/60 text-left shadow-sm"
          >
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Auto-fallback Mock Heat Grid</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Fallback to mock grid if FortyGuard key is absent.
              </span>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${allowMockHeat ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${allowMockHeat ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>

          <button
            onClick={handleNotificationsToggle}
            className="flex w-full items-center justify-between rounded-2xl bg-white dark:bg-slate-800/80 p-4 ring-1 ring-slate-200/80 dark:ring-slate-700/60 text-left shadow-sm"
          >
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Heat Emergency Alerts</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Browser alerts for extreme heat warnings (&ge;90°F)</span>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${notifications ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${notifications ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
        </section>

        {/* Emergency Callout */}
        <section>
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-200 dark:border-rose-900/40">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-xs">
              <TriangleAlert className="h-4 w-4" />
              Emergency Services: Call 911
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400/80 mt-0.5">
              Police · Fire · Cooling Shelters · Medical First Responders
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
