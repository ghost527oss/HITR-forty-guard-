import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  Crosshair,
  Landmark as LandmarkIcon,
  ListOrdered,
  MapPin,
  Minus,
  Plus,
  Sprout,
  Trees,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getHeatGrid, type HeatCell } from "../api";
import { useDarkTheme } from "../lib/useDarkTheme";
import { BASEMAP_DARK, BASEMAP_LIGHT, squareBounds, toDegPoly } from "../lib/basemaps";

// ── Planning scopes (P2 area/zoning/point + farm mode) ──────────────────────

export type PlannerScope = "spot" | "block" | "district" | "city" | "farm";

export interface ScopeMeta {
  id: PlannerScope;
  label: string;
  tagline: string;
  /** Classic backend change level (1–3 supported; 4 = vision only). */
  changeLevel: number;
  icon: LucideIcon;
  accent: string;
}

export const SCOPES: ScopeMeta[] = [
  {
    id: "spot",
    label: "Spot retouch",
    tagline: "Fix one hot spot on the real map — trees, shade & water.",
    changeLevel: 1,
    icon: MapPin,
    accent: "from-emerald-400/80 to-teal-500/80",
  },
  {
    id: "block",
    label: "Block retrofit",
    tagline: "One block: building retrofits, cool roofs, orientation.",
    changeLevel: 2,
    icon: Building2,
    accent: "from-sky-400/80 to-indigo-500/80",
  },
  {
    id: "district",
    label: "District re-plan",
    tagline: "Redesign the block layout — streets, shade, water features.",
    changeLevel: 3,
    icon: LandmarkIcon,
    accent: "from-violet-400/80 to-fuchsia-500/80",
  },
  {
    id: "city",
    label: "Whole city",
    tagline: "City-wide masterplan vision — zoning, wind ways, green network.",
    changeLevel: 4,
    icon: Trees,
    accent: "from-amber-400/80 to-heat-600/80",
  },
  {
    id: "farm",
    label: "Farm & garden",
    tagline: "Build a cooling garden or urban farm — food + °C relief.",
    changeLevel: 1,
    icon: Sprout,
    accent: "from-lime-400/80 to-emerald-600/80",
  },
];

/**
 * The square the region view (and the studio) shows, per scope — the user's
 * "big square vs small square": the pop screen shows exactly that square,
 * nothing else. Degrees of latitude around the picked point.
 */
export const SCOPE_SPANS: Record<PlannerScope, number> = {
  spot: 0.004, // ≈ 450 m
  block: 0.008, // ≈ 900 m
  district: 0.014, // ≈ 1.5 km
  city: 0.06, // ≈ 6.5 km
  farm: 0.01, // ≈ 1.1 km
};

export function scopeSizeLabel(scope: PlannerScope): string {
  const km = SCOPE_SPANS[scope] * 111.32;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

interface PlannerStartModalProps {
  open: boolean;
  spot: { lat: number; lng: number } | null;
  locationName: string;
  onClose: () => void;
  onChooseOnMap: () => void;
  onLaunch: (spot: { lat: number; lng: number }, scope: PlannerScope) => void;
  onOpenClassic: () => void;
}

// Neumorphic pop screen: pick WHERE + HOW MUCH to change. The carved-in map
// shows ONLY the chosen region (fit to the scope square, panning clamped to
// it, zoom free inside) — nothing else. Soft-UI styling follows the theme.
export default function PlannerStartModal(props: PlannerStartModalProps) {
  const { open, spot, locationName, onClose, onChooseOnMap, onLaunch, onOpenClassic } = props;
  const [scope, setScope] = useState<PlannerScope>("spot");
  const dark = useDarkTheme();

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const spanRef = useRef(SCOPE_SPANS.spot);
  const spotRef = useRef(spot);
  const darkRef = useRef(dark);
  const renderHeatRef = useRef<(map: maplibregl.Map) => void>(() => {});
  const [heat, setHeat] = useState<HeatCell[] | null>(null);
  spanRef.current = SCOPE_SPANS[scope];
  spotRef.current = spot;
  darkRef.current = dark;

  const span = SCOPE_SPANS[scope];
  const activeScope = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];

  // ── Region map (created while open, on the picked spot) ────────────────────
  useEffect(() => {
    if (!open || !spot || !mapElRef.current) return;

    const map = new maplibregl.Map({
      container: mapElRef.current,
      style: darkRef.current ? BASEMAP_DARK : BASEMAP_LIGHT,
      center: [spot.lng, spot.lat],
      zoom: 15,
      minZoom: 11,
      maxZoom: 17,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const fit = (animate = true) => {
      const s = spotRef.current;
      if (!s) return;
      map.fitBounds(squareBounds(s.lat, s.lng, spanRef.current), {
        padding: 4,
        duration: animate ? 650 : 0,
      });
    };

    map.on("load", () => {
      const s = spotRef.current;
      if (!s) return;
      // Clamp the view to the region: you can zoom in, but you can never see
      // outside the chosen square — the pop shows only that area.
      map.setMaxBounds(squareBounds(s.lat, s.lng, spanRef.current));
      fit(false);
    });
    // Theme swap re-loads the style; the clamped bounds survive the swap.
    // (Ref: the listener must run the LATEST heat, not the mount-time one.)
    map.on("style.load", () => renderHeatRef.current(map));

    const obs = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark === darkRef.current) return;
      darkRef.current = isDark;
      map.setStyle(isDark ? BASEMAP_DARK : BASEMAP_LIGHT);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      obs.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spot]);

  // Scope (or spot) changed → re-fit the map to the new square.
  useEffect(() => {
    const map = mapRef.current;
    const s = spot;
    if (!map || !s || !map.isStyleLoaded()) return;
    map.setMaxBounds(squareBounds(s.lat, s.lng, span));
    map.fitBounds(squareBounds(s.lat, s.lng, span), { padding: 4, duration: 550 });
  }, [scope, spot, span]);

  // Heat grid for the region (mock paints instantly; free).
  useEffect(() => {
    if (!open || !spot) return;
    let cancelled = false;
    setHeat(null);
    getHeatGrid(spot.lat, spot.lng, span, 20)
      .then((r) => {
        if (!cancelled) setHeat(r.cells ?? r.points ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, spot, span]);

  const renderHeat = useCallback((map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;
    if (map.getLayer("preview-heat")) map.removeLayer("preview-heat");
    if (map.getSource("preview-heat")) map.removeSource("preview-heat");
    if (!heat || !heat.length) return;
    const s = spotRef.current;
    if (!s) return;
    const halfM = ((spanRef.current / 20) * 111320) / 2;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: heat.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [toDegPoly(c.lat, c.lng, halfM)] },
        properties: { color: c.color },
      })),
    };
    map.addSource("preview-heat", { type: "geojson", data: fc });
    map.addLayer({
      id: "preview-heat",
      type: "fill",
      source: "preview-heat",
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.55 },
    });
  }, [heat]);
  renderHeatRef.current = renderHeat;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once("style.load", () => renderHeat(map));
      return;
    }
    renderHeat(map);
  }, [renderHeat]);

  if (!open) return null;

  const zoomBy = (dir: 1 | -1) => {
    const map = mapRef.current;
    if (!map) return;
    if (dir > 0) map.zoomIn({ duration: 350 });
    else map.zoomOut({ duration: 350 });
  };
  const fitView = () => {
    const map = mapRef.current;
    const s = spot;
    if (!map || !s) return;
    map.fitBounds(squareBounds(s.lat, s.lng, span), { padding: 4, duration: 550 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-slate-950/70"
      />
      <div
        className="nu nu-card relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px]"
        style={{ animation: "hitrModalIn .3s cubic-bezier(.22,1,.36,1)" }}
      >
        <style>{`
          @keyframes hitrModalIn { from { opacity: 0; transform: translateY(26px) scale(.97); } to { opacity: 1; transform: none; } }
          .nu { --nu-bg:#e8ecf3; --nu-sh1:#c6ccd9; --nu-sh2:#ffffff; --nu-text:#3c455c; --nu-muted:#8b93a7; }
          .dark .nu { --nu-bg:#232936; --nu-sh1:#1a1f29; --nu-sh2:#2c3342; --nu-text:#d3d9e5; --nu-muted:#828b9f; }
          .nu-card { background: var(--nu-bg); box-shadow: 12px 12px 28px var(--nu-sh1), -12px -12px 28px var(--nu-sh2); color: var(--nu-text); }
          .nu-inset { background: var(--nu-bg); box-shadow: inset 5px 5px 10px var(--nu-sh1), inset -5px -5px 10px var(--nu-sh2); }
          .nu-raise { background: var(--nu-bg); box-shadow: 5px 5px 12px var(--nu-sh1), -5px -5px 12px var(--nu-sh2); transition: box-shadow .15s ease; }
          .nu-raise:active { box-shadow: inset 4px 4px 9px var(--nu-sh1), inset -4px -4px 9px var(--nu-sh2); }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--nu-muted)" }}>
              City Planner
            </p>
            <h2 className="text-lg font-bold">Start a design</h2>
          </div>
          <button
            onClick={onClose}
            className="nu-raise flex h-9 w-9 items-center justify-center rounded-full"
            style={{ color: "var(--nu-muted)" }}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 pb-6">
          {/* Region preview — the chosen square and nothing else */}
          <section>
            <div className="nu-inset relative h-60 overflow-hidden rounded-[22px]">
              {spot ? (
                <>
                  <div ref={mapElRef} className="absolute inset-0" />
                  {/* scope pill */}
                  <div
                    className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold backdrop-blur"
                    style={{ background: "rgba(255,255,255,0.75)", color: "#33415c" }}
                  >
                    <activeScope.icon size={12} />
                    {activeScope.label} · {scopeSizeLabel(scope)}
                  </div>
                  {/* soft zoom cluster */}
                  <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                    <button
                      onClick={() => zoomBy(1)}
                      className="nu-raise flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ color: "var(--nu-text)" }}
                      aria-label="Zoom in"
                    >
                      <Plus size={15} />
                    </button>
                    <button
                      onClick={() => zoomBy(-1)}
                      className="nu-raise flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ color: "var(--nu-text)" }}
                      aria-label="Zoom out"
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      onClick={fitView}
                      className="nu-raise flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ color: "var(--nu-text)" }}
                      aria-label="Fit region"
                      title="Fit region"
                    >
                      <Crosshair size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={onChooseOnMap}
                  className="flex h-full w-full flex-col items-center justify-center gap-2"
                  style={{ color: "var(--nu-muted)" }}
                >
                  <Crosshair size={26} />
                  <span className="text-xs font-semibold">Select a place on the map</span>
                </button>
              )}
            </div>
          </section>

          {/* Step 1 — location */}
          <section>
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--nu-muted)" }}>
              <span className="mr-2 rounded-full nu-inset px-2 py-0.5 text-[10px]">1</span>
              Choose a place
            </p>
            {spot ? (
              <div className="nu-inset flex items-center gap-3 rounded-2xl px-4 py-3">
                <MapPin size={18} className="shrink-0" style={{ color: "#10b981" }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{locationName}</p>
                  <p className="text-[11px]" style={{ color: "var(--nu-muted)" }}>
                    {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)} — selected on map
                  </p>
                </div>
                <button
                  onClick={onChooseOnMap}
                  className="nu-raise ml-auto shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={onChooseOnMap}
                className="nu-raise flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold"
              >
                <Crosshair size={17} />
                Select on map
              </button>
            )}
          </section>

          {/* Step 2 — level of change */}
          <section>
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--nu-muted)" }}>
              <span className="mr-2 rounded-full nu-inset px-2 py-0.5 text-[10px]">2</span>
              Level of change — the region shown above follows this
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {SCOPES.map((s) => {
                const active = scope === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScope(s.id)}
                    className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left ${
                      active ? "nu-inset" : "nu-raise"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-white`}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold">{s.label}</span>
                      <span className="block text-[10px]" style={{ color: "var(--nu-muted)" }}>
                        {scopeSizeLabel(s.id)}
                      </span>
                    </span>
                    {active && <Check size={14} className="shrink-0" style={{ color: "#10b981" }} />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-4" style={{ color: "var(--nu-muted)" }}>
              {activeScope.tagline}
            </p>
          </section>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              disabled={!spot}
              onClick={() => spot && onLaunch(spot, scope)}
              className="nu-raise flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold disabled:opacity-40"
              style={{ color: "#0d9488" }}
            >
              Launch Design Studio
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onOpenClassic}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              style={{ color: "var(--nu-muted)" }}
            >
              <ListOrdered size={14} />
              Or use the classic ranked-list planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
