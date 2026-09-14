-- Run this once in the Supabase SQL Editor to add the new features
-- (shareable links, color/size fields) to your existing tables.

alter table projects add column if not exists share_token uuid not null default gen_random_uuid();
create unique index if not exists projects_share_token_idx on projects(share_token);

alter table links add column if not exists color text;
alter table links add column if not exists size text;
