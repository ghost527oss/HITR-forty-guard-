import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import StartScreen from "./components/StartScreen";
import { Crosshair, X } from "lucide-react";
import PlannerStartModal, { type PlannerScope } from "./components/PlannerStartModal";
import AlertBanner from "./components/AlertBanner";
import {
  analyzeSpot,
  analyzePattern,
  getPlan,
  getWeatherNow,
  type ChangeLevel,
  type HeatReading,
  type HeatCell,
  type LandInfo,
  type PatternAnalysis,
  type Plan,
  type WeatherNow,
} from "./api";
import { heatwaveStatus } from "./planner/uhiFactors";
import { loadHeatGrid } from "./lib/heatGrid";
import { loadRealHeatGrid, RealHeatUnavailable, type HeatJobPhase } from "./lib/realHeat";
import type { View } from "./nav";

const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const MapScreen = lazy(() => import("./screens/MapScreen"));
const CentralAssistantScreen = lazy(() => import("./screens/CentralAssistantScreen"));
const ArchitecturalDesignsScreen = lazy(() => import("./screens/ArchitecturalDesignsScreen"));
const PlannerScreen = lazy(() => import("./screens/PlannerScreen"));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen"));
const EmergencyScreen = lazy(() => import("./screens/EmergencyScreen"));
const DatabaseScreen = lazy(() => import("./screens/DatabaseScreen"));
const HeatSurfaceScreen = lazy(() => import("./screens/HeatSurfaceScreen"));
const CitySimulationScreen = lazy(() => import("./screens/CitySimulationScreen"));
const TrainingScreen = lazy(() => import("./screens/TrainingScreen"));
const DesignStudioScreen = lazy(() => import("./screens/DesignStudioScreen"));

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
  const [showStartScreen, setShowStartScreen] = useState(() => {
    return !sessionStorage.getItem("hitr.start-screen-dismissed");
  });
  const [view, setView] = useState<View>("home");
  const [center, setCenter] = useState<Center>(DEFAULT_CENTER);
  const [zoom] = useState(12);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [picked, setPicked] = useState<Center | null>(null);
  const [reading, setReading] = useState<HeatReading | null>(null);
  const [land, setLand] = useState<LandInfo | null>(null);
  const [pattern, setPattern] = useState<PatternAnalysis | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [loading, setLoading] = useState(false);
  const [heatData, setHeatData] = useState<HeatCell[] | null>(null);
  const [heatSource, setHeatSource] = useState<"mock" | "fortyguard">("mock");
  const [heatUnavailable, setHeatUnavailable] = useState<string | null>(null);
  const [heatJob, setHeatJob] = useState<HeatJobPhase | "mock">("mock");
  const [units, setUnits] = useState<Units>("imperial");
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => localStorage.getItem("hitr.google-search") === "true");
  const [allowMockHeat, setAllowMockHeat] = useState(() => localStorage.getItem("hitr.allow-mock-heat") !== "false");
  const [changeLevel, setChangeLevel] = useState<ChangeLevel>(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [lightCompare, setLightCompare] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [plannerModal, setPlannerModal] = useState(false);
  const [plannerPicking, setPlannerPicking] = useState(false);
  const [studioSpot, setStudioSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [studioScope, setStudioScope] = useState<PlannerScope>("spot");

  const clickCounterRef = useRef(0);
  const planCounterRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    analyzeSpot(center.lat, center.lng)
      .then((r) => {
        if (!cancelled) setReading(r.heat);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [center.lat, center.lng]);

  useEffect(() => {
    let cancelled = false;
    getWeatherNow(center.lat, center.lng)
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng]);

  const heatwave = weather
    ? heatwaveStatus(weather.days.map((d) => ({ tMaxC: d.t_max_c, tMinC: d.t_min_c })))
    : null;

  // FIXED: Never show absurd temps like 4000°F - filter aggressively
  const isValidTempF = (t: number) => typeof t === "number" && !isNaN(t) && t >= 50 && t <= 130;
  const filterValidCells = (pts: HeatCell[]) => {
    const valid = pts.filter((c) => isValidTempF(c.temp_f));
    if (valid.length > 0 && valid.length >= pts.length * 0.2) return valid;
    if (valid.length >= 3) return valid;
    return [];
  };

  useEffect(() => {
    let cancelled = false;
    let realArrived = false;
    setHeatUnavailable(null);
    setHeatJob(allowMockHeat ? "mock" : "processing");

    if (allowMockHeat) {
      setHeatSource("mock");
      loadHeatGrid(center.lat, center.lng)
        .then((pts) => {
          if (!cancelled && !realArrived && pts && pts.length > 0) {
            const filtered = filterValidCells(pts);
            if (filtered.length > 0) setHeatData(filtered);
          }
        })
        .catch(() => {});
    } else {
      setHeatData(null);
    }

    loadRealHeatGrid(center.lat, center.lng, 0.04, {
      onStatus: (phase) => {
        if (!cancelled) setHeatJob(phase);
      },
    })
      .then((pts) => {
        if (cancelled) return;
        const filtered = filterValidCells(pts);
        if (filtered.length > 0) {
          realArrived = true;
          setHeatUnavailable(null);
          setHeatData(filtered);
          setHeatSource("fortyguard");
          return;
        }
        console.warn("Real heat data invalid (e.g., 4000°F), falling back to mock", pts.slice(0, 2));
        if (allowMockHeat) {
          loadHeatGrid(center.lat, center.lng).then((mockPts) => {
            if (!cancelled && mockPts && mockPts.length > 0) {
              const mf = filterValidCells(mockPts);
              if (mf.length > 0) {
                setHeatData(mf);
                setHeatSource("mock");
              }
            }
          });
        } else {
          setHeatData(null);
          setHeatUnavailable("Real heat data invalid. Mock fallback off in Settings.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof RealHeatUnavailable) setHeatJob("unavailable");
        else setHeatJob("failed");
        if (allowMockHeat) {
          loadHeatGrid(center.lat, center.lng).then((mockPts) => {
            if (!cancelled && mockPts && mockPts.length > 0) {
              const mf = filterValidCells(mockPts);
              if (mf.length > 0) {
                setHeatData(mf);
                setHeatSource("mock");
              }
            }
          });
        } else {
          setHeatData(null);
          setHeatUnavailable(
            err instanceof RealHeatUnavailable
              ? "Real FortyGuard heat unavailable (no key). Turn on mock fallback in Settings."
              : (err?.message ?? "FortyGuard job failed."),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [center, allowMockHeat]);

  const handlePick = useCallback(async (lat: number, lng: number) => {
    if (plannerPicking) {
      setPlannerPicking(false);
      setPlannerModal(true);
    }
    const id = ++clickCounterRef.current;
    setPicked({ lat, lng });
    setLoading(true);
    setStatus(null);
    setPattern(null);
    try {
      const [r, p] = await Promise.all([
        analyzeSpot(lat, lng),
        analyzePattern(lat, lng).catch(() => null),
      ]);
      if (id === clickCounterRef.current) {
        setReading(r.heat);
        setLand(r.land);
        setPattern(p);
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
        setPattern(null);
        setPlan(null);
        setLightCompare(null);
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
      let light: Plan | null = null;
      if (level === 4) {
        light = await getPlan(picked.lat, picked.lng, 1).catch(() => null);
      }
      if (id === planCounterRef.current) {
        setPlan(p);
        setLightCompare(light);
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

  const handleFixHotspot = useCallback(async (lat: number, lng: number) => {
    setPicked({ lat, lng });
    setChangeLevel(1);
    const id = ++planCounterRef.current;
    setPlanLoading(true);
    setStatus(null);
    try {
      const p = await getPlan(lat, lng, 1);
      if (id === planCounterRef.current) {
        setPlan(p);
        setLightCompare(null);
        setView("planner");
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
  }, []);

  const toggleUnits = useCallback(
    () => setUnits((u) => (u === "imperial" ? "metric" : "imperial")),
    []
  );

  const heatAlertActive = (reading?.temp_f ?? 0) >= 90;

  const handleStartPlatform = useCallback(() => {
    sessionStorage.setItem("hitr.start-screen-dismissed", "true");
    setShowStartScreen(false);
  }, []);

  if (showStartScreen) {
    return <StartScreen onStart={handleStartPlatform} />;
  }

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
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-[var(--hitr-bg)] text-sm text-slate-500">
              Loading workspace…
            </div>
          }
        >
        {view === "home" && (
          <HomeScreen
            onNavigate={setView}
            location={title}
            heatwave={heatwave}
            weather={weather}
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
            onClearPick={() => { setPicked(null); setPattern(null); }}
            picked={picked}
            reading={reading}
            land={land}
            loading={loading}
            units={units}
            onToggleUnits={toggleUnits}
            heatData={heatData}
            heatSource={heatSource}
            heatUnavailable={heatUnavailable}
            heatJob={heatJob}
            pattern={pattern}
            weather={weather}
            heatwave={heatwave}
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
            lightCompare={lightCompare}
            locationName={title}
            picked={picked}
            reading={reading}
            land={land}
            pattern={pattern}
          />
        )}

        {view === "heat_surface" && picked && (
          <HeatSurfaceScreen
            lat={picked.lat}
            lng={picked.lng}
            locationName={title}
            onBack={() => setView("map")}
            onFixHotspot={handleFixHotspot}
            fixBusy={planLoading}
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

        {view === "emergency" && <EmergencyScreen onBack={() => setView("map")} />}

        {view === "settings" && (
          <SettingsScreen
            location={title}
            onSearch={handleSearch}
            units={units}
            onToggleUnits={toggleUnits}
            webSearchEnabled={webSearchEnabled}
            onWebSearchEnabledChange={setWebSearchEnabled}
            allowMockHeat={allowMockHeat}
            onAllowMockHeatChange={setAllowMockHeat}
          />
        )}
        </Suspense>
      </main>

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
