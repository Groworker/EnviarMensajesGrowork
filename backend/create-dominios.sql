-- ============================================
-- Migration: CreateDominios
-- ============================================

-- Create dominios table
CREATE TABLE IF NOT EXISTS dominios (
    id SERIAL PRIMARY KEY,
    dominio VARCHAR(255) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    prioridad INT NOT NULL DEFAULT 1,
    usuarios_actuales INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_dominios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dominios_updated_at ON dominios;
CREATE TRIGGER trigger_dominios_updated_at
    BEFORE UPDATE ON dominios
    FOR EACH ROW
    EXECUTE FUNCTION update_dominios_updated_at();

-- Migrate existing data from n8n (personalwork.es with priority 3)
INSERT INTO dominios (dominio, activo, prioridad, usuarios_actuales)
VALUES ('personalwork.es', true, 3, 0)
ON CONFLICT (dominio) DO NOTHING;

-- Verification
SELECT * FROM dominios;
