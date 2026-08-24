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

export interface HeatGridResponse {
  provider: string;
  count: number;
  points: HeatReading[];
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

export interface Intervention {
  rank: number;
  what: string;
  where: string;
  why: string;
  impact: string;
  cost: string;
  key: string;
}

export interface Plan {
  lat: number;
  lng: number;
  change_level: number;
  change_label: string;
  land: LandInfo;
  temp_f: number;
  risk: string;
  interventions: Intervention[];
}

export type ChangeLevel = 1 | 2 | 3;
export const CHANGE_LEVELS: { value: ChangeLevel; label: string }[] = [
  { value: 1, label: "Light" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Full re-plan" },
];

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

export function getPlan(
  lat: number,
  lng: number,
  changeLevel: ChangeLevel,
): Promise<Plan> {
  return get<Plan>(
    `/api/planner/plan?lat=${lat}&lng=${lng}&change_level=${changeLevel}`,
  );
}

export interface AssistantReply {
  intent: string;
  answer: string;
  source: string;
  data: unknown[];
}

export interface KnowledgeStats {
  cities: number;
  health_conditions: number;
  emergency_contacts: number;
  encyclopedia: number;
  buildings: number;
  source: string;
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

export interface AiAnswer {
  kind: string;
  text: string;
  contacts?: { label: string; phone: string }[];
}

export function askAi(q: string): Promise<AiAnswer> {
  return get<AiAnswer>(`/api/ai/ask?q=${encodeURIComponent(q)}`);
}

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
