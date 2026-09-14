-- Run this once in the Supabase SQL Editor for your project.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  url text not null,
  title text,
  image_url text,
  image_width int,
  image_height int,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists links_project_id_idx on links(project_id);
