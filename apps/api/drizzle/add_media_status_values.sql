-- Migration: Add missing status values to media_status enum
-- Run each ALTER statement separately in Supabase SQL Editor
-- DO NOT run them all at once in a single transaction

ALTER TYPE media_status ADD VALUE IF NOT EXISTS 'ended';
