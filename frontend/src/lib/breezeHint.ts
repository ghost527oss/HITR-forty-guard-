import { windVentilationScore } from "../planner/uhiFactors";

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function compassFromDeg(fromDeg: number): string {
  const d = ((fromDeg % 360) + 360) % 360;
  const i = Math.round(d / 45) % 8;
  return POINTS[i];
}

export function breezeHint(windDir: number, windMs: number): string {
  const from = compassFromDeg(windDir);
  const vent = windVentilationScore(windMs);
  const windward = `trees on the windward (${from}) side of this canyon`;
  if (vent >= 0.6) {
    return `Wind from ${from} at ${windMs.toFixed(1)} m/s — breeze already helps walk comfort; still plant ${windward}.`;
  }
  if (vent <= 0.15) {
    return `Wind from ${from} at ${windMs.toFixed(1)} m/s (weak) — ${windward} so shade is not stalled air.`;
  }
  return `Prevailing wind from ${from} — ${windward} so shade meets the breeze.`;
}
