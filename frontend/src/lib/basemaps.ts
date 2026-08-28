// Shared basemap styles for the map screens (Design Studio + planner region
// preview). Both are free and need no API key. The studio follows the app
// theme: Esri Dark Gray in dark mode, CARTO Positron (light) in light mode.
import maplibregl from "maplibre-gl";

export const BASEMAP_DARK: maplibregl.StyleSpecification = {
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

export const BASEMAP_LIGHT: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "studio-base": {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
    "studio-labels": {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "",
    },
  },
  layers: [
    { id: "studio-base", type: "raster", source: "studio-base" },
    { id: "studio-labels", type: "raster", source: "studio-labels" },
  ],
};

/** Axis-aligned square polygon (5 rings, closed) around (lat, lng), radius metres. */
export function toDegPoly(lat: number, lng: number, radiusM: number): number[][] {
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

/** Square bounds [[W,S],[E,N]] of `spanDeg` degrees around a centre point. */
export function squareBounds(lat: number, lng: number, spanDeg: number): [[number, number], [number, number]] {
  const h = spanDeg / 2;
  return [
    [lng - h, lat - h],
    [lng + h, lat + h],
  ];
}
