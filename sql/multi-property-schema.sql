-- Multi-property workspace schema for RITGB PMS
-- Run after auth-users-schema.sql and front-office-schema.sql

-- ========== CORE ==========
create table if not exists public.properties (
  id text primary key,
  name text not null,
  code text not null,
  city text not null default '',
  timezone text not null default 'Asia/Kolkata',
  is_default boolean not null default false,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_code_unique unique (code)
);

create table if not exists public.user_property_access (
  user_id text not null references public.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.user_permissions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  module_key text not null,
  permission text not null default 'read' check (permission in ('read', 'write', 'admin')),
  created_at timestamptz not null default now(),
  constraint user_permissions_unique unique (user_id, property_id, module_key)
);

create index if not exists idx_user_property_access_user on public.user_property_access (user_id);
create index if not exists idx_user_permissions_user on public.user_permissions (user_id, property_id);

alter table public.users add column if not exists is_super_admin boolean not null default false;

-- ========== property_id on operational tables ==========
do $$
declare
  t text;
begin
  foreach t in array array[
    'room_types', 'rooms', 'tariff_plans', 'companies', 'booking_sources',
    'guests', 'reservations', 'guest_stay_history', 'folio_entries', 'folios', 'payments',
    'transactions', 'invoices', 'room_transfers', 'wake_up_calls', 'taxi_bookings',
    'luggage_items', 'messages', 'guest_feedback', 'lost_found_items', 'housekeeping_requests',
    'maintenance_requests', 'cashier_shifts', 'room_charge_postings', 'day_closings',
    'desk_activity', 'room_availability_blocks', 'hk_rooms', 'housekeeping_tasks',
    'guest_requests', 'damage_reports', 'hk_inventory', 'hk_laundry_jobs', 'hk_requisitions',
    'hk_history', 'hk_luggage_jobs', 'hk_settings', 'public_areas', 'hk_public_areas'
  ] loop
    begin
      execute format(
        'alter table public.%I add column if not exists property_id text references public.properties(id) on delete cascade',
        t
      );
      execute format(
        'create index if not exists idx_%I_property on public.%I (property_id)',
        t, t
      );
    exception
      when undefined_table then
        null;
    end;
  end loop;
end $$;

-- Drop global unique on room_no → per-property unique (if rooms table exists)
do $$
begin
  if to_regclass('public.rooms') is not null then
    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.rooms'::regclass and contype = 'u'
        and pg_get_constraintdef(oid) ilike '%room_no%'
        and pg_get_constraintdef(oid) not ilike '%property_id%'
    ) then
      alter table public.rooms drop constraint if exists rooms_room_no_key;
    end if;
    create unique index if not exists rooms_property_room_no_key
      on public.rooms (property_id, room_no)
      where property_id is not null;
  end if;
end $$;

-- Drop global code unique → per-property unique (codes may repeat across properties)
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('room_types', 'code'),
      ('tariff_plans', 'code'),
      ('booking_sources', 'code'),
      ('companies', 'code')
    ) as t(table_name, column_name)
  loop
    if to_regclass(format('public.%I', rec.table_name)) is not null then
      execute format(
        'alter table public.%I drop constraint if exists %I',
        rec.table_name,
        rec.table_name || '_' || rec.column_name || '_key'
      );
      execute format(
        'create unique index if not exists %I on public.%I (property_id, %I) where property_id is not null',
        rec.table_name || '_property_' || rec.column_name || '_key',
        rec.table_name,
        rec.column_name
      );
    end if;
  end loop;
end $$;

-- public_areas uses area_code instead of code
do $$
begin
  if to_regclass('public.public_areas') is not null then
    alter table public.public_areas drop constraint if exists public_areas_area_code_key;
    drop index if exists public.public_areas_area_code_key;
    create unique index if not exists public_areas_property_area_code_key
      on public.public_areas (property_id, area_code)
      where property_id is not null;
  end if;
end $$;

-- guest_no / booking_no — unique per property
do $$
begin
  if to_regclass('public.guests') is not null then
    alter table public.guests drop constraint if exists guests_guest_no_key;
    drop index if exists public.guests_guest_no_key;
    create unique index if not exists guests_property_guest_no_key
      on public.guests (property_id, guest_no)
      where property_id is not null and guest_no is not null and trim(guest_no) <> '';
  end if;
  if to_regclass('public.reservations') is not null then
    alter table public.reservations drop constraint if exists reservations_booking_no_key;
    drop index if exists public.reservations_booking_no_key;
    create unique index if not exists reservations_property_booking_no_key
      on public.reservations (property_id, booking_no)
      where property_id is not null and booking_no is not null and trim(booking_no) <> '';
  end if;
end $$;

alter table public.properties enable row level security;
alter table public.user_property_access enable row level security;
alter table public.user_permissions enable row level security;

drop policy if exists "anon_all_properties" on public.properties;
create policy "anon_all_properties" on public.properties for all using (true) with check (true);

drop policy if exists "anon_all_user_property_access" on public.user_property_access;
create policy "anon_all_user_property_access" on public.user_property_access for all using (true) with check (true);

drop policy if exists "anon_all_user_permissions" on public.user_permissions;
create policy "anon_all_user_permissions" on public.user_permissions for all using (true) with check (true);
