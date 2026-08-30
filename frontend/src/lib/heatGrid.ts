import { getHeatGrid, type HeatCell } from "../api";

/** Mock / backend grid used by App without importing MapLibre. */
export async function loadHeatGrid(lat: number, lng: number, spanDeg = 0.04): Promise<HeatCell[]> {
  const res = await getHeatGrid(lat, lng, spanDeg, 24);
  return res.cells ?? res.points ?? [];
}
