-- lads-migration.sql
-- This script is designed to migrate an existing 'parcels' table
-- and create other new tables for the Land Administration System.

-- Ensure UUID generation and PostGIS are enabled in your database
-- If you haven't already, run these commands separately in your PostgreSQL client:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Function to automatically update the 'date_updated' timestamp on record modifications
-- This function is crucial for all tables that track modification times.
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. Create essential tables or alter existing ones that 'parcels'
--    or other tables will reference.
-- -----------------------------------------------------------------------------

-- Table for parties (individuals, organizations, staff)
-- Added password_hash for authentication and made contact_email unique and NOT NULL.
-- ADDED KRA_PIN COLUMN
CREATE TABLE IF NOT EXISTS parties (
    party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_type VARCHAR(50) NOT NULL, -- e.g., 'individual', 'organization', 'staff'
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    organization_name VARCHAR(255),
    staff_role VARCHAR(100), -- Role if party_type is 'staff'
    national_id_or_registration_number VARCHAR(50) UNIQUE,
    contact_email VARCHAR(255) UNIQUE NOT NULL, -- Email made unique and NOT NULL for login
    password_hash VARCHAR(255), -- Added for storing hashed passwords
    kra_pin VARCHAR(50), -- NEW: Added KRA_PIN column (optional)
    contact_phone VARCHAR(50), -- Optional
    address TEXT,             -- Optional
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- If the 'parties' table already exists, you would only run this specific ALTER TABLE command:
ALTER TABLE parties ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(50);
-- You might also need to ensure contact_email is UNIQUE NOT NULL if not already
ALTER TABLE parties ALTER COLUMN contact_email SET NOT NULL;
ALTER TABLE parties ADD CONSTRAINT parties_contact_email_key UNIQUE (contact_email);


CREATE INDEX IF NOT EXISTS idx_parties_national_id ON parties (national_id_or_registration_number);
CREATE INDEX IF NOT EXISTS idx_parties_party_type ON parties (party_type);
CREATE INDEX IF NOT EXISTS idx_parties_contact_email ON parties (contact_email); -- Index for email for faster logins
CREATE INDEX IF NOT EXISTS idx_parties_kra_pin ON parties (kra_pin); -- NEW: Index for KRA_PIN

-- Table for hierarchical administrative units (e.g., counties, sub-counties, wards)
CREATE TABLE IF NOT EXISTS administrative_units (
    admin_unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    unit_type VARCHAR(100) NOT NULL, -- e.g., 'county', 'sub_county', 'ward'
    county_code VARCHAR(10) UNIQUE,
    parent_admin_unit_id UUID REFERENCES administrative_units(admin_unit_id), -- Self-referencing for hierarchy
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_units_type_name ON administrative_units (unit_type, name);

-- Table for land registration sections within administrative units
CREATE TABLE IF NOT EXISTS registration_sections (
    registration_section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    admin_unit_id UUID NOT NULL REFERENCES administrative_units(admin_unit_id),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_sections_admin_unit_id ON registration_sections (admin_unit_id);

-- Supporting table for predefined land use categories and zoning codes
CREATE TABLE IF NOT EXISTS land_use_types (
    land_use_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zoning_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. Migrate the existing 'parcels' table.
--    This section alters your existing 'parcels' table to fit the new schema.
-- -----------------------------------------------------------------------------

-- Only perform these if the columns haven't been renamed yet
ALTER TABLE parcels RENAME COLUMN IF EXISTS gid TO old_gid;
ALTER TABLE parcels RENAME COLUMN IF EXISTS id TO old_id;
ALTER TABLE parcels RENAME COLUMN IF EXISTS parcelno TO parcel_number;
ALTER TABLE parcels RENAME COLUMN IF EXISTS area TO area_sqm;

-- Add the new primary key column 'parcel_id' if it doesn't exist
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS parcel_id UUID;

-- Populate 'parcel_id' for existing rows (using UUIDs)
-- This is a one-time operation to give existing parcels a new UUID.
UPDATE parcels SET parcel_id = gen_random_uuid() WHERE parcel_id IS NULL;

-- Drop the old primary key constraint (on old_gid) if it exists, before adding the new one
ALTER TABLE parcels DROP CONSTRAINT IF EXISTS parcels_pkey;

-- Set the new 'parcel_id' as the primary key
ALTER TABLE parcels ADD CONSTRAINT parcels_pkey PRIMARY KEY (parcel_id);

-- Add other new columns to the 'parcels' table if they don't exist
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS registration_section_id UUID;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_land_use_type_id UUID;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to ensure 'parcel_number' is NOT NULL if it isn't already,
-- and then add the NOT NULL and UNIQUE constraints.
-- You might need to UPDATE parcels SET parcel_number = 'SOME_DEFAULT' WHERE parcel_number IS NULL;
-- if you have NULLs and want to make it NOT NULL.
ALTER TABLE parcels ALTER COLUMN parcel_number SET NOT NULL;
ALTER TABLE parcels ADD CONSTRAINT parcels_parcel_number_key UNIQUE (parcel_number);

-- Change the geometry column type and SRID (from 21037 to 4326)
-- IMPORTANT: This step performs a spatial transformation. Ensure PostGIS is active.
-- If geom column already is not null, this line is fine. Otherwise, also add SET NOT NULL.
ALTER TABLE parcels ALTER COLUMN geom TYPE GEOMETRY(MultiPolygon, 4326) USING ST_SetSRID(geom, 4326);
ALTER TABLE parcels ALTER COLUMN geom SET NOT NULL; -- Ensure it's NOT NULL as per schema

-- Recreate the GIST index on the geometry column if it was dropped or to apply to the new type
DROP INDEX IF EXISTS parcels_geom_idx; -- Drop old index if it was on a different geom type
CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON parcels USING GIST (geom);

-- -----------------------------------------------------------------------------
-- 3. Create tables that reference the new 'parcels' (or 'parties') table.
--    These tables can now be created as 'parcels' and 'parties' have their final PKs.
-- -----------------------------------------------------------------------------

-- Table for Rights, Restrictions, and Responsibilities (RRRs) related to land
CREATE TABLE IF NOT EXISTS rrrs (
    rrr_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rrr_type VARCHAR(50) NOT NULL, -- 'right', 'restriction', 'responsibility'
    description TEXT NOT NULL,
    valid_from_date DATE NOT NULL,
    valid_to_date DATE, -- NULL if perpetual
    party_id UUID NOT NULL REFERENCES parties(party_id),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id), -- References the new parcel_id
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rrrs_type_party_parcel ON rrrs (rrr_type, party_id, parcel_id);

-- Table for source documents providing evidence for land information
CREATE TABLE IF NOT EXISTS source_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(100) NOT NULL, -- e.g., 'title_deed', 'survey_plan', 'mutation_form'
    document_reference_number VARCHAR(255) UNIQUE NOT NULL,
    document_date DATE NOT NULL,
    document_title VARCHAR(255),
    document_path TEXT, -- Path or URL to digitized document
    related_party_id UUID REFERENCES parties(party_id),
    parcel_id UUID REFERENCES parcels(parcel_id), -- References the new parcel_id
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_docs_type_ref ON source_documents (document_type, document_reference_number);

-- Table for recording land surveys
CREATE TABLE IF NOT EXISTS surveys (
    survey_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id), -- References the new parcel_id
    surveyor_party_id UUID NOT NULL REFERENCES parties(party_id), -- Links to a party classified as a 'surveyor'
    survey_date DATE NOT NULL,
    survey_method VARCHAR(100),
    survey_accuracy NUMERIC(5, 2),
    survey_notes TEXT,
    related_document_id UUID REFERENCES source_documents(document_id),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_surveys_parcel_surveyor ON surveys (parcel_id, surveyor_party_id);

-- Table for managing land-related applications
CREATE TABLE IF NOT EXISTS applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type VARCHAR(100) NOT NULL, -- e.g., 'land_use_change', 'title_registration'
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- e.g., 'submitted', 'approved', 'rejected'
    applicant_party_id UUID NOT NULL REFERENCES parties(party_id),
    parcel_id UUID REFERENCES parcels(parcel_id), -- References the new parcel_id
    assigned_staff_id UUID REFERENCES parties(party_id), -- Links to a party classified as 'staff'
    approval_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_status_type ON applications (status, application_type);

-- Table for historical land transactions and changes
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_type VARCHAR(100) NOT NULL, -- e.g., 'title_transfer', 'subdivision_completion'
    application_id UUID REFERENCES applications(application_id),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id), -- References the new parcel_id
    initiating_party_id UUID REFERENCES parties(party_id),
    receiving_party_id UUID REFERENCES parties(party_id),
    resulting_document_id UUID REFERENCES source_documents(document_id),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_type_parcel ON transactions (transaction_type, parcel_id);

-- Table for land valuations and financial assessments
CREATE TABLE IF NOT EXISTS valuations (
    valuation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id), -- References the new parcel_id
    market_value NUMERIC(20, 2) NOT NULL,
    valuation_date DATE NOT NULL,
    valuer_party_id UUID NOT NULL REFERENCES parties(party_id), -- Links to a party classified as a 'valuer'
    assessed_value NUMERIC(20, 2),
    valuation_notes TEXT,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_valuations_parcel_date ON valuations (parcel_id, valuation_date);

-- -----------------------------------------------------------------------------
-- 4. Add remaining foreign key constraints and triggers.
--    These are added after all referenced tables are guaranteed to exist.
-- -----------------------------------------------------------------------------

-- Add foreign key constraints to the 'parcels' table
ALTER TABLE parcels
ADD CONSTRAINT fk_registration_section
FOREIGN KEY (registration_section_id) REFERENCES registration_sections(registration_section_id);

ALTER TABLE parcels
ADD CONSTRAINT fk_land_use_type
FOREIGN KEY (current_land_use_type_id) REFERENCES land_use_types(land_use_type_id);

-- Add indexes for new columns on parcels
CREATE INDEX IF NOT EXISTS idx_parcels_registration_section_id ON parcels (registration_section_id);
CREATE INDEX IF NOT EXISTS idx_parcels_current_land_use_type_id ON parcels (current_land_use_type_id);

-- Apply the update timestamp trigger to all relevant tables
-- Using IF NOT EXISTS to prevent errors if triggers were already added.
CREATE TRIGGER trg_parties_update_timestamp
BEFORE UPDATE ON parties
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_administrative_units_update_timestamp
BEFORE UPDATE ON administrative_units
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_registration_sections_update_timestamp
BEFORE UPDATE ON registration_sections
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_land_use_types_update_timestamp
BEFORE UPDATE ON land_use_types
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger for the newly unified 'parcels' table (formerly spatial_units)
CREATE TRIGGER trg_parcels_update_timestamp
BEFORE UPDATE ON parcels
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_rrrs_update_timestamp
BEFORE UPDATE ON rrrs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_source_documents_update_timestamp
BEFORE UPDATE ON source_documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_surveys_update_timestamp
BEFORE UPDATE ON surveys
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_applications_update_timestamp
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_transactions_update_timestamp
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_valuations_update_timestamp
BEFORE UPDATE ON valuations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
