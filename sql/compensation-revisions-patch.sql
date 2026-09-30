-- Run in Supabase SQL Editor if you already deployed HRMS before compensation revisions.

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

alter table hr_compensation_revisions enable row level security;
drop policy if exists "anon_all_hr_compensation_revisions" on hr_compensation_revisions;
create policy "anon_all_hr_compensation_revisions" on hr_compensation_revisions
  for all to anon using (true) with check (true);

alter table hr_bonus_awards enable row level security;
drop policy if exists "anon_all_hr_bonus_awards" on hr_bonus_awards;
create policy "anon_all_hr_bonus_awards" on hr_bonus_awards
  for all to anon using (true) with check (true);
