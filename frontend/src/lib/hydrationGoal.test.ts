import { describe, expect, it } from "vitest";
import { dailyWaterGoalMl } from "./hydrationGoal";

describe("dailyWaterGoalMl", () => {
  it("stays at 2500 ml when the day is mild", () => {
    expect(dailyWaterGoalMl(28, false)).toBe(2500);
  });

  it("scales with today's max and heatwave", () => {
    expect(dailyWaterGoalMl(35, false)).toBe(2500 + 5 * 150);
    expect(dailyWaterGoalMl(35, true)).toBe(2500 + 5 * 150 + 500);
  });
});
