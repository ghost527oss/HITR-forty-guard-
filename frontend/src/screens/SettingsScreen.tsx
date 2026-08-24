import { useState } from "react";
import type { Units } from "../App";

interface SettingsScreenProps {
  location: string;
  onSearch: (q: string) => void;
  units: Units;
  onToggleUnits: () => void;
}

// Settings: location (makes the whole app relative to it), units, theme,
// notifications, emergency contact.
export default function SettingsScreen({ location, onSearch, units, onToggleUnits }: SettingsScreenProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifications, setNotifications] = useState(true);
  const [loc, setLoc] = useState("");

  const applyLocation = () => {
    if (loc.trim()) onSearch(loc.trim());
    setLoc("");
  };

  return (
    <div className="flex h-full flex-col bg-white pt-12">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-800">Settings</h2>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
        {/* Location */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Location</h3>
          <div className="rounded-2xl border border-gray-200 p-3">
            <div className="mb-2 text-gray-800">
              Current: <span className="font-semibold">{location}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLocation()}
                placeholder="Choose your city / place"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-heat-400"
              />
              <button
                onClick={applyLocation}
                className="rounded-xl bg-heat-600 px-3 py-2 font-semibold text-white"
              >
                Go
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Sets the whole app to this location.
            </p>
          </div>
        </section>

        {/* Units */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Units</h3>
          <button
            onClick={onToggleUnits}
            className="w-full rounded-2xl border border-gray-200 p-3 text-left"
          >
            <div className="text-gray-800">Temperature unit</div>
            <div className="text-xs text-gray-500">Currently {units === "imperial" ? "°F (Fahrenheit)" : "°C (Celsius)"}</div>
          </button>
        </section>

        {/* Theme */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Theme</h3>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-xl px-3 py-2 font-semibold ${
                  theme === t ? "bg-heat-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t === "light" ? "☀️ Light" : "🌙 Dark"}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Notifications</h3>
          <button
            onClick={() => setNotifications((n) => !n)}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 p-3 text-left"
          >
            <span className="text-gray-800">Heat alerts</span>
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${notifications ? "bg-heat-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${notifications ? "left-[22px]" : "left-0.5"}`}
              />
            </span>
          </button>
        </section>

        {/* Emergency contact */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Emergency</h3>
          <div className="rounded-2xl bg-red-50 p-3">
            <div className="font-semibold text-red-700">🚨 911 — Emergency</div>
            <div className="text-xs text-red-600">Police · Fire · Ambulance (US)</div>
          </div>
        </section>
      </div>
    </div>
  );
}
