// Thin typed client for the HITR backend. Uses relative /api paths so the
// Vite proxy routes them to FastAPI in dev (no hardcoded origin in the browser).

export interface HeatReading {
  lat: number;
  lng: number;
  temp_f: number;
  temp_c: number;
  risk: string;
  color: string;
  source: string;
  measured_at: string;
}

// FortyGuard-style colored tile cell (rectangle)
export interface HeatCell {
  lat: number;
  lng: number;
  temp_f: number;
  temp_c: number;
  risk: string;
  color: string;
  source: string;
}

export interface HeatGridResponse {
  provider: string;
  count: number;
  cells?: HeatCell[];
  /** Backend field name (known contract mismatch — tolerated until backend fix). */
  points?: HeatCell[];
}

// ── Live weather (Open-Meteo: free, no API key) ──────────────────────────────

export interface WeatherDay {
  t_max_c: number;
  t_min_c: number;
}

export interface WeatherNow {
  temp_c: number;
  wind_ms: number;
  wind_dir: number;
  rh: number;
  days: WeatherDay[];
}

export async function getWeatherNow(lat: number, lng: number): Promise<WeatherNow> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m` +
    `&daily=temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = (await res.json()) as any;
  const times: string[] = j.daily?.time ?? [];
  return {
    temp_c: j.current?.temperature_2m ?? 0,
    wind_ms: j.current?.wind_speed_10m ?? 0,
    wind_dir: j.current?.wind_direction_10m ?? 0,
    rh: j.current?.relative_humidity_2m ?? 40,
    days: times.map((_, i) => ({
      t_max_c: j.daily?.temperature_2m_max?.[i] ?? 0,
      t_min_c: j.daily?.temperature_2m_min?.[i] ?? 0,
    })),
  };
}

export interface LandInfo {
  kind: string;
  label: string;
  detail: string | null;
  source: string;
}

export interface SpotAnalysis {
  heat: HeatReading;
  land: LandInfo;
  summary: string;
}

// Point 4: Pattern recognition result
export interface PatternAnalysis {
  lat: number;
  lng: number;
  kind: string;
  land_label: string;
  temp_f: number;
  temp_c: number;
  risk: string;
  heat_severity: number;
  heat_severity_pct: string;
  pattern: string;
  pattern_label: string;
  summary: string;
}

export interface Intervention {
  rank: number;
  what: string;
  where: string;
  why: string;
  impact: string;
  cost: string;
  key: string;
}

/** How much of the city a plan touches. Every level states this plainly. */
export interface PlanScale {
  level: number;
  label: string;
  /** Plain-language description of what is physically affected. */
  touches: string;
  /** True from level 3 up — street grid / zoning / utilities are altered. */
  changes_city: boolean;
  note: string;
}

export interface Plan {
  lat: number;
  lng: number;
  change_level: number;
  change_label: string;
  scale: PlanScale;
  land: LandInfo;
  temp_f: number;
  temp_c: number;
  risk: string;
  pattern: string;
  pattern_label: string;
  /** 0–100% — where this spot sits on the local heat range. */
  heat_severity_pct: string;
  interventions: Intervention[];
  /** Present at level 0, where there are no interventions to list. */
  note?: string | null;
}

// Point 5: 5 change levels (0=observe, 1=light, 2=medium, 3=re-plan, 4=rebuild)
export type ChangeLevel = 0 | 1 | 2 | 3 | 4;
export const CHANGE_LEVELS: { value: ChangeLevel; label: string; desc: string }[] = [
  { value: 0, label: "Observe", desc: "Report current conditions only. No physical change." },
  { value: 1, label: "Light", desc: "Add trees, shade & water. City looks the same." },
  { value: 2, label: "Medium", desc: "Plus building retrofit & orientation guidance." },
  { value: 3, label: "Re-plan", desc: "Redesign block layout, solar, water features." },
  { value: 4, label: "Rebuild", desc: "Full masterplan: streets, zoning, utilities & green network redesigned." },
];

// Point 3: California cities for quick-select
export interface CaliforniaCity {
  name: string;
  lat: number;
  lng: number;
  region: string;
}

export const CALIFORNIA_CITIES: CaliforniaCity[] = [
  { name: "Los Angeles",    lat: 34.0522, lng: -118.2437, region: "Southern California" },
  { name: "San Francisco",  lat: 37.7749, lng: -122.4194, region: "Northern California" },
  { name: "San Diego",      lat: 32.7157, lng: -117.1611, region: "Southern California" },
  { name: "Sacramento",     lat: 38.5816, lng: -121.4944, region: "Central Valley" },
  { name: "Fresno",         lat: 36.7378, lng: -119.7871, region: "Central Valley" },
  { name: "San Jose",       lat: 37.3382, lng: -121.8863, region: "Northern California" },
  { name: "Oakland",        lat: 37.8044, lng: -122.2712, region: "Northern California" },
  { name: "Bakersfield",    lat: 35.3733, lng: -119.0187, region: "Central Valley" },
  { name: "Palm Springs",   lat: 33.8303, lng: -116.5453, region: "Desert" },
  { name: "Death Valley",   lat: 36.5323, lng: -116.9325, region: "Desert" },
];

export interface POI {
  name: string;
  category: string;
  lat: number;
  lng: number;
}

export interface POIResponse {
  pois: POI[];
}

export interface SurfaceCell {
  lat: number;
  lng: number;
  temp_f: number;
  risk: string;
  land_kind: string;
  land_label: string;
}

export interface HeatZone {
  kind: "hotspot" | "coolspot";
  label: string;
  severity: number;
  peak_temp_f: number;
  center_lat: number;
  center_lng: number;
  area_cells: number;
  land_kinds: string[];
  pattern: string;
  pattern_explanation: string;
  cells: { lat: number; lng: number; temp_f: number }[];
}

export interface TemporalSample {
  diurnal_sampling: { hour: number; surface_avg_f: number; surface_min_f: number; surface_max_f: number; hotspot_count: number; coolspot_count: number }[];
  seasonal_sampling: { month: number; surface_avg_f: number; surface_min_f: number; surface_max_f: number }[];
  hours_analyzed: number[];
  months_analyzed: number[];
}

export interface HeatSurfaceResult {
  center_lat: number;
  center_lng: number;
  radius_m: number;
  resolution: number;
  rows: number;
  cols: number;
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
  surface_min_f: number;
  surface_max_f: number;
  surface_avg_f: number;
  hotspots: HeatZone[];
  coolspots: HeatZone[];
  temporal: TemporalSample | null;
  grid_sample: SurfaceCell[];
}

export interface CitySimulation3D {
  center: { lat: number; lng: number };
  buildings: { lat: number; lng: number; height_m: number; temp_f: number }[];
  roads: { lat: number; lng: number; access_weight: number; temp_f: number }[];
  vegetation: { lat: number; lng: number; temp_f: number }[];
  hospitals: POI[];
  interventions: { type: "tree" | "water_point"; lat: number; lng: number; target_temp_f: number; projected_reduction: number; reason: string }[];
  stats: { avg_temp: number; max_temp: number; building_count: number; hospital_accessible: boolean };
}

export interface TrainingResult {
  status: string;
  iterations: number;
  accuracy: number;
  model_weights: Record<string, number>;
  logs: string[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`GET ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getHeatPoint(lat: number, lng: number): Promise<HeatReading> {
  return get<HeatReading>(`/api/heat/point?lat=${lat}&lng=${lng}`);
}

export function analyzeSpot(lat: number, lng: number): Promise<SpotAnalysis> {
  return get<SpotAnalysis>(`/api/analysis/spot?lat=${lat}&lng=${lng}`);
}

export function analyzePattern(lat: number, lng: number): Promise<PatternAnalysis> {
  return get<PatternAnalysis>(`/api/analysis/pattern?lat=${lat}&lng=${lng}`);
}

export function getNearbyPOIs(lat: number, lng: number, radius = 500): Promise<POIResponse> {
  return get<POIResponse>(`/api/analysis/pois?lat=${lat}&lng=${lng}&radius=${radius}`);
}

export function getHeatSurface(
  lat: number,
  lng: number,
  radius_m = 150,
  resolution = 12,
): Promise<HeatSurfaceResult> {
  return get<HeatSurfaceResult>(
    `/api/analysis/surface?lat=${lat}&lng=${lng}&radius_m=${radius_m}&resolution=${resolution}`,
  );
}

export function getCitySimulation3D(
  lat: number,
  lng: number,
  radius_m = 150,
): Promise<CitySimulation3D> {
  return get<CitySimulation3D>(
    `/api/analysis/simulation_3d?lat=${lat}&lng=${lng}&radius_m=${radius_m}`,
  );
}

export async function trainModel(): Promise<TrainingResult> {
  const res = await fetch("/api/analysis/train", { method: "POST" });
  return res.json();
}

export interface AssistantReply {
  intent: string;
  answer: string;
  source: string;
  data: unknown[];
}

export interface KnowledgeStats {
  // Flat fields (kept for back-compat with AiPanel; the live API nests them under .knowledge).
  cities?: number;
  health_conditions?: number;
  emergency_contacts?: number;
  encyclopedia?: number;
  buildings?: number;
  source?: string;
  status?: string;
  scope?: string;
  provider?: string;
  knowledge?: {
    cities: number;
    health_conditions: number;
    emergency_contacts: number;
    encyclopedia: number;
    buildings: number;
    source: string;
  };
}

export async function askAssistant(question: string): Promise<AssistantReply> {
  const res = await fetch("/api/ai/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    throw new Error(`POST /api/ai/ask -> ${res.status}`);
  }
  return res.json() as Promise<AssistantReply>;
}

export function getKnowledgeStats(): Promise<KnowledgeStats> {
  return get<KnowledgeStats>("/api/ai/status");
}

// Get a ranked intervention plan for a specific spot (Light/Medium/Re-plan)
export function getPlan(
  lat: number,
  lng: number,
  changeLevel: number,
): Promise<Plan> {
  return get<Plan>(
    `/api/planner/plan?lat=${lat}&lng=${lng}&change_level=${changeLevel}`,
  );
}

export interface AiAnswer {
  kind: string;
  text: string;
  contacts?: { label: string; phone: string }[];
}

// Audit #6 fix: removed unused `askAi()` GET wrapper. The live assistant path
// is `askAssistant()` (POST /api/ai/ask, with {question} body). The GET route
// never existed in the backend (405 Method Not Allowed if anything called it).
// `AiAnswer` interface kept for now — it's the response shape of the legacy GET.

export function getHeatGrid(
  lat: number,
  lng: number,
  spanDeg = 0.05,
  steps = 8,
): Promise<HeatGridResponse> {
  return get<HeatGridResponse>(
    `/api/heat/grid?lat=${lat}&lng=${lng}&span_deg=${spanDeg}&steps=${steps}`,
  );
}