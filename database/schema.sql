create extension if not exists pgcrypto;

create table if not exists public.customers (
  bank_customer_id uuid primary key default gen_random_uuid(),
  national_id text not null unique,
  last_name text not null,
  first_name text not null,
  age integer not null,
  marital_status text not null,
  children_count integer not null,
  annual_income numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_national_id_format check (national_id ~ '^[A-Z]{1,3}[0-9]{6,8}$'),
  constraint customers_last_name_format check (
    char_length(trim(last_name)) between 2 and 80
    and last_name !~ '[0-9]'
  ),
  constraint customers_first_name_format check (
    char_length(trim(first_name)) between 2 and 80
    and first_name !~ '[0-9]'
  ),
  constraint customers_age_range check (age between 18 and 100),
  constraint customers_marital_status_allowed check (
    marital_status in ('single', 'married', 'divorced', 'widowed')
  ),
  constraint customers_children_count_range check (children_count between 0 and 20),
  constraint customers_annual_income_range check (
    annual_income >= 0
    and annual_income <= 100000000
  )
);

create table if not exists public.credit_applications (
  application_id uuid primary key default gen_random_uuid(),
  bank_customer_id uuid not null references public.customers(bank_customer_id) on delete restrict,
  requested_amount numeric(12,2) not null,
  duration_value integer not null,
  duration_unit text not null,
  monthly_charges numeric(12,2) not null,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_applications_requested_amount_range check (
    requested_amount >= 1000
    and requested_amount <= 100000000
  ),
  constraint credit_applications_duration_value_range check (duration_value between 1 and 600),
  constraint credit_applications_duration_unit_allowed check (duration_unit in ('months', 'years')),
  constraint credit_applications_monthly_charges_range check (
    monthly_charges >= 0
    and monthly_charges <= 10000000
  ),
  constraint credit_applications_status_allowed check (
    status in ('draft', 'submitted', 'reviewed', 'approved', 'rejected')
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists credit_applications_set_updated_at on public.credit_applications;
create trigger credit_applications_set_updated_at
before update on public.credit_applications
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.credit_applications enable row level security;

drop policy if exists "No direct anon customer reads" on public.customers;
create policy "No direct anon customer reads"
on public.customers
for select
to anon
using (false);

drop policy if exists "No direct authenticated customer reads" on public.customers;
create policy "No direct authenticated customer reads"
on public.customers
for select
to authenticated
using (false);

drop policy if exists "No direct anon customer writes" on public.customers;
create policy "No direct anon customer writes"
on public.customers
for insert
to anon
with check (false);

drop policy if exists "No direct authenticated customer writes" on public.customers;
create policy "No direct authenticated customer writes"
on public.customers
for insert
to authenticated
with check (false);

drop policy if exists "No direct anon application reads" on public.credit_applications;
create policy "No direct anon application reads"
on public.credit_applications
for select
to anon
using (false);

drop policy if exists "No direct authenticated application reads" on public.credit_applications;
create policy "No direct authenticated application reads"
on public.credit_applications
for select
to authenticated
using (false);

drop policy if exists "No direct anon application writes" on public.credit_applications;
create policy "No direct anon application writes"
on public.credit_applications
for insert
to anon
with check (false);

drop policy if exists "No direct authenticated application writes" on public.credit_applications;
create policy "No direct authenticated application writes"
on public.credit_applications
for insert
to authenticated
with check (false);

grant select, insert, update on public.customers to service_role;
grant select, insert, update on public.credit_applications to service_role;

create index if not exists customers_last_name_idx on public.customers (last_name);
create index if not exists credit_applications_bank_customer_id_idx
  on public.credit_applications (bank_customer_id);

insert into public.customers (
  national_id,
  last_name,
  first_name,
  age,
  marital_status,
  children_count,
  annual_income
) values
  ('AB123456', 'BENALI', 'Salma', 34, 'married', 2, 185000.00),
  ('D1234567', 'EL MANSOURI', 'Yassine', 41, 'single', 0, 240000.00),
  ('BK234567', 'ALAOUI', 'Nadia', 29, 'single', 0, 132000.00),
  ('JH345678', 'TAZI', 'Mehdi', 46, 'married', 3, 310000.00),
  ('EE456789', 'BENNANI', 'Imane', 38, 'divorced', 1, 198000.00)
on conflict (national_id) do nothing;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end;
$$;
