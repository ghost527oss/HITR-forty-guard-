// ─────────────────────────────────────────────────────────────────────────────
// uhiFactors.ts — research-backed UHI factor engine for HITR.
// Grounded in docs/research/ (Papers 1–3):
//   P1 Ancona parametric optimization (Sustainability 2016) — physics formulas
//   P2 Lee & Kim urban-heating framework (IJERPH 2022) — evidence + thresholds
//   P3 Wicki et al. dense-green optimization (JEPM 2021) — allocation logic
// Pure TS: no React, no network. Safe offline. Unit: metric internally.
// ─────────────────────────────────────────────────────────────────────────────

import type { HeatCell } from "../api";

export interface LatLng {
  lat: number;
  lng: number;
}

// ── Paper constants (see docs/research/SYNTHESIS.md §6) ─────────────────────

/** Cooling effect of interventions, °C, from P2 Table 1 (real-city studies). */
export const COOLING_EFFECT = {
  /** +10% vegetation cover → −0.5…−0.8 °C air (Toronto / Beijing). */
  vegPlus10pct: -0.65,
  /** +25% tree canopy → −2 °C air (Phoenix). */
  canopyPlus25pct: -2.0,
  /** Planting 33% of an area with trees → −1 °C (Hong Kong). */
  trees33pctArea: -1.0,
  /** ~300 m² polygonal park → −1 °C; 650 m² → −2 °C (Seoul). */
  polygonalPark300m2: -1.0,
  /** Street-tree shade at pedestrian level: −1…−1.5 °C (Hong Kong). */
  streetShadePedestrian: -1.25,
  /** Park cooling reach: strong to 50 m, weak to 100 m (India). */
  parkReachStrongM: 50,
  parkReachWeakM: 100,
  /** Cool roofs: urban air −1.2…−2.0 K (P2). */
  coolRoofAir: -1.6,
  /** Pavement albedo +0.25 → −6.8 K surface (P2). */
  pavementAlbedo025: -6.8,
  /** +10% impervious cover → +0.7 °C (P2). */
  impervPlus10pct: +0.7,
} as const;

/** P2 official heatwave definitions. */
export const HEATWAVE = {
  /** °C — days at/above this for 3 consecutive days = alert. */
  dayAlertC: 35,
  /** °C — 3-day mean at/above this… */
  meanSoftenC: 28,
  /** …with every night at/above this = alert. */
  nightWarmC: 21,
} as const;

/** P1: above this outdoor temperature, geometry has no comfortable solutions. */
export const DESIGN_FAILS_ABOVE_C = 33;

// ── Geometry physics (P1) ────────────────────────────────────────────────────

/** Oke's canyon law (P1 eq. 3): urban−rural heat jump from street H/w ratio. */
export function canyonHeatPenalty(heightM: number, streetWidthM: number): number {
  const h = Math.max(heightM, 1);
  const w = Math.max(streetWidthM, 1);
  return 7.45 + 3.97 * Math.log(h / w);
}

/** Sky-view-factor proxy 0..1 (1 = open sky, 0 = deep canyon). Lower = hotter nights. */
export function skyViewFactorProxy(heightM: number, streetWidthM: number): number {
  const w = Math.max(streetWidthM, 1);
  const ratio = (2 * Math.max(heightM, 1)) / w;
  return Math.max(0.05, Math.min(1, Math.cos(Math.atan(ratio))));
}

// ── Human comfort: PMV / PPD (ISO 7730 / Fanger, P1) ─────────────────────────

export interface PmvInput {
  /** air temperature °C */
  taC: number;
  /** mean radiant temperature °C (use taC + 5…15 in sun as estimate) */
  trC: number;
  /** air speed m/s */
  va: number;
  /** relative humidity % */
  rh: number;
  /** metabolic rate, met (walking ≈ 2.0; sedentary 1.2) */
  met?: number;
  /** clothing insulation, clo (summer ≈ 0.5) */
  clo?: number;
}

export function ppdFromPmv(pmv: number): number {
  const p = Math.max(-3, Math.min(3, pmv));
  return 100 - 95 * Math.exp(-0.03353 * p ** 4 - 0.2179 * p ** 2);
}

/** Fanger PMV (ISO 7730). Iterative clothing-surface temperature, ~50 passes. */
export function pmvFanger(input: PmvInput): number {
  const { taC, trC, va, rh } = input;
  const met = input.met ?? 2.0;
  const clo = input.clo ?? 0.5;

  const paKpa = (rh / 100) * 0.61078 * Math.exp((17.27 * taC) / (taC + 237.3));
  const paPa = paKpa * 1000;
  const icl = 0.155 * clo;
  const fcl = icl <= 0.078 ? 1 + 1.29 * icl : 1.05 + 0.645 * icl;
  const M = met * 58.15;
  const W = 0;

  let tcl = taC;
  for (let i = 0; i < 200; i++) {
    const hn = 2.38 * Math.pow(Math.abs(tcl - taC), 0.25);
    const hc = Math.max(hn, 12.1 * Math.sqrt(Math.max(va, 0.05)));
    const tclTarget =
      35.7 -
      0.028 * (M - W) -
      icl *
        (3.96e-8 * fcl * (Math.pow(tcl + 273, 4) - Math.pow(trC + 273, 4)) +
          fcl * hc * (tcl - taC));
    // Damped update — the raw fixed-point can have |gain| > 1 (light summer
    // clothing) and diverge; α keeps the iteration stable.
    const tclNew = tcl + 0.25 * (tclTarget - tcl);
    if (Math.abs(tclNew - tcl) < 1e-4) {
      tcl = tclNew;
      break;
    }
    tcl = tclNew;
  }
  const hn = 2.38 * Math.pow(Math.abs(tcl - taC), 0.25);
  const hc = Math.max(hn, 12.1 * Math.sqrt(Math.max(va, 0.05)));

  const L =
    (M - W) -
    3.05e-3 * (5733 - 6.99 * (M - W) - paPa) -
    0.42 * ((M - W) - 58.15) -
    1.7e-5 * M * (5867 - paPa) -
    0.0014 * M * (34 - taC) -
    3.96e-8 * fcl * (Math.pow(tcl + 273, 4) - Math.pow(trC + 273, 4)) -
    fcl * hc * (tcl - taC);

  const pmv = (0.303 * Math.exp(-0.036 * M) + 0.028) * L;
  return Math.max(-3, Math.min(3, pmv));
}

export function pmvLabel(pmv: number): { text: string; tone: "ok" | "warm" | "hot" | "cold" } {
  if (pmv >= 2) return { text: "Hot", tone: "hot" };
  if (pmv >= 1) return { text: "Warm", tone: "warm" };
  if (pmv > -1) return { text: "Comfortable", tone: "ok" };
  return { text: "Cool", tone: "cold" };
}

// ── Heatwave status (P2 definitions) ─────────────────────────────────────────

export interface HeatDay {
  tMaxC: number;
  tMinC: number;
}

export interface HeatwaveStatus {
  level: "none" | "watch" | "alert";
  reason: string;
}

/** Most recent day LAST. 3-day rolling check on both official definitions. */
export function heatwaveStatus(days: HeatDay[]): HeatwaveStatus {
  if (days.length < 3) {
    const hot = days.some((d) => d.tMaxC >= HEATWAVE.dayAlertC);
    return hot
      ? { level: "watch", reason: "Forecast incomplete — hot day detected" }
      : { level: "none", reason: "No heatwave signal in forecast" };
  }
  const last3 = days.slice(-3);
  const threeHotDays = last3.every((d) => d.tMaxC >= HEATWAVE.dayAlertC);
  if (threeHotDays) {
    return {
      level: "alert",
      reason: `3 days ≥ ${HEATWAVE.dayAlertC} °C — official heatwave (P2/Lee & Kim)`,
    };
  }
  const meanMax = last3.reduce((s, d) => s + d.tMaxC, 0) / 3;
  const warmNights = last3.every((d) => d.tMinC >= HEATWAVE.nightWarmC);
  if (meanMax >= HEATWAVE.meanSoftenC && warmNights) {
    return {
      level: "alert",
      reason: `3-day mean ${meanMax.toFixed(0)} °C with nights ≥ ${HEATWAVE.nightWarmC} °C — heatwave`,
    };
  }
  if (meanMax >= HEATWAVE.meanSoftenC || last3.some((d) => d.tMaxC >= HEATWAVE.dayAlertC)) {
    return { level: "watch", reason: "Near heatwave thresholds — monitor" };
  }
  return { level: "none", reason: "No heatwave signal in 3-day forecast" };
}

// ── Wind helpers ─────────────────────────────────────────────────────────────

/** Wind bearing (degrees, FROM north) → unit vector in map space (x east, y north). */
export function windUnitVector(fromDeg: number): { u: number; v: number } {
  const rad = (fromDeg * Math.PI) / 180;
  return { u: Math.sin(rad), v: -Math.cos(rad) };
}

/** Wind comfort bonus: P1 — PPD falls sharply with wind (19% @4.9 m/s vs 80% @2.7). */
export function windVentilationScore(speedMs: number): number {
  return Math.max(0, Math.min(1, (speedMs - 2) / 5)); // 0 @ ≤2 m/s → 1 @ ≥7 m/s
}

// ── Distances ────────────────────────────────────────────────────────────────

export function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Design simulation (P2 effect sizes + P3 trade-off logic) ─────────────────

export type PlacementKind = "tree_cluster" | "water_station" | "cool_roof" | "garden";

export interface Placement {
  id: string;
  kind: PlacementKind;
  lat: number;
  lng: number;
}

interface KindSpec {
  label: string;
  radiusM: number;
  /** °C drop at the placement centre (P2 calibration). */
  centerDropC: number;
  /** Stacking cap per kind, °C (diminishing returns). */
  capC: number;
  note: string;
}

export const PLACEMENT_META: Record<PlacementKind, KindSpec> = {
  tree_cluster: {
    label: "Tree cluster",
    radiusM: 100,
    centerDropC: 0.8,
    capC: 2.0,
    note: "+10% canopy ≈ −0.5…−0.8 °C air (Toronto/Beijing studies)",
  },
  water_station: {
    label: "Water station",
    radiusM: 40,
    centerDropC: 0.35,
    capC: 0.6,
    note: "Hydration + misting point; local relief & survival range",
  },
  cool_roof: {
    label: "Cool roofs",
    radiusM: 60,
    centerDropC: 0.6,
    capC: 1.2,
    note: "Cool roofs: urban air −1.2…−2 K (Lee & Kim 2022)",
  },
  garden: {
    label: "Community garden",
    radiusM: 100,
    centerDropC: 1.0,
    capC: 1.5,
    note: "~300 m² polygonal green ≈ −1 °C (Seoul); food co-benefit",
  },
};

/** Total design cap per spot — keeps simulated claims conservative (≤3.5 °C). */
export const TOTAL_DROP_CAP_C = 3.5;

/** °C drop at a point from all placements (linear decay, per-kind caps, total cap). */
export function cellDropC(point: LatLng, placements: Placement[]): number {
  const perKind: Record<string, number> = {};
  for (const p of placements) {
    const spec = PLACEMENT_META[p.kind];
    const d = metersBetween(point, p);
    if (d > spec.radiusM) continue;
    const decay = 1 - d / spec.radiusM;
    perKind[p.kind] = Math.min((perKind[p.kind] ?? 0) + spec.centerDropC * decay, spec.capC);
  }
  let total = 0;
  for (const v of Object.values(perKind)) total += v;
  return Math.min(total, TOTAL_DROP_CAP_C);
}

/** Premium colour ramp for °F temps (cool teal → deep red). */
export function tempColorF(tempF: number): string {
  const stops: { f: number; c: [number, number, number] }[] = [
    { f: 70, c: [45, 160, 165] },
    { f: 80, c: [110, 170, 140] },
    { f: 88, c: [214, 178, 100] },
    { f: 95, c: [225, 120, 70] },
    { f: 104, c: [196, 50, 45] },
    { f: 113, c: [140, 20, 30] },
  ];
  const f = Math.max(60, Math.min(120, tempF));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (f >= a.f && f <= b.f) {
      const t = (f - a.f) / (b.f - a.f);
      const mix = a.c.map((v, k) => Math.round(v + t * (b.c[k] - v)));
      return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
    }
  }
  return "rgb(196,50,45)";
}

export interface DesignSummary {
  avgBeforeF: number;
  avgAfterF: number;
  maxBeforeF: number;
  maxAfterF: number;
  avgDropC: number;
  cells: HeatCell[];
}

/** Apply the design to a heat grid → simulated cells + before/after summary. */
export function simulateDesign(cells: HeatCell[], placements: Placement[]): DesignSummary {
  let sumB = 0;
  let sumA = 0;
  let maxB = -Infinity;
  let maxA = -Infinity;
  const out: HeatCell[] = cells.map((c) => {
    const dropC = cellDropC(c, placements);
    const afterF = c.temp_f - dropC * 1.8;
    sumB += c.temp_f;
    sumA += afterF;
    maxB = Math.max(maxB, c.temp_f);
    maxA = Math.max(maxA, afterF);
    return {
      ...c,
      temp_f: Math.round(afterF * 10) / 10,
      temp_c: Math.round((c.temp_c - dropC) * 10) / 10,
      color: tempColorF(afterF),
    };
  });
  return {
    avgBeforeF: cells.length ? sumB / cells.length : 0,
    avgAfterF: cells.length ? sumA / cells.length : 0,
    maxBeforeF: cells.length ? maxB : 0,
    maxAfterF: cells.length ? maxA : 0,
    avgDropC: cells.length ? ((sumB - sumA) / cells.length) / 1.8 : 0,
    cells: out,
  };
}

// ── Water-station placement (papers: hottest spots first, spacing, refuges) ──

export interface StationSuggestion {
  lat: number;
  lng: number;
  tempF: number;
  reason: string;
}

/**
 * Greedy hottest-first placement with a minimum spacing so stations cover the
 * whole hot area (P2: green/blue refuges must be easy-to-access for vulnerable
 * people; P1: >33 °C = survival infrastructure beats geometry).
 */
export function suggestWaterStations(
  cells: HeatCell[],
  existing: LatLng[],
  opts?: { count?: number; minSpacingM?: number },
): StationSuggestion[] {
  const count = opts?.count ?? 5;
  const minSpacing = opts?.minSpacingM ?? 120;
  const sorted = [...cells].sort((a, b) => b.temp_f - a.temp_f);
  if (!sorted.length) return [];
  const mean = sorted.reduce((s, c) => s + c.temp_f, 0) / sorted.length;
  const taken: LatLng[] = [...existing];
  const out: StationSuggestion[] = [];
  for (const c of sorted) {
    if (out.length >= count) break;
    if (c.temp_f < mean + 1.5 && out.length >= 2) break; // cooler area: stop early
    const far = taken.every((t) => metersBetween(t, c) >= minSpacing);
    if (!far) continue;
    taken.push(c);
    out.push({
      lat: c.lat,
      lng: c.lng,
      tempF: c.temp_f,
      reason: `${Math.round(c.temp_f)}°F hotspot · ≥${minSpacing} m from other water · Lee & Kim 2022: vulnerable people need easy-access cool refuges`,
    });
  }
  return out;
}
