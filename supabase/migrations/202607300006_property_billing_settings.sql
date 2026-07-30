create table if not exists public.property_billing_settings (
  property_id uuid primary key references public.properties(id) on delete cascade,
  electricity_price bigint not null default 3500 check (electricity_price >= 0),
  water_price bigint not null default 15000 check (water_price >= 0),
  internet_price bigint not null default 100000 check (internet_price >= 0),
  trash_price bigint not null default 30000 check (trash_price >= 0),
  payment_due_day smallint not null default 10 check (payment_due_day between 1 and 28),
  updated_at timestamptz not null default now()
);

insert into public.property_billing_settings
  (property_id, electricity_price, water_price, internet_price, trash_price, payment_due_day)
select p.id,
  coalesce(max(s.unit_price) filter (where s.code = 'electricity'), 3500),
  coalesce(max(s.unit_price) filter (where s.code = 'water'), 15000),
  coalesce(max(s.unit_price) filter (where s.code = 'internet'), 100000),
  coalesce(max(s.unit_price) filter (where s.code = 'trash'), 30000),
  coalesce(bs.payment_due_day, 10)
from public.properties p
left join public.services s on s.organization_id = p.organization_id
left join public.billing_settings bs on bs.organization_id = p.organization_id
group by p.id, bs.payment_due_day
on conflict (property_id) do nothing;

alter table public.property_billing_settings enable row level security;
