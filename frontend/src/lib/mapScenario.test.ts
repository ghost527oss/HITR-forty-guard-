import { describe, expect, it } from "vitest";
import type { HeatCell } from "../api";
import { buildMapScenario, mergeManualDrops, nearestCoolerTile, packPlacementsByBudget, rankPriorityCells } from "./mapScenario";

const cell = (lat: number, lng: number, f: number): HeatCell => ({
  lat,
  lng,
  temp_f: f,
  temp_c: (f - 32) * 5 / 9,
  risk: f >= 100 ? "very_high" : "high",
  color: "#f00",
  source: "mock",
});

describe("rankPriorityCells", () => {
  it("returns the hottest cells first, capped", () => {
    const ranked = rankPriorityCells([
      cell(1, 1, 90),
      cell(2, 2, 110),
      cell(3, 3, 100),
      cell(4, 4, 95),
    ], 3);
    expect(ranked.map((c) => c.temp_f)).toEqual([110, 100, 95]);
  });
});

describe("nearestCoolerTile", () => {
  it("picks a cooler cell that is not the origin", () => {
    const cells = [
      cell(34.05, -118.24, 110),
      cell(34.06, -118.24, 88),
      cell(34.05, -118.25, 92),
    ];
    const n = nearestCoolerTile({ lat: 34.05, lng: -118.24 }, cells);
    expect(n).not.toBeNull();
    expect(n!.cell.temp_f).toBe(92);
    expect(n!.meters).toBeGreaterThan(8);
  });
});

describe("buildMapScenario", () => {
  it("returns null for an empty grid", () => {
    expect(buildMapScenario([])).toBeNull();
  });

  it("places interventions on a hot grid and cools some cells", () => {
    const cells: HeatCell[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        cells.push(cell(34 + i * 0.002, -118 + j * 0.002, 98 + (i + j) * 0.4));
      }
    }
    const s = buildMapScenario(cells);
    expect(s).not.toBeNull();
    expect(s!.priority).toHaveLength(3);
    expect(s!.priority[0].temp_f).toBeGreaterThanOrEqual(s!.priority[1].temp_f);
    if (s!.placements.length > 0) {
      expect(s!.summary.affectedCells).toBeGreaterThan(0);
      expect(s!.summary.maxDropC).toBeGreaterThan(0);
      expect(s!.summary.cells).toHaveLength(cells.length);
    }
  });

  it("places cool roofs only on buildings", () => {
    const cells: HeatCell[] = [];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        cells.push(cell(34 + i * 0.002, -118 + j * 0.002, 100 + i));
      }
    }
    expect(buildMapScenario(cells)!.placements.some((p) => p.kind === "cool_roof")).toBe(false);
    const withB = buildMapScenario(cells, {
      vegetation: [],
      buildings: cells.map((c) => ({ lat: c.lat, lng: c.lng, height_m: 18 })),
    });
    expect(withB!.placements.some((p) => p.kind === "cool_roof")).toBe(true);
  });
});

describe("packPlacementsByBudget", () => {
  it("keeps only trees on Low", () => {
    const packed = packPlacementsByBudget([
      { id: "1", kind: "tree_cluster", lat: 1, lng: 1 },
      { id: "2", kind: "water_station", lat: 2, lng: 2 },
      { id: "3", kind: "cool_roof", lat: 3, lng: 3 },
    ], "low");
    expect(packed.map((p) => p.kind)).toEqual(["tree_cluster"]);
  });
});

describe("mergeManualDrops", () => {
  it("adds a dropped tree and cools the site cell", () => {
    const cells = [cell(34.05, -118.24, 104), cell(34.06, -118.24, 90)];
    const m = mergeManualDrops(cells, [], [{ id: "d1", kind: "tree_cluster", lat: 34.05, lng: -118.24 }]);
    expect(m.placements).toHaveLength(1);
    expect(m.summary.maxDropC).toBeGreaterThan(0);
    expect(m.summary.cells[0].temp_f).toBeLessThan(104);
  });
});
