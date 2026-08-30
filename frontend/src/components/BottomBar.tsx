import type { HeatReading, LandInfo, PatternAnalysis, WeatherNow } from "../api";
import type { Units } from "../App";
import { pmvFanger, ppdFromPmv, pmvLabel } from "../planner/uhiFactors";

interface BottomBarProps {
  picked: { lat: number; lng: number } | null;
  reading: HeatReading | null;
  land: LandInfo | null;
  loading: boolean;
  units: Units;
  onViewSurface?: () => void;
  /** Source of the heat overlay (not the spot reading). */
  heatSource?: "mock" | "fortyguard";
  pattern?: PatternAnalysis | null;
  weather?: WeatherNow | null;
  coolWalk?: { cell: { lat: number; lng: number; temp_f: number }; meters: number } | null;
}

// Bottom bar showing the selected spot's live temperature + land use (structure first).
export default function BottomBar({ picked, reading, land, loading, units, onViewSurface, heatSource = "mock", pattern = null, weather = null, coolWalk = null }: BottomBarProps) {
  const comfort = (() => {
    if (!reading || !weather) return null;
    const pmv = pmvFanger({
      taC: reading.temp_c,
      trC: reading.temp_c + 6,
      va: Math.max(0.1, weather.wind_ms),
      rh: weather.rh,
    });
    const label = pmvLabel(pmv);
    return { pmv, ppd: ppdFromPmv(pmv), label };
  })();

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 p-3">
      <div className="mx-auto max-w-lg rounded-2xl bg-white/90 shadow-lg p-4 backdrop-blur dark:bg-[var(--hitr-surface)] dark:ring-1 dark:ring-slate-600/50">
        {!picked && (
          <p className="text-gray-600 text-sm dark:text-slate-300">
            Tap anywhere on the map to see the live temperature and what's there.
          </p>
        )}
        {picked && loading && <p className="text-gray-600 text-sm dark:text-slate-300">Reading temperature…</p>}
        {picked && !loading && reading && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {land ? land.label : "Live temperature"}
              </div>
              <div className="text-3xl font-bold" style={{ color: reading.color }}>
                {units === "imperial" ? (
                  <>
                    {reading.temp_f}°F{" "}
                    <span className="text-lg">({reading.temp_c}°C)</span>
                  </>
                ) : (
                  <>
                    {reading.temp_c}°C{" "}
                    <span className="text-lg">({reading.temp_f}°F)</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <span
                className="rounded-full px-3 py-1 text-white text-sm font-medium"
                style={{ backgroundColor: reading.color }}
              >
                {reading.risk}
              </span>
              <div className="mt-1 text-xs text-gray-500">
                {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
              </div>
              <div className="text-[10px] text-gray-400">
                spot: {reading.source}
                {land && land.source === "fallback" ? " · land: estimated" : ""}
                {" · overlay: "}
                {heatSource === "fortyguard" ? (
                  <span className="font-medium text-emerald-600">FortyGuard</span>
                ) : (
                  <span>mock</span>
                )}
              </div>
              {onViewSurface && <button onClick={onViewSurface} className="mt-1 text-xs font-medium text-heat-700">View surface</button>}
            </div>
          </div>
        )}
        {picked && !loading && pattern && (
          <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-600">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Why this tile</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">{pattern.pattern_label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">{pattern.summary}</p>
          </div>
        )}
        {picked && !loading && comfort && (
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
            Walk comfort (PMV {comfort.pmv.toFixed(1)}):{" "}
            <span className="font-semibold">{comfort.label.text}</span>
            {" · "}
            {Math.round(comfort.ppd)}% dissatisfied · wind {weather?.wind_ms.toFixed(1)} m/s · RH {Math.round(weather?.rh ?? 0)}%
          </div>
        )}
        {picked && !loading && coolWalk && (
          <p className="mt-1 text-[11px] text-teal-700 dark:text-teal-300">
            Nearest cooler tile: {Math.round(coolWalk.meters)} m · {Math.round(coolWalk.cell.temp_f)}°F (teal path)
          </p>
        )}
      </div>
    </footer>
  );
}
