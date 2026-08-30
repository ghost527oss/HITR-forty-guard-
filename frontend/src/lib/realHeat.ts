/**
 * Real (FortyGuard) heat loading — the client half of layer C.
 *
 * Kept in a plain .ts module rather than inside MapView.tsx so it can be unit
 * tested without dragging maplibre-gl into a node environment.
 *
 * The shape is: submit ONE task for a bounding box, then poll until the vendor
 * finishes it. One task per view, versus one call per cell on the mock path.
 */

import {
  getHeatJob,
  submitHeatArea,
  RealHeatUnavailable,
  type Bounds,
  type HeatAreaResponse,
  type HeatCell,
} from "../api";

/** Bounding box of `spanDeg` centred on a point. */
export function boundsAround(lat: number, lng: number, spanDeg = 0.04): Bounds {
  const half = spanDeg / 2;
  return { west: lng - half, south: lat - half, east: lng + half, north: lat + half };
}

/** Tunables are exported so tests can shrink them. */
export const POLL = {
  intervalMs: 3000,
  maxPolls: 40, // ~2 min; the vendor takes seconds to a few minutes
};

export type FetchJob = (activityId: string) => Promise<HeatAreaResponse>;
export type SubmitArea = (b: Bounds, granularity?: number) => Promise<HeatAreaResponse>;
export type HeatJobPhase = "processing" | "ready" | "failed" | "unavailable";

/**
 * Load real tiles for an area, polling until the task resolves.
 *
 * - Throws `RealHeatUnavailable` when no API key is configured, so callers can
 *   fall back to the mock without treating it as a failure.
 * - Throws a plain Error when the task failed or never finished.
 * - Returns [] only if the vendor completed with no usable tiles.
 */
export async function loadRealHeatGrid(
  lat: number,
  lng: number,
  spanDeg = 0.04,
  opts: {
    submit?: SubmitArea;
    fetchJob?: FetchJob;
    sleep?: (ms: number) => Promise<void>;
    onStatus?: (phase: HeatJobPhase) => void;
  } = {},
): Promise<HeatCell[]> {
  const submit = opts.submit ?? submitHeatArea;
  const fetchJob = opts.fetchJob ?? getHeatJob;
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const onStatus = opts.onStatus;

  let job: HeatAreaResponse;
  try {
    job = await submit(boundsAround(lat, lng, spanDeg));
  } catch (e) {
    if (e instanceof RealHeatUnavailable) {
      onStatus?.("unavailable");
    } else {
      onStatus?.("failed");
    }
    throw e;
  }

  if (job.status === "processing") onStatus?.("processing");
  if (job.status === "failed") {
    onStatus?.("failed");
    throw new Error(job.error ?? "Heatmap did not finish in time");
  }

  for (let i = 0; i < POLL.maxPolls && job.status === "processing"; i++) {
    if (!job.activity_id) break;
    await sleep(POLL.intervalMs);
    job = await fetchJob(job.activity_id);
    if (job.status === "processing") onStatus?.("processing");
  }

  if (job.status !== "ready") {
    onStatus?.("failed");
    throw new Error(job.error ?? "Heatmap did not finish in time");
  }
  onStatus?.("ready");
  return job.points;
}

export { RealHeatUnavailable };
