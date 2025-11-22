-- Manual migration to add rich metadata fields to IngestedItem table
-- Run this on your Supabase database if Prisma migrations fail

-- Add new columns to IngestedItem table
ALTER TABLE "IngestedItem"
ADD COLUMN IF NOT EXISTS "category" TEXT,
ADD COLUMN IF NOT EXISTS "section" TEXT,
ADD COLUMN IF NOT EXISTS "authorNote" TEXT;

-- Add index for category field to improve query performance
CREATE INDEX IF NOT EXISTS "IngestedItem_category_idx" ON "IngestedItem"("category");

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'IngestedItem'
AND column_name IN ('category', 'section', 'authorNote');
