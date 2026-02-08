-- ============================================
-- Migration: Add max_usuarios column to dominios
-- ============================================

ALTER TABLE dominios ADD COLUMN IF NOT EXISTS max_usuarios INT DEFAULT 3;

-- Verification
SELECT id, dominio, activo, prioridad, max_usuarios FROM dominios;
