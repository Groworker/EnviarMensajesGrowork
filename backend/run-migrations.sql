-- ============================================
-- Migration: CreateClientWorkflowStates
-- ============================================

-- Create enum types
DO $$ BEGIN
    CREATE TYPE workflow_type_enum AS ENUM ('WKF-1', 'WKF-1.1', 'WKF-1.2', 'WKF-1.3', 'WKF-4');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status_enum AS ENUM ('PENDING', 'OK', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create client_workflow_states table
CREATE TABLE IF NOT EXISTS client_workflow_states (
    id SERIAL PRIMARY KEY,
    "clientId" INTEGER NOT NULL,
    "workflowType" workflow_type_enum NOT NULL,
    status workflow_status_enum NOT NULL DEFAULT 'PENDING',
    "executionUrl" VARCHAR,
    "executedAt" TIMESTAMP,
    "errorMessage" TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_client_workflow_states_clientId"
    ON client_workflow_states ("clientId");

CREATE INDEX IF NOT EXISTS "IDX_client_workflow_states_workflowType"
    ON client_workflow_states ("workflowType");

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_client_workflow_states_clientId_workflowType"
    ON client_workflow_states ("clientId", "workflowType");

-- Create foreign key
DO $$ BEGIN
    ALTER TABLE client_workflow_states
        ADD CONSTRAINT "FK_client_workflow_states_clientId"
        FOREIGN KEY ("clientId")
        REFERENCES clients(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Seed initial PENDING states for all existing clients
INSERT INTO client_workflow_states ("clientId", "workflowType", status)
SELECT
    c.id,
    workflow_type::workflow_type_enum,
    'PENDING'::workflow_status_enum
FROM clients c
CROSS JOIN (
    SELECT 'WKF-1' as workflow_type
    UNION ALL SELECT 'WKF-1.1'
    UNION ALL SELECT 'WKF-1.2'
    UNION ALL SELECT 'WKF-1.3'
    UNION ALL SELECT 'WKF-4'
) workflows
ON CONFLICT ("clientId", "workflowType") DO NOTHING;

-- ============================================
-- Migration: CreateCvCreators
-- ============================================

-- Create cv_creators table
CREATE TABLE IF NOT EXISTS cv_creators (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    ingles BOOLEAN NOT NULL DEFAULT false,
    aleman BOOLEAN NOT NULL DEFAULT false,
    frances BOOLEAN NOT NULL DEFAULT false,
    italiano BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    notas TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_cv_creators_nombre"
    ON cv_creators (nombre);

CREATE INDEX IF NOT EXISTS "IDX_cv_creators_email"
    ON cv_creators (email);

-- Seed initial data (ejemplo)
INSERT INTO cv_creators (nombre, email, ingles, aleman, frances, italiano, activo)
VALUES
    ('Creador Ejemplo', 'creador@example.com', true, true, false, false, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Add updated_at trigger for both tables
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for client_workflow_states
DROP TRIGGER IF EXISTS update_client_workflow_states_updated_at ON client_workflow_states;
CREATE TRIGGER update_client_workflow_states_updated_at
    BEFORE UPDATE ON client_workflow_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cv_creators
DROP TRIGGER IF EXISTS update_cv_creators_updated_at ON cv_creators;
CREATE TRIGGER update_cv_creators_updated_at
    BEFORE UPDATE ON cv_creators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Verification queries
-- ============================================

-- Check if tables were created
SELECT 'client_workflow_states' as table_name, COUNT(*) as row_count FROM client_workflow_states
UNION ALL
SELECT 'cv_creators' as table_name, COUNT(*) as row_count FROM cv_creators;

-- Show all workflow states
SELECT * FROM client_workflow_states ORDER BY "clientId", "workflowType";

-- Show all CV creators
SELECT * FROM cv_creators;
