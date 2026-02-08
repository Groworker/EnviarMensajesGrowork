-- Migration: Add notifications table, deletion_logs table, and new client fields
-- Created: 2026-02-03

-- Create notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  severity VARCHAR(20) DEFAULT 'info',
  related_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  related_workflow VARCHAR(100),
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on related_client_id for faster  queries
CREATE INDEX idx_notifications_client_id ON notifications(related_client_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Create deletion_logs table
CREATE TABLE deletion_logs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  deletion_reason TEXT,
  was_automatic BOOLEAN DEFAULT FALSE,
  days_since_closed INTEGER,
  days_since_last_email INTEGER,
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP DEFAULT NOW()
);

-- Create index for reporting and searching
CREATE INDEX idx_deletion_logs_deleted_at ON deletion_logs(deleted_at DESC);
CREATE INDEX idx_deletion_logs_was_automatic ON deletion_logs(was_automatic);

-- Add new fields to clients table
ALTER TABLE clients 
ADD COLUMN estado_changed_at TIMESTAMP,
ADD COLUMN last_email_sent_at TIMESTAMP,
ADD COLUMN discord_channel_id VARCHAR(100);

-- Create indexes for auto-deletion queries
CREATE INDEX idx_clients_estado_changed_at ON clients(estado_changed_at);
CREATE INDEX idx_clients_last_email_sent_at ON clients(last_email_sent_at);

-- Comments for documentation
COMMENT ON TABLE notifications IS 'System and workflow notifications for the admin dashboard';
COMMENT ON TABLE deletion_logs IS 'Audit log for client deletions (both automatic and manual)';
COMMENT ON COLUMN clients.estado_changed_at IS 'Timestamp when the estado field was last changed (for auto-deletion eligibility)';
COMMENT ON COLUMN clients.last_email_sent_at IS 'Timestamp of the last email sent to this client (for auto-deletion eligibility)';
COMMENT ON COLUMN clients.discord_channel_id IS 'Discord channel ID associated with this client from n8n workflows';
