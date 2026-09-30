-- HR seeds for Grand Palace Resort — run AFTER human-resources-schema.sql
-- All primary keys are UUIDs (fixed for reproducible references)

-- Property
-- prop-grand-palace from multi-property-seeds.sql

-- ========== DEPARTMENTS ==========
insert into hr_departments (id, property_id, dept_code, department_name, head_of_department, head_email, location, description, status) values
  ('a1000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'FO-10', 'Front Office', 'Rajesh Kumar', 'rajesh.kumar@grandpalace.com', 'Main Lobby - Floor 1', 'Guest reception, concierge, reservations, and front desk operations.', 'Active'),
  ('a1000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'HK-20', 'Housekeeping', 'Anjali Sharma', 'anjali.sharma@grandpalace.com', 'Service Floor - B1', 'Room cleaning, laundry coordination, and public area upkeep.', 'Active'),
  ('a1000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'FB-30', 'Food & Beverage', 'Chef Vikramjit Singh', 'vikram@grandpalace.com', 'Kitchen & Restaurants', 'Restaurant, bar, banquet, and kitchen operations.', 'Active'),
  ('a1000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'HR-40', 'Human Resources', 'Neha Mehta', 'neha.mehta@grandpalace.com', 'Admin Block - Floor 2', 'Recruitment, payroll, employee relations, and compliance.', 'Active'),
  ('a1000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'ENG-50', 'Engineering', 'Suresh Reddy', 'suresh.reddy@grandpalace.com', 'Basement - Plant Room', 'Maintenance, HVAC, electrical, and plumbing.', 'Active')
on conflict (id) do nothing;

-- ========== DESIGNATIONS ==========
insert into hr_designations (id, property_id, designation_code, designation_title, department_id, job_grade, description, status) values
  ('b2000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'DSG-FO-01', 'Front Desk Manager', 'a1000001-0001-4000-8000-000000000001', 'M2', 'Leads front desk team and guest check-in/out.', 'Active'),
  ('b2000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'DSG-FO-02', 'Guest Relations Executive', 'a1000001-0001-4000-8000-000000000001', 'E3', 'Handles VIP guest relations and feedback.', 'Active'),
  ('b2000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'DSG-HK-01', 'Executive Housekeeper', 'a1000001-0001-4000-8000-000000000002', 'M2', 'Oversees housekeeping standards and staff.', 'Active'),
  ('b2000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'DSG-FB-01', 'Executive Head Chef', 'a1000001-0001-4000-8000-000000000003', 'M3', 'Head of kitchen and menu planning.', 'Active'),
  ('b2000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'DSG-FB-02', 'Restaurant Captain', 'a1000001-0001-4000-8000-000000000003', 'S2', 'Floor service and F&B operations lead.', 'Active')
on conflict (id) do nothing;

-- ========== EMPLOYMENT TYPES ==========
insert into hr_employment_types (id, property_id, type_code, type_name, working_term, probation_days, notice_period_days, pf_eligible, esi_eligible, leave_eligible, description, status) values
  ('c3000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'ET-PERM', 'Permanent', 'Full-time permanent employment', 90, 30, true, true, true, 'Standard permanent staff with full benefits.', 'Active'),
  ('c3000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'ET-CONT', 'Contract', 'Fixed-term contract', 0, 15, false, true, true, 'Contractual staff for seasonal or project work.', 'Active'),
  ('c3000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'ET-PROB', 'Probation', 'Probation period employment', 90, 7, true, true, true, 'New joiners under probation assessment.', 'Active')
on conflict (id) do nothing;

-- ========== SHIFT TYPES ==========
insert into hr_shift_types (id, property_id, shift_code, shift_name, category, start_time, end_time, break_duration_minutes, total_working_hours, is_night_shift, night_allowance_eligible, description, status) values
  ('d4000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'SH-MRN', 'Morning Shift', 'Regular', '06:00', '14:00', 30, 7.5, false, false, 'Early morning operations shift.', 'Active'),
  ('d4000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'SH-EVE', 'Evening Shift', 'Regular', '14:00', '22:00', 30, 7.5, false, false, 'Afternoon to evening shift.', 'Active'),
  ('d4000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'SH-NGT', 'Night Shift', 'Night', '22:00', '06:00', 30, 7.5, true, true, 'Overnight operations with night allowance.', 'Active'),
  ('d4000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'SH-GEN', 'General Shift', 'Regular', '09:00', '18:00', 60, 8.0, false, false, 'Standard admin and back-office hours.', 'Active')
on conflict (id) do nothing;

-- ========== LEAVE TYPES ==========
insert into hr_leave_types (id, property_id, leave_code, leave_name, annual_quota_days, pay_type, carry_forward_allowed, max_carry_forward_days, encashable, requires_medical_proof, description, status) values
  ('e5000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'LV-CL', 'Casual Leave (CL)', 12, 'Paid', false, 0, false, false, 'Short unplanned personal absences.', 'Active'),
  ('e5000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'LV-EL', 'Earned Leave (EL)', 18, 'Paid', true, 30, true, false, 'Annual earned vacation leave.', 'Active'),
  ('e5000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'LV-SL', 'Sick Leave (SL)', 10, 'Paid', false, 0, false, true, 'Medical leave with doctor certificate for extended absences.', 'Active'),
  ('e5000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'LV-CO', 'Compensatory Off', 0, 'Paid', false, 0, false, false, 'Time off earned for holiday/weekend work.', 'Active'),
  ('e5000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'LV-LWP', 'Leave Without Pay', 0, 'Unpaid', false, 0, false, false, 'Unpaid leave when paid balance is exhausted.', 'Active')
on conflict (id) do nothing;

-- ========== LEAVE POLICIES ==========
insert into hr_leave_policies (id, property_id, policy_code, policy_name, total_annual_days, applicable_employment_types, allocations, description, status) values
  ('f6000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'LP-STD', 'Standard Policy', 24,
   '["c3000001-0001-4000-8000-000000000001","c3000001-0001-4000-8000-000000000003"]'::jsonb,
   '[{"leaveTypeId":"e5000001-0001-4000-8000-000000000001","days":12},{"leaveTypeId":"e5000001-0001-4000-8000-000000000002","days":12}]'::jsonb,
   'Default leave policy for permanent and probation staff.', 'Active'),
  ('f6000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'LP-EXE', 'Executive Policy', 30,
   '["c3000001-0001-4000-8000-000000000001"]'::jsonb,
   '[{"leaveTypeId":"e5000001-0001-4000-8000-000000000001","days":12},{"leaveTypeId":"e5000001-0001-4000-8000-000000000002","days":18}]'::jsonb,
   'Enhanced leave for management grades.', 'Active'),
  ('f6000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'LP-CON', 'Contract Policy', 12,
   '["c3000001-0001-4000-8000-000000000002"]'::jsonb,
   '[{"leaveTypeId":"e5000001-0001-4000-8000-000000000001","days":12}]'::jsonb,
   'Limited leave for contract employees.', 'Active')
on conflict (id) do nothing;

-- ========== HOLIDAYS (2026) ==========
insert into hr_holidays (id, property_id, holiday_code, holiday_name, holiday_date, day_of_week, category, is_mandatory, extra_pay_multiplier, year, description, status) values
  ('g7000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'HOL-REP', 'Republic Day', '2026-01-26', 'Monday', 'National', true, 2.0, 2026, 'National holiday', 'Active'),
  ('g7000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'HOL-HOLI', 'Holi', '2026-03-14', 'Saturday', 'Festival', true, 2.0, 2026, 'Festival holiday', 'Active'),
  ('g7000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'HOL-IND', 'Independence Day', '2026-08-15', 'Saturday', 'National', true, 2.0, 2026, 'National holiday — August payroll includes holiday pay.', 'Active'),
  ('g7000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'HOL-DIW', 'Diwali', '2026-11-08', 'Sunday', 'Festival', true, 2.0, 2026, 'Festival of lights', 'Active')
on conflict (id) do nothing;

-- ========== SALARY COMPONENTS ==========
insert into hr_salary_components (id, property_id, code, name, component_type, calculation_type, default_value, is_taxable, is_pf_applicable, is_esi_applicable, description, status) values
  ('h8000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'BASIC', 'Basic Salary', 'Earning', 'Fixed', 0, true, true, true, 'Core salary component.', 'Active'),
  ('h8000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'HRA', 'House Rent Allowance', 'Earning', 'Percentage', 40, true, false, false, '40% of basic.', 'Active'),
  ('h8000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'PF-EE', 'Provident Fund (Employee)', 'Deduction', 'Percentage', 12, false, false, false, 'Employee PF contribution.', 'Active'),
  ('h8000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'TDS', 'Income Tax (TDS)', 'Deduction', 'Computed', 0, false, false, false, 'Tax deducted at source.', 'Active')
on conflict (id) do nothing;

-- ========== DOCUMENT MASTERS ==========
insert into hr_document_categories (id, property_id, name, description, is_mandatory) values
  ('i9000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'Identity Proof', 'Government-issued identity documents', true),
  ('i9000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'Employment Documents', 'Offer letter, appointment letter, contracts', true)
on conflict (id) do nothing;

insert into hr_document_types (id, property_id, category_id, name, requires_expiry, is_mandatory, description) values
  ('j1000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'i9000001-0001-4000-8000-000000000001', 'Aadhaar Card', false, true, 'UIDAI identity proof'),
  ('j1000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'i9000001-0001-4000-8000-000000000001', 'PAN Card', false, true, 'Income tax PAN'),
  ('j1000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'i9000001-0001-4000-8000-000000000002', 'Appointment Letter', false, true, 'Signed appointment letter')
on conflict (id) do nothing;

-- ========== EMPLOYEES (joined within the past week — ref date: 2026-09-07) ==========
insert into hr_employees (id, property_id, emp_code, first_name, last_name, email, phone, department_id, designation_id, employment_type_id, shift_type_id, leave_policy_id, join_date, salary, status, gender, avatar, attendance_rate, leave_balance) values
  ('k2000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'EMP-0101', 'Rajesh', 'Kumar', 'rajesh.kumar@grandpalace.com', '+91 98765 43210', 'a1000001-0001-4000-8000-000000000001', 'b2000001-0001-4000-8000-000000000001', 'c3000001-0001-4000-8000-000000000001', 'd4000001-0001-4000-8000-000000000001', 'f6000001-0001-4000-8000-000000000002', '2026-09-01', 45000, 'Active', 'Male', 'RK', 100.0, '{"casual":8,"sick":7,"earned":14}'::jsonb),
  ('k2000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'EMP-0102', 'Priya', 'Patel', 'priya.patel@grandpalace.com', '+91 98765 43211', 'a1000001-0001-4000-8000-000000000001', 'b2000001-0001-4000-8000-000000000002', 'c3000001-0001-4000-8000-000000000001', 'd4000001-0001-4000-8000-000000000002', 'f6000001-0001-4000-8000-000000000001', '2026-09-02', 38000, 'Active', 'Female', 'PP', 75.0, '{"casual":6,"sick":8,"earned":10}'::jsonb),
  ('k2000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'EMP-0103', 'Anjali', 'Sharma', 'anjali.sharma@grandpalace.com', '+91 98765 43212', 'a1000001-0001-4000-8000-000000000002', 'b2000001-0001-4000-8000-000000000003', 'c3000001-0001-4000-8000-000000000001', 'd4000001-0001-4000-8000-000000000001', 'f6000001-0001-4000-8000-000000000002', '2026-09-03', 52000, 'Active', 'Female', 'AS', 100.0, '{"casual":10,"sick":9,"earned":16}'::jsonb),
  ('k2000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'EMP-0104', 'Vikramjit', 'Singh', 'vikram@grandpalace.com', '+91 98765 43213', 'a1000001-0001-4000-8000-000000000003', 'b2000001-0001-4000-8000-000000000004', 'c3000001-0001-4000-8000-000000000001', 'd4000001-0001-4000-8000-000000000002', 'f6000001-0001-4000-8000-000000000002', '2026-09-04', 95000, 'Active', 'Male', 'VS', 100.0, '{"casual":11,"sick":10,"earned":20}'::jsonb),
  ('k2000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'EMP-0105', 'Arjun', 'Verma', 'arjun.verma@grandpalace.com', '+91 98765 43214', 'a1000001-0001-4000-8000-000000000003', 'b2000001-0001-4000-8000-000000000005', 'c3000001-0001-4000-8000-000000000003', 'd4000001-0001-4000-8000-000000000002', 'f6000001-0001-4000-8000-000000000001', '2026-09-05', 32000, 'Active', 'Male', 'AV', 100.0, '{"casual":12,"sick":10,"earned":0}'::jsonb)
on conflict (id) do update set
  join_date = excluded.join_date,
  attendance_rate = excluded.attendance_rate;

-- ========== ATTENDANCE (past week — from each employee's join date through 2026-09-05) ==========
insert into hr_attendance_records (id, property_id, employee_id, shift_code, shift_name, record_date, check_in, check_out, worked_hours, expected_hours, status, in_location, out_location, device_type) values
  -- Rajesh Kumar — joined 2026-09-01, Morning Shift
  ('r8000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-01', '05:58', '14:02', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-02', '06:05', '14:10', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-03', '05:55', '14:00', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-04', '06:00', '14:05', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-05', '05:52', '14:00', 7.5, 7.5, 'Present', 'Main Gate — Biometric', 'Staff Exit', 'Biometric Reader'),
  -- Priya Patel — joined 2026-09-02, Evening Shift
  ('r8000001-0001-4000-8000-000000000006', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-02', '14:00', '22:00', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000007', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-03', '14:22', '22:05', 7.5, 7.5, 'Late', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000008', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-04', '13:58', '21:55', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  ('r8000001-0001-4000-8000-000000000009', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:05', '22:10', 7.5, 7.5, 'Present', 'Front Desk — Mobile GPS', 'Front Desk — Mobile GPS', 'Mobile App (GPS)'),
  -- Anjali Sharma — joined 2026-09-03, Morning Shift
  ('r8000001-0001-4000-8000-000000000010', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-03', '06:02', '14:08', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000011', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-04', '05:58', '14:00', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000012', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-05', '06:00', '14:05', 7.5, 7.5, 'Present', 'Service Floor — Biometric', 'Service Floor — Biometric', 'Biometric Reader'),
  -- Vikramjit Singh — joined 2026-09-04, Evening Shift
  ('r8000001-0001-4000-8000-000000000013', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-04', '14:00', '22:00', 7.5, 7.5, 'Present', 'Kitchen — Biometric', 'Kitchen — Biometric', 'Biometric Reader'),
  ('r8000001-0001-4000-8000-000000000014', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-05', '13:55', '21:50', 7.5, 7.5, 'Present', 'Kitchen — Biometric', 'Kitchen — Biometric', 'Biometric Reader'),
  -- Arjun Verma — joined 2026-09-05 (probation), Evening Shift — first day
  ('r8000001-0001-4000-8000-000000000015', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000005', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:10', '22:00', 7.5, 7.5, 'Present', 'Restaurant — Manual', 'Restaurant — Manual', 'Manual Entry')
on conflict (id) do nothing;

-- ========== PAYROLL RECORDS (August 2026) ==========
insert into hr_payroll_records (id, property_id, employee_id, payroll_month, payroll_year, payroll_batch_id, gross_salary, earnings_total, deductions_total, net_salary, status, calculated_at, earnings_breakdown, deductions_breakdown) values
  ('p3000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000001', 8, 2026, 'PAY-2026-08', 34250, 34250, 3300, 30950, 'Calculated', '2026-08-10T10:30:00Z',
   '{"basicSalary":18000,"hra":7200,"allowances":3500,"overtimePay":1500,"holidayPay":2550,"incentives":1000,"bonus":0,"otherEarnings":500}'::jsonb,
   '{"leaveDeduction":0,"pfDeduction":1800,"esiDeduction":300,"ptDeduction":200,"tdsDeduction":1000,"otherDeductions":0}'::jsonb),
  ('p3000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 8, 2026, 'PAY-2026-08', 29250, 29250, 3200, 26050, 'Calculated', '2026-08-10T10:30:00Z',
   '{"basicSalary":16000,"hra":6400,"allowances":3000,"overtimePay":800,"holidayPay":2550,"incentives":500,"bonus":0,"otherEarnings":0}'::jsonb,
   '{"leaveDeduction":500,"pfDeduction":1600,"esiDeduction":300,"ptDeduction":200,"tdsDeduction":600,"otherDeductions":0}'::jsonb),
  ('p3000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 8, 2026, 'PAY-2026-08', 36800, 36800, 3850, 32950, 'Calculated', '2026-08-10T10:30:00Z',
   '{"basicSalary":20000,"hra":8000,"allowances":4000,"overtimePay":1200,"holidayPay":2400,"incentives":1200,"bonus":0,"otherEarnings":0}'::jsonb,
   '{"leaveDeduction":0,"pfDeduction":2000,"esiDeduction":350,"ptDeduction":200,"tdsDeduction":1300,"otherDeductions":0}'::jsonb),
  ('p3000001-0001-4000-8000-000000000004', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000004', 8, 2026, 'PAY-2026-08', 72450, 72450, 8000, 64450, 'Calculated', '2026-08-10T10:30:00Z',
   '{"basicSalary":35000,"hra":14000,"allowances":9000,"overtimePay":3500,"holidayPay":3450,"incentives":2500,"bonus":5000,"otherEarnings":0}'::jsonb,
   '{"leaveDeduction":0,"pfDeduction":3500,"esiDeduction":0,"ptDeduction":200,"tdsDeduction":4300,"otherDeductions":0}'::jsonb),
  ('p3000001-0001-4000-8000-000000000005', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000005', 8, 2026, 'PAY-2026-08', 30400, 30400, 3600, 26800, 'Draft', null,
   '{"basicSalary":17000,"hra":6800,"allowances":2500,"overtimePay":900,"holidayPay":2400,"incentives":800,"bonus":0,"otherEarnings":0}'::jsonb,
   '{"leaveDeduction":1000,"pfDeduction":1700,"esiDeduction":300,"ptDeduction":200,"tdsDeduction":400,"otherDeductions":0}'::jsonb)
on conflict (id) do nothing;

-- ========== LEAVE APPLICATIONS (sample) ==========
insert into hr_leave_applications (id, property_id, employee_id, leave_type_id, leave_type_code, leave_type_name, from_date, to_date, total_days, reason, status) values
  ('l4000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000002', 'e5000001-0001-4000-8000-000000000001', 'LV-CL', 'Casual Leave (CL)', '2026-08-18', '2026-08-19', 2, 'Family function', 'Pending'),
  ('l4000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'k2000001-0001-4000-8000-000000000003', 'e5000001-0001-4000-8000-000000000003', 'LV-SL', 'Sick Leave (SL)', '2026-08-05', '2026-08-06', 2, 'Medical rest', 'Approved')
on conflict (id) do nothing;

-- ========== COMPLAINT CATEGORIES ==========
insert into hr_complaint_categories (id, property_id, category_name, description, review_level, status) values
  ('m5000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'Workplace Harassment', 'Harassment and misconduct complaints', 'HR Manager', 'Active'),
  ('m5000001-0001-4000-8000-000000000002', 'prop-grand-palace', 'Payroll & Benefits', 'Salary, payslip, and benefits issues', 'HR Executive', 'Active'),
  ('m5000001-0001-4000-8000-000000000003', 'prop-grand-palace', 'Facilities & Safety', 'Workplace safety and facilities', 'Admin Head', 'Active')
on conflict (id) do nothing;

-- ========== PAYROLL SETTINGS (default) ==========
insert into hr_payroll_settings (id, property_id, settings) values
  ('n6000001-0001-4000-8000-000000000001', 'prop-grand-palace',
   '{"frequency":"Monthly","startDay":1,"endDay":31,"paymentDay":10,"enablePf":true,"enableEsi":true,"enablePt":true,"pfEmployeePct":12,"approvalRole":"HR Manager"}'::jsonb)
on conflict (property_id) do nothing;

-- ========== AUDIT LOG (sample) ==========
insert into hr_audit_logs (id, property_id, module, action, entity_type, changed_by, audit_notes) values
  ('o7000001-0001-4000-8000-000000000001', 'prop-grand-palace', 'payroll', 'Collected & Calculated Payroll Batch', 'payroll_batch', 'Neha Mehta (HR Manager)', 'Automated fetch for August 2026.')
on conflict (id) do nothing;
