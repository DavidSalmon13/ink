-- V4: attachment metadata (api-conventions). The bytes live in the private S3-compatible bucket at
-- storage_key; the app reaches them only through 15-minute presigned URLs. No hard deletes.

create table attachment (
    id          uuid        primary key,
    kind        text        not null check (kind in ('tattoo_photo', 'sketch')),
    storage_key text        not null unique,
    mime_type   text        not null check (mime_type in ('image/jpeg', 'image/png', 'image/heic', 'image/webp')),
    -- Up to 15 MB (15 × 1024 × 1024 bytes).
    size_bytes  bigint      not null check (size_bytes > 0 and size_bytes <= 15728640),
    width       integer     check (width > 0),
    height      integer     check (height > 0),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    deleted_at  timestamptz,
    version     bigint      not null default 0
);
