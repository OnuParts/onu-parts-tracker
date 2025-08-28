-- ONU Parts Tracker Database Schema
-- Complete PostgreSQL schema for production deployment

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'technician', 'student', 'controller');
CREATE TYPE issue_reason AS ENUM ('production', 'maintenance', 'replacement', 'testing', 'other');
CREATE TYPE pickup_status AS ENUM ('pending', 'completed');
CREATE TYPE tool_status AS ENUM ('checked_out', 'returned', 'damaged', 'missing');
CREATE TYPE delivery_status AS ENUM ('pending', 'delivered', 'cancelled');
CREATE TYPE delivery_request_status AS ENUM ('pending', 'approved', 'fulfilled', 'rejected');

-- Session table for express-session
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'technician',
    department TEXT
);

-- Buildings table
CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    address TEXT,
    location TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP
);

-- Storage locations table
CREATE TABLE storage_locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shelves table
CREATE TABLE shelves (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES storage_locations(id),
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_location_shelf_idx ON shelves(location_id, name);

-- Parts table
CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    part_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    unit_cost TEXT,
    location TEXT,
    location_id INTEGER REFERENCES storage_locations(id),
    shelf_id INTEGER REFERENCES shelves(id),
    category TEXT,
    supplier TEXT,
    last_restock_date TIMESTAMP
);

-- Part barcodes table
CREATE TABLE part_barcodes (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    barcode TEXT NOT NULL UNIQUE,
    supplier TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Parts issuance table
CREATE TABLE parts_issuance (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    quantity INTEGER NOT NULL,
    issued_to TEXT NOT NULL,
    reason issue_reason NOT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    issued_by INTEGER,
    notes TEXT,
    department TEXT,
    project_code TEXT,
    building_id INTEGER REFERENCES buildings(id),
    cost_center TEXT
);

-- Archived parts issuance table
CREATE TABLE archived_parts_issuance (
    id SERIAL PRIMARY KEY,
    original_id INTEGER,
    part_id INTEGER NOT NULL,
    part_number TEXT NOT NULL,
    part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    issued_to TEXT NOT NULL,
    reason issue_reason NOT NULL,
    issued_at TIMESTAMP NOT NULL,
    issued_by_id INTEGER,
    issued_by_name TEXT,
    notes TEXT,
    department TEXT,
    project_code TEXT,
    unit_cost TEXT,
    archived_at TIMESTAMP NOT NULL DEFAULT NOW(),
    building_name TEXT,
    cost_center_name TEXT,
    cost_center_code TEXT
);

-- Parts to count table
CREATE TABLE parts_to_count (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    assigned_by_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT
);

-- Parts pickup table
CREATE TABLE parts_pickup (
    id SERIAL PRIMARY KEY,
    part_name TEXT NOT NULL,
    part_number TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    supplier TEXT,
    building_id INTEGER REFERENCES buildings(id),
    added_by_id INTEGER REFERENCES users(id),
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    picked_up_by_id INTEGER REFERENCES users(id),
    picked_up_at TIMESTAMP,
    status pickup_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    tracking_number TEXT,
    po_number TEXT,
    pickup_code TEXT
);

-- Tools table
CREATE TABLE tools (
    id SERIAL PRIMARY KEY,
    tool_number INTEGER NOT NULL UNIQUE,
    tool_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true
);

-- Tool signouts table
CREATE TABLE tool_signouts (
    id SERIAL PRIMARY KEY,
    tool_id INTEGER NOT NULL REFERENCES tools(id),
    technician_id INTEGER NOT NULL REFERENCES users(id),
    signed_out_at TIMESTAMP NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMP,
    status tool_status NOT NULL DEFAULT 'checked_out',
    condition TEXT,
    notes TEXT
);

-- Cost centers table
CREATE TABLE cost_centers (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Staff members table
CREATE TABLE staff_members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    building_id INTEGER REFERENCES buildings(id),
    cost_center_id INTEGER REFERENCES cost_centers(id),
    email TEXT,
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Parts delivery table
CREATE TABLE parts_delivery (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    quantity INTEGER NOT NULL,
    staff_member_id INTEGER NOT NULL REFERENCES staff_members(id),
    cost_center_id INTEGER REFERENCES cost_centers(id),
    delivered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    delivered_by_id INTEGER REFERENCES users(id),
    notes TEXT,
    project_code TEXT,
    building_id INTEGER REFERENCES buildings(id),
    unit_cost TEXT,
    signature TEXT,
    status delivery_status NOT NULL DEFAULT 'pending',
    confirmed_at TIMESTAMP
);

-- Delivery requests table
CREATE TABLE delivery_requests (
    id SERIAL PRIMARY KEY,
    requester_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    building_id INTEGER REFERENCES buildings(id),
    cost_center_id INTEGER REFERENCES cost_centers(id),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    request_date TIMESTAMP NOT NULL DEFAULT NOW(),
    fulfilled_date TIMESTAMP,
    fulfilled_by INTEGER REFERENCES users(id)
);

-- Delivery request items table
CREATE TABLE delivery_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES delivery_requests(id),
    part_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT
);

-- Insert default admin user
INSERT INTO users (username, password, name, role, department) 
VALUES ('admin', 'password123', 'System Administrator', 'admin', 'IT') 
ON CONFLICT (username) DO NOTHING;

-- Insert sample buildings
INSERT INTO buildings (name, description, active) VALUES 
('Main Building', 'Primary administrative building', true),
('Engineering Building', 'Engineering and technical departments', true),
('Science Building', 'Science laboratories and classrooms', true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample cost centers
INSERT INTO cost_centers (code, name, description, active) VALUES 
('11000-12760', 'Maintenance Operations', 'General maintenance and operations', true),
('11000-12761', 'Engineering Services', 'Engineering department operations', true),
('11000-12762', 'Facilities Management', 'Facilities and grounds management', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample storage locations
INSERT INTO storage_locations (name, description, active) VALUES 
('Stockroom A', 'Main parts stockroom', true),
('Warehouse B', 'Secondary storage warehouse', true),
('Mobile Unit', 'Mobile storage for field work', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_parts_part_id ON parts(part_id);
CREATE INDEX idx_parts_quantity ON parts(quantity);
CREATE INDEX idx_parts_issuance_issued_at ON parts_issuance(issued_at);
CREATE INDEX idx_parts_delivery_delivered_at ON parts_delivery(delivered_at);
CREATE INDEX idx_staff_members_email ON staff_members(email);
CREATE INDEX idx_parts_delivery_status ON parts_delivery(status);