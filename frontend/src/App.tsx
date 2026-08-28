import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import CentralAssistantScreen from "./screens/CentralAssistantScreen";
import ArchitecturalDesignsScreen from "./screens/ArchitecturalDesignsScreen";
import PlannerScreen from "./screens/PlannerScreen";
import ToolsScreen from "./screens/ToolsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import EmergencyScreen from "./screens/EmergencyScreen";
import DatabaseScreen from "./screens/DatabaseScreen";
import HeatSurfaceScreen from "./screens/HeatSurfaceScreen";
import CitySimulationScreen from "./screens/CitySimulationScreen";
import TrainingScreen from "./screens/TrainingScreen";
import { Crosshair, X } from "lucide-react";
import DesignStudioScreen from "./screens/DesignStudioScreen";
import PlannerStartModal, { type PlannerScope } from "./components/PlannerStartModal";
import AlertBanner from "./components/AlertBanner";
import {
  analyzeSpot,
  getPlan,
  type ChangeLevel,
  type HeatReading,
  type HeatCell,
  type LandInfo,
  type Plan,
} from "./api";
import { loadHeatGrid } from "./components/MapView";
import { loadRealHeatGrid } from "./lib/realHeat";
import type { View } from "./nav";

export type Units = "imperial" | "metric";

interface Center {
  lat: number;
  lng: number;
}

// Default view — California focus (Point 3).
const DEFAULT_CENTER: Center = { lat: 34.0522, lng: -118.2437 };
const DEFAULT_TITLE = "Los Angeles, CA";

async function geocode(q: string): Promise<Center | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [center, setCenter] = useState<Center>(DEFAULT_CENTER);
  const [zoom] = useState(12);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [picked, setPicked] = useState<Center | null>(null);
  const [reading, setReading] = useState<HeatReading | null>(null);
  const [land, setLand] = useState<LandInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [heatData, setHeatData] = useState<HeatCell[] | null>(null);
  // Which provider produced `heatData`. Drives the map's source badge.
  const [heatSource, setHeatSource] = useState<"mock" | "fortyguard">("mock");
  const [units, setUnits] = useState<Units>("imperial");
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => localStorage.getItem("hitr.google-search") === "true");
  const [changeLevel, setChangeLevel] = useState<ChangeLevel>(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Planner launch flow: popup → (optional) map pick → Design Studio.
  const [plannerModal, setPlannerModal] = useState(false);
  const [plannerPicking, setPlannerPicking] = useState(false);
  const [studioSpot, setStudioSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [studioScope, setStudioScope] = useState<PlannerScope>("spot");

  // Race-condition guards.
  const clickCounterRef = useRef(0);
  const planCounterRef = useRef(0);

  // Bug #8 fix: Home screen should show a real temperature for the default city.
  // Fetch on mount + whenever the city (center) changes via search.
  useEffect(() => {
    let cancelled = false;
    analyzeSpot(center.lat, center.lng)
      .then((r) => {
        if (!cancelled) setReading(r.heat);
      })
      .catch(() => {
        // Silent — Home falls back to "—" if backend is down.
      });
    return () => { cancelled = true; };
  }, [center.lat, center.lng]);

  // Heat grid, two phases.
  //
  // 1. The mock paints instantly so the map is never empty. It costs nothing.
  // 2. Real FortyGuard tiles replace it if (and only if) a key is configured.
  //    That task takes seconds to minutes, so showing it late is strictly
  //    better than blocking the whole screen on it.
  //
  // Phase 1 runs one provider call per cell (576 for 24x24); phase 2 is a
  // single task for the entire area.
  useEffect(() => {
    let cancelled = false;
    let realArrived = false;
    setHeatSource("mock");

    loadHeatGrid(center.lat, center.lng).then((pts) => {
      if (!cancelled && !realArrived) setHeatData(pts);
    }).catch(() => {
      // Swallowed on purpose: the real path below may still succeed, and an
      // empty overlay is a worse outcome than a stale one.
    });

    loadRealHeatGrid(center.lat, center.lng).then((pts) => {
      if (cancelled || pts.length === 0) return;
      realArrived = true;
      setHeatData(pts);
      setHeatSource("fortyguard");
    }).catch(() => {
      // No key configured, or the task failed. The mock simply stays on screen.
    });

    return () => { cancelled = true; };
  }, [center]);

  const handlePick = useCallback(async (lat: number, lng: number) => {
    // Planner setup: capture the tap and return to the launch popup.
    if (plannerPicking) {
      setPlannerPicking(false);
      setPlannerModal(true);
    }
    const id = ++clickCounterRef.current;
    setPicked({ lat, lng });
    setLoading(true);
    setStatus(null);
    try {
      const r = await analyzeSpot(lat, lng);
      if (id === clickCounterRef.current) {
        setReading(r.heat);
        setLand(r.land);
      }
    } catch (err: any) {
      if (id === clickCounterRef.current) {
        setStatus(`Couldn't read this spot: ${err?.message ?? "network error"}`);
      }
    } finally {
      if (id === clickCounterRef.current) {
        setLoading(false);
      }
    }
  }, [plannerPicking]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setStatus(null);
    try {
      const c = await geocode(q.trim());
      if (c) {
        setCenter(c);
        setTitle(q.trim());
        setPicked(null);
        setReading(null);
        setLand(null);
        setPlan(null);
      } else {
        setStatus(`Couldn't find "${q}". Try a US city name.`);
      }
    } catch (err: any) {
      setStatus(`Search failed: ${err?.message ?? "network error"}`);
    }
  }, []);

  const handleGeneratePlan = useCallback(async (overrideLevel?: ChangeLevel) => {
    if (!picked) return;
    const level = overrideLevel ?? changeLevel;
    if (overrideLevel !== undefined) setChangeLevel(level);
    const id = ++planCounterRef.current;
    setPlanLoading(true);
    setStatus(null);
    try {
      const p = await getPlan(picked.lat, picked.lng, level);
      if (id === planCounterRef.current) {
        setPlan(p);
      }
    } catch (err: any) {
      if (id === planCounterRef.current) {
        setStatus(`Couldn't generate plan: ${err?.message ?? "network error"}`);
      }
    } finally {
      if (id === planCounterRef.current) {
        setPlanLoading(false);
      }
    }
  }, [picked, changeLevel]);

  const toggleUnits = useCallback(
    () => setUnits((u) => (u === "imperial" ? "metric" : "imperial")),
    []
  );

  // The heat alert banner (AlertBanner) is absolute-positioned over the top of
  // every screen. When it is showing (≥90 °F) it used to cover each screen's
  // own top bar — the Map search bar, the Design Studio back button + title.
  // Push the whole content area down by the banner's height (40px) so screens
  // start below it instead of underneath it.
  const heatAlertActive = (reading?.temp_f ?? 0) >= 90;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AlertBanner temperature={reading?.temp_f ?? null} location={title} />
      {status && (
        <div className="absolute top-10 left-0 right-0 z-40 bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 text-center">
          {status}
          <button
            onClick={() => setStatus(null)}
            className="ml-2 font-bold text-amber-700 hover:text-amber-900"
            aria-label="Dismiss"
          ><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      )}

      <main className={`absolute inset-x-0 bottom-12 ${heatAlertActive ? "top-10" : "top-0"}`}>
        {view === "home" && (
          <HomeScreen
            onNavigate={setView}
            location={title}
            temp={reading
              ? (units === "imperial"
                  ? `${reading.temp_f}°F`
                  : `${reading.temp_c}°C`)
              : "—"}
          />
        )}

        {view === "map" && (
          <MapScreen
            center={center}
            zoom={zoom}
            title={title}
            onSearch={handleSearch}
            onPick={handlePick}
            onClearPick={() => setPicked(null)}
            picked={picked}
            reading={reading}
            land={land}
            loading={loading}
            units={units}
            onToggleUnits={toggleUnits}
            heatData={heatData}
            heatSource={heatSource}
            onViewSurface={() => setView("heat_surface")}
            onAssistant={() => setView("assistant")}
            onSOS={() => setView("emergency")}
            onDatabase={() => setView("database")}
            onGeneratePlan={handleGeneratePlan}
            planLoading={planLoading}
          />
        )}

        {view === "database" && (
          <DatabaseScreen
            onOpenArchitecturalDesigns={() => setView("architectural_designs")}
            onOpenPlanner={() => setPlannerModal(true)}
            onOpenTools={() => setView("tools")}
          />
        )}

        {view === "assistant" && (
          <CentralAssistantScreen
            picked={picked}
            reading={reading}
            land={land}
            plan={plan}
            onOpenPlanner={() => setPlannerModal(true)}
            webSearchEnabled={webSearchEnabled}
          />
        )}
        {view === "architectural_designs" && <ArchitecturalDesignsScreen />}

        {view === "design_studio" && studioSpot && (
          <DesignStudioScreen
            lat={studioSpot.lat}
            lng={studioSpot.lng}
            scope={studioScope}
            locationName={title}
            onBack={() => setView("database")}
          />
        )}

        {view === "planner" && (
          <PlannerScreen
            changeLevel={changeLevel}
            onSetChangeLevel={setChangeLevel}
            plan={plan}
            loading={planLoading}
            onGenerate={() => handleGeneratePlan()}
            hasPicked={!!picked}
            onGoMap={() => setView("map")}
          />
        )}

        {view === "heat_surface" && picked && (
          <HeatSurfaceScreen
            lat={picked.lat}
            lng={picked.lng}
            locationName={title}
            onBack={() => setView("map")}
          />
        )}

        {view === "city_simulation" && picked && (
          <CitySimulationScreen
            lat={picked.lat}
            lng={picked.lng}
            locationName={title}
            onBack={() => setView("planner")}
          />
        )}

        {view === "training" && (
          <TrainingScreen onBack={() => setView("settings")} />
        )}

        {view === "tools" && <ToolsScreen />}
        {view === "emergency" && <EmergencyScreen onBack={() => setView("map")} />}

        {view === "settings" && (
          <SettingsScreen
            location={title}
            onSearch={handleSearch}
            units={units}
            onToggleUnits={toggleUnits}
            webSearchEnabled={webSearchEnabled}
            onWebSearchEnabledChange={setWebSearchEnabled}
          />
        )}
      </main>

      {/* Planner launch popup (Database → City Planner) */}
      <PlannerStartModal
        open={plannerModal}
        spot={picked}
        locationName={title}
        onClose={() => setPlannerModal(false)}
        onChooseOnMap={() => {
          setPlannerModal(false);
          setPlannerPicking(true);
          setView("map");
        }}
        onLaunch={(spot, scope) => {
          setStudioSpot(spot);
          setStudioScope(scope);
          setPlannerModal(false);
          setView("design_studio");
        }}
        onOpenClassic={() => {
          setPlannerModal(false);
          setView("planner");
        }}
      />

      {/* Floating pill: planner location-pick mode on the map */}
      {plannerPicking && view === "map" && (
        <div className="absolute inset-x-4 bottom-16 z-40 flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 px-4 py-3 shadow-2xl ring-1 ring-white/15">
          <p className="flex items-center text-xs font-medium text-white">
            <Crosshair className="mr-1.5 h-4 w-4 shrink-0" aria-hidden="true" /> Tap the map to place your project…
          </p>
          <button
            onClick={() => {
              setPlannerPicking(false);
              setPlannerModal(true);
            }}
            className="shrink-0 rounded-full bg-heat-600 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Back to setup
          </button>
        </div>
      )}

      <BottomNav active={view} onNavigate={setView} />
    </div>
  );
}