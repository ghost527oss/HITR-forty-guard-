-- =====================================================================
-- Layer 1 seed — Emergency & helpline contacts
-- Run AFTER schema.sql and 01_cities_health.sql.
-- NOTE: only well-known national numbers (911, 211) are included as real.
-- City-specific heat-hotlines are left as VERIFY-LATER placeholders — do
-- not publish a number you have not confirmed.
-- =====================================================================

insert into emergency_contacts (city_id, country_code, kind, label, phone, phone_dial) values
  -- National (no city): 911 and 211 work across the US.
  (null, 'US', 'emergency', 'US emergency services (police / fire / ambulance)', '911', '911'),
  (null, 'US', 'helpline', '211 United Way — community & social services helpline', '211', '211')

  -- City-specific heat-relief lines: VERIFY before enabling. Example pattern
  -- (commented out, not inserted) — replace with a confirmed number:
  -- ('11111111-1111-1111-1111-111111111111', 'US', 'heat_hotline', 'Phoenix heat-relief line', '000-000-0000', '000-000-0000')
on conflict (id) do nothing;
