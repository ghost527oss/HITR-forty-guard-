import { describe, expect, it } from "vitest";
import {
  cellDropC,
  designContributions,
  heatwaveStatus,
  metersBetween,
  PLACEMENT_META,
  pmvFanger,
  pmvLabel,
  ppdFromPmv,
  simulateDesign,
  suggestPlacements,
  suggestWaterStations,
  tempColorF,
  TOTAL_DROP_CAP_C,
  windUnitVector,
  windVentilationScore,
  type Placement,
  type PlacementKind,
  type PlacementContext,
} from "./uhiFactors";
import type { HeatCell } from "../api";

const ORIGIN = { lat: 34.0522, lng: -118.2437 };

function placement(kind: PlacementKind, lat = ORIGIN.lat, lng = ORIGIN.lng): Placement {
  return { id: `${kind}-${lat}-${lng}-${Math.random()}`, kind, lat, lng };
}

function cell(tempF: number, lat = ORIGIN.lat, lng = ORIGIN.lng): HeatCell {
  return {
    lat,
    lng,
    temp_f: tempF,
    temp_c: ((tempF - 32) * 5) / 9,
    risk: "high",
    color: tempColorF(tempF),
    source: "mock",
  };
}

describe("pmvFanger (ISO 7730)", () => {
  // The fixed-point iteration diverges for light summer clothing without the
  // 0.25 damping factor. These tests are the guard on that.
  it("returns a finite value inside [-3, 3] across a wide input range", () => {
    for (const taC of [10, 20, 25, 30, 35, 40, 45]) {
      for (const clo of [0.1, 0.5, 1.0]) {
        for (const va of [0.05, 0.5, 2, 5]) {
          const pmv = pmvFanger({ taC, trC: taC + 5, va, rh: 50, met: 2.0, clo });
          expect(Number.isFinite(pmv), `pmv not finite at taC=${taC} clo=${clo} va=${va}`).toBe(true);
          expect(pmv).toBeGreaterThanOrEqual(-3);
          expect(pmv).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it("rises monotonically with air temperature", () => {
    const base = { trC: 32, va: 0.5, rh: 50, met: 2.0, clo: 0.5 };
    const cool = pmvFanger({ ...base, taC: 22, trC: 22 });
    const warm = pmvFanger({ ...base, taC: 28, trC: 28 });
    const hot = pmvFanger({ ...base, taC: 36, trC: 36 });
    expect(cool).toBeLessThan(warm);
    expect(warm).toBeLessThan(hot);
  });

  it("wind reduces thermal sensation (P1: PPD falls sharply with wind)", () => {
    // Kept off the clamp: at 34 C+ both readings saturate at +3 and the
    // difference is invisible. 30 C sits mid-scale where the effect shows.
    const still = pmvFanger({ taC: 30, trC: 33, va: 0.1, rh: 50 });
    const breezy = pmvFanger({ taC: 30, trC: 33, va: 3.0, rh: 50 });
    expect(still).toBeLessThan(3);
    expect(breezy).toBeLessThan(still);
  });
});

describe("ppdFromPmv", () => {
  it("is bounded 5..100 and minimised at neutral", () => {
    expect(ppdFromPmv(0)).toBeLessThan(6);
    expect(ppdFromPmv(3)).toBeGreaterThan(95);
    expect(ppdFromPmv(0)).toBeLessThan(ppdFromPmv(1));
    expect(ppdFromPmv(1)).toBeLessThan(ppdFromPmv(2));
  });

  it("is symmetric — cold and warm are equally uncomfortable", () => {
    expect(ppdFromPmv(-2)).toBeCloseTo(ppdFromPmv(2), 6);
  });
});

describe("pmvLabel", () => {
  it("maps the ISO sensation scale", () => {
    expect(pmvLabel(2.5).text).toBe("Hot");
    expect(pmvLabel(1.5).text).toBe("Warm");
    expect(pmvLabel(0).text).toBe("Comfortable");
    expect(pmvLabel(-2).text).toBe("Cool");
  });
});

describe("heatwaveStatus (official definitions, Lee & Kim 2022)", () => {
  it("alerts on 3 consecutive days at/above 35 C", () => {
    const status = heatwaveStatus([
      { tMaxC: 36, tMinC: 20 },
      { tMaxC: 37, tMinC: 20 },
      { tMaxC: 35, tMinC: 20 },
    ]);
    expect(status.level).toBe("alert");
  });

  it("alerts on a warm 3-day mean with warm nights", () => {
    const status = heatwaveStatus([
      { tMaxC: 29, tMinC: 22 },
      { tMaxC: 30, tMinC: 21 },
      { tMaxC: 28, tMinC: 23 },
    ]);
    expect(status.level).toBe("alert");
  });

  it("does NOT alert when nights are cool, even with warm days", () => {
    const status = heatwaveStatus([
      { tMaxC: 30, tMinC: 15 },
      { tMaxC: 30, tMinC: 14 },
      { tMaxC: 29, tMinC: 13 },
    ]);
    expect(status.level).not.toBe("alert");
  });

  it("stays calm in mild weather", () => {
    const status = heatwaveStatus([
      { tMaxC: 22, tMinC: 12 },
      { tMaxC: 23, tMinC: 13 },
      { tMaxC: 24, tMinC: 12 },
    ]);
    expect(status.level).toBe("none");
  });

  it("flags an incomplete forecast instead of silently passing", () => {
    const status = heatwaveStatus([{ tMaxC: 36, tMinC: 20 }]);
    expect(status.level).toBe("watch");
  });
});

describe("cellDropC — cooling caps", () => {
  it("gives no cooling when nothing is placed", () => {
    expect(cellDropC(ORIGIN, [])).toBe(0);
  });

  it("gives no cooling outside a placement's radius", () => {
    const far = { lat: ORIGIN.lat + 0.01, lng: ORIGIN.lng }; // ~1.1 km away
    expect(cellDropC(far, [placement("tree_cluster")])).toBe(0);
  });

  it("decays with distance", () => {
    const near = cellDropC({ lat: ORIGIN.lat + 0.0001, lng: ORIGIN.lng }, [placement("tree_cluster")]);
    const far = cellDropC({ lat: ORIGIN.lat + 0.0006, lng: ORIGIN.lng }, [placement("tree_cluster")]);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it("caps each kind at its own limit no matter how many are stacked", () => {
    const many = Array.from({ length: 50 }, () => placement("tree_cluster"));
    expect(cellDropC(ORIGIN, many)).toBeCloseTo(PLACEMENT_META.tree_cluster.capC, 6);
  });

  it("never exceeds the total 3.5 C cap", () => {
    const kinds: PlacementKind[] = ["tree_cluster", "water_station", "cool_roof", "garden"];
    const everything = kinds.flatMap((k) => Array.from({ length: 30 }, () => placement(k)));
    expect(cellDropC(ORIGIN, everything)).toBeLessThanOrEqual(TOTAL_DROP_CAP_C);
    expect(cellDropC(ORIGIN, everything)).toBeCloseTo(TOTAL_DROP_CAP_C, 6);
  });
});

describe("simulateDesign", () => {
  it("never reports a bigger drop than the cap allows", () => {
    const cells = [cell(105), cell(104), cell(106)];
    const kinds: PlacementKind[] = ["tree_cluster", "garden", "cool_roof"];
    const halfM = 0.0004; // ~45 m — inside every radius
    const placements = kinds.map((k) => placement(k, ORIGIN.lat + halfM, ORIGIN.lng + halfM));

    const result = simulateDesign(cells, placements);
    expect(result.avgDropC).toBeLessThanOrEqual(TOTAL_DROP_CAP_C);
    expect(result.avgAfterF).toBeLessThan(result.avgBeforeF);
  });

  it("leaves the grid untouched when there are no placements", () => {
    const cells = [cell(100), cell(98)];
    const result = simulateDesign(cells, []);
    expect(result.avgAfterF).toBeCloseTo(result.avgBeforeF, 6);
    expect(result.avgDropC).toBeCloseTo(0, 6);
  });

  it("lowers the peak as well as the average", () => {
    const cells = [cell(110), cell(90)];
    const result = simulateDesign(cells, [placement("garden")]);
    expect(result.maxAfterF).toBeLessThanOrEqual(result.maxBeforeF);
  });

  it("handles an empty grid without throwing", () => {
    const result = simulateDesign([], [placement("tree_cluster")]);
    expect(result.cells).toEqual([]);
    expect(result.avgBeforeF).toBe(0);
  });
});

describe("suggestWaterStations", () => {
  const grid: HeatCell[] = [
    cell(110, 34.0522, -118.2437),
    cell(108, 34.0523, -118.2437),
    cell(106, 34.0542, -118.2437), // ~220 m north
    cell(104, 34.0562, -118.2437), // ~440 m north
    cell(90, 34.0602, -118.2437),  // cool, far
  ];

  it("places the first station on the hottest cell", () => {
    const [first] = suggestWaterStations(grid, []);
    expect(first.tempF).toBe(110);
  });

  it("respects minimum spacing between stations", () => {
    const picks = suggestWaterStations(grid, [], { count: 5, minSpacingM: 120 });
    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        expect(metersBetween(picks[i], picks[j])).toBeGreaterThanOrEqual(120);
      }
    }
  });

  it("treats existing stations as occupied", () => {
    const occupied = [grid[0]];
    const picks = suggestWaterStations(grid, occupied, { count: 5, minSpacingM: 120 });
    expect(picks.every((p) => metersBetween(p, grid[0]) >= 120)).toBe(true);
  });

  it("returns nothing for an empty grid", () => {
    expect(suggestWaterStations([], [])).toEqual([]);
  });

  it("explains why each station was chosen", () => {
    for (const pick of suggestWaterStations(grid, [])) {
      expect(pick.reason).toMatch(/\d/);
    }
  });
});

describe("geometry & wind helpers", () => {
  it("metersBetween matches a known distance", () => {
    // ~111.32 km per degree of latitude
    const d = metersBetween({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("metersBetween is zero for identical points", () => {
    expect(metersBetween(ORIGIN, ORIGIN)).toBeCloseTo(0, 6);
  });

  it("windUnitVector returns a unit vector pointing downwind", () => {
    for (const deg of [0, 45, 90, 180, 270]) {
      const { u, v } = windUnitVector(deg);
      expect(Math.hypot(u, v)).toBeCloseTo(1, 6);
    }
    // A wind FROM the north blows toward the south (negative y / negative v)
    expect(windUnitVector(0).v).toBeLessThan(0);
  });

  it("windVentilationScore is clamped 0..1", () => {
    expect(windVentilationScore(0)).toBe(0);
    expect(windVentilationScore(2)).toBe(0);
    expect(windVentilationScore(4.5)).toBeCloseTo(0.5, 6);
    expect(windVentilationScore(50)).toBe(1);
  });
});

describe("tempColorF", () => {
  it("returns a valid rgb colour across the whole range", () => {
    for (let f = 40; f <= 140; f += 5) {
      expect(tempColorF(f)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    }
  });

  it("clamps extremes instead of returning an out-of-range colour", () => {
    expect(tempColorF(-50)).toBe(tempColorF(60));
    expect(tempColorF(500)).toBe(tempColorF(120));
  });
});

describe("suggestPlacements — factor-driven placement (the 'why here' engine)", () => {
  // Hot strip heading north, then a cool tail. A 24 m building beside the
  // hottest cell; existing canopy 2 m from the second-hottest cell.
  const hot = cell(110, 34.0522, -118.2437);
  const second = cell(108, 34.0532, -118.2437); // ~110 m north
  const third = cell(106, 34.0542, -118.2437); // ~220 m north
  const fourth = cell(104, 34.0552, -118.2437); // ~330 m north
  const cool = cell(88, 34.0622, -118.2437); // cool, far
  const grid = [hot, second, third, fourth, cool];
  const building = { lat: 34.05225, lng: -118.24365, height_m: 24 };
  const canopyBySecond = { lat: 34.05322, lng: -118.24372 };

  const bareCtx: PlacementContext = { vegetation: [], buildings: [], hospitals: [] };

  it("targets the hottest cell first and cites the canyon factor", () => {
    const picks = suggestPlacements(grid, { ...bareCtx, buildings: [building] }, "tree_cluster", { count: 5 });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks[0].lat).toBe(hot.lat);
    expect(picks[0].lng).toBe(hot.lng);
    expect(picks[0].reason).toMatch(/canyon/);
  });

  it("skips a hot cell that already has canopy nearby (diminishing returns)", () => {
    const picks = suggestPlacements(grid, { ...bareCtx, vegetation: [canopyBySecond] }, "tree_cluster", {
      count: 5,
    });
    expect(picks.some((p) => p.lat === second.lat && p.lng === second.lng)).toBe(false);
    expect(picks.some((p) => p.lat === hot.lat && p.lng === hot.lng)).toBe(true);
  });

  it("only places cool roofs where a building is actually nearby", () => {
    const picks = suggestPlacements(grid, { ...bareCtx, buildings: [building] }, "cool_roof", { count: 5 });
    expect(picks.length).toBe(1); // only the hottest cell has a roof within 60 m
    expect(picks[0].reason).toMatch(/24 m building/);
  });

  it("keeps gardens off rooftops (open ground only)", () => {
    const picks = suggestPlacements(grid, { ...bareCtx, buildings: [building] }, "garden", { count: 5 });
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) {
      expect(metersBetween(p, building)).toBeGreaterThan(40);
    }
  });

  it("notes hospital proximity for water stations", () => {
    const hospital = { lat: 34.05225, lng: -118.2438 };
    const picks = suggestPlacements(grid, { ...bareCtx, hospitals: [hospital] }, "water_station", { count: 1 });
    expect(picks.length).toBe(1);
    expect(picks[0].reason).toMatch(/hospital/);
  });

  it("respects spacing against existing placements", () => {
    const existing: Placement[] = [{ id: "x", kind: "tree_cluster", lat: hot.lat, lng: hot.lng }];
    const picks = suggestPlacements(grid, bareCtx, "tree_cluster", { count: 5, existing });
    for (const p of picks) {
      expect(metersBetween(p, existing[0])).toBeGreaterThanOrEqual(80);
    }
  });

  it("is deterministic — same input, same picks", () => {
    const a = suggestPlacements(grid, { ...bareCtx, buildings: [building] }, "tree_cluster", { count: 5 });
    const b = suggestPlacements(grid, { ...bareCtx, buildings: [building] }, "tree_cluster", { count: 5 });
    expect(a).toEqual(b);
  });

  it("never invents a placement for a cold grid", () => {
    const cold = [cell(80, 34.0522, -118.2437), cell(82, 34.0532, -118.2437)];
    expect(suggestPlacements(cold, bareCtx, "tree_cluster", { count: 5 })).toEqual([]);
  });
});

describe("designContributions", () => {
  it("groups by kind in tool order with the paper meta", () => {
    const ps = [placement("garden"), placement("tree_cluster"), placement("tree_cluster")];
    const contribs = designContributions(ps);
    expect(contribs.map((c) => c.kind)).toEqual(["tree_cluster", "garden"]);
    expect(contribs[0].count).toBe(2);
    expect(contribs[0].radiusM).toBe(PLACEMENT_META.tree_cluster.radiusM);
    expect(contribs[0].centerDropC).toBe(PLACEMENT_META.tree_cluster.centerDropC);
  });

  it("omits kinds that were not placed", () => {
    expect(designContributions([placement("garden")]).map((c) => c.kind)).toEqual(["garden"]);
  });
});

describe("simulateDesign — affected-area reporting", () => {
  it("counts only the cells actually cooled and reports the strongest drop", () => {
    const cells = [cell(110), cell(110, ORIGIN.lat + 0.005, ORIGIN.lng), cell(110, ORIGIN.lat + 0.02, ORIGIN.lng)];
    const result = simulateDesign(cells, [placement("tree_cluster")]);
    expect(result.affectedCells).toBe(1); // only the cell inside the 100 m radius
    expect(result.maxDropC).toBeCloseTo(PLACEMENT_META.tree_cluster.centerDropC, 6);
  });

  it("reports zero effect for an empty design", () => {
    const result = simulateDesign([cell(110)], []);
    expect(result.affectedCells).toBe(0);
    expect(result.maxDropC).toBe(0);
  });
});
