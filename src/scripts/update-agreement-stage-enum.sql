-- Update agreement_stage_history enum to include all approval stages
-- This script must be run manually in PostgreSQL

-- Add missing enum values to agreement_stage_history_fromstage_enum
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Legal Review';
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Delivery Review';
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Procurement Review';
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Finance Review';
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Client Review';
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'CEO Approval';
ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'ULCCS Approval';

-- Add missing enum values to agreement_stage_history_tostage_enum
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Legal Review';
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Delivery Review';
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Procurement Review';
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Finance Review';
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Client Review';
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'CEO Approval';
ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'ULCCS Approval';

-- Verify the updated enums
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'agreement_stage_history_fromstage_enum'::regtype ORDER BY enumsortorder;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'agreement_stage_history_tostage_enum'::regtype ORDER BY enumsortorder;
