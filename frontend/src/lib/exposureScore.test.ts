import { describe, expect, it } from "vitest";
import type { HeatCell } from "../api";
import { rankExposureCells } from "./exposureScore";

const cell = (lat: number, lng: number, f: number): HeatCell => ({
  lat, lng, temp_f: f, temp_c: (f - 32) * 5 / 9, risk: "high", color: "#f00", source: "mock",
});

describe("rankExposureCells", () => {
  it("ranks a hot far-from-hospital canopy-gap cell first", () => {
    const cells = [cell(34, -118, 90), cell(34.01, -118, 110)];
    const r = rankExposureCells(cells, {
      vegetation: [{ lat: 34, lng: -118 }],
      buildings: [],
      hospitals: [{ lat: 34, lng: -118 }],
    }, 2);
    expect(r[0].cell.temp_f).toBe(110);
    expect(r[0].canopyGap).toBe(true);
  });
});
