import { describe, expect, it } from "vitest";
import { citeForKey } from "./encyclopediaCite";

describe("citeForKey", () => {
  const entries = [
    { slug: "tree-canopy", title: "Tree canopy shade", plain_language: "Trees shade streets." },
    { slug: "cool-roof", title: "Cool roof", plain_language: "Reflects sunlight." },
  ];

  it("maps trees to the canopy article", () => {
    expect(citeForKey("trees", entries)?.slug).toBe("tree-canopy");
  });

  it("returns null when the knowledge set has no matching slug", () => {
    expect(citeForKey("trees", [])).toBeNull();
    expect(citeForKey("unknown-key", entries)).toBeNull();
  });
});
