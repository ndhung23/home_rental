alter table public.tenants
  add column if not exists gender text
  check (gender in ('male', 'female', 'other'));
