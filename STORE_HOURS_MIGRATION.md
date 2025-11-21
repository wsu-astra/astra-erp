# Store Hours Migration

Run this SQL in your Supabase dashboard to add store hours support:

```sql
-- Add store hours JSON column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS store_hours JSONB;
```

This adds:
- `store_hours` - JSON object containing hours for each day of the week
- Each day has: `open_time`, `close_time`, and `closed` boolean
- Times use 24-hour format but will be displayed as AM/PM in the UI
- Default: Mon-Sat 9AM-5PM, Sunday closed