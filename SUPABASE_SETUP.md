# Supabase Setup Guide

This guide will help you set up Supabase for your MI DevFest Hackathon project.

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- A Supabase account (sign up at https://supabase.com)

## Quick Start

### 1. Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in your project details:
   - Name: `mi-devfest-hackathon`
   - Database Password: (choose a strong password)
   - Region: (select closest to you)
4. Click "Create new project"

### 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (safe to use in frontend)
   - **service_role key** (use only in backend - keep secret!)

### 3. Configure Environment Variables

#### Root Project (.env)
```bash
cp .env.example .env
```
Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Frontend (.env)
```bash
cd frontend
cp .env.example .env
```
Edit `frontend/.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"

This will create:
- `profiles` table
- Row Level Security policies
- Automatic profile creation trigger
- Updated timestamp trigger

### 5. Install Dependencies

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

### Frontend (React + Vite)

The Supabase client is configured in `frontend/src/lib/supabase.js`:

```javascript
import { supabase } from './lib/supabase'

// Example: Sign up a user
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      username: 'johndoe',
      full_name: 'John Doe'
    }
  }
})

// Example: Query data
const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
```

### Backend (Python)

The Supabase client is configured in `backend/supabase_client.py`:

```python
from supabase_client import get_supabase_client

supabase = get_supabase_client()

# Example: Query data
response = supabase.table('profiles').select('*').execute()
profiles = response.data

# Example: Insert data
response = supabase.table('profiles').insert({
    'username': 'johndoe',
    'full_name': 'John Doe'
}).execute()
```

## Local Development with Supabase CLI (Optional)

For local development without internet:

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Initialize Supabase:
```bash
supabase init
```

3. Start local Supabase:
```bash
supabase start
```

4. Apply migrations:
```bash
supabase db reset
```

5. Access local services:
   - API: http://localhost:54321
   - Studio: http://localhost:54323
   - Database: postgresql://postgres:postgres@localhost:54322/postgres

## Common Operations

### Authentication

```javascript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Sign out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

### Database Operations

```javascript
// Select
const { data } = await supabase.from('profiles').select('*')

// Insert
const { data } = await supabase.from('profiles').insert({ username: 'test' })

// Update
const { data } = await supabase.from('profiles').update({ username: 'new' }).eq('id', userId)

// Delete
const { data } = await supabase.from('profiles').delete().eq('id', userId)
```

### Real-time Subscriptions

```javascript
const channel = supabase
  .channel('profiles-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'profiles' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

## Security Best Practices

1. **Never commit `.env` files** - they're already in `.gitignore`
2. **Use anon key in frontend** - it's safe for client-side use
3. **Use service_role key only in backend** - it bypasses Row Level Security
4. **Enable Row Level Security (RLS)** on all tables
5. **Create appropriate RLS policies** for your use case

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env` files are created and populated
- Restart your dev server after adding environment variables

### Database connection errors
- Verify your Supabase URL and keys are correct
- Check if your Supabase project is active

### RLS policy errors
- Review your Row Level Security policies
- Use service_role key in backend to bypass RLS for admin operations

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Python Client](https://supabase.com/docs/reference/python)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Next Steps

1. Customize the database schema in `supabase/migrations/001_initial_schema.sql`
2. Add more tables as needed for your application
3. Configure authentication providers (Google, GitHub, etc.) in Supabase dashboard
4. Set up storage buckets for file uploads if needed
5. Configure email templates for auth emails

Happy hacking! 🚀
