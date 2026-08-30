import { describe, expect, it } from "vitest";
import type { HeatCell } from "../api";
import { buildMapScenario, rankPriorityCells } from "./mapScenario";

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
});
