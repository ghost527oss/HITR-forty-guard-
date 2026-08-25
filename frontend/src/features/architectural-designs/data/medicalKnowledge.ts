/**
 * HITR - 100 House Cooling Architectural Designs
 * Heatwave Medical Emergency & Clinical First-Aid Knowledge Base
 * 100% Offline, Clinically Grounded Protocols & Survival Guidelines
 */

export interface MedicalEmergencyProtocol {
  id: string;
  condition: string;
  severity: 'CRITICAL EMERGENCY' | 'HIGH ALERT' | 'MODERATE' | 'PREVENTATIVE';
  coreTempThreshold: string;
  primarySymptoms: string[];
  immediateActions: string[];
  criticalContraindications: string[]; // What NOT to do
  coolingTechnique: string;
  hydrationProtocol: string;
  whenToCallEMS: string;
  specialPopulations: string;
  tags: string[];
}

export const HEAT_MEDICAL_PROTOCOLS: MedicalEmergencyProtocol[] = [
  {
    id: 'heat-stroke',
    condition: 'Exertional & Classic Heat Stroke (Hyperthermia Emergency)',
    severity: 'CRITICAL EMERGENCY',
    coreTempThreshold: '> 40.0°C (104.0°F) with central nervous system dysfunction',
    primarySymptoms: [
      'Altered mental status, confusion, slurred speech, delirium, seizures, or coma',
      'Hot, flushed skin (may be dry in classic heat stroke or profusely sweating in exertional heat stroke)',
      'Rapid, pounding pulse (tachycardia) and shallow hyperventilation',
      'Nausea, vomiting, severe headache, dizziness, loss of consciousness',
    ],
    immediateActions: [
      '1. CALL EMERGENCY SERVICES (911 / Local EMS) IMMEDIATELY — This is a life-threatening medical emergency.',
      '2. INITIATE RAPID AGGRESSIVE COOLING: Best method is Whole-Body Cold Water Immersion (ice water bath 1°C–15°C) while protecting airway.',
      '3. IF TUB UNAVAILABLE: Continuously douse or spray victim with cold water and vigorously fan them to maximize evaporative and convective cooling.',
      '4. STRATEGIC ICE PLACEMENT: Place ice packs or cold wet towels over major arterial blood vessels (both sides of the neck, bilateral armpits/axillae, and groin).',
      '5. REMOVE EXCESS CLOTHING: Strip heavy garments immediately to expose skin surface.',
      '6. TARGET CORE TEMP: Cool aggressively until body temperature drops to 38.3°C – 38.9°C (101°F – 102°F), then halt active cold immersion to prevent hypothermic rebound.',
    ],
    criticalContraindications: [
      'DO NOT administer antipyretic medications (Aspirin, Paracetamol/Acetaminophen, Ibuprofen) — Heat stroke is caused by environmental thermal overwhelm, NOT hypothalamic pyrogens. Antipyretics are ineffective and cause severe liver and renal toxicity and exacerbate coagulopathies.',
      'DO NOT attempt to give oral fluids or water if the person is confused, lethargic, seizing, or unconscious (causes fatal pulmonary aspiration).',
      'DO NOT use rubbing alcohol baths (causes toxic cutaneous vapor absorption and hypothermic shivering).',
      'DO NOT leave the victim unattended while cooling.',
    ],
    coolingTechnique:
      'Gold standard: Cold water immersion (cooling rate up to 0.20°C/min). Alternative: Continuous cold water misting with high-velocity fan airflow (evaporative convection) plus conductive ice bags on femoral, carotid, and axillary triangles.',
    hydrationProtocol:
      'Zero oral fluids until fully conscious and oriented. Emergency intravenous (IV) normal saline or lactated Ringer solution administered by EMS paramedics.',
    whenToCallEMS:
      'IMMEDIATELY upon first sign of cognitive disorientation, confusion, fainting, or body temperature over 39.5°C (103°F).',
    specialPopulations:
      'Elderly individuals with compromised cardiovascular reserve; infants who cannot thermoregulate; patients taking diuretics, beta-blockers, ACE inhibitors, or anticholinergics.',
    tags: ['heat stroke', 'emergency', 'fainting', 'unconscious', 'delirium', 'seizure', 'first aid', 'ice bath', 'hyperthermia'],
  },
  {
    id: 'heat-exhaustion',
    condition: 'Heat Exhaustion (Systemic Thermal Strain)',
    severity: 'HIGH ALERT',
    coreTempThreshold: '38.0°C – 40.0°C (100.4°F – 104.0°F) without central nervous system failure',
    primarySymptoms: [
      'Heavy, profuse sweating and cool, pale, clammy skin ("goosebumps in heat")',
      'Marked weakness, fatigue, dizziness, lightheadedness upon standing (orthostatic hypotension)',
      'Headache, nausea, loss of appetite, muscle cramping',
      'Weak and rapid pulse, decreased urine output with dark amber urine',
    ],
    immediateActions: [
      '1. Move person immediately to the coolest available environment (air-conditioned room, shaded basement, or breezeway).',
      '2. Lie down flat and elevate legs 15–30 cm (6–12 inches) to facilitate venous return to the heart and brain.',
      '3. Loosen or remove tight, restrictive clothing.',
      '4. Apply cold, damp towels to face, neck, chest, and arms, or take a cool shower/sponge bath.',
      '5. Provide cool water or oral rehydration electrolyte solution in slow, frequent sips.',
      '6. Monitor continuously for 30–45 minutes. If symptoms do not improve or worsen, escalate to emergency heat stroke protocol.',
    ],
    criticalContraindications: [
      'DO NOT allow the person to resume physical activity or return to the hot environment on the same day.',
      'DO NOT chug large volumes of ice water too quickly (can trigger gastric cramping and vomiting).',
      'DO NOT drink high-caffeine energy drinks, alcohol, or hyper-sugary sodas (worsens dehydration and osmotic diuresis).',
    ],
    coolingTechnique:
      'Conductive cooling via cold compress, cool mist spray, passive airflow with fans, and migration to lowest building floor or air-conditioned refuge zone.',
    hydrationProtocol:
      'Oral Rehydration Solution (ORS): 1 liter clean water + 1/2 tsp table salt (NaCl) + 6 tsp sugar, or commercial electrolyte solution containing balanced sodium, potassium, and magnesium.',
    whenToCallEMS:
      'If vomiting prevents fluid retention, symptoms persist after 30 minutes of cooling, or if confusion, slurred speech, or fainting occurs.',
    specialPopulations:
      'Pregnant women, endurance athletes, outdoor construction workers, individuals with hypertension or renal impairment.',
    tags: ['heat exhaustion', 'sweating', 'dizziness', 'nausea', 'headache', 'weakness', 'dehydration', 'electrolytes'],
  },
  {
    id: 'heat-cramps-syncope',
    condition: 'Heat Cramps & Heat Syncope (Electrolyte Depletion & Orthostatic Collapse)',
    severity: 'MODERATE',
    coreTempThreshold: 'Normal to slightly elevated (37.2°C – 38.3°C / 99°F – 101°F)',
    primarySymptoms: [
      'Sudden, painful spasms in large working muscles (calves, thighs, shoulders, abdomen)',
      'Transient fainting or lightheadedness when standing still for prolonged periods in hot conditions',
      'Intense thirst, sodium depletion from heavy unreplaced perspiration',
    ],
    immediateActions: [
      '1. Cease all physical activity immediately and rest in a cool, shaded area.',
      '2. Drink electrolyte-rich fluids (coconut water, oral rehydration solution, or sports beverage diluted 1:1 with water).',
      '3. Gently stretch and massage the cramping muscle group; hold prolonged static stretch with gentle pressure.',
      '4. For syncope (fainting): Keep the person supine (laying flat) with legs elevated until blood pressure stabilizes.',
    ],
    criticalContraindications: [
      'DO NOT take concentrated salt tablets without water (causes severe gastric irritation and hypernatremia).',
      'DO NOT violently massage or jerk spasming muscles.',
    ],
    coolingTechnique: 'Passive shade resting with cold compress over spasming muscle bellies.',
    hydrationProtocol: 'Sip 250–500 ml of isotonic electrolyte solution containing ~500 mg sodium per liter every 20 minutes.',
    whenToCallEMS: 'If muscle cramps last longer than 1 hour or if chest pain, shortness of breath, or palpitations occur.',
    specialPopulations: 'Manual laborers, athletes, individuals on low-sodium diets who sweat heavily.',
    tags: ['heat cramps', 'syncope', 'fainting', 'muscle spasm', 'electrolytes', 'salt loss', 'calves'],
  },
  {
    id: 'vulnerable-populations',
    condition: 'Vulnerable Population Protection Protocols (Elderly, Infants, Chronic Illness)',
    severity: 'PREVENTATIVE',
    coreTempThreshold: 'Any indoor ambient temperature above 29°C (84°F) without airflow',
    primarySymptoms: [
      'Elderly: Diminished thirst sensation, reduced sweat gland density, impaired cardiovascular response to heat.',
      'Infants/Toddlers: High body surface-area-to-mass ratio, under-developed thermoregulatory sweat centers.',
      'Medication Risks: Anticholinergics, diuretics (dehydration), beta-blockers (blunts cardiac output), antipsychotics.',
    ],
    immediateActions: [
      '1. Maintain indoor living space below 26°C (78°F) or relocate to community cooling shelters during peak hours (12 PM – 7 PM).',
      '2. Scheduled Hydration Check: Do not wait for thirst. Elderly must drink 150–200 ml of fluids every 60–90 minutes.',
      '3. Cold Foot Baths & Forearm Immersion: Submerging feet and hands in 18°C–20°C water provides rapid circulatory heat rejection via arterio-venous anastomoses (AVAs).',
      '4. Wet T-shirt / Damp Sheet Method: Wear light damp cotton clothing in front of an electric fan.',
      '5. Active Caregiver Check-ins: Physically check on isolated elderly neighbors at least twice daily.',
    ],
    criticalContraindications: [
      'NEVER leave infants or children in parked vehicles for even 1 minute (cabin temp rises 10°C / 18°F within 10 minutes).',
      'DO NOT rely on electric fans alone if indoor temperature exceeds 35°C (95°F) with dry air — fans will act as convection ovens and accelerate heat gain unless skin is continuously wetted.',
    ],
    coolingTechnique:
      'Forearm and foot cold immersion (AVAs), damp cotton garments with gentle fan breeze, cool gel packs behind neck.',
    hydrationProtocol:
      'Regular sips of water, dilute fruit juices, broths, and water-rich foods (watermelon, cucumbers, oranges).',
    whenToCallEMS:
      'At any signs of confusion, lethargy, decreased responsiveness, refusal to drink, or dry mucous membranes.',
    specialPopulations: 'Ages 65+, infants < 2 years, dialysis patients, Parkinson/Alzheimer patients, mobility-restricted individuals.',
    tags: ['elderly', 'infants', 'babies', 'medications', 'fans in extreme heat', 'foot bath', 'cooling shelter', 'ava cooling'],
  },
  {
    id: 'blackout-survival',
    condition: 'Grid-Failure & Blackout Extreme Heat Survival (Zero-Electricity Survival)',
    severity: 'HIGH ALERT',
    coreTempThreshold: 'Ambient indoor temp exceeding 36°C (97°F) without electrical AC',
    primarySymptoms: [
      'Indoor thermal accumulation in multistory or uninsulated homes during citywide power outages',
      'Heat distress when mechanical fans and air conditioners are non-functional',
    ],
    immediateActions: [
      '1. MIGRATE TO THE LOWEST LEVEL / BASEMENT: Heat rises through buoyancy; ground floors or basements can be 5°C–10°C cooler than top floors.',
      '2. CREATE AN EVAPORATIVE MICROCLIMATE: Hang damp, wet sheets or towels across open window breezeways in the path of incoming drafts.',
      '3. THE "EGYPTIAN SLEEP METHOD": Dampen a lightweight cotton bedsheet with cold water and use it as a cover; as water evaporates, it draws heat directly from the skin.',
      '4. EMERGENCY COOL PACKS: Fill plastic water bottles from cool tap water and place against femoral arteries (inner thighs) and carotid arteries (neck).',
      '5. SEAL TOP FLOOR HEAT: Close attic hatches and upper floor doors to trap rising convective hot air away from living areas.',
      '6. BLOCK DIRECT SOLAR RADIATION: Tape emergency foil space blankets (shiny side facing outward) or cardboard over south/west window glass (#84).',
    ],
    criticalContraindications: [
      'DO NOT keep windows open during the hottest hours of the day (11 AM – 6 PM) if outside air is hotter than inside air.',
      'DO NOT cook with indoor stoves, ovens, or incandescent lights.',
    ],
    coolingTechnique:
      'Passive nocturnal flush, damp sheet evaporative bedding, basement thermal sink, emergency mylar window shielding.',
    hydrationProtocol:
      'Conserve cool drinking water in insulated containers; mix 1 liter water with 1/2 tsp salt and 6 tsp sugar if heat exhaustion develops.',
    whenToCallEMS: 'Transport vulnerable persons to air-conditioned emergency shelters, hospitals, or public cooling centers.',
    specialPopulations: 'All residents in urban heat islands with multistory living quarters.',
    tags: ['blackout', 'no electricity', 'power outage', 'egyptian method', 'basement', 'mylar foil', 'emergency cooling', 'off-grid'],
  },
  {
    id: 'wbgt-wetbulb-limits',
    condition: 'Wet-Bulb Temperature (WBT) & Non-Compensable Heat Thresholds',
    severity: 'CRITICAL EMERGENCY',
    coreTempThreshold: 'WBT > 31°C (87.8°F) represents critical physiological human survival limit',
    primarySymptoms: [
      'Sweat does not evaporate from the skin due to 100% ambient vapor pressure saturation',
      'Rapid exponential rise in core body temperature even at complete rest without physical exertion',
      'Severe respiratory distress, metabolic acidosis, circulatory collapse',
    ],
    immediateActions: [
      '1. At WBT > 31°C, pure evaporation is thermodynamically impossible — mechanical dehumidification or external refrigerated chilling is mandatory.',
      '2. Submerge body in cold tap or well water below 24°C (75°F) to conductively sink heat without relying on evaporative sweating.',
      '3. Evacuate immediately to air-conditioned buildings, deep subterranean shelters, or cooled vehicles.',
      '4. Cease all metabolic output: lie flat, remain completely still, and apply conductive ice bags.',
    ],
    criticalContraindications: [
      'DO NOT assume sweating will cool you in high humidity (when humidity is near 100%, sweat rolls off skin without evaporating and provides ZERO cooling while depleting electrolytes).',
      'DO NOT run misting fans in closed, unventilated rooms (increases indoor relative humidity and accelerates wet-bulb lethality).',
    ],
    coolingTechnique:
      'Direct conductive heat sinking via cold water immersion, refrigerated AC cooling, ice jackets.',
    hydrationProtocol: 'Electrolyte replacement every 30 minutes; monitor for hyponatremia.',
    whenToCallEMS: 'Immediate evacuation required when outdoor wet bulb exceeds safe environmental thresholds.',
    specialPopulations: 'Anyone living in humid tropical / subtropical coastal lowlands without reliable electrical grid access.',
    tags: ['wet bulb', 'humidity', 'wbt', 'sweat failure', 'thermodynamics', 'lethal heat', 'dew point'],
  },
];

/**
 * Rapid Quick Triage Check
 */
export function getMedicalTriage(query: string): MedicalEmergencyProtocol | null {
  const q = query.toLowerCase();
  if (
    q.includes('stroke') ||
    q.includes('unconscious') ||
    q.includes('delirium') ||
    q.includes('seizure') ||
    q.includes('confusion') ||
    q.includes('104') ||
    q.includes('40 degree')
  ) {
    return HEAT_MEDICAL_PROTOCOLS[0]; // Heat Stroke
  }
  if (
    q.includes('exhaustion') ||
    q.includes('dizzy') ||
    q.includes('nausea') ||
    q.includes('clammy') ||
    q.includes('pale') ||
    q.includes('heavy sweat')
  ) {
    return HEAT_MEDICAL_PROTOCOLS[1]; // Heat Exhaustion
  }
  if (
    q.includes('cramp') ||
    q.includes('spasm') ||
    q.includes('faint') ||
    q.includes('syncope') ||
    q.includes('calf')
  ) {
    return HEAT_MEDICAL_PROTOCOLS[2]; // Heat Cramps
  }
  if (
    q.includes('elderly') ||
    q.includes('baby') ||
    q.includes('infant') ||
    q.includes('grandparent') ||
    q.includes('old age') ||
    q.includes('medicine') ||
    q.includes('medication') ||
    q.includes('fan in heat')
  ) {
    return HEAT_MEDICAL_PROTOCOLS[3]; // Vulnerable populations
  }
  if (
    q.includes('blackout') ||
    q.includes('no power') ||
    q.includes('outage') ||
    q.includes('no electricity') ||
    q.includes('egyptian') ||
    q.includes('survival')
  ) {
    return HEAT_MEDICAL_PROTOCOLS[4]; // Blackout Survival
  }
  if (
    q.includes('wet bulb') ||
    q.includes('humidity') ||
    q.includes('wetbulb') ||
    q.includes('wbgt') ||
    q.includes('sweat not working')
  ) {
    return HEAT_MEDICAL_PROTOCOLS[5]; // Wet bulb
  }
  return null;
}
