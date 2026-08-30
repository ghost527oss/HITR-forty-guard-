import { describe, expect, it } from "vitest";
import { formatBlockBrief } from "./blockBrief";

describe("formatBlockBrief", () => {
  it("includes location and an honest empty plan", () => {
    const md = formatBlockBrief({
      location: "Los Angeles, CA",
      picked: { lat: 34.05, lng: -118.24 },
      reading: null,
      land: null,
      pattern: null,
      plan: null,
    });
    expect(md).toContain("Los Angeles, CA");
    expect(md).toContain("No plan generated yet");
  });
});
