import type { DesignSummary, Placement } from "../planner/uhiFactors";

export interface SavedStudioDesign {
  label: "A" | "B";
  savedAt: string;
  locationName: string;
  lat: number;
  lng: number;
  placements: Placement[];
  summary: Pick<DesignSummary, "maxDropC" | "affectedCells" | "maxBeforeF" | "maxAfterF">;
}

const KEY = "hitr.studio-ab";

export function loadStudioPair(): { A: SavedStudioDesign | null; B: SavedStudioDesign | null } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { A: null, B: null };
    const j = JSON.parse(raw) as { A?: SavedStudioDesign | null; B?: SavedStudioDesign | null };
    return { A: j.A ?? null, B: j.B ?? null };
  } catch {
    return { A: null, B: null };
  }
}

export function saveStudioSlot(
  slot: "A" | "B",
  design: Omit<SavedStudioDesign, "label" | "savedAt">,
): { A: SavedStudioDesign | null; B: SavedStudioDesign | null } {
  const pair = loadStudioPair();
  pair[slot] = { ...design, label: slot, savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(pair));
  return pair;
}

export function compareStudioPair(a: SavedStudioDesign, b: SavedStudioDesign) {
  return {
    dropDeltaC: b.summary.maxDropC - a.summary.maxDropC,
    cellsDelta: b.summary.affectedCells - a.summary.affectedCells,
    countA: a.placements.length,
    countB: b.placements.length,
  };
}
