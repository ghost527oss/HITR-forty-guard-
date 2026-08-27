-- =====================================================================
-- Layer 1 seed — Cities + Health conditions
-- Run AFTER schema.sql. Idempotent (INSERT ... ON CONFLICT DO NOTHING).
-- Health content is GENERAL FIRST-AID GUIDANCE, not medical advice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cities
-- ---------------------------------------------------------------------
insert into cities (id, name, country, state, lat, lng, timezone) values
  ('11111111-1111-1111-1111-111111111111', 'Phoenix',   'US', 'Arizona',       33.4484, -112.0740, 'America/Phoenix'),
  ('22222222-2222-2222-2222-222222222222', 'Las Vegas', 'US', 'Nevada',         36.1699, -115.1398, 'America/Los_Angeles'),
  ('33333333-3333-3333-3333-333333333333', 'Austin',    'US', 'Texas',          30.2672, -97.7431,  'America/Chicago'),
  ('44444444-4444-4444-4444-444444444444', 'Miami',     'US', 'Florida',        25.7617, -80.1918,  'America/New_York'),
  ('55555555-5555-5555-5555-555555555555', 'Los Angeles','US','California',     34.0522, -118.2437, 'America/Los_Angeles')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Health conditions
-- ---------------------------------------------------------------------
insert into health_conditions (slug, name, plain_language, symptoms, first_aid_steps, severity) values
(
  'heat-stroke',
  'Heat stroke',
  'A life-threatening emergency where the body overheats and can no longer cool itself. Body temperature can rise above 104°F (40°C). Call for emergency help immediately.',
  array['Body temperature very high (104°F / 40°C or more)','Hot, dry skin with little or no sweating','Confusion or slurred speech','Seizures','Loss of consciousness','Rapid, strong pulse','Nausea or vomiting'],
  array['CALL EMERGENCY SERVICES (911 in the US) immediately','Move the person to a cool, shaded area','Remove extra clothing','Cool the body fast: cold water, ice packs on neck / armpits / groin, fan the skin','If awake, sip cool water slowly; NEVER force fluids if unconscious or confused','Stay with them and monitor breathing until help arrives'],
  'emergency'
),
(
  'heat-exhaustion',
  'Heat exhaustion',
  'A serious heat illness from losing too much water and salt through heavy sweating. It can turn into heat stroke if not treated, so cool the person down and rest.',
  array['Heavy sweating','Weakness or fatigue','Cool, pale, clammy skin','Fast but weak pulse','Headache and dizziness','Nausea or vomiting','Fainting'],
  array['Move to a cool place and rest','Loosen or remove tight clothing','Apply cool, wet cloths and fan the person','Sip water or an electrolyte drink slowly','If symptoms get worse or vomiting continues, seek medical help','If signs of heat stroke appear (confusion, high fever), treat as an emergency'],
  'severe'
),
(
  'heat-cramps',
  'Heat cramps',
  'Painful muscle spasms, usually in the legs or abdomen, caused by heavy sweating that loses water and salt.',
  array['Painful muscle spasms (legs, arms, abdomen)','Heavy sweating','Muscles feel hard or knotted'],
  array['Stop activity and rest in a cool place','Drink water or an electrolyte drink','Gently stretch and massage the cramped muscle','Return to activity slowly','Seek medical help if cramps last more than an hour'],
  'mild'
),
(
  'dehydration',
  'Dehydration',
  'The body does not have enough water to work normally. In hot weather you lose water fast through sweat, so drink regularly even before you feel thirsty.',
  array['Thirst and dry mouth','Dark yellow urine','Dizziness or light-headedness','Fatigue','Headache','Confusion (in severe cases)','Little or no urination'],
  array['Stop activity and move to a cool, shaded place','Drink water or an oral-rehydration/electrolyte drink in small sips','Rest until you feel normal','If confused, cannot keep fluids down, or symptoms worsen, seek medical help'],
  'severe'
),
(
  'sunburn',
  'Sunburn',
  'Red, painful skin caused by too much sun. It damages skin and raises the risk of heat illness because the skin loses its ability to cool you well.',
  array['Red, warm, painful skin','Swelling','Blisters (in more serious cases)','Dry, peeling skin a few days later'],
  array['Get out of the sun','Cool the skin with a cool (not ice-cold) compress or bath','Apply soothing aloe or moisturiser','Drink extra water to rehydrate','Take pain relief if needed','Seek medical help for severe or widespread blistering, fever, or confusion'],
  'mild'
)
on conflict (slug) do nothing;
