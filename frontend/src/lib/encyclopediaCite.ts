/** Map planner intervention keys to encyclopedia slugs (grounded, not LLM). */
export const INTERVENTION_CITE_SLUG: Record<string, string> = {
  trees: "tree-canopy",
  shade: "tree-canopy",
  water: "hydration",
  roof: "cool-roof",
  orientation: "cross-ventilation",
  shelter_belt: "shelter-belt",
  replan: "urban-heat-island",
  green_network: "tree-canopy",
  street_grid: "urban-heat-island",
  zoning: "urban-heat-island",
  district_cooling: "evaporative-cooling",
  wind_corridor: "cross-ventilation",
  hospital_access: "hydration",
  protect_coolspot: "tree-canopy",
  equity_priority: "urban-heat-island",
  protective_cooling: "hydration",
};

export interface CiteEntry {
  slug: string;
  title: string;
  plain_language: string;
}

export function citeForKey(key: string, entries: CiteEntry[]): CiteEntry | null {
  const slug = INTERVENTION_CITE_SLUG[key];
  if (!slug || !entries.length) return null;
  return entries.find((e) => e.slug === slug) ?? null;
}
