-- =============================================================================
-- HRMS — Unified database setup for a NEW Supabase project
-- =============================================================================
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Creates: auth, platform permissions, all HR tables, RLS policies, demo data,
--          admin account, and employee portal login accounts.
--
-- Demo passwords (bcrypt): 123456 for ALL accounts below
--
-- ADMIN (admin app):     admin@gmail.com / 123456
-- EMPLOYEE (portal):     rajesh.kumar@shawhotel.com / 123456
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AUTH — users table
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'Staff',
  initials text not null default 'U',
  status text not null default 'Active',
  is_super_admin boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_users_email on public.users (email);

alter table public.users enable row level security;
drop policy if exists "anon_all_users" on public.users;
create policy "anon_all_users" on public.users
  for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. PLATFORM — module permissions (single organization)
-- ---------------------------------------------------------------------------

create table if not exists public.user_permissions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  module_key text not null,
  permission text not null default 'read' check (permission in ('read', 'write', 'admin')),
  created_at timestamptz not null default now(),
  constraint user_permissions_unique unique (user_id, module_key)
);

create index if not exists idx_user_permissions_user on public.user_permissions (user_id);

alter table public.user_permissions enable row level security;

drop policy if exists "anon_all_user_permissions" on public.user_permissions;
create policy "anon_all_user_permissions" on public.user_permissions for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3. HR SCHEMA — all hr_* tables
-- ---------------------------------------------------------------------------

create table if not exists hr_departments (
  id text primary key default gen_random_uuid()::text,
  dept_code text not null,
  department_name text not null,
  head_of_department text,
  head_email text,
  location text,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dept_code)
);

create table if not exists hr_designations (
  id text primary key default gen_random_uuid()::text,
  designation_code text not null,
  designation_title text not null,
  department_id text references hr_departments(id) on delete set null,
  job_grade text,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (designation_code)
);

create table if not exists hr_employment_types (
  id text primary key default gen_random_uuid()::text,
  type_code text not null,
  type_name text not null,
  working_term text,
  probation_days integer default 0,
  notice_period_days integer default 30,
  pf_eligible boolean default true,
  esi_eligible boolean default true,
  leave_eligible boolean default true,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type_code)
);

create table if not exists hr_shift_types (
  id text primary key default gen_random_uuid()::text,
  shift_code text not null,
  shift_name text not null,
  category text,
  start_time text,
  end_time text,
  break_duration_minutes integer default 0,
  total_working_hours numeric(4,2),
  is_night_shift boolean default false,
  night_allowance_eligible boolean default false,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_code)
);

create table if not exists hr_leave_types (
  id text primary key default gen_random_uuid()::text,
  leave_code text not null,
  leave_name text not null,
  annual_quota_days integer not null default 0,
  pay_type text not null default 'Paid',
  carry_forward_allowed boolean default false,
  max_carry_forward_days integer default 0,
  encashable boolean default false,
  requires_medical_proof boolean default false,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (leave_code)
);

create table if not exists hr_leave_policies (
  id text primary key default gen_random_uuid()::text,
  policy_code text not null,
  policy_name text not null,
  total_annual_days integer not null default 0,
  applicable_employment_types jsonb default '[]'::jsonb,
  allocations jsonb default '[]'::jsonb,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (policy_code)
);

create table if not exists hr_holidays (
  id text primary key default gen_random_uuid()::text,
  holiday_code text not null,
  holiday_name text not null,
  holiday_date date not null,
  day_of_week text,
  category text,
  is_mandatory boolean default true,
  extra_pay_multiplier numeric(4,2) default 1.0,
  applicable_departments jsonb default '[]'::jsonb,
  description text default '',
  status text not null default 'Active',
  year integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holiday_code)
);

create table if not exists hr_salary_components (
  id text primary key default gen_random_uuid()::text,
  code text not null,
  name text not null,
  component_type text not null default 'Earning',
  calculation_type text not null default 'Fixed',
  default_value numeric(12,2) default 0,
  is_taxable boolean default true,
  is_pf_applicable boolean default false,
  is_esi_applicable boolean default false,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code)
);

create table if not exists hr_document_categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text default '',
  is_mandatory boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists hr_document_types (
  id text primary key default gen_random_uuid()::text,
  category_id text not null references hr_document_categories(id) on delete cascade,
  name text not null,
  requires_expiry boolean default false,
  is_mandatory boolean default false,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_employees (
  id text primary key default gen_random_uuid()::text,
  emp_code text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  department_id text references hr_departments(id) on delete set null,
  designation_id text references hr_designations(id) on delete set null,
  employment_type_id text references hr_employment_types(id) on delete set null,
  shift_type_id text references hr_shift_types(id) on delete set null,
  leave_policy_id text references hr_leave_policies(id) on delete set null,
  join_date date,
  salary numeric(12,2) default 0,
  status text not null default 'Active',
  gender text,
  dob date,
  address text,
  blood_group text,
  emergency_contact text,
  reporting_manager text,
  avatar text,
  photo_url text,
  bank_account text,
  bank_name text,
  ifsc_code text,
  pan_number text,
  uan_number text,
  esic_number text,
  attendance_rate numeric(5,2),
  leave_balance jsonb default '{"casual":0,"sick":0,"earned":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (emp_code)
);

alter table public.users
  add column if not exists employee_id text references hr_employees(id) on delete set null;

create unique index if not exists idx_users_employee_id on public.users (employee_id) where employee_id is not null;

create table if not exists hr_employee_documents (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  document_type_id text references hr_document_types(id) on delete set null,
  doc_title text not null,
  category text,
  file_format text,
  file_size text,
  expiry_date date,
  status text not null default 'Pending',
  verified_by text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_attendance_records (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  shift_code text,
  shift_name text,
  record_date date not null,
  check_in text,
  check_out text,
  worked_hours numeric(5,2) default 0,
  expected_hours numeric(5,2) default 8,
  status text not null default 'Present',
  in_location text,
  out_location text,
  device_type text,
  is_manual_entry boolean default false,
  manual_reason text,
  edited_by text,
  edited_on timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_shift_assignments (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  shift_type_id text references hr_shift_types(id) on delete set null,
  shift_code text,
  shift_name text,
  shift_category text,
  start_time text,
  end_time text,
  effective_from date not null,
  effective_to date,
  status text not null default 'Active',
  assigned_by text,
  assigned_on timestamptz default now(),
  remarks text,
  history jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_weekly_offs (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  off_type text not null default 'Fixed',
  days jsonb default '[]'::jsonb,
  rotation_pattern text,
  effective_from date not null,
  effective_to date,
  status text not null default 'Active',
  assigned_by text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_leave_applications (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  leave_type_id text references hr_leave_types(id) on delete set null,
  leave_type_code text,
  leave_type_name text,
  is_paid boolean default true,
  duration_option text,
  priority text default 'Normal',
  from_date date not null,
  to_date date not null,
  total_days numeric(5,1) not null,
  reason text,
  attachment_name text,
  status text not null default 'Pending',
  applied_on timestamptz default now(),
  approved_by text,
  clarification_request text,
  approval_chain jsonb default '[]'::jsonb,
  balances jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_overtime_records (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  shift_code text,
  shift_name text,
  ot_type text,
  record_date date not null,
  check_in text,
  check_out text,
  scheduled_hours numeric(5,2) default 8,
  break_hours numeric(5,2) default 0,
  worked_hours numeric(5,2) default 0,
  overtime_hours numeric(5,2) default 0,
  hourly_rate numeric(10,2) default 0,
  ot_rate_multiplier numeric(4,2) default 1.5,
  payable_amount numeric(12,2) default 0,
  reason text,
  status text not null default 'Pending',
  approved_by text,
  approved_on timestamptz,
  approval_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_holiday_attendance_records (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  holiday_name text not null,
  holiday_date date not null,
  attendance_status text not null default 'Present',
  check_in text,
  check_out text,
  worked_hours numeric(5,2) default 0,
  benefit_type text default 'Additional Pay',
  holiday_pay_amount numeric(12,2) default 0,
  payroll_status text default 'Pending Payroll Processing',
  approval_status text default 'Pending',
  reviewed_by text,
  reviewed_date timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_salary_structures (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  department_id text references hr_departments(id) on delete set null,
  employment_type_id text references hr_employment_types(id) on delete set null,
  structure_type text default 'Standard',
  version integer default 1,
  is_current_version boolean default true,
  effective_from date,
  effective_to date,
  description text,
  status text not null default 'Active',
  overtime_eligible boolean default true,
  incentives boolean default false,
  earnings jsonb default '[]'::jsonb,
  deductions jsonb default '[]'::jsonb,
  gross_salary numeric(12,2) default 0,
  total_deductions numeric(12,2) default 0,
  net_salary numeric(12,2) default 0,
  assigned_employee_ids jsonb default '[]'::jsonb,
  created_by text,
  history jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hr_employees
  add column if not exists salary_structure_id text references hr_salary_structures(id) on delete set null;

create index if not exists idx_hr_employees_salary_structure
  on hr_employees(salary_structure_id);

create table if not exists hr_compensation_revisions (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  salary_structure_id text references hr_salary_structures(id) on delete set null,
  revision_type text not null default 'increment',
  effective_from date not null,
  effective_to date,
  old_gross numeric(12,2),
  new_gross numeric(12,2) not null,
  hike_percentage numeric(8,2),
  reason text default '',
  remarks text default '',
  status text not null default 'Pending',
  old_components jsonb,
  new_components jsonb not null default '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hr_comp_rev_employee
  on hr_compensation_revisions(employee_id, effective_from desc);

create table if not exists hr_bonus_awards (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  payroll_month integer not null,
  payroll_year integer not null,
  amount numeric(12,2) not null,
  reason text default '',
  remarks text default '',
  status text not null default 'Pending',
  approved_by text,
  approved_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hr_bonus_awards_period
  on hr_bonus_awards(employee_id, payroll_year, payroll_month);

create table if not exists hr_payroll_records (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references hr_employees(id) on delete cascade,
  payroll_month integer not null,
  payroll_year integer not null,
  payroll_batch_id text,
  gross_salary numeric(12,2) not null default 0,
  earnings_total numeric(12,2) not null default 0,
  deductions_total numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,
  status text not null default 'Draft',
  calculated_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  is_locked boolean not null default false,
  earnings_breakdown jsonb default '{}'::jsonb,
  deductions_breakdown jsonb default '{}'::jsonb,
  validation_flags jsonb default '{}'::jsonb,
  payslip_generated boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, payroll_month, payroll_year)
);

create table if not exists hr_salary_payments (
  id text primary key default gen_random_uuid()::text,
  payroll_id text not null references hr_payroll_records(id) on delete cascade,
  employee_id text not null references hr_employees(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date date not null,
  payment_mode text not null default 'Bank Transfer',
  transaction_reference text not null,
  status text not null default 'Completed',
  remarks text,
  recorded_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_payslips (
  id text primary key default gen_random_uuid()::text,
  payroll_id text references hr_payroll_records(id) on delete set null,
  employee_id text not null references hr_employees(id) on delete cascade,
  payslip_no text not null,
  month_label text not null,
  pay_period text,
  generated_date date,
  payment_mode text,
  worked_days integer default 0,
  paid_leaves integer default 0,
  unpaid_leaves integer default 0,
  earnings jsonb default '{}'::jsonb,
  deductions jsonb default '{}'::jsonb,
  gross_salary numeric(12,2) default 0,
  total_deductions numeric(12,2) default 0,
  net_salary numeric(12,2) default 0,
  status text not null default 'Generated',
  sent_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payslip_no),
  unique (payroll_id)
);

alter table hr_payroll_records
  add column if not exists verified_at timestamptz,
  add column if not exists is_locked boolean not null default false;

create unique index if not exists idx_hr_payslips_payroll_id
  on hr_payslips(payroll_id)
  where payroll_id is not null;

create table if not exists hr_complaint_categories (
  id text primary key default gen_random_uuid()::text,
  category_name text not null,
  description text default '',
  review_level text,
  sla_days integer not null default 7,
  default_priority text not null default 'Medium',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_name)
);

create table if not exists hr_complaints (
  id text primary key default gen_random_uuid()::text,
  ticket_no text not null,
  employee_id text references hr_employees(id) on delete set null,
  category_id text references hr_complaint_categories(id) on delete set null,
  category text,
  subject text not null,
  description text,
  incident_date date,
  priority text default 'Medium',
  status text not null default 'Submitted',
  review_level text,
  submitted_date timestamptz default now(),
  due_date date,
  is_anonymous boolean default false,
  assigned_officer text,
  assigned_role text,
  proposed_resolution text,
  resolution_notes text,
  timeline jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticket_no)
);

create table if not exists hr_approval_workflows (
  id text primary key default gen_random_uuid()::text,
  code text not null,
  module text not null,
  request_type text not null,
  version integer default 1,
  approval_levels_count integer default 1,
  levels jsonb default '[]'::jsonb,
  conditions jsonb default '[]'::jsonb,
  effective_from date,
  effective_to date,
  status text not null default 'Active',
  created_by text,
  history jsonb default '[]'::jsonb,
  is_system_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code)
);

create table if not exists hr_payroll_settings (
  id text primary key default gen_random_uuid()::text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_tax_rules (
  id text primary key default gen_random_uuid()::text,
  rule_name text not null,
  tax_code text not null,
  tax_type text not null,
  description text,
  calc_method text,
  rate_percentage numeric(6,2),
  financial_year text,
  effective_from date,
  effective_to date,
  status text not null default 'Active',
  version integer default 1,
  slabs jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tax_code)
);

create table if not exists hr_audit_logs (
  id text primary key default gen_random_uuid()::text,
  module text not null,
  action text not null,
  entity_type text,
  entity_id text,
  changed_by text,
  audit_notes text,
  override_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_hr_payroll_records_period on hr_payroll_records(payroll_year, payroll_month);
create index if not exists idx_hr_attendance_date on hr_attendance_records(record_date);
create index if not exists idx_hr_leave_apps_status on hr_leave_applications(status);

-- ---------------------------------------------------------------------------
-- 4. RLS — allow API access via anon key (required without service role key)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'hr_departments','hr_designations','hr_employment_types','hr_shift_types','hr_leave_types',
    'hr_leave_policies','hr_holidays','hr_salary_components','hr_document_categories','hr_document_types',
    'hr_employees','hr_employee_documents','hr_attendance_records','hr_shift_assignments','hr_weekly_offs',
    'hr_leave_applications','hr_overtime_records','hr_holiday_attendance_records','hr_salary_structures',
    'hr_compensation_revisions','hr_bonus_awards',
    'hr_payroll_records','hr_salary_payments','hr_payslips','hr_complaint_categories','hr_complaints',
    'hr_approval_workflows','hr_payroll_settings','hr_tax_rules','hr_audit_logs'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon_all_%s" on %I', t, t);
    execute format(
      'create policy "anon_all_%s" on %I for all to anon using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. DEMO HR DATA
-- ---------------------------------------------------------------------------

-- Departments
insert into hr_departments (id, dept_code, department_name, head_of_department, head_email, location, description, status) values
  ('a1000002-0001-4000-8000-000000000001', 'FO-10', 'Front Office', 'Rajesh Kumar', 'rajesh.kumar@shawhotel.com', 'Main Lobby', 'Front desk and guest services.', 'Active'),
  ('a1000002-0001-4000-8000-000000000002', 'HK-20', 'Housekeeping', 'Anjali Sharma', 'anjali.sharma@shawhotel.com', 'Service Floor', 'Room and public area cleaning.', 'Active'),
  ('a1000002-0001-4000-8000-000000000003', 'FB-30', 'Food & Beverage', 'Chef Vikramjit Singh', 'vikram@shawhotel.com', 'Kitchen', 'Restaurant and kitchen ops.', 'Active'),
  ('a1000002-0001-4000-8000-000000000004', 'HR-40', 'Human Resources', 'Neha Mehta', 'neha.mehta@shawhotel.com', 'Admin Block', 'HR and payroll.', 'Active')
on conflict (id) do nothing;

-- Designations
insert into hr_designations (id, designation_code, designation_title, department_id, job_grade, description, status) values
  ('b2000002-0001-4000-8000-000000000001', 'DSG-FO-01', 'Front Desk Manager', 'a1000002-0001-4000-8000-000000000001', 'M2', 'Front desk lead.', 'Active'),
  ('b2000002-0001-4000-8000-000000000002', 'DSG-FO-02', 'Guest Relations Executive', 'a1000002-0001-4000-8000-000000000001', 'E3', 'Guest relations.', 'Active'),
  ('b2000002-0001-4000-8000-000000000003', 'DSG-HK-01', 'Executive Housekeeper', 'a1000002-0001-4000-8000-000000000002', 'M2', 'Housekeeping lead.', 'Active'),
  ('b2000002-0001-4000-8000-000000000004', 'DSG-FB-01', 'Executive Head Chef', 'a1000002-0001-4000-8000-000000000003', 'M3', 'Kitchen head.', 'Active')
on conflict (id) do nothing;

-- Employment types
insert into hr_employment_types (id, type_code, type_name, working_term, probation_days, notice_period_days, pf_eligible, esi_eligible, leave_eligible, description, status) values
  ('c3000002-0001-4000-8000-000000000001', 'ET-PERM', 'Permanent', 'Full-time', 90, 30, true, true, true, 'Permanent staff.', 'Active'),
  ('c3000002-0001-4000-8000-000000000002', 'ET-CONT', 'Contract', 'Contract', 0, 15, false, true, true, 'Contract staff.', 'Active'),
  ('c3000002-0001-4000-8000-000000000003', 'ET-PROB', 'Probation', 'Probation', 90, 7, true, true, true, 'Probation staff.', 'Active')
on conflict (id) do nothing;

-- Shift types
insert into hr_shift_types (id, shift_code, shift_name, category, start_time, end_time, break_duration_minutes, total_working_hours, is_night_shift, description, status) values
  ('d4000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', 'Regular', '06:00', '14:00', 30, 7.5, false, 'Morning shift.', 'Active'),
  ('d4000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', 'Regular', '14:00', '22:00', 30, 7.5, false, 'Evening shift.', 'Active'),
  ('d4000002-0001-4000-8000-000000000003', 'SH-GEN', 'General Shift', 'Regular', '09:00', '18:00', 60, 8.0, false, 'General shift.', 'Active')
on conflict (id) do nothing;

-- Leave types
insert into hr_leave_types (id, leave_code, leave_name, annual_quota_days, pay_type, description, status) values
  ('e5000002-0001-4000-8000-000000000001', 'LV-CL', 'Casual Leave (CL)', 12, 'Paid', 'Casual leave.', 'Active'),
  ('e5000002-0001-4000-8000-000000000002', 'LV-EL', 'Earned Leave (EL)', 18, 'Paid', 'Earned leave.', 'Active'),
  ('e5000002-0001-4000-8000-000000000003', 'LV-SL', 'Sick Leave (SL)', 10, 'Paid', 'Sick leave.', 'Active')
on conflict (id) do nothing;

-- Leave policies
insert into hr_leave_policies (id, policy_code, policy_name, total_annual_days, applicable_employment_types, allocations, description, status) values
  ('f6000002-0001-4000-8000-000000000001', 'LP-STD', 'Standard Policy', 24,
   '["c3000002-0001-4000-8000-000000000001"]'::jsonb,
   '[{"leaveTypeId":"e5000002-0001-4000-8000-000000000001","days":12},{"leaveTypeId":"e5000002-0001-4000-8000-000000000002","days":12}]'::jsonb,
   'Standard leave policy.', 'Active')
on conflict (id) do nothing;

-- Holidays 2026
insert into hr_holidays (id, holiday_code, holiday_name, holiday_date, day_of_week, category, is_mandatory, extra_pay_multiplier, year, description, status) values
  ('g7000002-0001-4000-8000-000000000001', 'HOL-REP', 'Republic Day', '2026-01-26', 'Monday', 'National', true, 2.0, 2026, 'National holiday', 'Active'),
  ('g7000002-0001-4000-8000-000000000002', 'HOL-HOLI', 'Holi', '2026-03-14', 'Saturday', 'Festival', true, 2.0, 2026, 'Festival holiday', 'Active'),
  ('g7000002-0001-4000-8000-000000000003', 'HOL-IND', 'Independence Day', '2026-08-15', 'Saturday', 'National', true, 2.0, 2026, 'National holiday', 'Active'),
  ('g7000002-0001-4000-8000-000000000004', 'HOL-DIW', 'Diwali', '2026-11-08', 'Sunday', 'Festival', true, 2.0, 2026, 'Festival of lights', 'Active'),
  ('g7000002-0001-4000-8000-000000000005', 'HOL-NEW', 'New Year', '2026-01-01', 'Thursday', 'National', true, 2.0, 2026, 'New Year', 'Active')
on conflict (id) do nothing;

-- Salary components
insert into hr_salary_components (id, code, name, component_type, calculation_type, default_value, is_taxable, is_pf_applicable, description, status) values
  ('h8000002-0001-4000-8000-000000000001', 'BASIC', 'Basic Salary', 'Earning', 'Fixed', 0, true, true, 'Core salary.', 'Active'),
  ('h8000002-0001-4000-8000-000000000002', 'HRA', 'House Rent Allowance', 'Earning', 'Percentage', 40, true, false, '40% of basic.', 'Active'),
  ('h8000002-0001-4000-8000-000000000003', 'PF-EE', 'Provident Fund', 'Deduction', 'Percentage', 12, false, false, 'Employee PF.', 'Active')
on conflict (id) do nothing;

-- Document masters
insert into hr_document_categories (id, name, description, is_mandatory) values
  ('i9000002-0001-4000-8000-000000000001', 'Identity Proof', 'Government ID documents', true),
  ('i9000002-0001-4000-8000-000000000002', 'Employment Documents', 'Offer and appointment letters', true)
on conflict (id) do nothing;

insert into hr_document_types (id, category_id, name, requires_expiry, is_mandatory, description) values
  ('j1000002-0001-4000-8000-000000000001', 'i9000002-0001-4000-8000-000000000001', 'Aadhaar Card', false, true, 'UIDAI identity proof'),
  ('j1000002-0001-4000-8000-000000000002', 'i9000002-0001-4000-8000-000000000001', 'PAN Card', false, true, 'Income tax PAN')
on conflict (id) do nothing;

-- Employees
insert into hr_employees (id, emp_code, first_name, last_name, email, phone, department_id, designation_id, employment_type_id, shift_type_id, leave_policy_id, join_date, salary, status, gender, dob, address, blood_group, emergency_contact, reporting_manager, avatar, bank_name, bank_account, ifsc_code, pan_number, attendance_rate, leave_balance) values
  ('f2000002-0001-4000-8000-000000000001', 'EMP-0101', 'Rajesh', 'Kumar', 'rajesh.kumar@shawhotel.com', '+91 98765 43210', 'a1000002-0001-4000-8000-000000000001', 'b2000002-0001-4000-8000-000000000001', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000001', 'f6000002-0001-4000-8000-000000000001', '2026-09-01', 45000, 'Active', 'Male', '1990-05-15', 'Bhubaneswar, Odisha', 'B+', '+91 98765 00001', 'Neha Mehta', 'RK', 'SBI', '123456789012', 'SBIN0001234', 'ABCPK1234A', 100.0, '{"casual":8,"sick":7,"earned":14}'::jsonb),
  ('f2000002-0001-4000-8000-000000000002', 'EMP-0102', 'Priya', 'Patel', 'priya.patel@shawhotel.com', '+91 98765 43211', 'a1000002-0001-4000-8000-000000000001', 'b2000002-0001-4000-8000-000000000002', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000002', 'f6000002-0001-4000-8000-000000000001', '2026-09-02', 38000, 'Active', 'Female', '1992-08-22', 'Cuttack, Odisha', 'O+', '+91 98765 00002', 'Rajesh Kumar', 'PP', 'HDFC', '987654321098', 'HDFC0001234', 'ABCPP5678B', 75.0, '{"casual":6,"sick":8,"earned":10}'::jsonb),
  ('f2000002-0001-4000-8000-000000000003', 'EMP-0103', 'Anjali', 'Sharma', 'anjali.sharma@shawhotel.com', '+91 98765 43212', 'a1000002-0001-4000-8000-000000000002', 'b2000002-0001-4000-8000-000000000003', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000001', 'f6000002-0001-4000-8000-000000000001', '2026-09-03', 52000, 'Active', 'Female', '1988-03-10', 'Puri, Odisha', 'A+', '+91 98765 00003', 'Neha Mehta', 'AS', 'ICICI', '456789012345', 'ICIC0001234', 'ABCPS9012C', 100.0, '{"casual":10,"sick":9,"earned":16}'::jsonb),
  ('f2000002-0001-4000-8000-000000000004', 'EMP-0104', 'Vikramjit', 'Singh', 'vikram@shawhotel.com', '+91 98765 43213', 'a1000002-0001-4000-8000-000000000003', 'b2000002-0001-4000-8000-000000000004', 'c3000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000002', 'f6000002-0001-4000-8000-000000000001', '2026-09-04', 95000, 'Active', 'Male', '1985-11-30', 'Bhubaneswar, Odisha', 'AB+', '+91 98765 00004', 'Neha Mehta', 'VS', 'Axis Bank', '789012345678', 'UTIB0001234', 'ABCVS3456D', 100.0, '{"casual":11,"sick":10,"earned":20}'::jsonb),
  ('f2000002-0001-4000-8000-000000000005', 'EMP-0105', 'Arjun', 'Verma', 'arjun.verma@shawhotel.com', '+91 98765 43214', 'a1000002-0001-4000-8000-000000000003', 'b2000002-0001-4000-8000-000000000004', 'c3000002-0001-4000-8000-000000000003', 'd4000002-0001-4000-8000-000000000002', 'f6000002-0001-4000-8000-000000000001', '2026-09-05', 32000, 'Active', 'Male', '1998-07-18', 'Rourkela, Odisha', 'B-', '+91 98765 00005', 'Vikramjit Singh', 'AV', 'SBI', '321098765432', 'SBIN0005678', 'ABCAV7890E', 100.0, '{"casual":12,"sick":10,"earned":0}'::jsonb)
on conflict (id) do update set
  join_date = excluded.join_date,
  leave_balance = excluded.leave_balance,
  attendance_rate = excluded.attendance_rate;

-- Attendance records
insert into hr_attendance_records (id, employee_id, shift_code, shift_name, record_date, check_in, check_out, worked_hours, expected_hours, status, in_location, out_location, device_type) values
  ('r8000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-01', '05:58', '14:02', 7.5, 7.5, 'Present', 'Main Lobby', 'Staff Exit', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-02', '06:05', '14:10', 7.5, 7.5, 'Present', 'Main Lobby', 'Staff Exit', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000003', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-03', '05:55', '14:00', 7.5, 7.5, 'Present', 'Main Lobby', 'Staff Exit', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000004', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-04', '06:00', '14:05', 7.5, 7.5, 'Present', 'Main Lobby', 'Staff Exit', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000005', 'f2000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '2026-09-05', '05:52', '14:00', 7.5, 7.5, 'Present', 'Main Lobby', 'Staff Exit', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000006', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-02', '14:00', '22:00', 7.5, 7.5, 'Present', 'Front Desk', 'Front Desk', 'Mobile App'),
  ('r8000002-0001-4000-8000-000000000007', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-03', '14:22', '22:05', 7.5, 7.5, 'Late', 'Front Desk', 'Front Desk', 'Mobile App'),
  ('r8000002-0001-4000-8000-000000000008', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-04', '13:58', '21:55', 7.5, 7.5, 'Present', 'Front Desk', 'Front Desk', 'Mobile App'),
  ('r8000002-0001-4000-8000-000000000009', 'f2000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:05', '22:10', 7.5, 7.5, 'Present', 'Front Desk', 'Front Desk', 'Mobile App'),
  ('r8000002-0001-4000-8000-000000000010', 'f2000002-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-03', '06:02', '14:08', 7.5, 7.5, 'Present', 'Service Floor', 'Service Floor', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000011', 'f2000002-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-04', '05:58', '14:00', 7.5, 7.5, 'Present', 'Service Floor', 'Service Floor', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000012', 'f2000002-0001-4000-8000-000000000003', 'SH-MRN', 'Morning Shift', '2026-09-05', '06:00', '14:05', 7.5, 7.5, 'Present', 'Service Floor', 'Service Floor', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000013', 'f2000002-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-04', '14:00', '22:00', 7.5, 7.5, 'Present', 'Kitchen', 'Kitchen', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000014', 'f2000002-0001-4000-8000-000000000004', 'SH-EVE', 'Evening Shift', '2026-09-05', '13:55', '21:50', 7.5, 7.5, 'Present', 'Kitchen', 'Kitchen', 'Biometric'),
  ('r8000002-0001-4000-8000-000000000015', 'f2000002-0001-4000-8000-000000000005', 'SH-EVE', 'Evening Shift', '2026-09-05', '14:10', '22:00', 7.5, 7.5, 'Present', 'Restaurant', 'Restaurant', 'Manual')
on conflict (id) do nothing;

-- Shift assignments
insert into hr_shift_assignments (id, employee_id, shift_type_id, shift_code, shift_name, start_time, end_time, effective_from, status) values
  ('s8000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000001', 'd4000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '06:00', '14:00', '2026-09-01', 'Active'),
  ('s8000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000002', 'd4000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '14:00', '22:00', '2026-09-02', 'Active'),
  ('s8000002-0001-4000-8000-000000000003', 'f2000002-0001-4000-8000-000000000003', 'd4000002-0001-4000-8000-000000000001', 'SH-MRN', 'Morning Shift', '06:00', '14:00', '2026-09-03', 'Active'),
  ('s8000002-0001-4000-8000-000000000004', 'f2000002-0001-4000-8000-000000000004', 'd4000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '14:00', '22:00', '2026-09-04', 'Active'),
  ('s8000002-0001-4000-8000-000000000005', 'f2000002-0001-4000-8000-000000000005', 'd4000002-0001-4000-8000-000000000002', 'SH-EVE', 'Evening Shift', '14:00', '22:00', '2026-09-05', 'Active')
on conflict (id) do nothing;

-- Weekly offs (Sunday for all)
insert into hr_weekly_offs (id, employee_id, off_type, days, effective_from, status) values
  ('w8000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000001', 'Fixed', '["sunday"]'::jsonb, '2026-09-01', 'Active'),
  ('w8000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000002', 'Fixed', '["sunday"]'::jsonb, '2026-09-02', 'Active'),
  ('w8000002-0001-4000-8000-000000000003', 'f2000002-0001-4000-8000-000000000003', 'Fixed', '["sunday"]'::jsonb, '2026-09-03', 'Active'),
  ('w8000002-0001-4000-8000-000000000004', 'f2000002-0001-4000-8000-000000000004', 'Fixed', '["sunday"]'::jsonb, '2026-09-04', 'Active'),
  ('w8000002-0001-4000-8000-000000000005', 'f2000002-0001-4000-8000-000000000005', 'Fixed', '["sunday"]'::jsonb, '2026-09-05', 'Active')
on conflict (id) do nothing;

-- Leave applications
insert into hr_leave_applications (id, employee_id, leave_type_id, leave_type_code, leave_type_name, from_date, to_date, total_days, reason, status) values
  ('l4000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000002', 'e5000002-0001-4000-8000-000000000001', 'LV-CL', 'Casual Leave (CL)', '2026-09-20', '2026-09-21', 2, 'Family function', 'Pending'),
  ('l4000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000003', 'e5000002-0001-4000-8000-000000000003', 'LV-SL', 'Sick Leave (SL)', '2026-08-05', '2026-08-06', 2, 'Medical rest', 'Approved')
on conflict (id) do nothing;

-- Overtime
insert into hr_overtime_records (id, employee_id, ot_type, record_date, overtime_hours, hourly_rate, ot_rate_multiplier, payable_amount, reason, status) values
  ('o8000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000001', 'Weekday OT', '2026-09-04', 2.0, 250, 1.5, 750, 'Extra front desk coverage', 'Approved'),
  ('o8000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000004', 'Weekday OT', '2026-09-05', 3.0, 400, 1.5, 1800, 'Banquet prep', 'Pending')
on conflict (id) do nothing;

-- Payroll + payslips (August 2026)
insert into hr_payroll_records (id, employee_id, payroll_month, payroll_year, payroll_batch_id, gross_salary, earnings_total, deductions_total, net_salary, status, calculated_at, earnings_breakdown, deductions_breakdown) values
  ('p3000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000001', 8, 2026, 'PAY-2026-08', 34250, 34250, 3300, 30950, 'Approved', '2026-08-10T10:30:00Z', '{"basicSalary":18000,"hra":7200,"allowances":3500}'::jsonb, '{"pfDeduction":1800,"tdsDeduction":1500}'::jsonb),
  ('p3000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000002', 8, 2026, 'PAY-2026-08', 29250, 29250, 3200, 26050, 'Approved', '2026-08-10T10:30:00Z', '{"basicSalary":16000,"hra":6400,"allowances":3000}'::jsonb, '{"pfDeduction":1600,"tdsDeduction":1600}'::jsonb),
  ('p3000002-0001-4000-8000-000000000003', 'f2000002-0001-4000-8000-000000000003', 8, 2026, 'PAY-2026-08', 36800, 36800, 3850, 32950, 'Approved', '2026-08-10T10:30:00Z', '{"basicSalary":20000,"hra":8000,"allowances":4000}'::jsonb, '{"pfDeduction":2000,"tdsDeduction":1850}'::jsonb),
  ('p3000002-0001-4000-8000-000000000004', 'f2000002-0001-4000-8000-000000000004', 8, 2026, 'PAY-2026-08', 72450, 72450, 8000, 64450, 'Approved', '2026-08-10T10:30:00Z', '{"basicSalary":35000,"hra":14000,"allowances":9000}'::jsonb, '{"pfDeduction":3500,"tdsDeduction":4500}'::jsonb),
  ('p3000002-0001-4000-8000-000000000005', 'f2000002-0001-4000-8000-000000000005', 8, 2026, 'PAY-2026-08', 30400, 30400, 3600, 26800, 'Draft', null, '{"basicSalary":17000,"hra":6800,"allowances":2500}'::jsonb, '{"pfDeduction":1700,"tdsDeduction":1900}'::jsonb)
on conflict (id) do nothing;

insert into hr_payslips (id, payroll_id, employee_id, payslip_no, month_label, pay_period, generated_date, net_salary, status) values
  ('ps800002-0001-4000-8000-000000000001', 'p3000002-0001-4000-8000-000000000001', 'f2000002-0001-4000-8000-000000000001', 'PS-2026-08-0101', 'August 2026', 'Aug 2026', '2026-08-31', 30950, 'Generated'),
  ('ps800002-0001-4000-8000-000000000002', 'p3000002-0001-4000-8000-000000000002', 'f2000002-0001-4000-8000-000000000002', 'PS-2026-08-0102', 'August 2026', 'Aug 2026', '2026-08-31', 26050, 'Generated'),
  ('ps800002-0001-4000-8000-000000000003', 'p3000002-0001-4000-8000-000000000003', 'f2000002-0001-4000-8000-000000000003', 'PS-2026-08-0103', 'August 2026', 'Aug 2026', '2026-08-31', 32950, 'Generated'),
  ('ps800002-0001-4000-8000-000000000004', 'p3000002-0001-4000-8000-000000000004', 'f2000002-0001-4000-8000-000000000004', 'PS-2026-08-0104', 'August 2026', 'Aug 2026', '2026-08-31', 64450, 'Generated')
on conflict (id) do nothing;

-- Complaint categories
insert into hr_complaint_categories (id, category_name, description, review_level, sla_days, default_priority, status) values
  ('m5000002-0001-4000-8000-000000000001', 'Workplace Harassment', 'Harassment complaints', 'Special Committee Review', 3, 'Critical', 'Active'),
  ('m5000002-0001-4000-8000-000000000002', 'Payroll & Salary Issues', 'Salary and payslip issues', 'Manager Review', 7, 'High', 'Active'),
  ('m5000002-0001-4000-8000-000000000003', 'Attendance Issues', 'Attendance and punch issues', 'Standard', 7, 'Medium', 'Active'),
  ('m5000002-0001-4000-8000-000000000004', 'Leave Related Issues', 'Leave balance and approvals', 'Standard', 7, 'Medium', 'Active'),
  ('m5000002-0001-4000-8000-000000000005', 'Shift Scheduling Issues', 'Shift roster concerns', 'Manager Review', 5, 'High', 'Active'),
  ('m5000002-0001-4000-8000-000000000006', 'Overtime Issues', 'OT pay and approval', 'Manager Review', 5, 'High', 'Active'),
  ('m5000002-0001-4000-8000-000000000007', 'Manager Complaint', 'Reporting manager conduct', 'Senior Management Review', 5, 'High', 'Active'),
  ('m5000002-0001-4000-8000-000000000008', 'Team Conflict', 'Peer and team disputes', 'Standard', 7, 'Medium', 'Active'),
  ('m5000002-0001-4000-8000-000000000009', 'Sexual Harassment (POSH)', 'POSH-related complaints', 'Special Committee Review', 2, 'Critical', 'Active'),
  ('m5000002-0001-4000-8000-000000000010', 'Discrimination', 'Bias and discrimination', 'Senior Management Review', 3, 'Critical', 'Active'),
  ('m5000002-0001-4000-8000-000000000011', 'Workplace Safety', 'Health and safety', 'Manager Review', 3, 'Critical', 'Active'),
  ('m5000002-0001-4000-8000-000000000012', 'Policy Violation', 'Company policy breaches', 'Manager Review', 7, 'Medium', 'Active'),
  ('m5000002-0001-4000-8000-000000000013', 'Facilities & Infrastructure', 'Facilities and workspace', 'Standard', 10, 'Low', 'Active'),
  ('m5000002-0001-4000-8000-000000000014', 'IT/System Issues', 'HR systems and access', 'Standard', 7, 'Medium', 'Active'),
  ('m5000002-0001-4000-8000-000000000015', 'Workload Concerns', 'Workload and staffing', 'Manager Review', 7, 'Medium', 'Active'),
  ('m5000002-0001-4000-8000-000000000016', 'Other', 'General grievances', 'Standard', 14, 'Low', 'Active')
on conflict (id) do nothing;

-- Payroll settings
insert into hr_payroll_settings (id, settings) values
  ('n6000002-0001-4000-8000-000000000001',
   '{"frequency":"Monthly","startDay":1,"endDay":31,"paymentDay":10,"enablePf":true,"enableEsi":true,"enablePt":true,"pfEmployeePct":12,"approvalRole":"HR Manager"}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. LOGIN ACCOUNTS
-- bcrypt hash for password: 123456
-- ---------------------------------------------------------------------------

-- Admin (HR admin app — super admin)
insert into users (id, name, email, password_hash, role, initials, status, is_super_admin) values
  ('U-ADMIN', 'Admin', 'admin@gmail.com', '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy', 'Admin', 'AD', 'Active', true)
on conflict (email) do update set
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  initials = excluded.initials,
  status = excluded.status,
  is_super_admin = excluded.is_super_admin;

-- Employee portal users (linked via employee_id)
insert into users (id, name, email, password_hash, role, initials, status, employee_id) values
  ('U-EMP-0101', 'Rajesh Kumar', 'rajesh.kumar@shawhotel.com', '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy', 'Staff', 'RK', 'Active', 'f2000002-0001-4000-8000-000000000001'),
  ('U-EMP-0102', 'Priya Patel', 'priya.patel@shawhotel.com', '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy', 'Staff', 'PP', 'Active', 'f2000002-0001-4000-8000-000000000002'),
  ('U-EMP-0103', 'Anjali Sharma', 'anjali.sharma@shawhotel.com', '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy', 'Staff', 'AS', 'Active', 'f2000002-0001-4000-8000-000000000003'),
  ('U-EMP-0104', 'Vikramjit Singh', 'vikram@shawhotel.com', '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy', 'Staff', 'VS', 'Active', 'f2000002-0001-4000-8000-000000000004'),
  ('U-EMP-0105', 'Arjun Verma', 'arjun.verma@shawhotel.com', '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy', 'Staff', 'AV', 'Active', 'f2000002-0001-4000-8000-000000000005')
on conflict (email) do update set
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  initials = excluded.initials,
  status = excluded.status,
  employee_id = excluded.employee_id;

-- ---------------------------------------------------------------------------
-- 7. ADMIN ACCESS — module permissions
-- ---------------------------------------------------------------------------

-- Super admin (U-ADMIN) bypasses permission checks; rows below are optional samples.
insert into user_permissions (id, user_id, module_key, permission) values
  ('perm-admin-dash', 'U-ADMIN', 'hr_dashboard', 'admin'),
  ('perm-admin-emp', 'U-ADMIN', 'hr_employees', 'admin'),
  ('perm-admin-users', 'U-ADMIN', 'hr_user_management', 'admin')
on conflict (user_id, module_key) do update set permission = excluded.permission;

-- ---------------------------------------------------------------------------
-- Done — refresh PostgREST schema cache
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';

-- Verify (optional — uncomment to check row counts after run):
-- select 'users' as tbl, count(*) from users
-- union all select 'hr_employees', count(*) from hr_employees;
