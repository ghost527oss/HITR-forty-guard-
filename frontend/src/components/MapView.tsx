import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HeatCell } from "../api";
import { getHeatGrid } from "../api";

// Minimal free style using OpenStreetMap raster tiles (no API key needed).
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

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  onPick: (lat: number, lng: number) => void;
  onBoxSelected?: (bounds: BoxBounds) => void;
  heatData: HeatCell[] | null;
  selectionBox?: BoxBounds | null;
  picked?: { lat: number; lng: number } | null;
}

export default function MapView({ center, zoom, onPick, onBoxSelected, heatData, selectionBox, picked }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawingBoxRef = useRef(false);
  const boxStartRef = useRef<{ lng: number; lat: number } | null>(null);
  // Bug #24 fix: track the picked-spot marker so we can move/remove it.
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [center.lng, center.lat],
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

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

  // Audit #1 fix: move map when center prop changes (e.g. user searched a new city).
  // Do NOT remove this effect — without it, the map stays on the initial city.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom, duration: 1500 });
  }, [center.lat, center.lng, zoom]);

  // Audit #2 fix: render heat overlay as FortyGuard-style colored rectangle tiles.
  // Guard against MapLibre style not being ready — calling addSource before the
  // style's "load" event fires throws and the heat overlay never appears.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatData || !heatData.length) return;
    if (!map.isStyleLoaded()) {
      map.once("load", () => renderHeatTiles(map, heatData));
      return;
    }
    renderHeatTiles(map, heatData);
  }, [heatData]);

  // Apply persistent selection box (cleared when null).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectionBox) {
      clearSelectionLayer(map);
      return;
    }
    applyHeatFilter(map, selectionBox);
  }, [selectionBox]);

  // Bug #24 fix: drop / move / clear a pin marker on the picked spot.
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
        "width:18px;height:18px;border-radius:50%;background:#ea580c;" +
        "border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;";
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([picked.lng, picked.lat])
        .addTo(map);
    }
  }, [picked]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function renderHeatTiles(map: maplibregl.Map, cells: HeatCell[]) {
  const spanDeg = estimateSpan(cells);
  const halfLat = spanDeg.lat / 2;
  const halfLng = spanDeg.lng / 2;

  const features = cells.map((c) => ({
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
    properties: { color: c.color, temp_f: c.temp_f, risk: c.risk, lng: c.lng, lat: c.lat },
  }));

  const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

  if (map.getSource("heat")) {
    (map.getSource("heat") as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource("heat", { type: "geojson", data: geojson });
    map.addLayer({
      id: "heat-tiles",
      type: "fill",
      source: "heat",
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0 },
    });
    setTimeout(() => {
      if (map.getLayer("heat-tiles")) {
        map.setPaintProperty("heat-tiles", "fill-opacity", 0.55);
      }
    }, 100);
    map.addLayer({
      id: "heat-tile-borders",
      type: "line",
      source: "heat",
      paint: { "line-color": ["get", "color"], "line-width": 0.5, "line-opacity": 0.7 },
    });
  }
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

function estimateSpan(cells: HeatCell[]): { lat: number; lng: number } {
  if (cells.length < 2) return { lat: 0.001, lng: 0.001 };
  const c0 = cells[0];
  let cLat: HeatCell | null = null;
  let cLng: HeatCell | null = null;
  for (let k = 1; k < cells.length; k++) {
    const c = cells[k];
    if (!cLat && Math.abs(c.lat - c0.lat) > 1e-5) cLat = c;
    if (!cLng && Math.abs(c.lng - c0.lng) > 1e-5) cLng = c;
    if (cLat && cLng) break;
  }
  return {
    lat: cLat ? Math.abs(cLat.lat - c0.lat) : 0.005,
    lng: cLng ? Math.abs(cLng.lng - c0.lng) : 0.005,
  };
}

// Helper used by App to load a heat grid around the current map center.
export async function loadHeatGrid(lat: number, lng: number): Promise<HeatCell[]> {
  const res = await getHeatGrid(lat, lng, 0.04, 24);
  return res.cells;
}