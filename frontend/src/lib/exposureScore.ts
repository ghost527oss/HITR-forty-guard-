import type { HeatCell } from "../api";
import { metersBetween, type PlacementContext } from "../planner/uhiFactors";

export interface ExposureRank {
  cell: HeatCell;
  score: number;
  canopyGap: boolean;
  hospitalM: number | null;
}

/** Heat percentile × canopy gap × inverse hospital access. No invented census. */
export function rankExposureCells(
  cells: HeatCell[],
  ctx: PlacementContext,
  n = 3,
): ExposureRank[] {
  if (!cells.length) return [];
  const temps = [...cells].map((c) => c.temp_f).sort((a, b) => a - b);
  const pct = (t: number) => {
    const i = temps.findIndex((x) => x >= t);
    return temps.length <= 1 ? 1 : Math.max(0, i) / (temps.length - 1);
  };
  const ranked = cells.map((cell) => {
    const canopyGap =
      ctx.vegetation.length === 0
        ? true
        : Math.min(...ctx.vegetation.map((v) => metersBetween(cell, v))) >= 60;
    let hospitalM: number | null = null;
    if (ctx.hospitals?.length) {
      hospitalM = Math.min(...ctx.hospitals.map((h) => metersBetween(cell, h)));
    }
    const far = hospitalM == null ? 0.5 : Math.min(1, hospitalM / 800);
    const score = pct(cell.temp_f) * (canopyGap ? 1 : 0.45) * (0.5 + 0.5 * far);
    return { cell, score, canopyGap, hospitalM };
  });
  return ranked.sort((a, b) => b.score - a.score || b.cell.temp_f - a.cell.temp_f).slice(0, n);
}
