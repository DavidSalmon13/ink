-- V3: the studio's single Settings row (api-conventions), seeded with the data-model.md defaults.
-- Money is integer agorot (≥ 0). estimate_tables and calibration_points are editable JSON.

create table settings (
    id                         uuid        primary key default gen_random_uuid(),
    -- Exactly one row: the unique index on a constant-true column rejects a second insert.
    singleton                  boolean     not null default true check (singleton),
    minimum_price_agorot       integer     not null check (minimum_price_agorot >= 0),
    minimum_minutes            integer     not null check (minimum_minutes >= 0),
    hourly_rate_agorot         integer     not null check (hourly_rate_agorot >= 0),
    design_hourly_rate_agorot  integer     not null check (design_hourly_rate_agorot >= 0),
    needle_opening_cost_agorot integer     not null check (needle_opening_cost_agorot >= 0),
    extra_needle_cost_agorot   integer     not null check (extra_needle_cost_agorot >= 0),
    estimate_tables            jsonb       not null,
    calibration_points         jsonb       not null,
    auto_lock_seconds          integer     not null check (auto_lock_seconds >= 0),
    timezone                   text        not null,
    created_at                 timestamptz not null default now(),
    updated_at                 timestamptz not null default now(),
    deleted_at                 timestamptz,
    version                    bigint      not null default 0
);

create unique index settings_singleton on settings (singleton);

insert into settings (
    minimum_price_agorot, minimum_minutes, hourly_rate_agorot, design_hourly_rate_agorot,
    needle_opening_cost_agorot, extra_needle_cost_agorot, estimate_tables, calibration_points,
    auto_lock_seconds, timezone
) values (
    35000, 30, 33000, 20000,
    7000, 5000,
    -- Time estimate: minutes = roundUpTo5(max(15, sizeBase × detail × shading × placement)).
    '{
       "sizeBaseMinutes": {"XS": 20, "S": 40, "M": 75, "L": 120, "XL": 180},
       "detail":          {"simple": 0.8, "medium": 1.0, "high": 1.35},
       "shading":         {"none": 1.0, "light": 1.2, "full": 1.45},
       "placement":       {"easy": 1.0, "medium": 1.1, "hard": 1.25}
     }',
    '[
       {"label": "arm", "minutes": 180},
       {"label": "back", "minutes": 180},
       {"label": "cherry", "minutes": 80},
       {"label": "figure with book", "minutes": 120},
       {"label": "rose", "minutes": 60},
       {"label": "deer", "minutes": 120}
     ]',
    0, 'Asia/Jerusalem'
);
