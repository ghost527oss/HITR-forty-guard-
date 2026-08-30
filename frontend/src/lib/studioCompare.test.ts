import { describe, expect, it } from "vitest";
import { compareStudioPair, type SavedStudioDesign } from "./studioCompare";

const stub = (label: "A" | "B", drop: number, cells: number, n: number): SavedStudioDesign => ({
  label,
  savedAt: "2026-08-30",
  locationName: "LA",
  lat: 34,
  lng: -118,
  placements: Array.from({ length: n }, (_, i) => ({
    id: `${label}${i}`,
    kind: "tree_cluster",
    lat: 34,
    lng: -118,
  })),
  summary: { maxDropC: drop, affectedCells: cells, maxBeforeF: 100, maxAfterF: 98 },
});

describe("compareStudioPair", () => {
  it("reports B minus A for drop and cells", () => {
    const c = compareStudioPair(stub("A", 0.8, 10, 2), stub("B", 1.4, 18, 5));
    expect(c.dropDeltaC).toBeCloseTo(0.6);
    expect(c.cellsDelta).toBe(8);
    expect(c.countA).toBe(2);
    expect(c.countB).toBe(5);
  });
});
