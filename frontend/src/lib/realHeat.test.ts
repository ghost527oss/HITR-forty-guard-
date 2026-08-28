/**
 * Tests for the real (FortyGuard) heat path — layer C.
 *
 * Deliberately small: four tests, each covering a couple of related behaviours,
 * rather than one assertion per case. Everything is injected (submit / fetchJob /
 * sleep), so no network, no timers, no API key.
 *
 * The property that matters most is the one at the top of the file: loading a
 * real grid must cost ONE area request, not one per cell. That is the entire
 * point of layer B/C — the mock path issues 576 calls for the same screen.
 */

import { describe, expect, it } from "vitest";
import {
  RealHeatUnavailable,
  boundsAround,
  loadRealHeatGrid,
  type FetchJob,
  type SubmitArea,
} from "./realHeat";
import type { HeatAreaResponse, HeatCell } from "../api";

const cell = (lat: number, lng: number, f: number): HeatCell => ({
  lat,
  lng,
  temp_f: f,
  temp_c: (f - 32) * 5 / 9,
  risk: "high",
  color: "#f00",
  source: "fortyguard",
});

const ready = (points: HeatCell[]): HeatAreaResponse => ({
  status: "ready",
  activity_id: "act-1",
  count: points.length,
  points,
});

const noSleep = async () => {};

describe("boundsAround", () => {
  it("centres the box on the point and spans the requested degrees", () => {
    const b = boundsAround(37.7749, -122.4194, 0.04);
    expect(b.west).toBeCloseTo(-122.4394, 6);
    expect(b.east).toBeCloseTo(-122.3994, 6);
    expect(b.south).toBeCloseTo(37.7549, 6);
    expect(b.north).toBeCloseTo(37.7949, 6);
    // Centre must be preserved in both axes.
    expect((b.west + b.east) / 2).toBeCloseTo(-122.4194, 9);
    expect((b.south + b.north) / 2).toBeCloseTo(37.7749, 9);
  });
});

describe("loadRealHeatGrid", () => {
  it("polls until ready and costs exactly one area request", async () => {
    const submitted: unknown[] = [];
    const statuses: HeatAreaResponse[] = [
      { status: "processing", activity_id: "act-1", count: 0, points: [] },
      { status: "processing", activity_id: "act-1", count: 0, points: [] },
      ready([cell(37.77, -122.42, 87.8)]),
    ];
    let poll = 0;

    const submit: SubmitArea = async (b) => {
      submitted.push(b);
      return statuses[0];
    };
    const fetchJob: FetchJob = async () => statuses[++poll];

    const pts = await loadRealHeatGrid(37.7749, -122.4194, 0.04, {
      submit,
      fetchJob,
      sleep: noSleep,
    });

    // One submit for the whole area — not 576.
    expect(submitted).toHaveLength(1);
    expect(pts).toHaveLength(1);
    expect(pts[0].temp_f).toBe(87.8);
    expect(pts[0].source).toBe("fortyguard");
  });

  it("signals 'no key configured' distinctly so callers can fall back to the mock", async () => {
    const submit: SubmitArea = async () => {
      throw new RealHeatUnavailable();
    };

    await expect(
      loadRealHeatGrid(37.7749, -122.4194, 0.04, { submit, sleep: noSleep }),
    ).rejects.toBeInstanceOf(RealHeatUnavailable);
  });

  it("rejects when the vendor fails or never finishes, without hanging", async () => {
    const failed: HeatAreaResponse = {
      status: "failed",
      activity_id: "act-1",
      count: 0,
      points: [],
      error: "FortyGuard reported this task as Failed. Failed tasks are not billed.",
    };

    // Failed task surfaces its (not-billed) explanation.
    await expect(
      loadRealHeatGrid(37.7749, -122.4194, 0.04, {
        submit: async () => failed,
        sleep: noSleep,
      }),
    ).rejects.toThrow(/not billed/);

    // A task stuck on processing stops after the poll budget instead of looping.
    await expect(
      loadRealHeatGrid(37.7749, -122.4194, 0.04, {
        submit: async () => ({
          status: "processing",
          activity_id: "act-1",
          count: 0,
          points: [],
        }),
        fetchJob: async () => ({
          status: "processing",
          activity_id: "act-1",
          count: 0,
          points: [],
        }),
        sleep: noSleep,
      }),
    ).rejects.toThrow(/did not finish/);
  });
});
