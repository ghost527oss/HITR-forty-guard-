import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box, Trees } from "lucide-react";
import type { HeatCell } from "../api";
import { getHeatGrid } from "../api";
import { boundsAround, loadRealHeatGrid } from "../lib/realHeat";

export { boundsAround, loadRealHeatGrid };

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
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [is3D, setIs3D] = useState(false);
  const [show3DTrees, setShow3DTrees] = useState(true);

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

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");

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
    map.flyTo({ center: [center.lng, center.lat], zoom, duration: 1500 });
  }, [center.lat, center.lng, zoom]);

  // Render heat overlay & 3D heat extrusions / trees
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatData || !heatData.length) return;
    if (!map.isStyleLoaded()) {
      map.once("load", () => renderHeatTiles(map, heatData, is3D, show3DTrees));
      return;
    }
    renderHeatTiles(map, heatData, is3D, show3DTrees);
  }, [heatData, is3D, show3DTrees]);

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
        "width:20px;height:20px;border-radius:50%;background:#f97316;" +
        "border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5);cursor:pointer;";
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([picked.lng, picked.lat])
        .addTo(map);
    }
  }, [picked]);

  // Toggle 3D pitch/tilt mode (55 degree camera pitch tilt towards target)
  const toggle3DMode = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextIs3D = !is3D;
    setIs3D(nextIs3D);

    if (nextIs3D) {
      map.easeTo({ pitch: 55, bearing: 0, duration: 1000 });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating 3D Perspective Controls */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggle3DMode}
          className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-lg backdrop-blur-md transition-all ${
            is3D
              ? "bg-orange-500 text-white ring-2 ring-orange-300 shadow-orange-500/30"
              : "bg-white/90 text-slate-700 hover:bg-white dark:bg-slate-800/90 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700"
          }`}
        >
          <Box className="h-4 w-4" />
          <span>{is3D ? "3D Buildings Active" : "3D Perspective"}</span>
        </button>

        {is3D && (
          <button
            onClick={() => setShow3DTrees(!show3DTrees)}
            className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold shadow-md backdrop-blur-md transition-all ${
              show3DTrees
                ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                : "bg-white/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200"
            }`}
          >
            <Trees className="h-4 w-4" />
            <span>3D Canopy Models</span>
          </button>
        )}
      </div>
    </div>
  );
}

function renderHeatTiles(map: maplibregl.Map, cells: HeatCell[], is3D: boolean, show3DTrees: boolean) {
  const spanDeg = estimateSpan(cells);
  const halfLat = spanDeg.lat / 2;
  const halfLng = spanDeg.lng / 2;

  const buildingFeatures = cells.map((c) => {
    const baseTemp = c.temp_f ?? 80;
    const height = Math.max(10, (baseTemp - 70) * 12);

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
        color: c.color,
        temp_f: c.temp_f,
        risk: c.risk,
        lng: c.lng,
        lat: c.lat,
        height,
      },
    };
  });

  const treeFeatures = cells
    .filter((_, idx) => idx % 3 === 0)
    .map((c) => {
      const radius = halfLng * 0.4;
      return {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [c.lng - radius, c.lat - radius],
            [c.lng + radius, c.lat - radius],
            [c.lng + radius, c.lat + radius],
            [c.lng - radius, c.lat + radius],
            [c.lng - radius, c.lat - radius],
          ]],
        },
        properties: {
          height: 14,
          base_height: 4,
          color: "#10b981",
        },
      };
    });

  const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: buildingFeatures };
  const treeGeojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: treeFeatures };

  if (map.getSource("heat")) {
    (map.getSource("heat") as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource("heat", { type: "geojson", data: geojson });

    map.addLayer({
      id: "heat-tiles",
      type: "fill",
      source: "heat",
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.55 },
    });

    map.addLayer({
      id: "heat-tile-borders",
      type: "line",
      source: "heat",
      paint: { "line-color": ["get", "color"], "line-width": 0.5, "line-opacity": 0.7 },
    });

    map.addLayer({
      id: "heat-3d-buildings",
      type: "fill-extrusion",
      source: "heat",
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.75,
      },
    });
  }

  if (map.getSource("3d-trees")) {
    (map.getSource("3d-trees") as maplibregl.GeoJSONSource).setData(treeGeojson);
  } else {
    map.addSource("3d-trees", { type: "geojson", data: treeGeojson });
    map.addLayer({
      id: "tree-3d-canopy",
      type: "fill-extrusion",
      source: "3d-trees",
      paint: {
        "fill-extrusion-color": "#059669",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base_height"],
        "fill-extrusion-opacity": 0.85,
      },
    });
  }

  if (map.getLayer("heat-3d-buildings")) {
    map.setLayoutProperty("heat-3d-buildings", "visibility", is3D ? "visible" : "none");
  }

  if (map.getLayer("tree-3d-canopy")) {
    map.setLayoutProperty("tree-3d-canopy", "visibility", is3D && show3DTrees ? "visible" : "none");
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
  if (map.getLayer("heat-3d-buildings")) {
    map.setFilter("heat-3d-buildings", filter);
  }
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

export async function loadHeatGrid(lat: number, lng: number, spanDeg = 0.04): Promise<HeatCell[]> {
  const res = await getHeatGrid(lat, lng, spanDeg, 24);
  return res.cells ?? res.points ?? [];
}
