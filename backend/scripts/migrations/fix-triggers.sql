-- ============================================
-- Fix triggers for updated_at / updatedAt
-- ============================================

-- Drop existing function with CASCADE (removes all dependent triggers)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create separate function for camelCase (updatedAt)
CREATE OR REPLACE FUNCTION update_updatedAt_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create separate function for snake_case (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for client_workflow_states (uses updatedAt in camelCase)
DROP TRIGGER IF EXISTS update_client_workflow_states_updated_at ON client_workflow_states;
DROP TRIGGER IF EXISTS update_client_workflow_states_updatedAt ON client_workflow_states;
CREATE TRIGGER update_client_workflow_states_updatedAt
    BEFORE UPDATE ON client_workflow_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedAt_column();

-- Create trigger for cv_creators (uses updated_at in snake_case)
DROP TRIGGER IF EXISTS update_cv_creators_updated_at ON cv_creators;
CREATE TRIGGER update_cv_creators_updated_at
    BEFORE UPDATE ON cv_creators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate trigger for clients table (uses updated_at in snake_case)
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify triggers were created
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
    'update_client_workflow_states_updatedAt',
    'update_cv_creators_updated_at',
    'update_clients_updated_at'
)
ORDER BY event_object_table;
