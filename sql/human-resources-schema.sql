-- Human Resources schema — UUID text primary keys, property-scoped
-- Run AFTER: auth-users-schema.sql, multi-property-schema.sql

-- ========== MASTERS ==========

create table if not exists hr_departments (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  dept_code text not null,
  department_name text not null,
  head_of_department text,
  head_email text,
  location text,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, dept_code)
);

create table if not exists hr_designations (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  designation_code text not null,
  designation_title text not null,
  department_id text references hr_departments(id) on delete set null,
  job_grade text,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, designation_code)
);

create table if not exists hr_employment_types (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, type_code)
);

create table if not exists hr_shift_types (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, shift_code)
);

create table if not exists hr_leave_types (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, leave_code)
);

create table if not exists hr_leave_policies (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  policy_code text not null,
  policy_name text not null,
  total_annual_days integer not null default 0,
  applicable_employment_types jsonb default '[]'::jsonb,
  allocations jsonb default '[]'::jsonb,
  description text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, policy_code)
);

create table if not exists hr_holidays (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, holiday_code)
);

create table if not exists hr_salary_components (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, code)
);

create table if not exists hr_document_categories (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  name text not null,
  description text default '',
  is_mandatory boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);

create table if not exists hr_document_types (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  category_id text not null references hr_document_categories(id) on delete cascade,
  name text not null,
  requires_expiry boolean default false,
  is_mandatory boolean default false,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== EMPLOYEES ==========

create table if not exists hr_employees (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, emp_code)
);

create table if not exists hr_employee_documents (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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

-- ========== ATTENDANCE & LEAVE OPS ==========

create table if not exists hr_attendance_records (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  property_id text not null references properties(id) on delete cascade,
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
  property_id text not null references properties(id) on delete cascade,
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
  property_id text not null references properties(id) on delete cascade,
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
  property_id text not null references properties(id) on delete cascade,
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
  property_id text not null references properties(id) on delete cascade,
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

-- ========== PAYROLL ==========

create table if not exists hr_salary_structures (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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

create table if not exists hr_payroll_records (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  approved_at timestamptz,
  earnings_breakdown jsonb default '{}'::jsonb,
  deductions_breakdown jsonb default '{}'::jsonb,
  validation_flags jsonb default '{}'::jsonb,
  payslip_generated boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, employee_id, payroll_month, payroll_year)
);

create table if not exists hr_salary_payments (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, payslip_no)
);

-- ========== GRIEVANCES & WORKFLOWS ==========

create table if not exists hr_complaint_categories (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  category_name text not null,
  description text default '',
  review_level text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, category_name)
);

create table if not exists hr_complaints (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, ticket_no)
);

create table if not exists hr_approval_workflows (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, code)
);

create table if not exists hr_payroll_settings (
  id text primary key default gen_random_uuid()::text,
  property_id text not null unique references properties(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hr_tax_rules (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
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
  unique (property_id, tax_code)
);

create table if not exists hr_audit_logs (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references properties(id) on delete cascade,
  module text not null,
  action text not null,
  entity_type text,
  entity_id text,
  changed_by text,
  audit_notes text,
  override_reason text,
  created_at timestamptz not null default now()
);

-- ========== INDEXES ==========

create index if not exists idx_hr_employees_property on hr_employees(property_id);
create index if not exists idx_hr_payroll_records_period on hr_payroll_records(property_id, payroll_year, payroll_month);
create index if not exists idx_hr_attendance_date on hr_attendance_records(property_id, record_date);
create index if not exists idx_hr_leave_apps_status on hr_leave_applications(property_id, status);

-- ========== RLS (anon access — same pattern as FO / HK / F&B) ==========
do $$
declare
  t text;
begin
  foreach t in array array[
    'hr_departments','hr_designations','hr_employment_types','hr_shift_types','hr_leave_types',
    'hr_leave_policies','hr_holidays','hr_salary_components','hr_document_categories','hr_document_types',
    'hr_employees','hr_employee_documents','hr_attendance_records','hr_shift_assignments','hr_weekly_offs',
    'hr_leave_applications','hr_overtime_records','hr_holiday_attendance_records','hr_salary_structures',
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

notify pgrst, 'reload schema';
