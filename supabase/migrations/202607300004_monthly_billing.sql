create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  unit text not null,
  unit_price bigint not null check (unit_price >= 0),
  calculation_type text not null check (calculation_type in ('metered', 'fixed')),
  is_active boolean not null default true,
  unique (organization_id, code)
);

create table if not exists public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  period date not null,
  previous_value numeric(12,2) not null default 0,
  current_value numeric(12,2) not null,
  usage_value numeric(12,2) generated always as (current_value - previous_value) stored,
  created_at timestamptz not null default now(),
  unique (room_id, service_id, period),
  check (current_value >= previous_value)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  period date not null,
  due_date date not null,
  rent_amount bigint not null default 0,
  service_amount bigint not null default 0,
  discount_amount bigint not null default 0,
  total_amount bigint not null default 0,
  status text not null default 'unpaid' check (status in ('draft', 'unpaid', 'paid', 'overdue')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, period)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price bigint not null default 0,
  amount bigint not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount bigint not null check (amount > 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'bank_transfer')),
  paid_at timestamptz not null default now(),
  note text
);

create index if not exists meter_readings_period_idx on public.meter_readings(period);
create index if not exists invoices_period_idx on public.invoices(period);
create index if not exists invoices_status_idx on public.invoices(status);

insert into public.services (organization_id, name, code, unit, unit_price, calculation_type)
select o.id, seed.name, seed.code, seed.unit, seed.unit_price, seed.calculation_type
from public.organizations o
cross join (values
  ('Điện', 'electricity', 'kWh', 3500::bigint, 'metered'),
  ('Nước', 'water', 'm³', 15000::bigint, 'metered'),
  ('Internet', 'internet', 'tháng', 100000::bigint, 'fixed'),
  ('Rác', 'trash', 'tháng', 30000::bigint, 'fixed')
) as seed(name, code, unit, unit_price, calculation_type)
on conflict (organization_id, code) do nothing;

alter table public.services enable row level security;
alter table public.meter_readings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
