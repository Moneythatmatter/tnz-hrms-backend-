-- Auth users table for Hotel PMS login
-- Run in Supabase SQL Editor

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'Staff',
  initials text not null default 'U',
  status text not null default 'Active',
  created_at timestamptz default now()
);

create index if not exists idx_users_email on users (email);

alter table users enable row level security;

drop policy if exists "anon_all_users" on users;
create policy "anon_all_users" on users
  for all to anon
  using (true)
  with check (true);

-- Demo admin: admin@gmail.com / 123456
-- password_hash generated with bcrypt (cost 10)
insert into users (id, name, email, password_hash, role, initials, status) values
  (
    'U-ADMIN',
    'Admin',
    'admin@gmail.com',
    '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy',
    'Admin',
    'AD',
    'Active'
  )
on conflict (id) do update set
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role,
  name = excluded.name,
  initials = excluded.initials,
  status = excluded.status;
