create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  kind text not null check (kind in ('meter','invoice','cashflow','vehicle','asset','service','maintenance','task','notification','report')),
  code text not null,
  title text not null,
  detail text not null default '',
  assignee text not null default '',
  due_date date,
  status text not null default 'new' check (status in ('new','processing','completed')),
  email text,
  amount numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists operations_org_kind_idx on public.operations(organization_id, kind, created_at desc);
create index if not exists operations_property_room_idx on public.operations(property_id, room_id);

alter table public.operations enable row level security;

create policy "organization members manage operations" on public.operations
for all to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = operations.organization_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.organization_members m where m.organization_id = operations.organization_id and m.user_id = auth.uid())
);
