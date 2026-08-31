import { useEffect, useMemo, useState } from "react";
import { Crosshair, Trees, Droplets, Home as HomeIcon } from "lucide-react";
import MapView, { type BoxBounds } from "../components/MapView";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import HeatMapFAB from "../components/HeatMapFAB";
import PlanSheet from "../components/PlanSheet";
import type { Units } from "../App";
import type { HeatReading, HeatCell, LandInfo, ChangeLevel, PatternAnalysis, WeatherNow } from "../api";
import { getCitySimulation3D } from "../api";
import type { HeatwaveStatus, Placement, PlacementContext, PlacementKind } from "../planner/uhiFactors";
import { cellDropC, PLACEMENT_META } from "../planner/uhiFactors";
import { buildMapScenario, mergeManualDrops, nearestCoolerTile, scenarioAtBudget, type BudgetTier } from "../lib/mapScenario";
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

// Helper: filter out absurd temps like 4586°F from broken FortyGuard parsing
function isValidTemp(tempF: number): boolean {
  return typeof tempF === "number" && !isNaN(tempF) && tempF >= 50 && tempF <= 130;
}

function safeTempDisplay(tempF: number): string {
  if (!isValidTemp(tempF)) return "—";
  return `${Math.round(tempF)}°F`;
}

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
  const [dropTool, setDropTool] = useState<PlacementKind | null>(null);
  const [drops, setDrops] = useState<Placement[]>([]);
  const [lastDropFeedback, setLastDropFeedback] = useState<string | null>(null);

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

  // Filter heatData to valid temps only for scenario calculations
  const validHeatData = useMemo(() => {
    if (!heatData) return null;
    const filtered = heatData.filter((c) => isValidTemp(c.temp_f));
    // If filtering removes too many, fall back to original but clamped
    return filtered.length >= 3 ? filtered : heatData;
  }, [heatData]);

  const fullScenario = useMemo(
    () => (validHeatData && validHeatData.length ? buildMapScenario(validHeatData, placeCtx) : null),
    [validHeatData, placeCtx],
  );
  const scenario = useMemo(
    () => (validHeatData && fullScenario ? scenarioAtBudget(validHeatData, fullScenario, budget) : null),
    [validHeatData, fullScenario, budget],
  );
  const exposure = useMemo(
    () => (validHeatData && validHeatData.length ? rankExposureCells(validHeatData, placeCtx, 3) : []),
    [validHeatData, placeCtx],
  );
  const merged = useMemo(() => {
    if (!validHeatData?.length) return null;
    const auto = scenario?.placements ?? [];
    if (!auto.length && !drops.length) return null;
    return mergeManualDrops(validHeatData, auto, drops);
  }, [validHeatData, scenario, drops]);

  const displayHeat = scenarioMode === "after" && merged?.placements.length
    ? merged.summary.cells
    : heatData;

  const lastDropPreview = drops.length
    ? cellDropC(drops[drops.length - 1], merged?.placements ?? drops)
    : null;

  // FIXED: Drop functionality now produces immediate visible change
  const handleMapTap = (lat: number, lng: number) => {
    if (dropTool) {
      const newDrop: Placement = {
        id: `drop-${Date.now()}-${drops.length}`,
        kind: dropTool,
        lat,
        lng,
        reason: `Manual ${PLACEMENT_META[dropTool].label} placed by user`,
      };
      setDrops((prev) => [...prev, newDrop]);
      setScenarioMode("after");
      
      // Auto-enable relevant layer so user immediately sees the drop
      if (dropTool === "tree_cluster") {
        setLayers((l) => ({ ...l, canopy: true, heat: true }));
      } else if (dropTool === "water_station") {
        setLayers((l) => ({ ...l, water: true, heat: true }));
      } else if (dropTool === "cool_roof") {
        setLayers((l) => ({ ...l, roofs: true, heat: true }));
      }

      // Immediate feedback
      const meta = PLACEMENT_META[dropTool];
      setLastDropFeedback(`${meta.label} placed! Tap more or switch to After plan to see cooling.`);
      setTimeout(() => setLastDropFeedback(null), 4000);
      
      return;
    }
    onPick(lat, lng);
  };

  const coolWalk = picked && validHeatData?.length
    ? nearestCoolerTile(picked, validHeatData)
    : null;
  const coolPath = picked && coolWalk
    ? { from: picked, to: { lat: coolWalk.cell.lat, lng: coolWalk.cell.lng } }
    : null;
  const livePlacements = merged?.placements ?? scenario?.placements ?? [];
  const waterStations = livePlacements
    .filter((p) => p.kind === "water_station")
    .map((p) => ({ lat: p.lat, lng: p.lng, label: p.reason, kind: "water" as const }));
  const canopyGaps = livePlacements
    .filter((p) => p.kind === "tree_cluster")
    .map((p) => ({ lat: p.lat, lng: p.lng, label: p.reason, kind: "tree" as const }));
  const roofTargets = livePlacements
    .filter((p) => p.kind === "cool_roof")
    .map((p) => ({ lat: p.lat, lng: p.lng, label: p.reason, kind: "roof" as const }));
  
  // Manual drops are always visible with distinct styling
  const manualDrops = drops.map((d) => ({
    lat: d.lat,
    lng: d.lng,
    label: `${PLACEMENT_META[d.kind].label} (manual)`,
    kind: d.kind === "tree_cluster" ? "tree" as const : d.kind === "water_station" ? "water" as const : "roof" as const,
  }));

  const handlePlanConfirm = (level: ChangeLevel) => {
    setPlanSheetOpen(false);
    if (onGeneratePlan) onGeneratePlan(level);
  };

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
        onPick={handleMapTap}
        onBoxSelected={setBox}
        heatData={displayHeat}
        selectionBox={box}
        picked={picked}
        coolPath={coolPath}
        waterStations={waterStations}
        canopyGaps={canopyGaps}
        roofTargets={roofTargets}
        manualDrops={manualDrops}
        showHeat={layers.heat}
        showWater={layers.water}
        showCoolPath={layers.path}
        showCanopy={layers.canopy}
        showRoofs={layers.roofs}
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
          {/* FIXED DROP CONTROLS - Now produce immediate visible feedback */}
          <div className="flex flex-wrap gap-1.5">
            {([
              ["tree_cluster", "Drop tree", Trees],
              ["water_station", "Drop water", Droplets],
              ["cool_roof", "Drop roof", HomeIcon],
            ] as const).map(([kind, label, Icon]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setDropTool((t) => (t === kind ? null : kind))}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-md transition-all ${
                  dropTool === kind 
                    ? "bg-teal-600 text-white ring-2 ring-teal-300 scale-105" 
                    : "bg-white text-slate-700 hover:bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {dropTool === kind && <span className="ml-1 text-[9px]">● TAP MAP</span>}
              </button>
            ))}
            {drops.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDrops((d) => d.slice(0, -1));
                  setLastDropFeedback("Last drop removed");
                  setTimeout(() => setLastDropFeedback(null), 2000);
                }}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              >
                Undo
              </button>
            )}
          </div>
          {dropTool && (
            <div className="rounded-xl bg-teal-600 px-3 py-2.5 text-[11px] text-white shadow-lg ring-1 ring-teal-500 animate-pulse">
              <p className="font-bold">📍 Tap map to place {PLACEMENT_META[dropTool].label}</p>
              <p className="mt-1 text-teal-100 text-[10px]">{PLACEMENT_META[dropTool].note}</p>
              {lastDropPreview != null && drops.length > 0 && (
                <p className="mt-2 font-bold bg-teal-700 rounded-lg px-2 py-1">
                  ✓ Last: −{lastDropPreview.toFixed(2)}°C cooling · {drops.length} placed
                </p>
              )}
            </div>
          )}
          {lastDropFeedback && !dropTool && (
            <div className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white shadow-lg animate-in fade-in">
              {lastDropFeedback}
            </div>
          )}
          {drops.length > 0 && (
            <div className="rounded-xl bg-white px-3 py-2 text-[11px] shadow-md ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600 dark:text-slate-200">
              <p className="font-bold">{drops.length} manual interventions</p>
              <p className="text-[10px] text-slate-500">Switch to After plan to see total cooling effect</p>
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
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm transition-colors ${
                  layers[key] ? "bg-orange-500 text-white" : "bg-white/90 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300"
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
                  className="mt-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white"
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
                  className="mt-1 block rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold text-white"
                >
                  Apply cool-roof set
                </button>
              )}
            </div>
          )}
          {scenario && scenario.priority.length > 0 && (
            <div className="rounded-xl bg-white px-2.5 py-2 shadow-md ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Act here first</p>
              <ul className="space-y-1">
                {scenario.priority.filter((c) => isValidTemp(c.temp_f)).map((c, i) => (
                  <li key={`${c.lat}-${c.lng}`}>
                    <button
                      type="button"
                      onClick={() => onPick(c.lat, c.lng)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        #{i + 1} {safeTempDisplay(c.temp_f)}
                      </span>
                      <span className="text-slate-500 capitalize">{c.risk}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exposure.length > 0 && (
            <div className="rounded-xl bg-white px-2.5 py-2 shadow-md ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Priority people</p>
              <ul className="space-y-1">
                {exposure.filter((e) => isValidTemp(e.cell.temp_f)).map((e, i) => (
                  <li key={`eq-${e.cell.lat}-${e.cell.lng}`}>
                    <button
                      type="button"
                      onClick={() => onPick(e.cell.lat, e.cell.lng)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        #{i + 1} {safeTempDisplay(e.cell.temp_f)}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {e.canopyGap ? "no canopy" : "has trees"}
                        {e.hospitalM != null ? ` · ${Math.round(e.hospitalM)}m` : ""}
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

      {/* REMOVED: Heatwave banner that was marked R - was covering map at bottom-36 */}
      {/* Heatwave info now shown via TopBar AlertBanner only for cleaner map */}

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
