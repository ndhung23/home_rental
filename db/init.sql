create extension if not exists "pgcrypto";

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  code varchar(30) not null,
  tenant_name varchar(120),
  tenant_phone varchar(30),
  monthly_rent bigint not null check (monthly_rent > 0),
  status varchar(30) not null default 'vacant'
    check (status in ('occupied', 'vacant', 'expiring', 'unpaid')),
  payment_note varchar(120) not null default 'Phòng mới',
  created_at timestamptz not null default now(),
  unique (property_id, code)
);

create index if not exists rooms_property_id_idx on rooms(property_id);

insert into properties (name, address)
select 'Nhà trọ An Nhiên', 'Thành phố Hồ Chí Minh'
where not exists (select 1 from properties);

insert into rooms (property_id, code, tenant_name, tenant_phone, monthly_rent, status, payment_note)
select p.id, seed.code, seed.tenant_name, seed.tenant_phone, seed.monthly_rent, seed.status, seed.payment_note
from properties p
cross join (
  values
    ('P.101', 'Nguyễn Minh Anh', '090 312 4578', 3200000::bigint, 'occupied', 'Đã thanh toán'),
    ('P.102', 'Trần Quốc Bảo', '098 672 0193', 3000000::bigint, 'unpaid', 'Quá hạn 3 ngày'),
    ('P.103', null, null, 2800000::bigint, 'vacant', 'Đã vệ sinh'),
    ('P.201', 'Lê Hoàng Yến', '093 548 2110', 3500000::bigint, 'expiring', 'Còn 12 ngày'),
    ('P.202', 'Phạm Gia Huy', '091 806 3467', 3200000::bigint, 'occupied', 'Đã thanh toán'),
    ('P.203', 'Võ Thanh Tú', '097 447 9261', 3000000::bigint, 'unpaid', 'Hạn hôm nay')
) as seed(code, tenant_name, tenant_phone, monthly_rent, status, payment_note)
where p.id = (select id from properties order by created_at limit 1)
on conflict (property_id, code) do nothing;
