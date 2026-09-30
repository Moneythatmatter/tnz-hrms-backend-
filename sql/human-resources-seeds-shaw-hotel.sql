-- HR seeds for Shaw Hotel — run if you use prop-shaw-hotel as active property
-- Run AFTER human-resources-schema.sql (and optionally after human-resources-seeds.sql)

-- ========== DEPARTMENTS ==========
insert into hr_departments (id, property_id, dept_code, department_name, head_of_department, head_email, location, description, status) values
  ('a1000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'FO-10', 'Front Office', 'Rajesh Kumar', 'rajesh.kumar@shawhotel.com', 'Main Lobby', 'Front desk and guest services.', 'Active'),
  ('a1000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'HK-20', 'Housekeeping', 'Anjali Sharma', 'anjali.sharma@shawhotel.com', 'Service Floor', 'Room and public area cleaning.', 'Active'),
  ('a1000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'FB-30', 'Food & Beverage', 'Chef Vikramjit Singh', 'vikram@shawhotel.com', 'Kitchen', 'Restaurant and kitchen ops.', 'Active'),
  ('a1000002-0001-4000-8000-000000000004', 'prop-shaw-hotel', 'HR-40', 'Human Resources', 'Neha Mehta', 'neha.mehta@shawhotel.com', 'Admin Block', 'HR and payroll.', 'Active')
on conflict (id) do nothing;

-- ========== DESIGNATIONS ==========
insert into hr_designations (id, property_id, designation_code, designation_title, department_id, job_grade, description, status) values
  ('b2000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'DSG-FO-01', 'Front Desk Manager', 'a1000002-0001-4000-8000-000000000001', 'M2', 'Front desk lead.', 'Active'),
  ('b2000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'DSG-FO-02', 'Guest Relations Executive', 'a1000002-0001-4000-8000-000000000001', 'E3', 'Guest relations.', 'Active'),
  ('b2000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'DSG-HK-01', 'Executive Housekeeper', 'a1000002-0001-4000-8000-000000000002', 'M2', 'Housekeeping lead.', 'Active'),
  ('b2000002-0001-4000-8000-000000000004', 'prop-shaw-hotel', 'DSG-FB-01', 'Executive Head Chef', 'a1000002-0001-4000-8000-000000000003', 'M3', 'Kitchen head.', 'Active')
on conflict (id) do nothing;

-- ========== EMPLOYMENT TYPES ==========
insert into hr_employment_types (id, property_id, type_code, type_name, working_term, probation_days, notice_period_days, pf_eligible, esi_eligible, leave_eligible, description, status) values
  ('c3000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'ET-PERM', 'Permanent', 'Full-time', 90, 30, true, true, true, 'Permanent staff.', 'Active'),
  ('c3000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'ET-CONT', 'Contract', 'Contract', 0, 15, false, true, true, 'Contract staff.', 'Active'),
  ('c3000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'ET-PROB', 'Probation', 'Probation', 90, 7, true, true, true, 'Probation staff.', 'Active')
on conflict (id) do nothing;

-- ========== SHIFT TYPES ==========
insert into hr_shift_types (id, property_id, shift_code, shift_name, category, start_time, end_time, break_duration_minutes, total_working_hours, is_night_shift, description, status) values
  ('d4000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'SH-MRN', 'Morning Shift', 'Regular', '06:00', '14:00', 30, 7.5, false, 'Morning shift.', 'Active'),
  ('d4000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'SH-EVE', 'Evening Shift', 'Regular', '14:00', '22:00', 30, 7.5, false, 'Evening shift.', 'Active'),
  ('d4000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'SH-GEN', 'General Shift', 'Regular', '09:00', '18:00', 60, 8.0, false, 'General shift.', 'Active')
on conflict (id) do nothing;

-- ========== LEAVE TYPES ==========
insert into hr_leave_types (id, property_id, leave_code, leave_name, annual_quota_days, pay_type, description, status) values
  ('e5000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'LV-CL', 'Casual Leave (CL)', 12, 'Paid', 'Casual leave.', 'Active'),
  ('e5000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'LV-EL', 'Earned Leave (EL)', 18, 'Paid', 'Earned leave.', 'Active'),
  ('e5000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'LV-SL', 'Sick Leave (SL)', 10, 'Paid', 'Sick leave.', 'Active')
on conflict (id) do nothing;

-- ========== LEAVE POLICIES ==========
insert into hr_leave_policies (id, property_id, policy_code, policy_name, total_annual_days, applicable_employment_types, allocations, description, status) values
  ('f6000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'LP-STD', 'Standard Policy', 24,
   '["c3000002-0001-4000-8000-000000000001"]'::jsonb,
   '[{"leaveTypeId":"e5000002-0001-4000-8000-000000000001","days":12},{"leaveTypeId":"e5000002-0001-4000-8000-000000000002","days":12}]'::jsonb,
   'Standard leave policy.', 'Active')
on conflict (id) do nothing;

-- ========== EMPLOYEES (joined within the past week — ref date: 2026-09-07) ==========
insert into hr_employees (id, property_id, emp_code, first_name, last_name, email, phone, department_id, designation_id, employment_type_id, shift_type_id, leave_policy_id, join_date, salary, status, gender, avatar, attendance_rate, leave_balance) values
  ('f2000002-0001-4000-8000-000000000001', 'prop-shaw-hotel', 'EMP-0101', 'Rajesh', 'Kumar', 'rajesh.kumar@shawhotel.com', '+91 98765 43210', 'a1000002-0001-4000-8000-000000000001', 'b2000002-0001-4000-8000-000000000001', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000001', 'f6000002-0001-4000-8000-000000000001', '2026-09-01', 45000, 'Active', 'Male', 'RK', 100.0, '{"casual":8,"sick":7,"earned":14}'::jsonb),
  ('f2000002-0001-4000-8000-000000000002', 'prop-shaw-hotel', 'EMP-0102', 'Priya', 'Patel', 'priya.patel@shawhotel.com', '+91 98765 43211', 'a1000002-0001-4000-8000-000000000001', 'b2000002-0001-4000-8000-000000000002', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000002', 'f6000002-0001-4000-8000-000000000001', '2026-09-02', 38000, 'Active', 'Female', 'PP', 75.0, '{"casual":6,"sick":8,"earned":10}'::jsonb),
  ('f2000002-0001-4000-8000-000000000003', 'prop-shaw-hotel', 'EMP-0103', 'Anjali', 'Sharma', 'anjali.sharma@shawhotel.com', '+91 98765 43212', 'a1000002-0001-4000-8000-000000000002', 'b2000002-0001-4000-8000-000000000003', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000001', 'f6000002-0001-4000-8000-000000000001', '2026-09-03', 52000, 'Active', 'Female', 'AS', 100.0, '{"casual":10,"sick":9,"earned":16}'::jsonb),
  ('f2000002-0001-4000-8000-000000000004', 'prop-shaw-hotel', 'EMP-0104', 'Vikramjit', 'Singh', 'vikram@shawhotel.com', '+91 98765 43213', 'a1000002-0001-4000-8000-000000000003', 'b2000002-0001-4000-8000-000000000004', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000002', 'f6000002-0001-4000-8000-000000000001', '2026-09-04', 95000, 'Active', 'Male', 'VS', 100.0, '{"casual":11,"sick":10,"earned":20}'::jsonb),
  ('f2000002-0001-4000-8000-000000000005', 'prop-shaw-hotel', 'EMP-0105', 'Arjun', 'Verma', 'arjun.verma@shawhotel.com', '+91 98765 43214', 'a1000002-0001-4000-8000-000000000003', 'b2000002-0001-4000-8000-000000000004', 'c3000002-0001-4000-8000-000000000003', 'd4000002-0001-4000-8000-000000000002', 'f6000002-0001-4000-8000-000000000001', '2026-09-05', 32000, 'Active', 'Male', 'AV', 100.0, '{"casual":12,"sick":10,"earned":0}'::jsonb)
on conflict (id) do update set
  join_date = excluded.join_date,
  attendance_rate = excluded.attendance_rate;

-- ========== ATTENDANCE (past week — from each employee's join date through 2026-09-05) ==========
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

-- ========== PAYROLL SETTINGS ==========
insert into hr_payroll_settings (id, property_id, settings) values
  ('n6000002-0001-4000-8000-000000000001', 'prop-shaw-hotel',
   '{"frequency":"Monthly","startDay":1,"endDay":31,"paymentDay":10,"enablePf":true,"enableEsi":true,"enablePt":true,"pfEmployeePct":12,"approvalRole":"HR Manager"}'::jsonb)
on conflict (property_id) do nothing;
