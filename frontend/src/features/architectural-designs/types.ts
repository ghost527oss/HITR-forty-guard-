/**
 * HITR - 100 House Cooling Architectural Designs
 * TypeScript Domain Types & Interfaces
 */

export type CostLevel = 'Free' | 'Cheap' | 'Moderate' | 'Expensive' | 'Very Expensive';
export type EffortLevel = 'Low' | 'Medium' | 'High' | 'Extremely High';
export type DifficultyLevel = 'Easy' | 'Moderate' | 'Difficult' | 'Extremely Difficult';
export type Difficulty = DifficultyLevel;
export type NatureType = 'Natural' | 'Artificial / Mechanical' | 'Hybrid';

export type HouseZone =
  | 'Roof & Attic'
  | 'Windows & Glazing'
  | 'Walls & Envelope'
  | 'Orientation & Layout'
  | 'Traditional & Courtyard'
  | 'Water & Evaporative'
  | 'Landscape & Site'
  | 'Ventilation & Airflow'
  | 'Mechanical & Active'
  | 'Low-Cost DIY Hacks'
  | 'Advanced & Experimental'
  | 'Subterranean & Foundation';

export type ClimateType =
  | 'All Climates'
  | 'Hot-Arid'
  | 'Hot-Humid'
  | 'Mediterranean'
  | 'Temperate'
  | 'Tropical'
  | 'Desert'
  | 'Subtropical'
  | 'Extreme Climates'
  | 'Coastal'
  | 'Middle Eastern'
  | 'South Asian'
  | 'Commercial / Luxury'
  | 'Dry Summer'
  | 'Tropical Dry'
  | string;

export type CoolingMechanism =
  | 'Radiation Shielding'
  | 'Evaporative Cooling'
  | 'Thermal Mass / Lag'
  | 'Convective Venting'
  | 'Geothermal Exchange'
  | 'Phase Change'
  | 'Mechanical Vapor-Compression'
  | 'Sensory / Convective Chill'
  | 'Subterranean Heat Sink';

export type RetrofitSuitability =
  | 'High (DIY / Easy Retrofit)'
  | 'Medium (Moderate Retrofit)'
  | 'Low (Best for New Construction)';

export interface CoolingDesign {
  id: number;
  name: string;
  category: string;
  categorySlug: string;
  costLevel: CostLevel;
  effortLevel: EffortLevel;
  difficulty: DifficultyLevel;
  nature: NatureType;
  houseZone: HouseZone;
  climateSuitability: ClimateType[];
  coolingMechanism: CoolingMechanism;
  retrofitSuitability: RetrofitSuitability;
  tempDropEstimate: string;
  tempDropCelsiusRange: [number, number]; // [min, max] delta in °C
  estimatedCostRangeUSD: string;
  summary: string;
  architecturalPrinciple: string;
  constructionNotes: string;
  pros: string[];
  cons: string[];
  maintenanceNotes: string;
  materialsNeeded: string[];
  diyFeasibility: 'DIY Friendly' | 'Intermediate DIY / Handyman' | 'Licensed Contractor Required';
  historicalVernacularContext?: string;
  tags: string[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  range: string;
  description: string;
  iconName: string;
  badgeColor: string;
  zone: HouseZone;
  primaryPrinciple: string;
}

export interface FilterState {
  search: string;
  category: string;
  cost: string;
  effort: string;
  difficulty: string;
  nature: string;
  houseZone: string;
  climate: string;
  retrofit?: string;
  coolingMechanism?: string;
  sortBy: 'id' | 'name' | 'cost-asc' | 'cost-desc' | 'cooling-desc';
}

export interface ProjectItem {
  designId: number;
  addedAt: string;
  customNotes?: string;
  targetZone?: string;
  isImplemented?: boolean;
}

export interface SavedProject {
  id: string;
  name: string;
  houseDescription: string;
  climate: ClimateType;
  items: ProjectItem[];
  createdAt: string;
  updatedAt: string;
}

export interface HouseZoneHotspot {
  id: string;
  name: string;
  description: string;
  coordinates: { x: number; y: number };
  categorySlug: string;
  zone: HouseZone;
}
