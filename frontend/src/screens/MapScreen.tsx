import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import MapView, { type BoxBounds } from "../components/MapView";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import HeatMapFAB from "../components/HeatMapFAB";
import PlanSheet from "../components/PlanSheet";
import type { Units } from "../App";
import type { HeatReading, HeatCell, LandInfo, ChangeLevel, PatternAnalysis } from "../api";
import { buildMapScenario } from "../lib/mapScenario";

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
  pattern?: PatternAnalysis | null;
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
    land, loading, units, onToggleUnits, heatData, heatSource, heatUnavailable, pattern, onViewSurface,
    onAssistant, onSOS, onDatabase, onGeneratePlan, planLoading,
  } = props;
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [box, setBox] = useState<BoxBounds | null>(null);
  const [scenarioMode, setScenarioMode] = useState<"now" | "after">("now");

  const scenario = useMemo(() => (heatData && heatData.length ? buildMapScenario(heatData) : null), [heatData]);
  const displayHeat = scenarioMode === "after" && scenario?.placements.length
    ? scenario.summary.cells
    : heatData;

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
      />
      <TopBar title={title} onSearch={onSearch} units={units} onToggleUnits={onToggleUnits} />

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
                  (trees + water, capped).
                </p>
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

      <PlanSheet
        open={planSheetOpen}
        onClose={() => setPlanSheetOpen(false)}
        onConfirm={handlePlanConfirm}
        hasPicked={!!picked}
        loading={planLoading}
        pickedTemp={reading?.temp_f ?? null}
      />
    </div>
  );
}