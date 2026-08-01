create table if not exists public.invoice_email_reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invoice_email_reminders_invoice_id_idx
  on public.invoice_email_reminders(invoice_id);

alter table public.invoice_email_reminders enable row level security;
