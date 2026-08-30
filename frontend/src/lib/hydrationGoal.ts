/** Daily water goal from forecast max + heatwave — not a static 2500 ml. */
export function dailyWaterGoalMl(tMaxC: number | null | undefined, heatwaveAlert: boolean): number {
  const base = 2500;
  if (tMaxC == null || Number.isNaN(tMaxC)) {
    return heatwaveAlert ? 3000 : base;
  }
  const extraHeat = Math.max(0, Math.round((tMaxC - 30) * 150));
  const extraWave = heatwaveAlert ? 500 : 0;
  return Math.min(4500, base + extraHeat + extraWave);
}
