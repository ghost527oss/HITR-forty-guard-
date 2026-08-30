import { useEffect, useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import MapView, { type BoxBounds } from "../components/MapView";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import HeatMapFAB from "../components/HeatMapFAB";
import PlanSheet from "../components/PlanSheet";
import type { Units } from "../App";
import type { HeatReading, HeatCell, LandInfo, ChangeLevel, PatternAnalysis, WeatherNow } from "../api";
import { getCitySimulation3D } from "../api";
import type { HeatwaveStatus, PlacementContext } from "../planner/uhiFactors";
import { buildMapScenario, nearestCoolerTile, scenarioAtBudget, type BudgetTier } from "../lib/mapScenario";
import { rankExposureCells } from "../lib/exposureScore";

interface Center {
  lat: number;
  lng: number;
}

interface MapScreenProps {
  center: Center;
  zoom: number;
  title: string;
  onSearch: (q: string) => void;
  onPick: (lat: number, lng: number) => void;
  onClearPick?: () => void;
  picked: { lat: number; lng: number } | null;
  reading: HeatReading | null;
  land: LandInfo | null;
  loading: boolean;
  units: Units;
  onToggleUnits: () => void;
  heatData: HeatCell[] | null;
  onViewSurface?: () => void;
  heatSource?: "mock" | "fortyguard";
  heatUnavailable?: string | null;
  heatJob?: "processing" | "ready" | "failed" | "unavailable" | "mock";
  pattern?: PatternAnalysis | null;
  weather?: WeatherNow | null;
  heatwave?: HeatwaveStatus | null;
  onAssistant?: () => void;
  onSOS?: () => void;
  onDatabase?: () => void;
  onGeneratePlan?: (level: ChangeLevel) => void;
  planLoading?: boolean;
}

// Full-screen live heat map with FAB menu, iPhone-style plan sheet,
// and shift+drag box-selection (Google Lens style).
export default function MapScreen(props: MapScreenProps) {
  const {
    center, zoom, title, onSearch, onPick, onClearPick, picked, reading,
    land, loading, units, onToggleUnits, heatData, heatSource, heatUnavailable, heatJob = "mock", pattern, weather, heatwave, onViewSurface,
    onAssistant, onSOS, onDatabase, onGeneratePlan, planLoading,
  } = props;
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [box, setBox] = useState<BoxBounds | null>(null);
  const [scenarioMode, setScenarioMode] = useState<"now" | "after">("now");
  const [budget, setBudget] = useState<BudgetTier>("med");
  const [placeCtx, setPlaceCtx] = useState<PlacementContext>({ vegetation: [], buildings: [] });
  const [layers, setLayers] = useState({
    heat: true,
    water: true,
    path: true,
    canopy: false,
    roofs: false,
  });

  useEffect(() => {
    if (!picked) {
      setPlaceCtx({ vegetation: [], buildings: [] });
      return;
    }
    let cancelled = false;
    getCitySimulation3D(picked.lat, picked.lng)
      .then((sim) => {
        if (cancelled) return;
        setPlaceCtx({
          vegetation: sim.vegetation.map((v) => ({ lat: v.lat, lng: v.lng })),
          buildings: sim.buildings.map((b) => ({ lat: b.lat, lng: b.lng, height_m: b.height_m })),
          hospitals: sim.hospitals.map((h) => ({ lat: h.lat, lng: h.lng })),
        });
      })
      .catch(() => {
        if (!cancelled) setPlaceCtx({ vegetation: [], buildings: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [picked?.lat, picked?.lng]);

  const fullScenario = useMemo(
    () => (heatData && heatData.length ? buildMapScenario(heatData, placeCtx) : null),
    [heatData, placeCtx],
  );
  const scenario = useMemo(
    () => (heatData && fullScenario ? scenarioAtBudget(heatData, fullScenario, budget) : null),
    [heatData, fullScenario, budget],
  );
  const exposure = useMemo(
    () => (heatData && heatData.length ? rankExposureCells(heatData, placeCtx, 3) : []),
    [heatData, placeCtx],
  );
  const displayHeat = scenarioMode === "after" && scenario?.placements.length
    ? scenario.summary.cells
    : heatData;

  const coolWalk = picked && heatData?.length
    ? nearestCoolerTile(picked, heatData)
    : null;
  const coolPath = picked && coolWalk
    ? { from: picked, to: { lat: coolWalk.cell.lat, lng: coolWalk.cell.lng } }
    : null;
  const waterStations = (scenario?.placements ?? [])
    .filter((p) => p.kind === "water_station")
    .map((p) => ({ lat: p.lat, lng: p.lng, label: p.reason }));
  const canopyGaps = (scenario?.placements ?? [])
    .filter((p) => p.kind === "tree_cluster")
    .map((p) => ({ lat: p.lat, lng: p.lng, label: p.reason }));
  const roofTargets = (scenario?.placements ?? [])
    .filter((p) => p.kind === "cool_roof")
    .map((p) => ({ lat: p.lat, lng: p.lng, label: p.reason }));

  const handlePlanConfirm = (level: ChangeLevel) => {
    setPlanSheetOpen(false);
    if (onGeneratePlan) onGeneratePlan(level);
  };

  // Suppress unused vars warning for the prop names used by App wiring.
  void box; void setBox;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {heatUnavailable && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-900/35 px-6">
          <div className="pointer-events-auto max-w-sm rounded-2xl bg-[var(--hitr-surface)] p-5 text-center shadow-xl ring-1 ring-slate-200 dark:ring-slate-700">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Heat overlay unavailable</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{heatUnavailable}</p>
          </div>
        </div>
      )}
      <MapView
        center={center}
        zoom={zoom}
        onPick={onPick}
        onBoxSelected={setBox}
        heatData={displayHeat}
        selectionBox={box}
        picked={picked}
        coolPath={coolPath}
        waterStations={waterStations}
      />
      <TopBar title={title} onSearch={onSearch} units={units} onToggleUnits={onToggleUnits} />
      <div className="pointer-events-none absolute right-3 top-16 z-20">
        <span className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${
          heatJob === "ready" ? "bg-emerald-600 text-white"
            : heatJob === "processing" ? "bg-amber-500 text-white"
              : heatJob === "failed" ? "bg-rose-600 text-white"
                : heatJob === "unavailable" ? "bg-slate-700 text-white"
                  : "bg-slate-900/80 text-white/80"
        }`}>
          {heatJob === "ready" ? "FortyGuard ready"
            : heatJob === "processing" ? "FortyGuard processing…"
              : heatJob === "failed" ? "FortyGuard failed"
                : heatJob === "unavailable" ? "FortyGuard: no key"
                  : "Overlay: mock"}
        </span>
      </div>

      {heatData && heatData.length > 0 && !heatUnavailable && (
        <div className="absolute left-3 top-16 z-20 flex max-w-[min(100%-1.5rem,20rem)] flex-col gap-2">
          <div className="flex overflow-hidden rounded-full bg-slate-900/90 text-[10px] font-bold text-white shadow-lg ring-1 ring-white/15">
            <button
              type="button"
              onClick={() => setScenarioMode("now")}
              className={`px-3 py-1.5 ${scenarioMode === "now" ? "bg-orange-500 text-white" : "text-white/70"}`}
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setScenarioMode("after")}
              className={`px-3 py-1.5 ${scenarioMode === "after" ? "bg-orange-500 text-white" : "text-white/70"}`}
            >
              After plan
            </button>
          </div>
          <div className="flex overflow-hidden rounded-full bg-slate-900/90 text-[10px] font-bold text-white shadow-lg ring-1 ring-white/15">
            {(["low", "med", "high"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => { setBudget(tier); setScenarioMode("after"); }}
                className={`px-3 py-1.5 ${budget === tier ? "bg-emerald-600 text-white" : "text-white/70"}`}
              >
                {tier === "low" ? "Low $" : tier === "med" ? "Med $" : "High $"}
              </button>
            ))}
          </div>
          {scenarioMode === "after" && scenario && (
            <div className="rounded-xl bg-[var(--hitr-surface)] px-3 py-2 text-[11px] text-slate-700 shadow-md ring-1 ring-slate-200 dark:text-slate-200 dark:ring-slate-600">
              {scenario.placements.length === 0 ? (
                <p>No cells hot enough for auto-placement (≥95°F). After matches Now.</p>
              ) : (
                <p>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    −{scenario.summary.maxDropC.toFixed(1)}°C
                  </span>
                  {" "}peak · {scenario.summary.affectedCells} cells · {scenario.placements.length} actions
                  ({budget} budget · {scenario.placements.map((p) => p.kind).filter((k, i, a) => a.indexOf(k) === i).join(" + ") || "none"}, capped).
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {([
              ["heat", "Heat"],
              ["water", "Water"],
              ["path", "Path"],
              ["canopy", "Gaps"],
              ["roofs", "Roofs"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${
                  layers[key] ? "bg-orange-500 text-white" : "bg-slate-900/80 text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {layers.canopy && (
            <div className="rounded-xl bg-[var(--hitr-surface)] px-3 py-2 text-[11px] text-slate-700 shadow-md ring-1 ring-slate-200 dark:text-slate-200 dark:ring-slate-600">
              <p>Canopy gaps: {canopyGaps.length} suggested tree clusters (no canopy within 60 m).</p>
              {canopyGaps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScenarioMode("after")}
                  className="mt-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white"
                >
                  Plant suggested clusters
                </button>
              )}
            </div>
          )}
          {layers.roofs && (
            <div className="rounded-xl bg-[var(--hitr-surface)] px-3 py-2 text-[11px] text-slate-700 shadow-md ring-1 ring-slate-200 dark:text-slate-200 dark:ring-slate-600">
              {roofTargets.length === 0
                ? "No cool-roof targets — need building footprints (tap a spot so the 3D twin can load)."
                : `${roofTargets.length} roof targets (must sit on a building).`}
              {roofTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScenarioMode("after")}
                  className="mt-1 block rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold text-white"
                >
                  Apply cool-roof set
                </button>
              )}
            </div>
          )}
          {scenario && scenario.priority.length > 0 && (
            <div className="rounded-xl bg-[var(--hitr-surface)] px-2.5 py-2 shadow-md ring-1 ring-slate-200 dark:ring-slate-600">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Act here first</p>
              <ul className="space-y-1">
                {scenario.priority.map((c, i) => (
                  <li key={`${c.lat}-${c.lng}`}>
                    <button
                      type="button"
                      onClick={() => onPick(c.lat, c.lng)}
                      className="flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        #{i + 1} {Math.round(c.temp_f)}°F
                      </span>
                      <span className="text-slate-500">{c.risk}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exposure.length > 0 && (
            <div className="rounded-xl bg-[var(--hitr-surface)] px-2.5 py-2 shadow-md ring-1 ring-slate-200 dark:ring-slate-600">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Priority people</p>
              <ul className="space-y-1">
                {exposure.map((e, i) => (
                  <li key={`eq-${e.cell.lat}-${e.cell.lng}`}>
                    <button
                      type="button"
                      onClick={() => onPick(e.cell.lat, e.cell.lng)}
                      className="flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        #{i + 1} {Math.round(e.cell.temp_f)}°F
                      </span>
                      <span className="text-slate-500">
                        {e.canopyGap ? "no canopy" : "has trees"}
                        {e.hospitalM != null ? ` · ${Math.round(e.hospitalM)} m hospital` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <BottomBar
        picked={picked}
        reading={reading}
        land={land}
        loading={loading}
        units={units}
        onViewSurface={onViewSurface}
        heatSource={heatSource}
        pattern={pattern}
        weather={weather}
        coolWalk={coolWalk}
      />

      {/* Two different things can be selected: the AREA you are looking at
          (set by search) and the SPOT you picked by tapping. Plans, heat
          surface and simulation all act on the SPOT, so surfacing it here
          answers "why won't my plan generate?" before it is asked. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
        {picked ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/90 py-1.5 pl-3 pr-1.5 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/15">
            <Crosshair className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            <span>
              Spot {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
            </span>
            {onClearPick && (
              <button
                onClick={onClearPick}
                className="rounded-full px-2 py-0.5 text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-full bg-slate-900/90 px-3 py-1.5 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/15">
            Tap the map to choose a spot · Hold{" "}
            <kbd className="rounded bg-white/25 px-1 py-px font-sans">Shift</kbd> + drag for an area
          </div>
        )}
      </div>

      <HeatMapFAB
        hasPicked={!!picked}
        onPlan={() => setPlanSheetOpen(true)}
        onAssistant={onAssistant || (() => {})}
        onSOS={onSOS || (() => {})}
        onDatabase={onDatabase || (() => {})}
      />

      {heatwave && heatwave.level !== "none" && (
        <div className="pointer-events-none absolute inset-x-3 bottom-36 z-20">
          <div className="rounded-xl bg-rose-700/95 px-3 py-2 text-[11px] font-medium text-white shadow-lg">
            {heatwave.level === "alert" ? "Heatwave" : "Heat watch"} — {heatwave.reason}
            {heatwave.level === "alert" ? " Prioritize water + shade (Light plan)." : ""}
          </div>
        </div>
      )}

      <PlanSheet
        open={planSheetOpen}
        onClose={() => setPlanSheetOpen(false)}
        onConfirm={handlePlanConfirm}
        hasPicked={!!picked}
        loading={planLoading}
        pickedTemp={reading?.temp_f ?? null}
        heatwave={heatwave}
      />
    </div>
  );
}