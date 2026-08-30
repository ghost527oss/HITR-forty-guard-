import { describe, expect, it } from "vitest";
import type { CoolingDesign } from "../features/architectural-designs/types";
import { matchDesignsForSpot } from "./spotDesigns";

const d = (id: number, zone: CoolingDesign["houseZone"], climates: string[]): CoolingDesign => ({
  id,
  name: `Design ${id}`,
  category: "x",
  categorySlug: "x",
  costLevel: "Cheap",
  effortLevel: "Low",
  difficulty: "Easy",
  nature: "Natural",
  houseZone: zone,
  climateSuitability: climates as CoolingDesign["climateSuitability"],
  coolingMechanism: "Radiation Shielding",
  retrofitSuitability: "High (DIY / Easy Retrofit)",
  tempDropEstimate: "1-2",
  tempDropCelsiusRange: [1, 2],
  estimatedCostRangeUSD: "$",
  summary: "s",
  architecturalPrinciple: "p",
  constructionNotes: "c",
  pros: [],
  cons: [],
  maintenanceNotes: "m",
  materialsNeeded: [],
  diyFeasibility: "DIY Friendly",
  tags: [],
});

describe("matchDesignsForSpot", () => {
  it("prefers roof designs on a hot building", () => {
    const list = [
      d(1, "Landscape & Site", ["Temperate"]),
      d(2, "Roof & Attic", ["Hot-Arid", "All Climates"]),
      d(3, "Water & Evaporative", ["Coastal"]),
    ];
    const top = matchDesignsForSpot(102, "building", list, 2);
    expect(top[0].id).toBe(2);
    expect(top).toHaveLength(2);
  });
});
