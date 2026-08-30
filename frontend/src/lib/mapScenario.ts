/** Client-only Now/After + priority ranking over the existing heat grid. */
import type { HeatCell } from "../api";
import {
  simulateDesign,
  suggestPlacements,
  metersBetween,
  type DesignSummary,
  type Placement,
  type LatLng,
} from "../planner/uhiFactors";

export interface MapScenario {
  placements: Placement[];
  summary: DesignSummary;
  priority: HeatCell[];
}

const EMPTY_CTX = { vegetation: [] as { lat: number; lng: number }[], buildings: [] as { lat: number; lng: number; height_m: number }[] };

/** Cooler = at least 1.5°F below the grid mean; skip tiles closer than 8 m. */
export function nearestCoolerTile(
  from: LatLng,
  cells: HeatCell[],
): { cell: HeatCell; meters: number } | null {
  if (!cells.length) return null;
  const mean = cells.reduce((s, c) => s + c.temp_f, 0) / cells.length;
  const threshold = mean - 1.5;
  let best: { cell: HeatCell; meters: number } | null = null;
  for (const cell of cells) {
    if (cell.temp_f > threshold) continue;
    const meters = metersBetween(from, cell);
    if (meters < 8) continue;
    if (!best || meters < best.meters) best = { cell, meters };
  }
  return best;
}

export function rankPriorityCells(cells: HeatCell[], n = 3): HeatCell[] {
  if (!cells.length) return [];
  return [...cells].sort((a, b) => b.temp_f - a.temp_f || a.lat - b.lat).slice(0, n);
}

export function buildMapScenario(cells: HeatCell[]): MapScenario | null {
  if (!cells.length) return null;
  const trees = suggestPlacements(cells, EMPTY_CTX, "tree_cluster", { count: 5 });
  const water = suggestPlacements(cells, EMPTY_CTX, "water_station", {
    count: 4,
    existing: trees,
  });
  const placements = [...trees, ...water];
  const summary = simulateDesign(cells, placements);
  return {
    placements,
    summary,
    priority: rankPriorityCells(cells, 3),
  };
}
