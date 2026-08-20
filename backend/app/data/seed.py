"""
Bundled knowledge seed data — the offline fallback the repository reads from
until a Supabase project is connected. Mirrors db/seed/*.sql.

Medical content is GENERAL FIRST-AID GUIDANCE, not medical advice. Only
well-known national numbers (911, 211) are included as real; city heat-hotlines
are placeholders to verify later.
"""

CITIES = [
    {"id": "11111111-1111-1111-1111-111111111111", "name": "Phoenix", "state": "Arizona", "lat": 33.4484, "lng": -112.0740},
    {"id": "22222222-2222-2222-2222-222222222222", "name": "Las Vegas", "state": "Nevada", "lat": 36.1699, "lng": -115.1398},
    {"id": "33333333-3333-3333-3333-333333333333", "name": "Austin", "state": "Texas", "lat": 30.2672, "lng": -97.7431},
    {"id": "44444444-4444-4444-4444-444444444444", "name": "Miami", "state": "Florida", "lat": 25.7617, "lng": -80.1918},
    {"id": "55555555-5555-5555-5555-555555555555", "name": "Los Angeles", "state": "California", "lat": 34.0522, "lng": -118.2437},
]

HEALTH_CONDITIONS = [
    {
        "slug": "heat-stroke", "name": "Heat stroke", "severity": "emergency",
        "plain_language": "A life-threatening emergency where the body overheats and can no longer cool itself. Body temperature can rise above 104°F (40°C). Call for emergency help immediately.",
        "symptoms": ["Body temperature very high (104°F / 40°C or more)", "Hot, dry skin with little or no sweating", "Confusion or slurred speech", "Seizures", "Loss of consciousness", "Rapid, strong pulse", "Nausea or vomiting"],
        "first_aid_steps": ["CALL EMERGENCY SERVICES (911 in the US) immediately", "Move the person to a cool, shaded area", "Remove extra clothing", "Cool the body fast: cold water, ice packs on neck / armpits / groin, fan the skin", "If awake, sip cool water slowly; NEVER force fluids if unconscious or confused", "Stay with them and monitor breathing until help arrives"],
    },
    {
        "slug": "heat-exhaustion", "name": "Heat exhaustion", "severity": "severe",
        "plain_language": "A serious heat illness from losing too much water and salt through heavy sweating. It can turn into heat stroke if not treated, so cool the person down and rest.",
        "symptoms": ["Heavy sweating", "Weakness or fatigue", "Cool, pale, clammy skin", "Fast but weak pulse", "Headache and dizziness", "Nausea or vomiting", "Fainting"],
        "first_aid_steps": ["Move to a cool place and rest", "Loosen or remove tight clothing", "Apply cool, wet cloths and fan the person", "Sip water or an electrolyte drink slowly", "If symptoms get worse or vomiting continues, seek medical help", "If signs of heat stroke appear (confusion, high fever), treat as an emergency"],
    },
    {
        "slug": "heat-cramps", "name": "Heat cramps", "severity": "mild",
        "plain_language": "Painful muscle spasms, usually in the legs or abdomen, caused by heavy sweating that loses water and salt.",
        "symptoms": ["Painful muscle spasms (legs, arms, abdomen)", "Heavy sweating", "Muscles feel hard or knotted"],
        "first_aid_steps": ["Stop activity and rest in a cool place", "Drink water or an electrolyte drink", "Gently stretch and massage the cramped muscle", "Return to activity slowly", "Seek medical help if cramps last more than an hour"],
    },
    {
        "slug": "dehydration", "name": "Dehydration", "severity": "severe",
        "plain_language": "The body does not have enough water to work normally. In hot weather you lose water fast through sweat, so drink regularly even before you feel thirsty.",
        "symptoms": ["Thirst and dry mouth", "Dark yellow urine", "Dizziness or light-headedness", "Fatigue", "Headache", "Confusion (in severe cases)", "Little or no urination"],
        "first_aid_steps": ["Stop activity and move to a cool, shaded place", "Drink water or an oral-rehydration/electrolyte drink in small sips", "Rest until you feel normal", "If confused, cannot keep fluids down, or symptoms worsen, seek medical help"],
    },
    {
        "slug": "sunburn", "name": "Sunburn", "severity": "mild",
        "plain_language": "Red, painful skin caused by too much sun. It damages skin and raises the risk of heat illness because the skin loses its ability to cool you well.",
        "symptoms": ["Red, warm, painful skin", "Swelling", "Blisters (in more serious cases)", "Dry, peeling skin a few days later"],
        "first_aid_steps": ["Get out of the sun", "Cool the skin with a cool (not ice-cold) compress or bath", "Apply soothing aloe or moisturiser", "Drink extra water to rehydrate", "Take pain relief if needed", "Seek medical help for severe or widespread blistering, fever, or confusion"],
    },
]

EMERGENCY_CONTACTS = [
    {"kind": "emergency", "label": "US emergency services (police / fire / ambulance)", "phone": "911", "city": None},
    {"kind": "helpline", "label": "211 United Way — community & social services helpline", "phone": "211", "city": None},
    # City heat-hotlines are placeholders — verify before publishing.
]

ENCYCLOPEDIA = [
    {"slug": "heat-wave", "category": "heat", "title": "Heat wave",
     "plain_language": "A period of unusually hot weather that lasts several days or more. It is dangerous because the body does not get a break from the heat at night, so heat illnesses build up over days.",
     "tags": ["heat", "heatwave", "heat illness", "heat warning", "extreme heat"]},
    {"slug": "urban-heat-island", "category": "heat", "title": "Urban heat island (UHI)",
     "plain_language": "Cities are often several degrees hotter than the surrounding countryside because roads, roofs, and buildings absorb heat in the day and release it at night. This makes city heat feel and stay worse.",
     "tags": ["urban heat island", "heat island", "city heat", "green roof", "cool surface"]},
    {"slug": "heat-index", "category": "heat", "title": "Heat index",
     "plain_language": "The \"feels like\" temperature: how hot it actually feels when humidity is combined with air temperature. High humidity makes sweat less effective, so it feels hotter than the thermometer reads.",
     "tags": ["heat index", "feels like", "humidity", "apparent temperature"]},
    {"slug": "hydration", "category": "water", "title": "Drinking water & hydration",
     "plain_language": "In hot weather your body loses water fast through sweat. Drink water regularly before you feel thirsty, and replace electrolytes (salt) if you are sweating heavily.",
     "tags": ["hydration", "water", "drink", "dehydration", "electrolytes"]},
    {"slug": "shelter-belt", "category": "crops", "title": "Shelter-belt / windbreak",
     "plain_language": "A row or band of trees and shrubs planted to slow the wind. It reduces heat stress and water loss on crops and protects fields and farmhouses.",
     "tags": ["shelter belt", "windbreak", "wind", "crops", "farm", "agroforestry"]},
    {"slug": "crop-row-orientation", "category": "crops", "title": "Crop-row orientation",
     "plain_language": "The direction your crop rows face affects how much sun and wind they get. Orienting rows relative to the sun and wind can keep plants cooler and healthier.",
     "tags": ["crops", "farm", "crop row", "orientation", "sun", "wind"]},
    {"slug": "green-roof", "category": "buildings", "title": "Green roof",
     "plain_language": "A roof covered with plants and soil. It shades the building, absorbs heat, and helps manage rainwater — keeping the building cooler and the city cooler.",
     "tags": ["green roof", "roof", "plants", "insulation", "cooling"]},
    {"slug": "cool-roof", "category": "buildings", "title": "Cool (reflective) roof",
     "plain_language": "A roof made of or coated with light, reflective material that bounces sunlight away instead of absorbing it. This keeps the building and the rooms below much cooler.",
     "tags": ["cool roof", "reflective roof", "white roof", "roof", "cooling", "retrofit"]},
    {"slug": "cross-ventilation", "category": "buildings", "title": "Cross-ventilation",
     "plain_language": "Arranging windows and openings on opposite sides of a room so air can flow through and cool it, without relying on fans or air conditioning.",
     "tags": ["ventilation", "cross ventilation", "airflow", "cooling", "passive cooling"]},
    {"slug": "thermal-mass", "category": "buildings", "title": "Thermal mass (heavy walls)",
     "plain_language": "Thick walls made of earth, brick, or stone slowly absorb heat during the day and release it at night, keeping the inside cooler during the hottest hours.",
     "tags": ["thermal mass", "adobe", "rammed earth", "thick walls", "passive cooling"]},
    {"slug": "tree-canopy", "category": "shade", "title": "Tree canopy shade",
     "plain_language": "Trees shading streets, buildings, and people lower the temperature around them by blocking sun and releasing water vapour (evapotranspiration).",
     "tags": ["trees", "shade", "canopy", "green", "street", "cooling"]},
    {"slug": "evaporative-cooling", "category": "heat", "title": "Evaporative cooling",
     "plain_language": "Cooling that happens when water evaporates, absorbing heat. Fountains, misting, damp cloths, and plants all use this effect to cool the air around them.",
     "tags": ["evaporative cooling", "water", "mist", "fountain", "cooling"]},
]

BUILDINGS = [
    {"slug": "cool-roof-house", "name": "Reflective cool-roof house",
     "plain_language": "A house with a white or light reflective roof that bounces sunlight away, so the rooms underneath stay noticeably cooler without extra air conditioning.",
     "cooling_benefit_c": 3.0, "energy_cost_bucket": "low", "cost_bucket": "low",
     "materials": ["White reflective roof", "Light-coloured walls", "Attic insulation"],
     "climate_suitability": "hot-dry, hot-humid", "tags": ["cool roof", "white roof", "retrofit", "low cost"]},
    {"slug": "veranda-courtyard-house", "name": "Deep-veranda courtyard house",
     "plain_language": "A home arranged around a shaded courtyard with a deep veranda on the hot side, creating a cool outdoor living space and shading the walls.",
     "cooling_benefit_c": 4.0, "energy_cost_bucket": "medium", "cost_bucket": "medium",
     "materials": ["Shaded courtyard", "Deep veranda", "Overhangs", "Light walls"],
     "climate_suitability": "hot-dry", "tags": ["courtyard", "veranda", "shade", "passive design", "traditional"]},
    {"slug": "cross-ventilated-house", "name": "Cross-ventilated narrow-plan house",
     "plain_language": "A home with a narrow layout and windows on opposite sides so air flows through every room, keeping it cool with natural breezes.",
     "cooling_benefit_c": 2.5, "energy_cost_bucket": "low", "cost_bucket": "low",
     "materials": ["Opposing windows", "Narrow plan", "High windows", "Vents"],
     "climate_suitability": "hot-humid, hot-dry", "tags": ["ventilation", "airflow", "passive cooling", "windows"]},
    {"slug": "thermal-mass-house", "name": "High-thermal-mass earth house",
     "plain_language": "A house with thick earth, adobe, or rammed-earth walls that absorb heat during the day and release it at night, staying cool in the hottest hours.",
     "cooling_benefit_c": 4.5, "energy_cost_bucket": "low", "cost_bucket": "medium",
     "materials": ["Rammed earth / adobe", "Thick walls", "High ceilings", "Night ventilation"],
     "climate_suitability": "hot-dry", "tags": ["thermal mass", "adobe", "rammed earth", "earth", "passive cooling"]},
    {"slug": "insulated-attic-house", "name": "Insulated & sealed house",
     "plain_language": "A well-insulated home with an insulated attic and sealed, reflective surfaces that keeps heat out in summer and warmth in winter.",
     "cooling_benefit_c": 2.0, "energy_cost_bucket": "low", "cost_bucket": "medium",
     "materials": ["Attic insulation", "Wall insulation", "Reflective roof", "Sealed windows"],
     "climate_suitability": "any", "tags": ["insulation", "attic", "sealed", "energy efficient"]},
    {"slug": "shaded-window-house", "name": "Shaded-window & overhang house",
     "plain_language": "A home with deep overhangs and louvres that block summer sun from hitting windows while still letting in light and views.",
     "cooling_benefit_c": 3.5, "energy_cost_bucket": "medium", "cost_bucket": "low",
     "materials": ["Deep overhangs", "External blinds / louvres", "Awnings", "Low-e glass"],
     "climate_suitability": "any", "tags": ["shade", "overhang", "window", "louvre", "sun control"]},
]
