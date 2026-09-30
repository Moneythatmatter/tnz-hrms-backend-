-- Human Resources — RLS patch (run if Supabase Table Editor shows rows but API/UI is empty)
-- Safe to re-run. Required when backend uses SUPABASE_ANON_KEY (no service role key).

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
