create table if not exists public.billing_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  payment_due_day smallint not null default 10 check (payment_due_day between 1 and 28),
  updated_at timestamptz not null default now()
);

insert into public.billing_settings (organization_id, payment_due_day)
select id, 10 from public.organizations
on conflict (organization_id) do nothing;

alter table public.billing_settings enable row level security;
