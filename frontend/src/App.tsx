import { useCallback, useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import AssistantScreen from "./screens/AssistantScreen";
import PlannerScreen from "./screens/PlannerScreen";
import ToolsScreen from "./screens/ToolsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import {
  analyzeSpot,
  getPlan,
  type ChangeLevel,
  type HeatReading,
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

// Default view — Los Angeles, CA (matches the FortyGuard demo heat map in California).
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
  const [heatData, setHeatData] = useState<HeatReading[] | null>(null);
  const [units, setUnits] = useState<Units>("imperial");
  const [changeLevel, setChangeLevel] = useState<ChangeLevel>(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Load a heat grid around the current center (live heat-map overlay).
  useEffect(() => {
    let cancelled = false;
    loadHeatGrid(center.lat, center.lng).then((pts) => {
      if (!cancelled) setHeatData(pts);
    });
    return () => {
      cancelled = true;
    };
  }, [center]);

  const handlePick = useCallback(async (lat: number, lng: number) => {
    setPicked({ lat, lng });
    setLoading(true);
    try {
      const r = await analyzeSpot(lat, lng);
      setReading(r.heat);
      setLand(r.land);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    const c = await geocode(q.trim());
    if (c) {
      setCenter(c);
      setTitle(q.trim());
      setPicked(null);
      setReading(null);
      setLand(null);
      setPlan(null);
    }
  }, []);

  const handleGeneratePlan = useCallback(async () => {
    if (!picked) return;
    setPlanLoading(true);
    try {
      const p = await getPlan(picked.lat, picked.lng, changeLevel);
      setPlan(p);
    } finally {
      setPlanLoading(false);
    }
  }, [picked, changeLevel]);

  const toggleUnits = useCallback(() => setUnits((u) => (u === "imperial" ? "metric" : "imperial")), []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <main className="absolute inset-0 bottom-12">
        {view === "home" && (
          <HomeScreen
            onNavigate={setView}
            location={title}
            temp={reading ? `${reading.temp_f}°F` : "—"}
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
          />
        )}
        {view === "assistant" && <AssistantScreen />}
        {view === "planner" && (
          <PlannerScreen
            changeLevel={changeLevel}
            onSetChangeLevel={setChangeLevel}
            plan={plan}
            loading={planLoading}
            onGenerate={handleGeneratePlan}
            hasPicked={!!picked}
            onGoMap={() => setView("map")}
          />
        )}
        {view === "tools" && <ToolsScreen />}
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
