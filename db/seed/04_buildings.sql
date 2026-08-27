-- =====================================================================
-- Layer 1 seed — Architecture / building designs (plain language)
-- Run AFTER schema.sql.
-- Cooling benefit is a reasonable estimate in °C, framed as guidance.
-- =====================================================================

insert into buildings (slug, name, plain_language, description, cooling_benefit_c, energy_cost_bucket, materials, climate_suitability, cost_bucket, tags) values
(
  'cool-roof-house',
  'Reflective cool-roof house',
  'A house with a white or light reflective roof that bounces sunlight away, so the rooms underneath stay noticeably cooler without extra air conditioning.',
  'One of the simplest and most effective retrofits in hot, sunny climates. Pairs well with a light-coloured exterior and good attic insulation.',
  3.0, 'low',
  array['White reflective roof','Light-coloured walls','Attic insulation'],
  'hot-dry, hot-humid',
  'low',
  array['cool roof','white roof','retrofit','low cost']
),
(
  'veranda-courtyard-house',
  'Deep-veranda courtyard house',
  'A home arranged around a shaded courtyard with a deep veranda on the hot side, creating a cool outdoor living space and shading the walls.',
  'Common in hot climates: the courtyard stays shaded much of the day, and the veranda protects walls and windows from direct sun.',
  4.0, 'medium',
  array['Shaded courtyard','Deep veranda','Overhangs','Light walls'],
  'hot-dry',
  'medium',
  array['courtyard','veranda','shade','passive design','traditional']
),
(
  'cross-ventilated-house',
  'Cross-ventilated narrow-plan house',
  'A home with a narrow layout and windows on opposite sides so air flows through every room, keeping it cool with natural breezes.',
  'Works best when openings face the prevailing breeze. High windows let hot air escape at the top.',
  2.5, 'low',
  array['Opposing windows','Narrow plan','High windows','Vents'],
  'hot-humid, hot-dry',
  'low',
  array['ventilation','airflow','passive cooling','windows']
),
(
  'thermal-mass-house',
  'High-thermal-mass earth house',
  'A house with thick earth, adobe, or rammed-earth walls that absorb heat during the day and release it at night, staying cool in the hottest hours.',
  'Best in hot-dry climates with large day-night swings. Combine with shade and night-time ventilation to flush out stored heat.',
  4.5, 'low',
  array['Rammed earth / adobe','Thick walls','High ceilings','Night ventilation'],
  'hot-dry',
  'medium',
  array['thermal mass','adobe','rammed earth','earth','passive cooling']
),
(
  'insulated-attic-house',
  'Insulated & sealed house',
  'A well-insulated home with an insulated attic and sealed, reflective surfaces that keeps heat out in summer and warmth in winter.',
  'Insulation slows heat moving through the roof and walls. Pair with cool-roof coating and airtight windows for best results.',
  2.0, 'low',
  array['Attic insulation','Wall insulation','Reflective roof','Sealed windows'],
  'any',
  'medium',
  array['insulation','attic','sealed','energy efficient']
),
(
  'shaded-window-house',
  'Shaded-window & overhang house',
  'A home with deep overhangs and louvres that block summer sun from hitting windows while still letting in light and views.',
  'Shading the windows is the single most effective way to stop heat getting in. Works with adjustable awnings or external blinds.',
  3.5, 'medium',
  array['Deep overhangs','External blinds / louvres','Awnings','Low-e glass'],
  'any',
  'low',
  array['shade','overhang','window','louvre','sun control']
)
on conflict (slug) do nothing;
