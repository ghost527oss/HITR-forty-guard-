/** Client-only Now/After + priority ranking over the existing heat grid. */
import type { HeatCell } from "../api";
import {
  simulateDesign,
  suggestPlacements,
  metersBetween,
  type DesignSummary,
  type Placement,
  type PlacementContext,
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

export type BudgetTier = "low" | "med" | "high";

/** Cost buckets aligned with planner `_COST`: trees=low, water/roof=medium. */
export function packPlacementsByBudget(placements: Placement[], tier: BudgetTier): Placement[] {
  if (tier === "low") return placements.filter((p) => p.kind === "tree_cluster");
  if (tier === "med") return placements.filter((p) => p.kind === "tree_cluster" || p.kind === "water_station");
  return placements;
}

export function buildMapScenario(cells: HeatCell[], ctx: PlacementContext = EMPTY_CTX): MapScenario | null {
  if (!cells.length) return null;
  const trees = suggestPlacements(cells, ctx, "tree_cluster", { count: 5 });
  const water = suggestPlacements(cells, ctx, "water_station", {
    count: 4,
    existing: trees,
  });
  const roofs = suggestPlacements(cells, ctx, "cool_roof", { count: 4 });
  const placements = [...trees, ...water, ...roofs];
  const summary = simulateDesign(cells, placements);
  return {
    placements,
    summary,
    priority: rankPriorityCells(cells, 3),
  };
}

export function scenarioAtBudget(
  cells: HeatCell[],
  full: MapScenario,
  tier: BudgetTier,
): MapScenario {
  const placements = packPlacementsByBudget(full.placements, tier);
  return {
    placements,
    summary: simulateDesign(cells, placements),
    priority: full.priority,
  };
}
