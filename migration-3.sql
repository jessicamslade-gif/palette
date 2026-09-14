-- Run this once in the Supabase SQL Editor for the sections/price update.

alter table links add column if not exists section text;
alter table links add column if not exists price text;
