CREATE TABLE shift_slots (
    id BIGSERIAL PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    day_of_week TEXT CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
    slot_name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    required_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, day_of_week, slot_name)
);