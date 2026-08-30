import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dropletSvg, treesSvg } from "../lib/mapIcons";
import { loadRealHeatGrid } from "../lib/realHeat";
import { useDarkTheme } from "../lib/useDarkTheme";
import { BASEMAP_DARK, BASEMAP_LIGHT, squareBounds, toDegPoly } from "../lib/basemaps";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Building2,
  ChevronLeft,
  Crosshair,
  Droplets,
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
  designContributions,
  metersBetween,
  pmvFanger,
  pmvLabel,
  ppdFromPmv,
  PLACEMENT_META,
  simulateDesign,
  suggestPlacements,
  suggestWaterStations,
  tempColorF,
  windUnitVector,
  type Placement,
  type PlacementContext,
  type PlacementKind,
} from "../planner/uhiFactors";
import type { PlannerScope } from "../components/PlannerStartModal";
import { SCOPES, SCOPE_SPANS } from "../components/PlannerStartModal";
import { compareStudioPair, loadStudioPair, saveStudioSlot, type SavedStudioDesign } from "../lib/studioCompare";

interface DesignStudioScreenProps {
  lat: number;
  lng: number;
  scope: PlannerScope;
  locationName: string;
  onBack: () => void;
}

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



export default function DesignStudioScreen(props: DesignStudioScreenProps) {
  const { lat, lng, scope, locationName, onBack } = props;
  const scopeMeta = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];
  const dark = useDarkTheme();
  // The region the studio works in = the scope's square (same one the pop
  // screen previewed): small scope → small region, big scope → big region.
  const span = SCOPE_SPANS[scope] ?? 0.014;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const idRef = useRef(0);
  const windRafRef = useRef<number | null>(null);
  const weatherRef = useRef<WeatherNow | null>(null);
  const styleDarkRef = useRef(dark); // which basemap the map is currently on
  const renderLayersRef = useRef<() => void>(() => {});

  const [cells, setCells] = useState<HeatCell[] | null>(null);
  const [provider, setProvider] = useState("…");
  const [sim, setSim] = useState<CitySimulation3D | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [savedPair, setSavedPair] = useState(() => loadStudioPair());
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
    getHeatGrid(lat, lng, span, GRID_STEPS)
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
    loadRealHeatGrid(lat, lng, span)
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
  }, [lat, lng, span]);

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
        // Switch to the "after" view the moment the design has a first element,
        // so the cooling is visible on the map instead of only in the card.
        setLayers((l) => (l.after ? l : { ...l, after: true }));
        return;
      }
      const point = { lat: clickLat, lng: clickLng };

      // 0 — the user's own placement: show what it does and (if factor-placed)
      // the reason it was suggested there.
      const placed = placements.find((p) => metersBetween(point, p) < NEARBY_M);
      if (placed) {
        const spec = PLACEMENT_META[placed.kind];
        new maplibregl.Popup({ closeButton: false })
          .setLngLat([clickLng, clickLat])
          .setHTML(
            `<div style="font:12px system-ui;color:#0f172a;max-width:240px"><b>${spec.label}</b><br/>` +
              `−${spec.centerDropC.toFixed(2)} °C at site · fades to 0 over ${spec.radiusM} m<br/>` +
              `<span style="color:#475569">${placed.reason ?? spec.note}</span></div>`,
          )
          .addTo(map);
        return;
      }

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
    [tool, cells, design, sim, autoStations, placements],
  );
  clickRef.current = handleMapClick;

  // ── Map init (once) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const bounds = squareBounds(lat, lng, span);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: dark ? BASEMAP_DARK : BASEMAP_LIGHT,
      center: [lng, lat],
      zoom: 15.5,
      // Esri's Canvas "World_Dark_Gray" tile service stops at z16. Without a
      // matching cap the user can zoom past it and the basemap silently goes
      // blank behind the heat layer.
      maxZoom: 16,
      // Clamp the working view to the chosen region (a little padding so
      // edge placements stay reachable) — the studio shows that area, not the
      // whole world.
      maxBounds: squareBounds(lat, lng, span * 1.35),
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => clickRef.current(e.lngLat.lat, e.lngLat.lng));
    map.on("load", () => map.fitBounds(bounds, { padding: 8, duration: 0 }));
    // Every style (re)load — including a theme swap — ends here, and the data
    // layers are rebuilt on top of the new basemap.
    map.on("style.load", () => renderLayersRef.current());
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme changed → swap the basemap (the style.load listener rebuilds layers).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || dark === styleDarkRef.current) return;
    styleDarkRef.current = dark;
    map.setStyle(dark ? BASEMAP_DARK : BASEMAP_LIGHT);
  }, [dark]);

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
      const halfM = ((span / GRID_STEPS) * 111320) / 2;
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
  }, [cells, design, layers, sim, autoStations, placements, span]);
  renderLayersRef.current = renderLayers;

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
  // (The heatwave banner that used to render here was removed on request — it
  // sat over the map and hid the very info it was warning about. Live heat is
  // still visible on the map itself, in the PMV "feels" chip, and in the
  // Home screen's alert banner.)
  const pmv = weather
    ? pmvFanger({
        taC: weather.temp_c,
        trC: weather.temp_c + 8,
        va: Math.max(weather.wind_ms, 0.3),
        rh: weather.rh,
      })
    : null;
  const pmvInfo = pmv !== null ? pmvLabel(pmv) : null;

  /**
   * Factor-driven placement: runs the papers' factor model (hottest cells
   * first, canopy gaps, canyon bonus, roof-on-building, open ground, hospital
   * proximity) and adds up to 5 placements of the active tool (trees if none
   * selected). Each dot carries its "why here" reason — tap a dot to see it.
   */
  const smartPlace = useCallback(() => {
    if (!cells) return;
    const kind: PlacementKind = tool ?? "tree_cluster";
    const ctx: PlacementContext = {
      vegetation: (sim?.vegetation ?? []).map((v) => ({ lat: v.lat, lng: v.lng })),
      buildings: (sim?.buildings ?? []).map((b) => ({ lat: b.lat, lng: b.lng, height_m: b.height_m })),
      hospitals: (sim?.hospitals ?? []).map((h) => ({ lat: h.lat, lng: h.lng })),
    };
    const sugg = suggestPlacements(cells, ctx, kind, { count: 5, existing: placements });
    if (!sugg.length) return; // no cell met the factors — nothing random gets placed
    setPlacements((prev) => [...prev, ...sugg]);
    setLayers((l) => ({ ...l, after: true }));
    setTool(null);
  }, [cells, sim, tool, placements]);

  const chip = (on: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
      on
        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        : "bg-white/80 text-slate-600 hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
    }`;

  const toggle = (key: keyof LayerState) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  return (
    <div className="relative h-full w-full overflow-hidden bg-white dark:bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      {layers.wind && (
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      )}

      {/* Top bar: header + impact card stack in normal flow inside this
          overlay (the card used to be absolutely positioned at 4.6rem, over
          whatever sat there). Follows the app theme. */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white/95 via-white/60 to-transparent px-3 pb-10 pt-3 dark:from-slate-950/95 dark:via-slate-950/50">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-900 ring-1 ring-slate-900/10 dark:bg-slate-900/80 dark:text-white dark:ring-white/15"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => {
              const m = mapRef.current;
              if (m) m.fitBounds(squareBounds(lat, lng, span), { padding: 8, duration: 600 });
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-900 ring-1 ring-slate-900/10 dark:bg-slate-900/80 dark:text-white dark:ring-white/15"
            aria-label="Fit region"
            title="Fit the chosen region"
          >
            <Crosshair size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">Design Studio</h1>
              <span className="shrink-0 rounded-full bg-heat-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                {scopeMeta.label}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {locationName} · heat:{" "}
              {provider === "fortyguard" ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-300">FortyGuard</span>
              ) : provider === "mock" ? (
                "mock model (FortyGuard slot)"
              ) : (
                provider
              )}
            </p>
          </div>
        </div>

        {/* Impact card — in normal flow below the header */}
        {design && (
        <div className="mt-2 rounded-2xl bg-white/90 p-3 ring-1 ring-slate-900/10 backdrop-blur dark:bg-slate-900/85 dark:ring-white/10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
              <Sparkles size={13} /> Your design impact
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPlacements((p) => p.slice(0, -1))}
                disabled={!placements.length}
                className="rounded-lg bg-slate-900/5 p-1.5 text-slate-500 transition hover:bg-slate-900/10 disabled:opacity-30 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                aria-label="Undo last"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setPlacements([])}
                disabled={!placements.length}
                className="rounded-lg bg-slate-900/5 p-1.5 text-slate-500 transition hover:bg-slate-900/10 disabled:opacity-30 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                aria-label="Clear design"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Peak temp</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {Math.round(design.maxBeforeF)}°F
                {placements.length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-300"> → {Math.round(design.maxAfterF)}°F</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Strongest drop</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {placements.length > 0 ? `−${design.maxDropC.toFixed(1)} °C` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Feels (PMV)</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {pmvInfo ? `${pmvInfo.text} · ${Math.round(ppdFromPmv(pmv ?? 0))}%` : "—"}
              </p>
            </div>
          </div>
          {placements.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-slate-200/70 pt-2 dark:border-white/10">
              {designContributions(placements, TOOL_ORDER).map((k) => (
                <li
                  key={k.kind}
                  className="flex items-baseline justify-between gap-2 text-[10px] leading-4 text-slate-600 dark:text-slate-300"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {PLACEMENT_META[k.kind].label} ×{k.count}
                  </span>
                  <span className="text-right">
                    −{k.centerDropC.toFixed(2)} °C at site · fades to 0 over {k.radiusM} m
                  </span>
                </li>
              ))}
            </ul>
          )}
          {placements.length > 0 && cells && (
            <p className="mt-1.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              Local effect: cools {design.affectedCells} of {cells.length} map tiles
              (≈{Math.round((100 * design.affectedCells) / cells.length)} %). The area average barely moves
              (−{design.avgDropC.toFixed(2)} °C) — that's the physics: a tree cools its block, not the whole
              city (Lee &amp; Kim 2022).
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["A", "B"] as const).map((slot) => (
              <button
                key={slot}
                type="button"
                disabled={!design || !placements.length}
                onClick={() => {
                  if (!design) return;
                  setSavedPair(saveStudioSlot(slot, {
                    locationName,
                    lat,
                    lng,
                    placements,
                    summary: {
                      maxDropC: design.maxDropC,
                      affectedCells: design.affectedCells,
                      maxBeforeF: design.maxBeforeF,
                      maxAfterF: design.maxAfterF,
                    },
                  }));
                }}
                className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[10px] font-bold text-slate-700 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200"
              >
                Save {slot}
              </button>
            ))}
          </div>
          {savedPair.A && savedPair.B && (
            <p className="mt-1.5 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
              {(() => {
                const c = compareStudioPair(savedPair.A as SavedStudioDesign, savedPair.B as SavedStudioDesign);
                return `A vs B: ${c.countA} vs ${c.countB} actions · peak drop ${savedPair.A.summary.maxDropC.toFixed(1)} vs ${savedPair.B.summary.maxDropC.toFixed(1)}°C · cells ${savedPair.A.summary.affectedCells} vs ${savedPair.B.summary.affectedCells} (B−A drop ${c.dropDeltaC >= 0 ? "+" : ""}${c.dropDeltaC.toFixed(1)}°C).`;
              })()}
            </p>
          )}
        </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white/95 via-white/80 to-transparent px-3 pb-4 pt-10 dark:from-slate-950/95 dark:via-slate-950/80">
        {tool && (
          <div className="mb-2">
            <div className="flex items-center justify-center gap-2 rounded-full bg-heat-600/90 py-1.5 text-[11px] font-semibold text-white">
              <Droplets size={12} /> Tap the map to place · {PLACEMENT_META[tool].label}
              <button
                onClick={() => setTool(null)}
                className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]"
              >
                done
              </button>
            </div>
            {/* Each tool does a different, calibrated thing — say so up front
                so the four options don't look interchangeable. */}
            <p className="mt-1 px-2 text-center text-[9px] leading-3 text-slate-600 dark:text-slate-300">
              {PLACEMENT_META[tool].note} — −{PLACEMENT_META[tool].centerDropC.toFixed(2)} °C at site,
              fades to 0 over {PLACEMENT_META[tool].radiusM} m
            </p>
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
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-white/5">
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
                    : "bg-white/80 text-slate-600 hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                }`}
              >
                <Icon size={12} /> {meta.label}
              </button>
            );
          })}
          <button
            onClick={smartPlace}
            disabled={!cells}
            title="Factor-driven: hottest cells, canopy gaps, canyon bonus, roof-on-building, open ground, hospital proximity"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/30 transition hover:bg-emerald-600/20 disabled:opacity-40 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30 dark:hover:bg-emerald-400/20"
          >
            <Sparkles size={12} /> Auto place ×5
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9px] leading-3 text-slate-400 dark:text-slate-500">
          Effects calibrated from peer-reviewed studies (Lee &amp; Kim 2022; Ancona 2016) · tap any placed dot
          to see why it was put there
        </p>
      </div>
    </div>
  );
}
