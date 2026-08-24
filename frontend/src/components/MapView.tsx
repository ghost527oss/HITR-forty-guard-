import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HeatReading } from "../api";
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
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  onPick: (lat: number, lng: number) => void;
  heatData: HeatReading[] | null;
}

export default function MapView({ center, zoom, onPick, heatData }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [center.lng, center.lat],
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => onPick(e.lngLat.lat, e.lngLat.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render the heat overlay as a source/layer of colored circles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatData) return;
    if (map.getSource("heat")) {
      (map.getSource("heat") as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: heatData.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: p,
        })),
      });
    } else {
      map.addSource("heat", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: heatData.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            properties: p,
          })),
        },
      });
      map.addLayer({
        id: "heat-dots",
        type: "circle",
        source: "heat",
        paint: {
          "circle-radius": 14,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.7,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  }, [heatData]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// Helper used by App to load a heat grid around the current map center.
export async function loadHeatGrid(
  lat: number,
  lng: number,
): Promise<HeatReading[]> {
  const res = await getHeatGrid(lat, lng, 0.05, 8);
  return res.points;
}
