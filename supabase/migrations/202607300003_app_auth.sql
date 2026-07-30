create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text not null,
  role text not null check (role in ('landlord', 'staff', 'tenant')),
  organization_id uuid references public.organizations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.app_users (username, password_hash, display_name, role, organization_id)
values (
  'admin',
  crypt('1', gen_salt('bf')),
  'Tuấn Anh',
  'landlord',
  (select id from public.organizations order by created_at limit 1)
)
on conflict (username) do update
set password_hash = excluded.password_hash,
    display_name = excluded.display_name,
    role = excluded.role,
    organization_id = excluded.organization_id,
    is_active = true;

alter table public.app_users enable row level security;
