alter table public.organizations alter column owner_id drop not null;

insert into public.organizations (name, owner_id)
select 'Hệ thống Nhà Trọ 365', null
where not exists (select 1 from public.organizations);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text not null,
  manager_name text,
  manager_phone text,
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists property_id uuid references public.properties(id) on delete cascade;
alter table public.rooms add column if not exists floor integer;
alter table public.rooms add column if not exists area_sqm numeric(8,2);

insert into public.properties (organization_id, name, address, manager_name, manager_phone)
select id, 'Nhà trọ An Nhiên', 'Thành phố Hồ Chí Minh', 'Tuấn Anh', '090 123 4567'
from public.organizations o
where not exists (
  select 1 from public.properties p where p.organization_id = o.id
);

update public.rooms r
set property_id = (
  select p.id from public.properties p
  where p.organization_id = r.organization_id
  order by p.created_at limit 1
)
where r.property_id is null;

create index if not exists properties_organization_id_idx on public.properties(organization_id);
create index if not exists rooms_property_id_idx on public.rooms(property_id);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  identity_number text,
  date_of_birth date,
  permanent_address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (organization_id, phone)
);

create index if not exists tenants_organization_id_idx on public.tenants(organization_id);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  start_date date not null,
  end_date date,
  deposit bigint not null default 0,
  status text not null default 'active' check (status in ('draft', 'active', 'ended')),
  created_at timestamptz not null default now()
);

create index if not exists leases_room_id_idx on public.leases(room_id);
create index if not exists leases_tenant_id_idx on public.leases(tenant_id);

alter table public.properties enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;

create policy "members can manage properties"
on public.properties for all to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = properties.organization_id and m.user_id = auth.uid()
))
with check (exists (
  select 1 from public.organization_members m
  where m.organization_id = properties.organization_id and m.user_id = auth.uid()
));

create policy "members can manage tenants"
on public.tenants for all to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = tenants.organization_id and m.user_id = auth.uid()
))
with check (exists (
  select 1 from public.organization_members m
  where m.organization_id = tenants.organization_id and m.user_id = auth.uid()
));

create policy "members can manage leases"
on public.leases for all to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = leases.organization_id and m.user_id = auth.uid()
))
with check (exists (
  select 1 from public.organization_members m
  where m.organization_id = leases.organization_id and m.user_id = auth.uid()
));
