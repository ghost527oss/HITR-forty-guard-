import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getHeatSurface, type HeatSurfaceResult } from "../api";

const HOURS = [0, 6, 12, 18] as const;

export default function HeatSurfaceScreen({
  lat,
  lng,
  locationName,
  onBack,
}: {
  lat: number;
  lng: number;
  locationName: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<HeatSurfaceResult | null>(null);
  const [error, setError] = useState("");
  const [hour, setHour] = useState<number | "now">("now");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setData(null);
    getHeatSurface(lat, lng)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Could not load heat surface");
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const sample = useMemo(() => {
    if (!data || hour === "now") return null;
    return data.temporal?.diurnal_sampling.find((s) => s.hour === hour) ?? null;
  }, [data, hour]);

  return (
    <section className="h-full overflow-y-auto bg-[var(--hitr-bg)] p-5 pb-24 text-slate-800 dark:text-slate-100">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-heat-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Map
      </button>
      <h1 className="mt-4 text-xl font-bold">Heat surface: {locationName}</h1>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {!data && !error && <p className="mt-4 text-sm text-slate-500">Loading local heat surface…</p>}

      {data && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Time of day</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setHour("now")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  hour === "now" ? "bg-orange-500 text-white" : "bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
                }`}
              >
                Snapshot
              </button>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    hour === h ? "bg-orange-500 text-white" : "bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
                  }`}
                >
                  {String(h).padStart(2, "0")}:00
                </button>
              ))}
            </div>
          </div>

          {hour === "now" || !sample ? (
            <div className="space-y-1 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
              <p>
                Range: {data.surface_min_f}–{data.surface_max_f}°F · average {data.surface_avg_f}°F
              </p>
              <p>
                Hotspots: {data.hotspots.length} · Coolspots: {data.coolspots.length}
              </p>
            </div>
          ) : (
            <div className="space-y-1 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
              <p className="font-semibold">{String(hour).padStart(2, "0")}:00 diurnal sample</p>
              <p>
                Range: {sample.surface_min_f}–{sample.surface_max_f}°F · average {sample.surface_avg_f}°F
              </p>
              <p>
                Hotspots: {sample.hotspot_count} · Coolspots: {sample.coolspot_count}
              </p>
            </div>
          )}

          {hour === "now" && data.hotspots.length > 0 && (
            <ul className="space-y-2">
              {data.hotspots.slice(0, 4).map((z, i) => (
                <li key={i} className="rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
                  <span className="font-bold">{z.label}</span> · {z.peak_temp_f}°F · {z.pattern}
                  <p className="mt-1 text-slate-500">{z.pattern_explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
