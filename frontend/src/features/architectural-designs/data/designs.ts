/**
 * HITR - 100 House Cooling Architectural Designs
 * Master Aggregator & Lookup Engine
 */

import { CoolingDesign } from '../types';
import { DESIGNS_PART_1 } from './designs-part1';
import { DESIGNS_PART_2 } from './designs-part2';
import { DESIGNS_PART_3 } from './designs-part3';

export const ALL_COOLING_DESIGNS: CoolingDesign[] = [
  ...DESIGNS_PART_1,
  ...DESIGNS_PART_2,
  ...DESIGNS_PART_3,
];

// Verify we have all 100 designs
export const TOTAL_DESIGNS_COUNT = ALL_COOLING_DESIGNS.length;

export function getDesignById(id: number): CoolingDesign | undefined {
  return ALL_COOLING_DESIGNS.find((d) => d.id === id);
}

export function getDesignsByCategory(categorySlug: string): CoolingDesign[] {
  return ALL_COOLING_DESIGNS.filter((d) => d.categorySlug === categorySlug);
}

export function getDesignsByZone(zone: string): CoolingDesign[] {
  return ALL_COOLING_DESIGNS.filter((d) => d.houseZone === zone);
}

export function getQuickStats() {
  const cheapOrFreeCount = ALL_COOLING_DESIGNS.filter(
    (d) => d.costLevel === 'Free' || d.costLevel === 'Cheap'
  ).length;
  const naturalCount = ALL_COOLING_DESIGNS.filter((d) => d.nature === 'Natural').length;
  const highRetrofitCount = ALL_COOLING_DESIGNS.filter((d) =>
    d.retrofitSuitability.startsWith('High')
  ).length;
  const diyFriendlyCount = ALL_COOLING_DESIGNS.filter((d) => d.diyFeasibility === 'DIY Friendly').length;

  return {
    total: TOTAL_DESIGNS_COUNT,
    cheapOrFreeCount,
    naturalCount,
    highRetrofitCount,
    diyFriendlyCount,
  };
}
