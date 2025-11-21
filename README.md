# MainStreet Copilot - Multi-Tenant SMB Operating System

A production-ready, multi-tenant SaaS application for small business management with AI-powered features.

## 🚀 Features

### Multi-Tenancy & White-Labeling
- **Complete Business Isolation**: Each business has its own isolated data
- **Custom Branding**: Each business can upload their own logo
- **Secure Authentication**: Row-level security ensures no cross-business data access

### Core Modules

1. **Inventory Management**
   - Track stock levels with status indicators (In Stock / Low / Out)
   - AI-powered order generation using IBM WatsonX
   - Direct Instacart integration for ordering

2. **Employee Management**
   - Employee profiles with strength levels (Strong / Normal / New)
   - Weekly availability tracking
   - Active/inactive status management

3. **AI Schedule Builder**
   - Automated shift scheduling using WatsonX AI
   - Respects employee availability
   - Pairs strong employees with new hires
   - Meets staffing requirements per day

4. **Sales vs Payroll Tracking**
   - Track weekly gross sales and payroll
   - Automatic payroll percentage calculation
   - Color-coded status (Green < 28%, Yellow 28-35%, Red > 35%)

5. **Reminders System**
   - Create reminders for inventory, payroll, or scheduling
   - Schedule by day and time
   - Dashboard displays today's reminders

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Supabase** - PostgreSQL database with auth & storage
- **IBM WatsonX.ai** - AI-powered scheduling and ordering
- **Pydantic** - Data validation

### Frontend
- **React + TypeScript** - Type-safe UI framework
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first styling
- **Axios** - HTTP client
- **Lucide React** - Modern icons

## 📦 Installation

### Prerequisites
- Python 3.8+
- Node.js 18+
- Supabase account
- IBM WatsonX account (optional, has fallbacks)

### 1. Clone & Setup

```bash
git clone https://github.com/josephkhemmoro/mi-devfest-hackathon.git
cd mi-devfest-hackathon
```

### 2. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_mainstreet_schema.sql`
3. Go to Storage and create a bucket called `business-logos` (set to public)

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `backend/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
WATSONX_API_KEY=your_watsonx_key  # Optional
WATSONX_PROJECT_ID=your_project_id  # Optional
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## 🧪 Testing Multi-Tenancy

### Success Test Flow

1. **Create Business A**
   - Go to http://localhost:5173/signup
   - Sign up with email: `business-a@test.com`
   - Business name: "Joe's Pizza"
   - Add inventory items, employees, schedule

2. **Create Business B**
   - Log out
   - Sign up with email: `business-b@test.com`
   - Business name: "Sarah's Bakery"

3. **Verify Isolation**
   - Business B should see NO data from Business A
   - Each business should only see their own:
     - Inventory items
     - Employees
     - Schedules
     - Financial records
     - Reminders

4. **Test White-Labeling**
   - Upload different logos for each business
   - Verify logo appears in header for each business

## 📚 API Documentation

### Authentication

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "business_name": "My Business"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Inventory

#### Get All Items
```http
GET /api/inventory/
Authorization: Bearer {token}
```

#### Create Item
```http
POST /api/inventory/
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Fries",
  "category": "Food",
  "current_quantity": 50,
  "minimum_quantity": 20,
  "unit": "boxes",
  "instacart_search": "french fries frozen"
}
```

#### Generate AI Order List
```http
POST /api/inventory/generate-order
Authorization: Bearer {token}
```

### Employees

#### Get All Employees
```http
GET /api/employees/
Authorization: Bearer {token}
```

#### Create Employee
```http
POST /api/employees/
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "John Doe",
  "role": "Cook",
  "strength": "strong",
  "active": true,
  "availability": ["mon", "tue", "wed", "thu", "fri"]
}
```

### Schedule

#### Generate AI Schedule
```http
POST /api/schedule/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "week_start": "2024-01-01"
}
```

#### Get Shifts
```http
GET /api/schedule/shifts/2024-01-01
Authorization: Bearer {token}
```

### Financials

#### Create Financial Record
```http
POST /api/financials/
Authorization: Bearer {token}
Content-Type: application/json

{
  "week_start": "2024-01-01",
  "gross_sales": 5000.00,
  "payroll": 1200.00
}
```

## 🔐 Security

### Multi-Tenant Security Model

1. **Row-Level Security (RLS)**
   - All tables have RLS policies
   - Users can only access data where `business_id` matches their metadata

2. **Authentication Flow**
   - JWT tokens contain `business_id` in user metadata
   - Backend validates token on every request
   - Frontend stores token in localStorage

3. **Business Isolation**
   - Every database query filters by `business_id`
   - Cross-business access attempts return 403 Forbidden
   - Each business's data is completely isolated

4. **API Key Security**
   - Service role key used only in backend
   - Anon key safe for frontend use
   - Environment variables never committed

## 🤖 AI Features

### WatsonX Integration

The application uses IBM WatsonX AI for:

1. **Inventory Ordering**
   - Analyzes current vs minimum quantities
   - Adds 20% buffer for low-stock items
   - Returns optimized order quantities

2. **Employee Scheduling**
   - Respects employee availability
   - Pairs strong with new employees
   - Distributes shifts evenly
   - Meets required staff counts

**Fallback Behavior:**
If WatsonX is unavailable, the app uses built-in algorithms to ensure functionality continues.

## 📁 Project Structure

```
mi-devfest-hackathon/
├── backend/
│   ├── app.py                 # Main FastAPI app
│   ├── auth.py                # Auth middleware
│   ├── db.py                  # Database connection
│   ├── models.py              # Pydantic models
│   ├── routers/
│   │   ├── inventory.py       # Inventory routes
│   │   ├── employees.py       # Employee routes
│   │   ├── schedule.py        # Scheduling routes
│   │   ├── money.py           # Financial routes
│   │   ├── reminders.py       # Reminder routes
│   │   └── dashboard.py       # Dashboard routes
│   └── services/
│       ├── watsonx_client.py  # WatsonX AI client
│       ├── inventory_engine.py
│       └── schedule_engine.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx     # Main layout with white-labeling
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── BusinessContext.tsx
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios client
│   │   │   └── supabase.js    # Supabase client
│   │   ├── pages/
│   │   │   ├── SignUp.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inventory.tsx
│   │   │   ├── Employees.tsx
│   │   │   ├── Schedule.tsx
│   │   │   ├── Money.tsx
│   │   │   └── Reminders.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql
        └── 002_mainstreet_schema.sql
```

## 🐛 Troubleshooting

### Frontend won't start
- Run `npm install` in the frontend directory
- Check that `.env` file exists with correct Supabase keys

### Backend errors
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`
- Check `.env` file has all required variables

### Authentication fails
- Verify Supabase URL and keys are correct
- Check that migrations have been run
- Ensure RLS policies are enabled

### Data showing for wrong business
- Clear localStorage and log out
- Check backend logs for business_id validation
- Verify RLS policies in Supabase

## 📝 License

MIT License - feel free to use for your own projects!

## 👥 Contributors

Built for MI DevFest Hackathon 2024

## 🙏 Acknowledgments

- Supabase for the amazing backend platform
- IBM WatsonX for AI capabilities
- FastAPI for the excellent Python framework
- React team for the UI library
