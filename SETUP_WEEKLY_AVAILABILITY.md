# Setup Weekly Availability System

## Quick Setup Instructions

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/ffnvtmasyzvzkfmnpnxx

2. **Navigate to SQL Editor**: Click "SQL Editor" in the left sidebar

3. **Run the Migration**: Copy and paste the following SQL and click "Run":

```sql
-- Weekly Availability System
-- Add to existing schema for calendar-based availability management

-- WEEKLY AVAILABILITY TABLE
create table if not exists weekly_availability (
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  date date not null,
  available boolean not null default true,
  start_time text default '09:00',
  end_time text default '17:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on weekly_availability
alter table weekly_availability enable row level security;

-- Policies for weekly_availability
create policy "Users can view their own availability"
  on weekly_availability for select
  using (user_id = auth.uid());

create policy "Users can insert their own availability"
  on weekly_availability for insert
  with check (user_id = auth.uid());

create policy "Users can update their own availability"
  on weekly_availability for update
  using (user_id = auth.uid());

create policy "Users can delete their own availability"
  on weekly_availability for delete
  using (user_id = auth.uid());

-- Managers can view all availability for their business
create policy "Admins can view team availability"
  on weekly_availability for select
  using (
    business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id') AND
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and is_admin = true
      and business_id::text = (auth.jwt() -> 'user_metadata' ->> 'business_id')
    )
  );

-- Create indexes for performance
create index if not exists idx_weekly_availability_user_week 
  on weekly_availability(user_id, week_start);

create index if not exists idx_weekly_availability_business_week 
  on weekly_availability(business_id, week_start);

create index if not exists idx_weekly_availability_date 
  on weekly_availability(date);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger update_weekly_availability_updated_at 
  before update on weekly_availability 
  for each row execute function update_updated_at_column();
```

4. **Verify Table Creation**: After running, you should see "Success" message. You can verify by running:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'weekly_availability';
```

## What This Enables

✅ **Week-specific availability** - Employees can set different availability each week
✅ **Time slots** - Start/end times for each available day  
✅ **Real-time updates** - Calendar shows current week automatically
✅ **Manager overview** - Admins can see team availability
✅ **Smart scheduling** - AI can use actual availability for better schedules

## How to Use

1. **Employees**: Click "Set My Availability" button on Employees page
2. **Navigate weeks** with arrow buttons or "Go to Current Week"  
3. **Toggle days** available/unavailable with green/gray buttons
4. **Set hours** for each available day
5. **Quick actions** to set whole week or clear all days
6. **Save** to update your availability

The system automatically highlights today and shows current week by default.