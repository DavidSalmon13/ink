-- V2: the single studio owner and their per-device login sessions (owner-auth-lock).
-- No hard deletes: a revoked session keeps its row with deleted_at set.

create table owner (
    id            uuid        primary key default gen_random_uuid(),
    email         text        not null,
    password_hash text        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    deleted_at    timestamptz
);

-- One live owner per email, compared case-insensitively.
create unique index owner_email_unique on owner (lower(email)) where deleted_at is null;

create table owner_session (
    id           uuid        primary key default gen_random_uuid(),
    owner_id     uuid        not null references owner (id),
    -- Lowercase hex SHA-256 of the opaque token. The raw token is never stored.
    token_hash   text        not null unique check (length(token_hash) = 64),
    device_name  text        not null,
    platform     text        not null,
    created_at   timestamptz not null default now(),
    -- Sliding expiry: a session is active while last_used_at > now() - 90 days.
    last_used_at timestamptz not null default now(),
    -- Set when the session is revoked (logout, revoke, password change).
    deleted_at   timestamptz
);

create index owner_session_owner_id on owner_session (owner_id);
