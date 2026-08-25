/**
 * HITR - 100 House Cooling Architectural Designs
 * 100% Offline, Zero-Cost Bioclimatic & Medical Intelligence Reasoning Engine
 * Runs completely on-device without external APIs, tokens, or servers.
 */

import { ALL_COOLING_DESIGNS } from '../data/designs';
import { HEAT_MEDICAL_PROTOCOLS, getMedicalTriage, MedicalEmergencyProtocol } from '../data/medicalKnowledge';
import { CoolingDesign } from '../types';

export interface AiQueryResult {
  title: string;
  category: 'medical-emergency' | 'architectural-strategy' | 'building-physics' | 'diy-renter-hack' | 'climate-guide';
  badge: string;
  summary: string;
  keyDirectives: string[];
  recommendedDesigns: CoolingDesign[];
  medicalAlert?: MedicalEmergencyProtocol;
  contraindications?: string[];
  physicsExplanation?: string;
  estimatedTempDrop?: string;
  costEstimate?: string;
}

export interface CustomHousePlanRequest {
  climate: string;
  houseType: string;
  budget: string;
  specificProblem: string;
}

export interface StructuredPlanPhase {
  phaseName: string;
  actions: string[];
  recommendedDesigns: CoolingDesign[];
  estimatedDrop: string;
  costEstimate: string;
}

export interface GeneratedCustomPlan {
  title: string;
  summary: string;
  climateDiagnosis: string;
  phases: StructuredPlanPhase[];
  architecturalWarnings: string[];
  medicalPreparedness: string[];
  totalTempDrop: string;
}

/**
 * Intelligent Query Processor (100% Client-Side / Offline)
 */
export function queryOfflineAiEngine(userQuery: string): AiQueryResult {
  const q = userQuery.trim().toLowerCase();

  // 1. Check for Critical Medical Emergencies First
  const medicalMatch = getMedicalTriage(q);
  if (medicalMatch) {
    const matchingDesigns = ALL_COOLING_DESIGNS.filter(
      (d) =>
        d.id === 84 || // Emergency Mylar
        d.id === 85 || // Damp sheet evaporative
        d.id === 51 || // Evaporative cooling
        d.id === 71 // Night purge fan
    );

    return {
      title: `MEDICAL PROTOCOL: ${medicalMatch.condition}`,
      category: 'medical-emergency',
      badge: medicalMatch.severity,
      summary: `Immediate clinical response protocol for acute thermal distress. Follow these life-saving procedures immediately.`,
      keyDirectives: medicalMatch.immediateActions,
      medicalAlert: medicalMatch,
      contraindications: medicalMatch.criticalContraindications,
      recommendedDesigns: matchingDesigns,
      physicsExplanation: `Core temperature threshold: ${medicalMatch.coreTempThreshold}. Cooling method: ${medicalMatch.coolingTechnique}`,
    };
  }

  // 2. Room/Zone Specific Diagnostics

  // Attic / Upper Floor Heat Buildup
  if (q.includes('attic') || q.includes('upstairs') || q.includes('2nd floor') || q.includes('second floor') || q.includes('top floor') || q.includes('roof heat')) {
    const atticDesigns = ALL_COOLING_DESIGNS.filter((d) =>
      [11, 12, 14, 18, 20, 71, 73, 87].includes(d.id)
    );
    return {
      title: 'Attic & Upper-Floor Thermal Purge Strategy',
      category: 'architectural-strategy',
      badge: 'High Impact Retrofit',
      summary: 'Upstairs heat buildup is primarily caused by downward solar radiation through the roof deck combined with natural convective air buoyancy (stack effect). Temperatures in unventilated attics routinely hit 60°C (140°F), turning ceiling drywall into a continuous radiant heating element.',
      keyDirectives: [
        '1. Install a sub-rafter radiant foil barrier (#14) with a 2-inch minimum air gap to reflect 97% of roof deck radiation.',
        '2. Apply high-albedo white elastomeric cool roof coating (#11) to drop surface roof temperatures by up to 25°C.',
        '3. Create continuous soffit-to-ridge natural airflow (#18) or install a solar-powered attic exhaust fan (#20) to flush trapped hot air.',
        '4. Seal attic bypasses and ceiling penetrations to prevent convective hot air leaking downward into bedrooms.',
        '5. Run a whole-house night-purge fan (#71) after sunset to draw cool ambient night air across the upper floor.',
      ],
      recommendedDesigns: atticDesigns,
      estimatedTempDrop: '4°C – 8°C (7.2°F – 14.4°F)',
      costEstimate: '$120 (DIY Foil) – $1,800 (Full Solar Vent + Cool Roof)',
      physicsExplanation: 'Stefan-Boltzmann law dictates that roof deck radiation scales with the 4th power of absolute temperature (T⁴). Blocking radiation before it conducts into fiberglass insulation yields immediate upper-floor relief.',
    };
  }

  // West / South Window Sun-Traps & Solar Heat Gain
  if (q.includes('window') || q.includes('west') || q.includes('glass') || q.includes('sunroom') || q.includes('sliding door') || q.includes('glazing')) {
    const windowDesigns = ALL_COOLING_DESIGNS.filter((d) =>
      [21, 22, 23, 24, 25, 26, 28, 83, 84].includes(d.id)
    );
    return {
      title: 'Exterior Solar Shading & Glazing Radiation Deflection',
      category: 'architectural-strategy',
      badge: 'Immediate ROI Solution',
      summary: 'Standard double-pane and single-pane clear glass transmits 70%–86% of solar radiation directly into indoor surfaces, where it is absorbed and re-emitted as longwave infrared heat that cannot escape (Greenhouse Effect).',
      keyDirectives: [
        '1. Exterior Shading is 5x more effective than interior blinds — install operable louvered shutters (#24) or retractable canvas awnings (#28).',
        '2. Apply exterior solar control low-E reflective film (#22) or ceramic tinting to reject 78% of total solar heat gain (SHGC < 0.25).',
        '3. Renter/DIY zero-cost hack: Tape emergency space blankets (Mylar) or aluminum-faced foam board (#83, #84) against exterior window frames.',
        '4. Integrate horizontal overhangs (#21) sized to the solar altitude angle (blocks high summer sun while allowing low winter light).',
      ],
      recommendedDesigns: windowDesigns,
      estimatedTempDrop: '3°C – 6°C (5.4°F – 10.8°F)',
      costEstimate: '$15 (Emergency Foil) – $650 (High-Grade Awnings)',
      physicsExplanation: 'Interior curtains trap heat inside the room envelope. Exterior shading stops photons before they strike the glass pane, preventing internal convective re-radiation entirely.',
    };
  }

  // Humidity / Tropical Coastal Cooling
  if (q.includes('humidity') || q.includes('tropical') || q.includes('muggy') || q.includes('sticky') || q.includes('coastal') || q.includes('sweat')) {
    const humidDesigns = ALL_COOLING_DESIGNS.filter((d) =>
      [4, 6, 8, 48, 72, 79, 88].includes(d.id)
    );
    return {
      title: 'Tropical & Hot-Humid Bioclimatic Cross-Ventilation Strategy',
      category: 'architectural-strategy',
      badge: 'Sensible vs Latent Heat Management',
      summary: 'In hot-humid climates (RH > 70%), standard evaporative cooling fails and high air temperatures prevent sweat from evaporating. Architectural cooling relies on high-velocity continuous skin convective airflow, elevated stilts, wide covered verandas, and mechanical dehumidification.',
      keyDirectives: [
        '1. Maximize cross-ventilation apertures (#4) oriented perpendicular to prevailing seasonal sea/land breezes.',
        '2. Elevate living levels on open stilts/pilings (#48) to catch unobstructed laminar boundary-layer winds and isolate from damp soil radiation.',
        '3. Utilize oversized ceiling fans (#72) to maintain indoor air velocities of 0.8–1.5 m/s, producing a physiological cooling effect of 3°C–4°C on human skin.',
        '4. Provide deep 2-meter roof overhangs and shaded verandas (#62) to prevent rain splash while allowing windows to remain open 24/7.',
        '5. Isolate latent humidity with dedicated heat-pump dehumidification or multi-split variable refrigerant flow (#79).',
      ],
      recommendedDesigns: humidDesigns,
      estimatedTempDrop: '3°C – 5°C apparent physiological drop',
      costEstimate: '$80 (Ceiling Fans) – $3,200 (Stilt/Veranda Retrofit)',
      physicsExplanation: 'When wet-bulb depression is small, convective air velocity over the human body thins the stagnant thermal boundary layer, boosting cutaneous heat transfer even when relative humidity is elevated.',
    };
  }

  // Renter / DIY / Zero-Dollar Low Budget Hacks
  if (q.includes('renter') || q.includes('diy') || q.includes('cheap') || q.includes('free') || q.includes('low budget') || q.includes('apartment') || q.includes('no money')) {
    const diyDesigns = ALL_COOLING_DESIGNS.filter((d) =>
      [81, 82, 83, 84, 85, 86, 87, 88, 89, 90].includes(d.id)
    );
    return {
      title: 'Zero-Dollar & Low-Cost Renter Cooling Arsenal',
      category: 'diy-renter-hack',
      badge: '100% Non-Invasive',
      summary: 'Non-permanent, zero-damage cooling hacks engineered for renters and low-budget households that require zero drilling or structural alterations.',
      keyDirectives: [
        '1. Egyptian Evaporative Bedding Method (#85): Dampen a 100% cotton sheet with cold water; as ambient air flows across it, latent heat of vaporization draws body heat away.',
        '2. Cardboard & Foil Window Heat Shields (#84): Cut cardboard panels to fit window frames and glue shiny aluminum foil facing outside to reflect 90% of solar radiation.',
        '3. Bernoulli Pressure Differential Window Funnels (#81): Cut recycled plastic bottles into funnels to compress and cool incoming breeze through pressure drop.',
        '4. Targeted Ice-Siphon Fan Cooler (#82): Position a bowl of ice/frozen salt-water bottles directly in the intake stream of a standard box fan.',
        '5. Strategic Nighttime Pressure Purge (#87): Place one fan facing OUT on the hot leeward side and open a shaded intake window on the windward side to purge the entire apartment.',
      ],
      recommendedDesigns: diyDesigns,
      estimatedTempDrop: '2°C – 5°C (3.5°F – 9°F)',
      costEstimate: '$0 – $40 total',
      physicsExplanation: 'Evaporation consumes 2,260 kJ of thermal energy per kilogram of water vaporized. Using simple phase-change mechanics and radiative reflection yields high thermal relief at near-zero expense.',
    };
  }

  // Desert / Arid / Courtyard & Windcatchers
  if (q.includes('desert') || q.includes('arid') || q.includes('dry') || q.includes('windcatcher') || q.includes('badgir') || q.includes('courtyard') || q.includes('mashrabiya') || q.includes('jaali')) {
    const desertDesigns = ALL_COOLING_DESIGNS.filter((d) =>
      [1, 2, 41, 43, 44, 51, 52, 53, 54, 55].includes(d.id)
    );
    return {
      title: 'Arid Vernacular & Evaporative Windcatcher Systems',
      category: 'architectural-strategy',
      badge: 'Time-Tested Vernacular Genius',
      summary: 'Hot-arid climates have high diurnal temperature swings (hot days, cool nights) and low relative humidity (high wet-bulb depression). Vernacular architecture exploits heavy thermal mass to delay heat entry and uses wind towers, courtyards, and evaporative water jars.',
      keyDirectives: [
        '1. Traditional Windcatcher / Badgir (#41): Multi-directional rooftop scoops channel elevated cool breezes downward across subterranean water channels or damp clay porous pots (#43).',
        '2. Shaded Central Courtyards (#44): Act as thermal chimneys, discharging hot air during the day and pooling cold dense air overnight to cool adjacent rooms.',
        '3. Direct Evaporative Cooling (#51): In dry climates (< 30% RH), evaporating water can drop incoming dry-bulb air temperatures by 8°C to 12°C with minimal energy.',
        '4. Perforated Screen Walls / Jaali & Mashrabiya (#3, #45): Provide privacy, diffuse intense solar glare, and accelerate air velocity through the Venturi nozzle effect.',
      ],
      recommendedDesigns: desertDesigns,
      estimatedTempDrop: '6°C – 12°C (10.8°F – 21.6°F)',
      costEstimate: '$150 (DIY Misting/Evap) – $4,500 (Architectural Tower/Courtyard)',
      physicsExplanation: 'When relative humidity is low, ambient dry-bulb temperature can be driven down toward wet-bulb temperature via adiabatic saturation without requiring any mechanical refrigeration compressor.',
    };
  }

  // Building Physics / Thermodynamics / General Inquiries
  const generalMatches = ALL_COOLING_DESIGNS.filter((d) => {
    return (
      d.name.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.architecturalPrinciple.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  }).slice(0, 6);

  if (generalMatches.length > 0) {
    return {
      title: `Architectural Cooling Search: "${userQuery}"`,
      category: 'architectural-strategy',
      badge: `${generalMatches.length} Matching Principles Found`,
      summary: `Identified ${generalMatches.length} architectural techniques in the HITR catalogue directly corresponding to your query.`,
      keyDirectives: generalMatches.map(
        (d) => `• [Design #${d.id}] ${d.name}: ${d.summary} (Est. Drop: ${d.tempDropEstimate}, Cost: ${d.costLevel})`
      ),
      recommendedDesigns: generalMatches,
      physicsExplanation: generalMatches[0].architecturalPrinciple,
    };
  }

  // Fallback Comprehensive Overview
  const topDesigns = ALL_COOLING_DESIGNS.filter((d) => [11, 14, 21, 50, 71, 84].includes(d.id));
  return {
    title: 'HITR Bioclimatic Architectural & Heat Defense Intelligence',
    category: 'climate-guide',
    badge: '100% Offline AI Knowledge Core',
    summary: 'The fundamental law of passive house cooling is the 3-Layer Defense: 1. Prevent Heat Entry (Shading & Cool Roofs), 2. Dissipate Stored Heat (Night Ventilation & Convection), 3. Active Heat Rejection (Evaporation & Mechanical Heat Pumps).',
    keyDirectives: [
      'Layer 1 — Solar Radiation Defense: Block direct solar rays with cool roofs (#11, #14) and exterior window shading (#21, #28) before heat penetrates the building envelope.',
      'Layer 2 — Thermal Mass & Convective Purging: Store heat during peak day in high-mass structures (#31) and purge it with whole-house night flushing (#5, #71).',
      'Layer 3 — Microclimate & Evaporative Sinking: Deploy perimeter vegetation (#61, #66), water misting (#51, #56), or ground-coupled earth tubes (#92).',
      'Emergency Medical Safeguard: If anyone exhibits confusion or core body temp > 40°C, initiate immediate cold water immersion and call emergency services.',
    ],
    recommendedDesigns: topDesigns,
    physicsExplanation: 'Building heat gain is governed by Fourier\'s law of conduction (Q = -k·A·dT/dx) and Stefan-Boltzmann radiation (E = ε·σ·T⁴). Minimizing surface absorption (albedo) and maximizing ventilation cross-sections delivers optimal cooling without reliance on grid energy.',
  };
}

/**
 * Generate Structured Custom Bioclimatic Plan 100% Offline
 */
export function generateOfflineBioclimaticPlan(req: CustomHousePlanRequest): GeneratedCustomPlan {
  const { climate, houseType, budget, specificProblem } = req;
  const lowerClimate = climate.toLowerCase();
  const isHumid = lowerClimate.includes('humid') || lowerClimate.includes('tropical') || lowerClimate.includes('coastal');
  const isArid = lowerClimate.includes('arid') || lowerClimate.includes('desert') || lowerClimate.includes('dry');
  const isBudgetLow = budget.toLowerCase().includes('diy') || budget.toLowerCase().includes('low') || budget.toLowerCase().includes('200') || budget.toLowerCase().includes('renter');

  let phase1Designs: CoolingDesign[];
  let phase2Designs: CoolingDesign[];
  let phase3Designs: CoolingDesign[];

  if (isArid) {
    phase1Designs = ALL_COOLING_DESIGNS.filter((d) => [11, 14, 28, 84].includes(d.id));
    phase2Designs = ALL_COOLING_DESIGNS.filter((d) => [5, 44, 51, 54, 71].includes(d.id));
    phase3Designs = ALL_COOLING_DESIGNS.filter((d) => [31, 41, 79, 92].includes(d.id));
  } else if (isHumid) {
    phase1Designs = ALL_COOLING_DESIGNS.filter((d) => [11, 21, 72, 85].includes(d.id));
    phase2Designs = ALL_COOLING_DESIGNS.filter((d) => [4, 6, 20, 62, 73].includes(d.id));
    phase3Designs = ALL_COOLING_DESIGNS.filter((d) => [42, 48, 79, 98].includes(d.id));
  } else {
    // Temperate / Mediterranean / General
    phase1Designs = ALL_COOLING_DESIGNS.filter((d) => [11, 14, 21, 28, 84].includes(d.id));
    phase2Designs = ALL_COOLING_DESIGNS.filter((d) => [5, 66, 71, 72].includes(d.id));
    phase3Designs = ALL_COOLING_DESIGNS.filter((d) => [35, 42, 79, 92].includes(d.id));
  }

  if (isBudgetLow) {
    phase1Designs = ALL_COOLING_DESIGNS.filter((d) => [81, 83, 84, 85, 87].includes(d.id));
    phase2Designs = ALL_COOLING_DESIGNS.filter((d) => [5, 11, 28, 72].includes(d.id));
    phase3Designs = ALL_COOLING_DESIGNS.filter((d) => [14, 18, 51, 71].includes(d.id));
  }

  const phase1: StructuredPlanPhase = {
    phaseName: 'Phase 1: Solar Deflection & Immediate Low-Cost Interventions',
    actions: [
      'Apply white reflective cool coating (#11) or sub-rafter radiant foil barrier (#14) to halt roof deck solar radiation.',
      'Install exterior window shade awnings or non-invasive reflective Mylar shields (#28, #84) on vulnerable west/south facades.',
      'Enforce zero-cost nighttime cross-ventilation flushing (#5, #87) once ambient outside temperatures drop below indoor levels.',
    ],
    recommendedDesigns: phase1Designs,
    estimatedDrop: '2°C – 4°C (3.5°F – 7.2°F)',
    costEstimate: isBudgetLow ? '$20 – $150' : '$250 – $600',
  };

  const phase2: StructuredPlanPhase = {
    phaseName: 'Phase 2: Envelope Optimization, Convective Airflow & Microclimate',
    actions: [
      'Install high-volume low-speed ceiling fans (#72) and whole-house attic exhaust purge systems (#71).',
      'Plant deciduous shade trees on the southern and western building boundaries (#66) and introduce permeable pavers (#67).',
      isArid
        ? 'Deploy courtyard porous clay evaporative water jars (#43) or direct misting lines (#56) to exploit dry-bulb depression.'
        : 'Incorporate continuous ridge-and-soffit thermal ventilation (#18) and breathable rainscreens (#42).',
    ],
    recommendedDesigns: phase2Designs,
    estimatedDrop: '3°C – 6°C (5.4°F – 10.8°F)',
    costEstimate: '$800 – $2,400',
  };

  const phase3: StructuredPlanPhase = {
    phaseName: 'Phase 3: High-Performance Bioclimatic Structural Upgrades',
    actions: [
      'Retrofit high-mass rammed earth/adobe interior partitions (#31) or ventilated double-skin thermal facades (#98).',
      'Integrate multi-zone variable-speed heat pump mini-splits (#79) coupled with ground heat exchanger earth tubes (#92).',
      'Implement smart motorized clerestory windows (#80) linked to automated indoor/outdoor temperature differential sensors.',
    ],
    recommendedDesigns: phase3Designs,
    estimatedDrop: '4°C – 8°C (7.2°F – 14.4°F)',
    costEstimate: '$3,500 – $8,000+',
  };

  return {
    title: `Tailored Bioclimatic Masterplan for ${houseType || 'Residential Structure'}`,
    summary: `Comprehensive 3-phase thermal mitigation roadmap engineered specifically for ${climate} climate dynamics, addressing: "${specificProblem}".`,
    climateDiagnosis: `In ${climate}, the primary heat influx driver is ${
      isArid
        ? 'intense solar radiation and high ambient daytime temperatures with large diurnal swing'
        : isHumid
        ? 'high ambient relative humidity suppressing evaporative sweat cooling and high night temperatures'
        : 'unshaded roof/window solar gain and inadequate convective attic purging'
    }.`,
    phases: [phase1, phase2, phase3],
    architecturalWarnings: [
      'Always maintain a 2-inch minimum ventilated air gap on at least one side of any reflective radiant barrier to prevent conductive heat bridging.',
      'In high-humidity zones, avoid running evaporative misting systems indoors, which increases latent heat and wet-bulb lethality.',
      'Ensure roof load engineering compliance prior to retrofitting heavy living green roofs or deep water retention systems.',
    ],
    medicalPreparedness: [
      'Establish an air-conditioned or lower-floor "Cool Refuge Room" for vulnerable family members (elderly, infants).',
      'Maintain an emergency heat emergency kit containing Oral Rehydration Salts (ORS), cold gel packs, and an electric spray mister.',
      'Know the signs of Heat Stroke: confusion, core temp > 40°C, and hot/dry skin require immediate emergency 911 activation and cold water immersion.',
    ],
    totalTempDrop: '5°C to 11°C (9°F – 20°F) Cumulative Indoor Reduction',
  };
}
