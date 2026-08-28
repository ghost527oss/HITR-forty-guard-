import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dropletSvg, treesSvg } from "../lib/mapIcons";
import { loadRealHeatGrid } from "../lib/realHeat";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Building2,
  ChevronLeft,
  Droplets,
  Flame,
  Layers,
  Leaf,
  RotateCcw,
  Sparkles,
  ThermometerSun,
  Trash2,
  TreePine,
  Wind,
} from "lucide-react";
import {
  getCitySimulation3D,
  getHeatGrid,
  getWeatherNow,
  type CitySimulation3D,
  type HeatCell,
  type WeatherNow,
} from "../api";
import {
  heatwaveStatus,
  metersBetween,
  pmvFanger,
  pmvLabel,
  ppdFromPmv,
  PLACEMENT_META,
  simulateDesign,
  suggestWaterStations,
  tempColorF,
  windUnitVector,
  type Placement,
  type PlacementKind,
} from "../planner/uhiFactors";
import type { PlannerScope } from "../components/PlannerStartModal";
import { SCOPES } from "../components/PlannerStartModal";

interface DesignStudioScreenProps {
  lat: number;
  lng: number;
  scope: PlannerScope;
  locationName: string;
  onBack: () => void;
}

// Premium dark basemap (free, no key).
const STUDIO_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "studio-base": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Esri, HERE, Garmin, FAO, NOAA, USGS",
    },
    "studio-labels": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 16,
      attribution: "",
    },
  },
  layers: [
    { id: "studio-base", type: "raster", source: "studio-base" },
    { id: "studio-labels", type: "raster", source: "studio-labels" },
  ],
};
const GRID_SPAN = 0.014;
const GRID_STEPS = 20;

const TOOL_ORDER: PlacementKind[] = ["tree_cluster", "water_station", "cool_roof", "garden"];

const NEARBY_M = 45; // tap-tolerance for station/suggestion popups

interface LayerState {
  heat: boolean;
  wind: boolean;
  buildings: boolean;
  green: boolean;
  suggest: boolean;
  after: boolean;
}

function toDegPoly(lat: number, lng: number, radiusM: number): number[][] {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

export default function DesignStudioScreen(props: DesignStudioScreenProps) {
  const { lat, lng, scope, locationName, onBack } = props;
  const scopeMeta = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const idRef = useRef(0);
  const windRafRef = useRef<number | null>(null);
  const weatherRef = useRef<WeatherNow | null>(null);

  const [cells, setCells] = useState<HeatCell[] | null>(null);
  const [provider, setProvider] = useState("…");
  const [sim, setSim] = useState<CitySimulation3D | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [tool, setTool] = useState<PlacementKind | null>(scope === "farm" ? "garden" : null);
  const [layers, setLayers] = useState<LayerState>({
    heat: true,
    wind: false,
    buildings: true,
    green: true,
    suggest: true,
    after: false,
  });

  weatherRef.current = weather;

  const design = useMemo(
    () => (cells ? simulateDesign(cells, placements) : null),
    [cells, placements],
  );

  const autoStations = useMemo(
    () =>
      cells
        ? suggestWaterStations(cells, placements.filter((p) => p.kind === "water_station"))
        : [],
    [cells, placements],
  );

  // ── Data load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let realArrived = false;
    setCells(null);
    setSim(null);
    setWeather(null);

    // Phase 1 — the mock paints instantly. It is one provider call per cell
    // (400 here), which is only acceptable because it is synthetic and free.
    getHeatGrid(lat, lng, GRID_SPAN, GRID_STEPS)
      .then((r) => {
        if (cancelled || realArrived) return;
        setProvider(r.provider);
        setCells(r.cells ?? r.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setProvider("offline");
      });

    // Phase 2 — ONE real FortyGuard task for the whole area, swapped in when it
    // lands. The task takes seconds to minutes, so arriving late is fine; the
    // studio is usable on the mock in the meantime.
    loadRealHeatGrid(lat, lng, GRID_SPAN)
      .then((pts) => {
        if (cancelled || pts.length === 0) return;
        realArrived = true;
        setProvider("fortyguard");
        setCells(pts);
      })
      .catch(() => {
        // No key configured, or the task failed — the mock stays on screen.
      });
    getCitySimulation3D(lat, lng, 200)
      .then((s) => {
        if (!cancelled) setSim(s);
      })
      .catch(() => {
        if (!cancelled) setSim(null);
      });
    getWeatherNow(lat, lng)
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  // ── Map interactions (fresh closure via ref, attached once) ────────────────
  const clickRef = useRef<(lat: number, lng: number) => void>(() => {});

  const handleMapClick = useCallback(
    (clickLat: number, clickLng: number) => {
      const map = mapRef.current;
      if (!map) return;
      if (tool) {
        setPlacements((prev) => [
          ...prev,
          { id: `pl-${++idRef.current}`, kind: tool, lat: clickLat, lng: clickLng },
        ]);
        return;
      }
      const point = { lat: clickLat, lng: clickLng };

      // 1 — nearest auto water-station suggestion
      const station = autoStations.find((s) => metersBetween(point, s) < NEARBY_M);
      if (station) {
        new maplibregl.Popup({ closeButton: false })
          .setLngLat([clickLng, clickLat])
          .setHTML(
            `<div style="font:12px system-ui;color:#0f172a;max-width:230px"><b>${dropletSvg()}Water station spot</b><br/>` +
              `${Math.round(station.tempF)}°F zone<br/><span style="color:#475569">${station.reason}</span></div>`,
          )
          .addTo(map);
        return;
      }

      // 2 — nearest backend intervention suggestion
      const sugg = sim?.interventions.find((iv) => metersBetween(point, iv) < NEARBY_M);
      if (sugg) {
        new maplibregl.Popup({ closeButton: false })
          .setLngLat([clickLng, clickLat])
          .setHTML(
            `<div style="font:12px system-ui;color:#0f172a;max-width:230px"><b>` +
              `${sugg.type === "water_point" ? dropletSvg() + "Suggested water station" : treesSvg() + "Suggested tree point"}</b><br/>` +
              `targets ${Math.round(sugg.target_temp_f)}°F · −${sugg.projected_reduction.toFixed(1)}°F projected<br/>` +
              `<span style="color:#475569">${sugg.reason}</span></div>`,
          )
          .addTo(map);
        return;
      }

      // 3 — heat cell reading
      if (!cells) return;
      let best: HeatCell | null = null;
      let bestI = -1;
      let bestD = Infinity;
      cells.forEach((c, i) => {
        const d = (c.lat - clickLat) ** 2 + (c.lng - clickLng) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
          bestI = i;
        }
      });
      if (best) {
        const afterF = design ? design.cells[bestI]?.temp_f : undefined;
        const b = best as HeatCell;
        new maplibregl.Popup({ closeButton: false })
          .setLngLat([clickLng, clickLat])
          .setHTML(
            `<div style="font:12px system-ui;color:#0f172a"><b>${Math.round(b.temp_f)}°F · ${b.risk}</b>` +
              `${afterF !== undefined ? `<br/>After your design: <b>${Math.round(afterF)}°F</b>` : ""}</div>`,
          )
          .addTo(map);
      }
    },
    [tool, cells, design, sim, autoStations],
  );
  clickRef.current = handleMapClick;

  // ── Map init (once) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STUDIO_STYLE,
      center: [lng, lat],
      zoom: 15.5,
      // Esri's Canvas "World_Dark_Gray" tile service stops at z16. Without a
      // matching cap the user can zoom past it and the basemap silently goes
      // blank behind the heat layer.
      maxZoom: 16,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => clickRef.current(e.lngLat.lat, e.lngLat.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Layer rendering (rebuild on data/layer/placement change) ───────────────
  const renderLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    for (const id of [
      "heat-fill",
      "heat-line",
      "building-dots",
      "green-dots",
      "suggest-dots",
      "suggest-ring",
      "auto-dots",
      "auto-ring",
      "place-halo",
      "place-dot",
    ]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of ["heat", "sim", "green", "suggest", "auto", "place"]) {
      if (map.getSource(id)) map.removeSource(id);
    }

    // Heat tiles (live grid, or simulated "after design")
    const shown = layers.after && design ? design.cells : cells;
    if (shown && shown.length && layers.heat) {
      const halfM = ((GRID_SPAN / GRID_STEPS) * 111320) / 2;
      const features = shown.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [toDegPoly(c.lat, c.lng, halfM)] },
        properties: { color: layers.after ? tempColorF(c.temp_f) : c.color, t: c.temp_f, risk: c.risk },
      }));
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
      map.addSource("heat", { type: "geojson", data: fc });
      map.addLayer({
        id: "heat-fill",
        type: "fill",
        source: "heat",
        paint: { "fill-color": ["get", "color"], "fill-opacity": layers.after ? 0.62 : 0.55 },
      });
      map.addLayer({
        id: "heat-line",
        type: "line",
        source: "heat",
        paint: { "line-color": ["get", "color"], "line-width": 0.4, "line-opacity": 0.5 },
      });
    }

    // Structures (buildings sized by height)
    if (sim && sim.buildings.length && layers.buildings) {
      const simFc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: sim.buildings.map((b) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] },
          properties: { h: b.height_m },
        })),
      };
      map.addSource("sim", { type: "geojson", data: simFc });
      map.addLayer({
        id: "building-dots",
        type: "circle",
        source: "sim",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "h"], 5, 1.6, 20, 4.5, 40, 7],
          "circle-color": "#94a3b8",
          "circle-opacity": 0.55,
        },
      });
    }

    // Existing green
    if (sim && sim.vegetation.length && layers.green) {
      const greenFc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: sim.vegetation.map((v) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
          properties: {},
        })),
      };
      map.addSource("green", { type: "geojson", data: greenFc });
      map.addLayer({
        id: "green-dots",
        type: "circle",
        source: "green",
        paint: { "circle-radius": 2.2, "circle-color": "#34d399", "circle-opacity": 0.8 },
      });
    }

    // Backend-suggested trees & water points
    if (sim && sim.interventions.length && layers.suggest) {
      const sugFc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: sim.interventions.map((iv) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [iv.lng, iv.lat] },
          properties: { kind: iv.type },
        })),
      };
      map.addSource("suggest", { type: "geojson", data: sugFc });
      map.addLayer({
        id: "suggest-ring",
        type: "circle",
        source: "suggest",
        paint: {
          "circle-radius": 9,
          "circle-color": "#00000000",
          "circle-stroke-color": ["match", ["get", "kind"], "water_point", "#22d3ee", "#4ade80"],
          "circle-stroke-width": 1.6,
          "circle-stroke-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "suggest-dots",
        type: "circle",
        source: "suggest",
        paint: {
          "circle-radius": 4,
          "circle-color": ["match", ["get", "kind"], "water_point", "#22d3ee", "#4ade80"],
        },
      });
    }

    // Client-side auto water-station placement (research rule)
    if (autoStations.length && layers.suggest) {
      const autoFc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: autoStations.map((s) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
          properties: {},
        })),
      };
      map.addSource("auto", { type: "geojson", data: autoFc });
      map.addLayer({
        id: "auto-ring",
        type: "circle",
        source: "auto",
        paint: {
          "circle-radius": 11,
          "circle-color": "#00000000",
          "circle-stroke-color": "#38bdf8",
          "circle-stroke-width": 1.4,
          "circle-stroke-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "auto-dots",
        type: "circle",
        source: "auto",
        paint: { "circle-radius": 5, "circle-color": "#0ea5e9" },
      });
    }

    // User's design placements
    if (placements.length) {
      const halos: GeoJSON.Feature[] = [];
      const dots: GeoJSON.Feature[] = [];
      for (const p of placements) {
        const spec = PLACEMENT_META[p.kind];
        halos.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [toDegPoly(p.lat, p.lng, spec.radiusM)] },
          properties: {},
        });
        dots.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { kind: p.kind },
        });
      }
      map.addSource("place", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [...halos, ...dots] },
      });
      map.addLayer({
        id: "place-halo",
        type: "fill",
        source: "place",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#2dd4bf", "fill-opacity": 0.14 },
      });
      map.addLayer({
        id: "place-dot",
        type: "circle",
        source: "place",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "match",
            ["get", "kind"],
            "tree_cluster",
            "#4ade80",
            "water_station",
            "#22d3ee",
            "cool_roof",
            "#facc15",
            "#a3e635",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });
    }
  }, [cells, design, layers, sim, autoStations, placements]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once("load", () => renderLayers());
      return;
    }
    renderLayers();
  }, [renderLayers]);

  // ── Wind overlay (canvas streaks; live Open-Meteo vector) ──────────────────
  useEffect(() => {
    if (!layers.wind || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface P {
      x: number;
      y: number;
      life: number;
    }
    const parts: P[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      life: 0.4 + Math.random() * 0.6,
    }));

    const step = () => {
      const w = weatherRef.current;
      const dir = w?.wind_dir ?? 225;
      const speed = w?.wind_ms ?? 3;
      const uv = windUnitVector(dir);
      const streak = 8 + speed * 3.5;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.2;
      for (const p of parts) {
        ctx.strokeStyle = `rgba(125, 211, 252, ${0.5 * p.life})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + uv.u * streak, p.y + uv.v * streak);
        ctx.stroke();
        p.x += uv.u * streak;
        p.y += uv.v * streak;
        p.life -= 0.006;
        if (
          p.x < -30 ||
          p.x > canvas.width + 30 ||
          p.y < -30 ||
          p.y > canvas.height + 30 ||
          p.life <= 0
        ) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 0.4 + Math.random() * 0.6;
        }
      }
      windRafRef.current = requestAnimationFrame(step);
    };
    windRafRef.current = requestAnimationFrame(step);
    return () => {
      if (windRafRef.current !== null) cancelAnimationFrame(windRafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [layers.wind]);

  // ── Derived readouts ───────────────────────────────────────────────────────
  const hw = weather
    ? heatwaveStatus(weather.days.map((d) => ({ tMaxC: d.t_max_c, tMinC: d.t_min_c })))
    : null;
  const pmv = weather
    ? pmvFanger({
        taC: weather.temp_c,
        trC: weather.temp_c + 8,
        va: Math.max(weather.wind_ms, 0.3),
        rh: weather.rh,
      })
    : null;
  const pmvInfo = pmv !== null ? pmvLabel(pmv) : null;

  const chip = (on: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
      on ? "bg-white text-slate-900" : "bg-white/10 text-slate-300 hover:bg-white/20"
    }`;

  const toggle = (key: keyof LayerState) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      {layers.wind && (
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-950/90 to-transparent px-3 pb-8 pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-white ring-1 ring-white/15"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold text-white">Design Studio</h1>
              <span className="shrink-0 rounded-full bg-heat-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                {scopeMeta.label}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-400">
              {locationName} · heat:{" "}
              {provider === "fortyguard" ? (
                <span className="font-medium text-emerald-300">FortyGuard</span>
              ) : provider === "mock" ? (
                "mock model (FortyGuard slot)"
              ) : (
                provider
              )}
            </p>
          </div>
        </div>
        {hw && hw.level !== "none" && (
          <div
            className={`mt-2 rounded-xl px-3 py-2 text-[11px] font-medium ring-1 ${
              hw.level === "alert"
                ? "bg-red-500/20 text-red-200 ring-red-400/40"
                : "bg-amber-500/20 text-amber-100 ring-amber-400/40"
            }`}
          >
            <Flame className="mr-1.5 inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {hw.level === "alert" ? "HEATWAVE ALERT" : "Heat watch"} — {hw.reason}. Above 33 °C, design
            alone stops working: prioritize shade, water & refuges (Ancona 2016).
          </div>
        )}
      </div>

      {/* Impact card */}
      {design && (
        <div className="absolute inset-x-3 top-[4.6rem] z-10 rounded-2xl bg-slate-900/85 p-3 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles size={13} /> Your design impact
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPlacements((p) => p.slice(0, -1))}
                disabled={!placements.length}
                className="rounded-lg bg-white/10 p-1.5 text-slate-300 transition hover:bg-white/20 disabled:opacity-30"
                aria-label="Undo last"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setPlacements([])}
                disabled={!placements.length}
                className="rounded-lg bg-white/10 p-1.5 text-slate-300 transition hover:bg-white/20 disabled:opacity-30"
                aria-label="Clear design"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Avg temp</p>
              <p className="text-sm font-bold text-white">
                {Math.round(design.avgBeforeF)}°F
                {placements.length > 0 && (
                  <span className="text-emerald-300"> → {Math.round(design.avgAfterF)}°F</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Peak temp</p>
              <p className="text-sm font-bold text-white">
                {Math.round(design.maxBeforeF)}°F
                {placements.length > 0 && (
                  <span className="text-emerald-300"> → {Math.round(design.maxAfterF)}°F</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Feels (PMV)</p>
              <p className="text-sm font-bold text-white">
                {pmvInfo ? `${pmvInfo.text} · ${Math.round(ppdFromPmv(pmv ?? 0))}%` : "—"}
              </p>
            </div>
          </div>
          {placements.length > 0 && (
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              avg −{design.avgDropC.toFixed(2)} °C across map · {placements.length} intervention
              {placements.length > 1 ? "s" : ""} · capped at −3.5 °C (literature-safe)
            </p>
          )}
        </div>
      )}

      {/* Bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent px-3 pb-4 pt-10">
        {tool && (
          <div className="mb-2 flex items-center justify-center gap-2 rounded-full bg-heat-600/90 py-1.5 text-[11px] font-semibold text-white">
            <Droplets size={12} /> Tap the map to place · {PLACEMENT_META[tool].label}
            <button
              onClick={() => setTool(null)}
              className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]"
            >
              done
            </button>
          </div>
        )}
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => toggle("heat")} className={chip(layers.heat)}>
            <ThermometerSun size={12} /> Heat
          </button>
          <button onClick={() => toggle("after")} className={chip(layers.after)}>
            <Sparkles size={12} /> After design
          </button>
          <button onClick={() => toggle("wind")} className={chip(layers.wind)}>
            <Wind size={12} /> Wind{weather ? ` ${Math.round(weather.wind_ms)}m/s` : ""}
          </button>
          <button onClick={() => toggle("buildings")} className={chip(layers.buildings)}>
            <Building2 size={12} /> Structures
          </button>
          <button onClick={() => toggle("green")} className={chip(layers.green)}>
            <Leaf size={12} /> Green
          </button>
          <button onClick={() => toggle("suggest")} className={chip(layers.suggest)}>
            <Droplets size={12} /> Water & trees
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Layers size={11} /> Design
          </span>
          {TOOL_ORDER.map((k) => {
            const meta = PLACEMENT_META[k];
            const active = tool === k;
            const Icon = k === "tree_cluster" ? TreePine : k === "cool_roof" ? Building2 : Droplets;
            return (
              <button
                key={k}
                onClick={() => setTool(active ? null : k)}
                title={meta.note}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
              >
                <Icon size={12} /> {meta.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-center text-[9px] leading-3 text-slate-500">
          Effects calibrated from peer-reviewed studies (Lee &amp; Kim 2022; Ancona 2016) · docs/research
        </p>
      </div>
    </div>
  );
}
