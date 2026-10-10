-- Notes for the client: one overall note per project, one note per item.
alter table projects add column if not exists notes text;
alter table links add column if not exists notes text;
