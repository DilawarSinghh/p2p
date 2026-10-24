-- ============================================================================
-- Predictive Circular-Resource Grid - Core schema (P2P 2026)
-- 7 relational tables matching the provided datasets exactly.
-- ============================================================================

-- Table 1: buildings (8 rows)
create table if not exists public.buildings (
  building_id       varchar primary key,
  building_name     varchar not null,
  building_type     varchar not null,
  floors            int not null,
  area_sqm          int not null,
  design_capacity   int not null,
  has_solar         int not null,
  solar_capacity_kw int not null,
  year_built        int not null,
  has_composter     int not null
);

-- Table 2: calendar (120 rows)
create table if not exists public.calendar (
  date         date primary key,
  day_of_week  varchar not null,
  day_type     varchar not null,
  event        text,
  avg_temp_c   float not null,
  rainfall_mm  float not null,
  humidity_pct int not null
);

-- Table 3: daily_summary (960 rows)
create table if not exists public.daily_summary (
  date                 date not null,
  building_id          varchar not null references public.buildings(building_id),
  occupancy_avg        float,
  electricity_kwh      float,
  water_litres         float,
  solar_generation_kwh float,
  wet_organic_kg       float,
  dry_recyclable_kg    float,
  ewaste_kg            float,
  hazardous_kg         float,
  composted_kg         float,
  recycled_kg          float,
  contamination_pct    float,
  landfill_kg          float,
  primary key (date, building_id)
);

-- Table 4: hourly_streams (23,192 rows)
create table if not exists public.hourly_streams (
  id                     bigserial primary key,
  timestamp              timestamp not null,
  received_at            timestamp not null,
  building_id            varchar not null references public.buildings(building_id),
  electricity_kwh        float,
  water_litres           float,
  solar_generation_kwh   float,
  footfall               float,
  ingestion_lag_minutes  float,
  is_buffered            int default 0,
  is_duplicate           int default 0
);
create index if not exists idx_hourly_building_ts
  on public.hourly_streams (building_id, timestamp);

-- Table 5: manual_logs (415 rows)
create table if not exists public.manual_logs (
  log_id                 varchar primary key,
  logged_at              timestamp not null,
  logger_role            varchar not null,
  building               varchar,
  stream                 varchar not null,
  value                  float,
  unit                   varchar,
  note                   text,
  normalized_building_id varchar references public.buildings(building_id),
  normalized_value       float,
  normalized_unit        varchar
);

-- Table 6: waste_events_train (6,314 rows)
create table if not exists public.waste_events_train (
  event_id          varchar primary key,
  timestamp         timestamp not null,
  building_id       varchar not null references public.buildings(building_id),
  bin_id            varchar not null,
  weight_g          float,
  moisture_pct      float,
  metal_signal      float,
  transparency      float,
  acoustic_hardness float,
  category          varchar not null
);

-- Table 7: waste_events_test (1,601 rows)
create table if not exists public.waste_events_test (
  event_id          varchar primary key,
  timestamp         timestamp not null,
  building_id       varchar not null references public.buildings(building_id),
  bin_id            varchar not null,
  weight_g          float,
  moisture_pct      float,
  metal_signal      float,
  transparency      float,
  acoustic_hardness float,
  predicted_class   varchar,
  confidence        float
);

-- Green credits ledger (gamification loop writes here).
create table if not exists public.green_credits (
  id          bigserial primary key,
  building_id varchar not null references public.buildings(building_id),
  credits     float not null default 0,
  reason      text,
  awarded_at  timestamptz not null default now()
);

-- App user profiles with RBAC role (linked to auth.users).
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  role        varchar not null default 'student'
              check (role in ('admin','warden','technician','student')),
  created_at  timestamptz not null default now()
);
