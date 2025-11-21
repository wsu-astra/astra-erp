-- MainStreet Copilot Multi-Tenant Schema
-- RUN THIS IN SUPABASE SQL EDITOR

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- BUSINESSES TABLE
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

-- Enable RLS on businesses
alter table businesses enable row level security;

-- Policies for businesses
create policy "Users can view their own business"
  on businesses for select
  using (id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their own business"
  on businesses for insert
  with check (true);

create policy "Users can update their own business"
  on businesses for update
  using (id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- USER PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- INVENTORY ITEMS
create table if not exists inventory_items (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  category text,
  current_quantity int not null default 0 check (current_quantity >= 0),
  minimum_quantity int not null default 0,
  unit text default 'unit',
  instacart_search text,
  last_updated timestamptz default now(),
  unique(business_id, name)
);

-- Enable RLS on inventory_items
alter table inventory_items enable row level security;

-- Policies for inventory_items
create policy "Users can view their business inventory"
  on inventory_items for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business inventory"
  on inventory_items for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business inventory"
  on inventory_items for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business inventory"
  on inventory_items for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- EMPLOYEES
create table if not exists employees (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  full_name text not null,
  role text,
  strength text check (strength in ('strong','normal','new')) default 'normal',
  active boolean default true
);

-- Enable RLS on employees
alter table employees enable row level security;

-- Policies for employees
create policy "Users can view their business employees"
  on employees for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business employees"
  on employees for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business employees"
  on employees for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business employees"
  on employees for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- EMPLOYEE AVAILABILITY
create table if not exists employee_availability (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  employee_id bigint references employees(id) on delete cascade,
  day_of_week text check (
    day_of_week in ('mon','tue','wed','thu','fri','sat','sun')
  ) not null,
  can_work boolean not null default true
);

-- Enable RLS on employee_availability
alter table employee_availability enable row level security;

-- Policies for employee_availability
create policy "Users can view their business availability"
  on employee_availability for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business availability"
  on employee_availability for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business availability"
  on employee_availability for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business availability"
  on employee_availability for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- STAFFING RULES
create table if not exists staffing_rules (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  day_of_week text check (
    day_of_week in ('mon','tue','wed','thu','fri','sat','sun')
  ) not null,
  required_count int not null default 0,
  unique(business_id, day_of_week)
);

-- Enable RLS on staffing_rules
alter table staffing_rules enable row level security;

-- Policies for staffing_rules
create policy "Users can view their business staffing rules"
  on staffing_rules for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business staffing rules"
  on staffing_rules for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business staffing rules"
  on staffing_rules for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business staffing rules"
  on staffing_rules for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- SHIFTS
create table if not exists shifts (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  week_start date not null,
  day_of_week text check (
    day_of_week in ('mon','tue','wed','thu','fri','sat','sun')
  ) not null,
  employee_id bigint references employees(id) on delete cascade,
  start_time text default '10:00',
  end_time text default '18:00'
);

-- Enable RLS on shifts
alter table shifts enable row level security;

-- Policies for shifts
create policy "Users can view their business shifts"
  on shifts for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business shifts"
  on shifts for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business shifts"
  on shifts for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business shifts"
  on shifts for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- WEEKLY FINANCIALS
create table if not exists weekly_financials (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  week_start date not null,
  gross_sales numeric not null,
  payroll numeric not null,
  payroll_pct numeric not null,
  unique(business_id, week_start)
);

-- Enable RLS on weekly_financials
alter table weekly_financials enable row level security;

-- Policies for weekly_financials
create policy "Users can view their business financials"
  on weekly_financials for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business financials"
  on weekly_financials for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business financials"
  on weekly_financials for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business financials"
  on weekly_financials for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- REMINDERS
create table if not exists reminders (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  type text check (
    type in ('payroll','inventory','schedule')
  ) not null,
  day_of_week text check (
    day_of_week in ('mon','tue','wed','thu','fri','sat','sun')
  ) not null,
  time_of_day text not null,
  message text not null,
  active boolean default true
);

-- Enable RLS on reminders
alter table reminders enable row level security;

-- Policies for reminders
create policy "Users can view their business reminders"
  on reminders for select
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can insert their business reminders"
  on reminders for insert
  with check (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can update their business reminders"
  on reminders for update
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

create policy "Users can delete their business reminders"
  on reminders for delete
  using (business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id'));

-- Create Storage Bucket for business logos (Run this separately in Storage section)
-- insert into storage.buckets (id, name, public) values ('business-logos', 'business-logos', true);

-- Storage policies for business-logos bucket
-- create policy "Public logos are viewable by everyone"
--   on storage.objects for select
--   using (bucket_id = 'business-logos');

-- create policy "Users can upload their business logo"
--   on storage.objects for insert
--   with check (bucket_id = 'business-logos' and auth.role() = 'authenticated');

-- create policy "Users can update their business logo"
--   on storage.objects for update
--   using (bucket_id = 'business-logos' and auth.role() = 'authenticated');
