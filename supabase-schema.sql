-- Run this once in the Supabase SQL Editor for your project.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  url text not null,
  title text,
  section text,
  color text,
  size text,
  price text,
  image_url text,
  image_width int,
  image_height int,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create unique index if not exists projects_share_token_idx on projects(share_token);
create index if not exists links_project_id_idx on links(project_id);
