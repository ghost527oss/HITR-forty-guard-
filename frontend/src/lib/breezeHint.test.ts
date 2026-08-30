import { describe, expect, it } from "vitest";
import { breezeHint, compassFromDeg } from "./breezeHint";

describe("compassFromDeg", () => {
  it("maps bearings to compass points", () => {
    expect(compassFromDeg(0)).toBe("N");
    expect(compassFromDeg(225)).toBe("SW");
  });
});

describe("breezeHint", () => {
  it("mentions windward planting", () => {
    expect(breezeHint(225, 3)).toMatch(/SW/);
    expect(breezeHint(225, 3)).toMatch(/windward/);
  });
});
