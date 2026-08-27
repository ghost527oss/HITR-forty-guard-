-- =====================================================================
-- Layer 1 seed — Encyclopedia (heat / crops / buildings / shade / water)
-- Run AFTER schema.sql.
-- =====================================================================

insert into encyclopedia (slug, category, title, plain_language, detail, tags) values
(
  'heat-wave',
  'heat',
  'Heat wave',
  'A period of unusually hot weather that lasts several days or more. It is dangerous because the body does not get a break from the heat at night, so heat illnesses build up over days.',
  'Check local heat warnings, stay indoors during the hottest hours, use fans or air conditioning, and check on elderly neighbours and children, who are most at risk.',
  array['heat','heatwave','heat illness','heat warning','extreme heat']
),
(
  'urban-heat-island',
  'heat',
  'Urban heat island (UHI)',
  'Cities are often several degrees hotter than the surrounding countryside because roads, roofs, and buildings absorb heat in the day and release it at night. This makes city heat feel and stay worse.',
  'Shade trees, green roofs, lighter-coloured (reflective) surfaces, and more green space reduce the urban heat island effect. These are exactly the interventions HITR recommends.',
  array['urban heat island','heat island','city heat','green roof','cool surface']
),
(
  'heat-index',
  'heat',
  'Heat index',
  'The "feels like" temperature: how hot it actually feels when humidity is combined with air temperature. High humidity makes sweat less effective, so it feels hotter than the thermometer reads.',
  'When the heat index is high, the body struggles to cool itself even if the air temperature alone seems moderate.',
  array['heat index','feels like','humidity','apparent temperature']
),
(
  'hydration',
  'water',
  'Drinking water & hydration',
  'In hot weather your body loses water fast through sweat. Drink water regularly before you feel thirsty, and replace electrolytes (salt) if you are sweating heavily.',
  'Plain water is best for most people. For long activity or heavy sweating, an electrolyte drink helps replace lost salt. Avoid excess caffeine and alcohol, which dehydrate.',
  array['hydration','water','drink','dehydration','electrolytes']
),
(
  'shelter-belt',
  'crops',
  'Shelter-belt / windbreak',
  'A row or band of trees and shrubs planted to slow the wind. It reduces heat stress and water loss on crops and protects fields and farmhouses.',
  'Place shelter-belts across the direction of the hot prevailing wind. A good belt can lower crop heat stress, cut water use, and cool a farmhouse.',
  array['shelter belt','windbreak','wind','crops','farm','agroforestry']
),
(
  'crop-row-orientation',
  'crops',
  'Crop-row orientation',
  'The direction your crop rows face affects how much sun and wind they get. Orienting rows relative to the sun and wind can keep plants cooler and healthier.',
  'Rows aligned to allow airflow and reduce full midday sun exposure can reduce heat stress. Combined with shelter-belts and inter-cropping, yields can improve in hot climates.',
  array['crops','farm','crop row','orientation','sun','wind']
),
(
  'green-roof',
  'buildings',
  'Green roof',
  'A roof covered with plants and soil. It shades the building, absorbs heat, and helps manage rainwater — keeping the building cooler and the city cooler.',
  'Green roofs reduce indoor temperature swings, lower rooftop surface temperature, and can extend roof life. Great for flat or gently sloped roofs.',
  array['green roof','roof','plants','insulation','cooling']
),
(
  'cool-roof',
  'buildings',
  'Cool (reflective) roof',
  'A roof made of or coated with light, reflective material that bounces sunlight away instead of absorbing it. This keeps the building and the rooms below much cooler.',
  'A white or reflective roof can cut indoor cooling needs significantly in hot, sunny climates. One of the cheapest, highest-impact retrofits.',
  array['cool roof','reflective roof','white roof','roof','cooling','retrofit']
),
(
  'cross-ventilation',
  'buildings',
  'Cross-ventilation',
  'Arranging windows and openings on opposite sides of a room so air can flow through and cool it, without relying on fans or air conditioning.',
  'Place openings facing the prevailing breeze on opposite walls. Tall, narrow plans and high windows help hot air rise and escape.',
  array['ventilation','cross ventilation','airflow','cooling','passive cooling']
),
(
  'thermal-mass',
  'buildings',
  'Thermal mass (heavy walls)',
  'Thick walls made of earth, brick, or stone slowly absorb heat during the day and release it at night, keeping the inside cooler during the hottest hours.',
  'High-thermal-mass homes work best in hot-dry climates with big day-night temperature swings, combined with shade and night-time ventilation.',
  array['thermal mass','adobe','rammed earth','thick walls','passive cooling']
),
(
  'tree-canopy',
  'shade',
  'Tree canopy shade',
  'Trees shading streets, buildings, and people lower the temperature around them by blocking sun and releasing water vapour (evapotranspiration).',
  'A well-placed shade tree can make a street feel several degrees cooler and reduce the heat absorbed by nearby buildings and pavement.',
  array['trees','shade','canopy','green','street','cooling']
),
(
  'evaporative-cooling',
  'heat',
  'Evaporative cooling',
  'Cooling that happens when water evaporates, absorbing heat. Fountains, misting, damp cloths, and plants all use this effect to cool the air around them.',
  'Useful in hot, dry climates. A water feature or misting line combined with shade can cool a public space noticeably.',
  array['evaporative cooling','water','mist','fountain','cooling']
)
on conflict (slug) do nothing;
