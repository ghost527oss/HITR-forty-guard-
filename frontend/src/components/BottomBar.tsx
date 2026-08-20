import type { HeatReading, LandInfo } from "../api";
import type { Units } from "../App";

interface BottomBarProps {
  picked: { lat: number; lng: number } | null;
  reading: HeatReading | null;
  land: LandInfo | null;
  loading: boolean;
  units: Units;
}

// Bottom bar showing the selected spot's live temperature + land use (structure first).
export default function BottomBar({ picked, reading, land, loading, units }: BottomBarProps) {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 p-3">
      <div className="mx-auto max-w-lg rounded-2xl bg-white/90 shadow-lg p-4 backdrop-blur">
        {!picked && (
          <p className="text-gray-600 text-sm">
            Tap anywhere on the map to see the live temperature and what's there.
          </p>
        )}
        {picked && loading && <p className="text-gray-600 text-sm">Reading temperature…</p>}
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
                heat: {reading.source}
                {land && land.source === "fallback" ? " · land: estimated" : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
