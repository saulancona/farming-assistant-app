-- Cleanup Script: Delete all seeded default data
-- This will remove all data from fields, expenses, and tasks tables
-- Run this ONCE to clean up duplicate seeded data between accounts

-- Delete all fields
DELETE FROM fields;

-- Delete all expenses
DELETE FROM expenses;

-- Delete all tasks
DELETE FROM tasks;

-- Note: This leaves users with a clean slate
-- Each user can now add their own unique data
