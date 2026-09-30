-- Patch: recent joiners + attendance (ref date 2026-09-07)
-- Run in Supabase SQL Editor if employees already exist with old join dates.
-- Safe to re-run — updates join dates and upserts attendance by fixed IDs.

-- ========== GRAND PALACE — join dates ==========
update hr_employees set join_date = '2026-09-01', attendance_rate = 100.0 where id = 'k2000001-0001-4000-8000-000000000001';
update hr_employees set join_date = '2026-09-02', attendance_rate = 75.0  where id = 'k2000001-0001-4000-8000-000000000002';
update hr_employees set join_date = '2026-09-03', attendance_rate = 100.0 where id = 'k2000001-0001-4000-8000-000000000003';
update hr_employees set join_date = '2026-09-04', attendance_rate = 100.0 where id = 'k2000001-0001-4000-8000-000000000004';
update hr_employees set join_date = '2026-09-05', attendance_rate = 100.0 where id = 'k2000001-0001-4000-8000-000000000005';

-- ========== SHAW HOTEL — join dates ==========
update hr_employees set join_date = '2026-09-01', attendance_rate = 100.0 where id = 'f2000002-0001-4000-8000-000000000001';
update hr_employees set join_date = '2026-09-02', attendance_rate = 75.0  where id = 'f2000002-0001-4000-8000-000000000002';
update hr_employees set join_date = '2026-09-03', attendance_rate = 100.0 where id = 'f2000002-0001-4000-8000-000000000003';
update hr_employees set join_date = '2026-09-04', attendance_rate = 100.0 where id = 'f2000002-0001-4000-8000-000000000004';
update hr_employees set join_date = '2026-09-05', attendance_rate = 100.0 where id = 'f2000002-0001-4000-8000-000000000005';

-- ========== GRAND PALACE — attendance ==========
insert into hr_attendance_records (id, property_id, employee_id, shift_code, shift_name, record_date, check_in, check_out, worked_hours, expected_hours, status, in_location, out_location, device_type) values
  ('r8000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-01', '05:58', '14:02', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-02', '06:05', '14:10', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-03', '05:55', '14:00', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-04', '06:00', '14:05', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-05', '05:52', '14:00', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000006', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-02', '14:00', '22:00', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000007', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-03', '14:22', '22:05', 7.5, 7.5, 'Late', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000008', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-04', '13:58', '21:55', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000009', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:05', '22:10', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000010', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-03', '06:02', '14:08', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000011', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-04', '05:58', '14:00', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000012', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-05', '06:00', '14:05', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000013', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-04', '14:00', '22:00', 7.5, 7.5, 'Present', 'Kitchen — Biometric', 'Kitchen — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000014', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-05', '13:55', '21:50', 7.5, 7.5, 'Present', 'Kitchen — Biometric', 'Kitchen — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000015', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000005', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:10', '22:00', 7.5, 7.5, 'Present', 'Restaurant — Manual', 'Restaurant — Manual', 'Manual Entry')
on conflict (id) do nothing;

-- ========== SHAW HOTEL — attendance ==========
insert into hr_attendance_records (id, property_id, employee_id, shift_code, shift_name, record_date, check_in, check_out, worked_hours, expected_hours, status, in_location, out_location, device_type) values
  ('r8000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-01', '05:58', '14:02', 7.5, 7.5, 'Present', 'Main Lobby — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-02', '06:05', '14:10', 7.5, 7.5, 'Present', 'Main Lobby — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-03', '05:55', '14:00', 7.5, 7.5, 'Present', 'Main Lobby — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000004', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-04', '06:00', '14:05', 7.5, 7.5, 'Present', 'Main Lobby — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000005', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-05', '05:52', '14:00', 7.5, 7.5, 'Present', 'Main Lobby — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000006', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-02', '14:00', '22:00', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000002-0001-4000-8000-000000000007', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-03', '14:22', '22:05', 7.5, 7.5, 'Late', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000002-0001-4000-8000-000000000008', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-04', '13:58', '21:55', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000002-0001-4000-8000-000000000009', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:05', '22:10', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000002-0001-4000-8000-000000000010', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-03', '06:02', '14:08', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000011', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-04', '05:58', '14:00', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000012', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-05', '06:00', '14:05', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000013', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-04', '14:00', '22:00', 7.5, 7.5, 'Present', 'Kitchen — Biometric', 'Kitchen — Biometric', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000014', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-05', '13:55', '21:50', 7.5, 7.5, 'Present', 'Kitchen — Biometric', 'Kitchen — Biometric', 'Biometric Reader'),
  ('r8000002-0001-4000-8000-000000000015', 'prop-shaw-hotel', 'f2000002-0001-4000-8000-000000000005', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:10', '22:00', 7.5, 7.5, 'Present', 'Restaurant — Manual', 'Restaurant — Manual', 'Manual Entry')
on conflict (id) do nothing;
