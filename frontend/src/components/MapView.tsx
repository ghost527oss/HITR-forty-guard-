import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HeatCell } from "../api";
import { boundsAround, loadRealHeatGrid } from "../lib/realHeat";
import { loadHeatGrid } from "../lib/heatGrid";

export { boundsAround, loadRealHeatGrid, loadHeatGrid };

const style: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export interface BoxBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MapOverlayPoint {
  lat: number;
  lng: number;
  label?: string;
  kind?: "tree" | "water" | "roof" | "manual";
}

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  onPick: (lat: number, lng: number) => void;
  onBoxSelected?: (bounds: BoxBounds) => void;
  heatData: HeatCell[] | null;
  selectionBox?: BoxBounds | null;
  picked?: { lat: number; lng: number } | null;
  coolPath?: { from: { lat: number; lng: number }; to: { lat: number; lng: number } } | null;
  waterStations?: MapOverlayPoint[] | null;
  canopyGaps?: MapOverlayPoint[] | null;
  roofTargets?: MapOverlayPoint[] | null;
  manualDrops?: MapOverlayPoint[] | null;
  showHeat?: boolean;
  showWater?: boolean;
  showCoolPath?: boolean;
  showCanopy?: boolean;
  showRoofs?: boolean;
}

export default function MapView({
  center, zoom, onPick, onBoxSelected, heatData, selectionBox, picked,
  coolPath = null, waterStations = null,
  canopyGaps = null, roofTargets = null,
  manualDrops = null,
  showHeat = true, showWater = true, showCoolPath = true, showCanopy = false, showRoofs = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawingBoxRef = useRef(false);
  const boxStartRef = useRef<{ lng: number; lat: number } | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [center.lng, center.lat],
      zoom,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");

    map.on("click", (e) => {
      if (!drawingBoxRef.current) onPick(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("mousedown", (e) => {
      if (!e.originalEvent.shiftKey) return;
      drawingBoxRef.current = true;
      boxStartRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      map.dragPan.disable();
      map.getCanvas().style.cursor = "crosshair";
    });

    map.on("mousemove", (e) => {
      if (!drawingBoxRef.current || !boxStartRef.current) return;
      const start = boxStartRef.current;
      drawSelectionLayer(map, start, { lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    map.on("mouseup", (e) => {
      if (!drawingBoxRef.current || !boxStartRef.current) return;
      drawingBoxRef.current = false;
      const start = boxStartRef.current;
      boxStartRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
      const bounds = normalizeBounds(start, { lng: e.lngLat.lng, lat: e.lngLat.lat });
      if (onBoxSelected) onBoxSelected(bounds);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Center update on search
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom, duration: 1200 });
  }, [center.lat, center.lng, zoom]);

  // Render heat overlay - CLEAN SQUARE GRID
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatData || !heatData.length) return;
    if (!map.isStyleLoaded()) {
      map.once("load", () => renderHeatTiles(map, heatData));
      return;
    }
    renderHeatTiles(map, heatData);
  }, [heatData]);

  // Selection box filtering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectionBox) {
      clearSelectionLayer(map);
      return;
    }
    applyHeatFilter(map, selectionBox);
  }, [selectionBox]);

  // Pin marker on picked location
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (picked) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#f97316;" +
        "border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;";
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([picked.lng, picked.lat])
        .addTo(map);
    }
  }, [picked]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (coolPath) {
        const line: GeoJSON.Feature = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [coolPath.from.lng, coolPath.from.lat],
              [coolPath.to.lng, coolPath.to.lat],
            ],
          },
          properties: {},
        };
        if (map.getSource("cool-path")) {
          (map.getSource("cool-path") as maplibregl.GeoJSONSource).setData(line);
        } else {
          map.addSource("cool-path", { type: "geojson", data: line });
          map.addLayer({
            id: "cool-path-line",
            type: "line",
            source: "cool-path",
            paint: { "line-color": "#0d9488", "line-width": 3, "line-dasharray": [2, 1] },
          });
        }
      } else if (map.getSource("cool-path")) {
        if (map.getLayer("cool-path-line")) map.removeLayer("cool-path-line");
        map.removeSource("cool-path");
      }
      if (map.getLayer("cool-path-line")) {
        map.setLayoutProperty("cool-path-line", "visibility", showCoolPath ? "visible" : "none");
      }
    };
    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return;
    }
    apply();
  }, [coolPath, showCoolPath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const features = (waterStations ?? []).map((w) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] },
        properties: { label: w.label ?? "water", kind: w.kind ?? "water" },
      }));
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
      if (map.getSource("water-refuges")) {
        (map.getSource("water-refuges") as maplibregl.GeoJSONSource).setData(fc);
      } else {
        map.addSource("water-refuges", { type: "geojson", data: fc });
        map.addLayer({
          id: "water-refuges-dots",
          type: "circle",
          source: "water-refuges",
          paint: {
            "circle-radius": 7,
            "circle-color": "#0284c7",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
      if (map.getLayer("water-refuges-dots")) {
        map.setLayoutProperty("water-refuges-dots", "visibility", showWater ? "visible" : "none");
      }
    };
    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return;
    }
    apply();
  }, [waterStations, showWater]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = (on: boolean) => (on ? "visible" : "none");
    const apply = () => {
      for (const id of ["heat-tiles", "heat-tile-borders"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis(showHeat));
      }
      if (map.getLayer("cool-path-line")) map.setLayoutProperty("cool-path-line", "visibility", vis(showCoolPath));
      if (map.getLayer("water-refuges-dots")) map.setLayoutProperty("water-refuges-dots", "visibility", vis(showWater));
      if (map.getLayer("canopy-gaps-dots")) map.setLayoutProperty("canopy-gaps-dots", "visibility", vis(showCanopy));
      if (map.getLayer("roof-targets-dots")) map.setLayoutProperty("roof-targets-dots", "visibility", vis(showRoofs));
      if (map.getLayer("manual-drops-dots")) map.setLayoutProperty("manual-drops-dots", "visibility", "visible");
    };
    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return;
    }
    apply();
  }, [showHeat, showCoolPath, showWater, showCanopy, showRoofs, heatData, coolPath, waterStations, canopyGaps, roofTargets, manualDrops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const paintDots = (
      sourceId: string,
      layerId: string,
      pts: MapOverlayPoint[] | null,
      color: string,
      visible: boolean,
      radius = 6,
    ) => {
      const features = (pts ?? []).map((w) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] },
        properties: { label: w.label ?? "", kind: w.kind ?? "" },
      }));
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
      } else {
        map.addSource(sourceId, { type: "geojson", data: fc });
        map.addLayer({
          id: layerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": radius,
            "circle-color": color,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    };
    const apply = () => {
      paintDots("canopy-gaps", "canopy-gaps-dots", canopyGaps, "#16a34a", showCanopy, 6);
      paintDots("roof-targets", "roof-targets-dots", roofTargets, "#a855f7", showRoofs, 6);
      // Manual drops are ALWAYS visible with distinct styling
      if (manualDrops && manualDrops.length > 0) {
        const features = manualDrops.map((w) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] },
          properties: { label: w.label ?? "", kind: w.kind ?? "manual" },
        }));
        const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
        if (map.getSource("manual-drops")) {
          (map.getSource("manual-drops") as maplibregl.GeoJSONSource).setData(fc);
        } else {
          map.addSource("manual-drops", { type: "geojson", data: fc });
          map.addLayer({
            id: "manual-drops-dots",
            type: "circle",
            source: "manual-drops",
            paint: {
              "circle-radius": [
                "match",
                ["get", "kind"],
                "tree", 9,
                "water", 9,
                "roof", 9,
                8,
              ] as any,
              "circle-color": [
                "match",
                ["get", "kind"],
                "tree", "#16a34a",
                "water", "#0284c7",
                "roof", "#a855f7",
                "#f59e0b",
              ] as any,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            },
          });
          // Pulse effect via second larger transparent circle
          map.addLayer({
            id: "manual-drops-pulse",
            type: "circle",
            source: "manual-drops",
            paint: {
              "circle-radius": 18,
              "circle-color": [
                "match",
                ["get", "kind"],
                "tree", "#16a34a",
                "water", "#0284c7",
                "roof", "#a855f7",
                "#f59e0b",
              ] as any,
              "circle-opacity": 0.25,
              "circle-stroke-width": 0,
            },
          });
        }
      } else if (map.getSource("manual-drops")) {
        if (map.getLayer("manual-drops-pulse")) map.removeLayer("manual-drops-pulse");
        if (map.getLayer("manual-drops-dots")) map.removeLayer("manual-drops-dots");
        map.removeSource("manual-drops");
      }
    };
    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return;
    }
    apply();
  }, [canopyGaps, roofTargets, manualDrops, showCanopy, showRoofs]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// FIXED: Clean square grid, no 3D distortion, robust span calculation
function renderHeatTiles(map: maplibregl.Map, cells: HeatCell[]) {
  if (!cells.length) return;

  // Filter out absurd temperatures that cause visual bugs (e.g., 4586°F)
  const validCells = cells.filter((c) => {
    const t = c.temp_f;
    return typeof t === "number" && t >= 50 && t <= 130 && !isNaN(t);
  });

  const useCells = validCells.length > 0 ? validCells : cells;

  // Calculate robust cell size from actual data bounds
  const lats = useCells.map((c) => c.lat);
  const lngs = useCells.map((c) => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const count = useCells.length;
  const gridDim = Math.sqrt(count) || 1;

  // Cell size = total span / grid dimension, with 85% factor to leave tiny gap
  // Clamped to 0.0003 - 0.003 degrees (~30m - 300m) for clean squares
  let cellLatSize = gridDim > 1 ? (latSpan / gridDim) * 0.88 : 0.001;
  let cellLngSize = gridDim > 1 ? (lngSpan / gridDim) * 0.88 : 0.001;

  // Fallback for sparse or single-point data
  if (!isFinite(cellLatSize) || cellLatSize <= 0) cellLatSize = 0.001;
  if (!isFinite(cellLngSize) || cellLngSize <= 0) cellLngSize = 0.001;

  // Clamp to clean, professional size
  cellLatSize = Math.max(0.00025, Math.min(0.0035, cellLatSize));
  cellLngSize = Math.max(0.00025, Math.min(0.0035, cellLngSize));

  const halfLat = cellLatSize / 2;
  const halfLng = cellLngSize / 2;

  const features = useCells.map((c) => {
    // Clamp temp for color but preserve original temp_f in properties for debugging
    const clampedTemp = Math.max(60, Math.min(130, c.temp_f ?? 80));
    // Use original color if valid, else generate from clamped temp
    const color = c.color || tempColorFallback(clampedTemp);

    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [c.lng - halfLng, c.lat - halfLat],
          [c.lng + halfLng, c.lat - halfLat],
          [c.lng + halfLng, c.lat + halfLat],
          [c.lng - halfLng, c.lat + halfLat],
          [c.lng - halfLng, c.lat - halfLat],
        ]],
      },
      properties: {
        color,
        temp_f: c.temp_f,
        risk: c.risk,
      },
    };
  });

  const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

  if (map.getSource("heat")) {
    (map.getSource("heat") as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource("heat", { type: "geojson", data: geojson });

    map.addLayer({
      id: "heat-tiles",
      type: "fill",
      source: "heat",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.52,
      },
    });

    map.addLayer({
      id: "heat-tile-borders",
      type: "line",
      source: "heat",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 0.4,
        "line-opacity": 0.18,
      },
    });
  }

  // Clean up any old 3D layers that caused distorted cube/mesh artifacts
  for (const layerId of ["heat-3d-buildings", "tree-3d-canopy", "3d-trees"]) {
    if (map.getLayer(layerId)) {
      try { map.removeLayer(layerId); } catch {}
    }
  }
  for (const sourceId of ["3d-trees"]) {
    if (map.getSource(sourceId)) {
      try { map.removeSource(sourceId); } catch {}
    }
  }
}

function tempColorFallback(tempF: number): string {
  if (tempF <= 70) return "#3b82f6";
  if (tempF <= 80) return "#4caf50";
  if (tempF <= 90) return "#ff9800";
  if (tempF <= 100) return "#f44336";
  return "#b71c1c";
}

function drawSelectionLayer(map: maplibregl.Map, a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const rect: GeoJSON.Feature = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [a.lng, a.lat], [b.lng, a.lat], [b.lng, b.lat], [a.lng, b.lat], [a.lng, a.lat],
      ]],
    },
    properties: {},
  };
  if (map.getSource("selection")) {
    (map.getSource("selection") as maplibregl.GeoJSONSource).setData(rect);
  } else {
    map.addSource("selection", { type: "geojson", data: rect });
    map.addLayer({
      id: "selection-fill",
      type: "fill",
      source: "selection",
      paint: { "fill-color": "#ea580c", "fill-opacity": 0.15 },
    });
    map.addLayer({
      id: "selection-outline",
      type: "line",
      source: "selection",
      paint: { "line-color": "#ea580c", "line-width": 2, "line-dasharray": [2, 2] },
    });
  }
}

function clearSelectionLayer(map: maplibregl.Map) {
  if (map.getLayer("selection-fill")) map.removeLayer("selection-fill");
  if (map.getLayer("selection-outline")) map.removeLayer("selection-outline");
  if (map.getSource("selection")) map.removeSource("selection");
  if (map.getLayer("heat-tiles")) {
    map.setFilter("heat-tiles", null);
    map.setFilter("heat-tile-borders", null);
  }
}

function applyHeatFilter(map: maplibregl.Map, bounds: BoxBounds) {
  if (!map.getLayer("heat-tiles")) return;
  const polygon = [[
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south],
  ]];
  const rect: GeoJSON.Feature = {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: polygon },
    properties: {},
  };
  if (map.getSource("selection")) {
    (map.getSource("selection") as maplibregl.GeoJSONSource).setData(rect);
  } else {
    map.addSource("selection", { type: "geojson", data: rect });
    map.addLayer({
      id: "selection-fill",
      type: "fill",
      source: "selection",
      paint: { "fill-color": "#ea580c", "fill-opacity": 0.15 },
    });
    map.addLayer({
      id: "selection-outline",
      type: "line",
      source: "selection",
      paint: { "line-color": "#ea580c", "line-width": 2, "line-dasharray": [2, 2] },
    });
  }
  const filter = ["all",
    [">=", ["get", "lng"], bounds.west],
    ["<=", ["get", "lng"], bounds.east],
    [">=", ["get", "lat"], bounds.south],
    ["<=", ["get", "lat"], bounds.north],
  ] as any;
  map.setFilter("heat-tiles", filter);
  map.setFilter("heat-tile-borders", filter);
}

function normalizeBounds(a: { lng: number; lat: number }, b: { lng: number; lat: number }): BoxBounds {
  return {
    west: Math.min(a.lng, b.lng),
    east: Math.max(a.lng, b.lng),
    south: Math.min(a.lat, b.lat),
    north: Math.max(a.lat, b.lat),
  };
}
