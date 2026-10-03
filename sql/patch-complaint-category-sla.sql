-- Run in Supabase SQL Editor if hr_complaint_categories already exists without SLA columns.

alter table hr_complaint_categories
  add column if not exists sla_days integer not null default 7;

alter table hr_complaint_categories
  add column if not exists default_priority text not null default 'Medium';

update hr_complaint_categories
set
  sla_days = coalesce(sla_days, 7),
  default_priority = coalesce(nullif(default_priority, ''), 'Medium')
where sla_days is null or default_priority is null or default_priority = '';
