# HRMS Database Setup

## Quick start (new Supabase project)

Run **one file** in Supabase SQL Editor:

```
backend/sql/setup-hrms-database.sql
```

That script creates everything: tables, RLS, demo HR data, admin + employee logins.

### After running the script

1. Copy Supabase credentials into `backend/.env`:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=change-me-in-production
   PORT=5002
   ```

2. Start backend: `cd backend && npm run dev`

3. Frontends — set `NEXT_PUBLIC_API_URL=http://127.0.0.1:5002`

### Demo logins (password: `123456`)

| App | Email | Role |
|-----|-------|------|
| **Admin** | `admin@gmail.com` | Super admin |
| **Employee portal** | `rajesh.kumar@shawhotel.com` | Staff |
| **Employee portal** | `priya.patel@shawhotel.com` | Staff |

---

## API

| Module | Prefix |
|--------|--------|
| Auth | `/api/auth` |
| Platform | `/api/platform` |
| HR Admin | `/api/human-resources` |
| Employee portal | `/api/employee-portal` |

All protected routes require `Authorization: Bearer <token>`.

---

## Existing database patch (compensation revisions)

If you already deployed HRMS before compensation/increment support, run:

```
backend/sql/compensation-revisions-patch.sql
```

---

## Existing database patch (payroll workflow)

If you already ran an older version of the schema, execute in Supabase SQL Editor:

```sql
alter table hr_payroll_records
  add column if not exists verified_at timestamptz,
  add column if not exists is_locked boolean not null default false;

alter table hr_employees
  add column if not exists salary_structure_id text references hr_salary_structures(id) on delete set null;

create unique index if not exists idx_hr_payslips_payroll_id
  on hr_payslips(payroll_id)
  where payroll_id is not null;
```
