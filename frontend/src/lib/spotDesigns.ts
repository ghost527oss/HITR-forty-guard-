import type { CoolingDesign } from "../features/architectural-designs/types";
import { ALL_COOLING_DESIGNS } from "../features/architectural-designs/data/designs";

function climatesForTempF(tempF: number): string[] {
  if (tempF >= 105) return ["Desert", "Hot-Arid", "Extreme Climates", "All Climates"];
  if (tempF >= 95) return ["Hot-Arid", "Hot-Humid", "Subtropical", "Desert", "All Climates"];
  if (tempF >= 85) return ["Mediterranean", "Subtropical", "Hot-Humid", "All Climates"];
  return ["Temperate", "Mediterranean", "All Climates"];
}

function zonesForLand(kind: string): string[] | null {
  if (kind === "building") return ["Roof & Attic", "Walls & Envelope", "Windows & Glazing"];
  if (kind === "road") return ["Landscape & Site", "Orientation & Layout"];
  if (kind === "green") return ["Landscape & Site"];
  if (kind === "water" || kind === "waterway") return ["Water & Evaporative"];
  if (kind === "farmland") return ["Landscape & Site", "Orientation & Layout"];
  return null;
}

export function matchDesignsForSpot(
  tempF: number,
  landKind: string,
  designs: CoolingDesign[] = ALL_COOLING_DESIGNS,
  n = 3,
): CoolingDesign[] {
  const climates = climatesForTempF(tempF);
  const zones = zonesForLand(landKind);
  const scored = designs.map((d) => {
    const climateHit = d.climateSuitability.some((c) => climates.includes(c) || c === "All Climates");
    const zoneHit = !zones || zones.includes(d.houseZone);
    const drop = (d.tempDropCelsiusRange[0] + d.tempDropCelsiusRange[1]) / 2;
    const cheap = d.costLevel === "Free" || d.costLevel === "Cheap" ? 1 : 0;
    const score = (climateHit ? 4 : 0) + (zoneHit ? 3 : 0) + drop + cheap;
    return { d, score, climateHit };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.d.id - b.d.id)
    .slice(0, n)
    .map((s) => s.d);
}
