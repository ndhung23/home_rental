create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff', 'tenant')),
  primary key (organization_id, user_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  tenant_name text,
  tenant_phone text,
  monthly_rent bigint not null check (monthly_rent > 0),
  status text not null default 'vacant' check (status in ('occupied', 'vacant', 'expiring', 'unpaid')),
  payment_note text not null default 'Phòng mới',
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index rooms_organization_id_idx on public.rooms(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.rooms enable row level security;

create policy "members can view their organizations"
on public.organizations for select to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.organization_members
    where organization_id = organizations.id and user_id = auth.uid()
  )
);

create policy "members can view memberships"
on public.organization_members for select to authenticated
using (user_id = auth.uid());

create policy "members can view rooms"
on public.rooms for select to authenticated
using (
  exists (
    select 1 from public.organization_members
    where organization_id = rooms.organization_id and user_id = auth.uid()
  )
);

create policy "owners and staff can add rooms"
on public.rooms for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members
    where organization_id = rooms.organization_id
      and user_id = auth.uid()
      and role in ('owner', 'staff')
  )
);

create policy "owners and staff can update rooms"
on public.rooms for update to authenticated
using (
  exists (
    select 1 from public.organization_members
    where organization_id = rooms.organization_id
      and user_id = auth.uid()
      and role in ('owner', 'staff')
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare new_organization_id uuid;
begin
  insert into public.organizations (name, owner_id)
  values ('Nhà trọ của tôi', new.id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
