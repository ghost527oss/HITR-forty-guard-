import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import AssistantScreen from "./screens/AssistantScreen";
import PlannerScreen from "./screens/PlannerScreen";
import ToolsScreen from "./screens/ToolsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import EmergencyScreen from "./screens/EmergencyScreen";
import DatabaseScreen from "./screens/DatabaseScreen";
import HeatSurfaceScreen from "./screens/HeatSurfaceScreen";
import CitySimulationScreen from "./screens/CitySimulationScreen";
import TrainingScreen from "./screens/TrainingScreen";
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
  const [units, setUnits] = useState<Units>("imperial");
  const [changeLevel, setChangeLevel] = useState<ChangeLevel>(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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

  // Load a heat grid around the current center.
  useEffect(() => {
    let cancelled = false;
    loadHeatGrid(center.lat, center.lng)
      .then((pts) => {
        if (!cancelled) setHeatData(pts);
      })
      .catch((err) => {
        if (!cancelled) setStatus(`Couldn't load heat map: ${err.message}`);
      });
    return () => { cancelled = true; };
  }, [center]);

  const handlePick = useCallback(async (lat: number, lng: number) => {
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
  }, []);

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
          >✕</button>
        </div>
      )}

      <main className="absolute inset-0 bottom-12">
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
            picked={picked}
            reading={reading}
            land={land}
            loading={loading}
            units={units}
            onToggleUnits={toggleUnits}
            heatData={heatData}
            onViewSurface={() => setView("heat_surface")}
          />
        )}

        {view === "database" && (
          <DatabaseScreen onBack={() => setView("map")} />
        )}

        {view === "assistant" && <AssistantScreen />}

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
        {view === "emergency" && <EmergencyScreen onBack={() => setView("tools")} />}

        {view === "settings" && (
          <SettingsScreen
            location={title}
            onSearch={handleSearch}
            units={units}
            onToggleUnits={toggleUnits}
          />
        )}
      </main>

      <BottomNav active={view} onNavigate={setView} />
    </div>
  );
}