-- V7: quotes (save-quote). A quote is one priced visit saved to a client; quote_item is one tattoo
-- within it. Quote is a synced entity (device uuid, soft delete, optimistic version) written through
-- VersionedWrites; the server stores the authoritative prices it recomputed from the Settings row
-- (computed_price_agorot, final_price_agorot) and the per-item/visit minutes, so stored numbers never
-- change when the rates change later. Money is integer agorot. No hard deletes on quote.
-- quote_item.sketch_id is nullable with no foreign key until the Sketch epic adds the sketch table.

create table quote (
    id                      uuid        primary key,
    client_id               uuid        not null references client (id),
    title                   text        not null check (char_length(title) <= 200),
    notes                   text        check (char_length(notes) <= 2000),
    discount_type           text        not null check (discount_type in ('none', 'percent', 'amount')),
    -- A percent (0-100) when discount_type = 'percent', else agorot; 0 when 'none'.
    discount_value          bigint      not null default 0 check (discount_value >= 0),
    extra_needles           integer     not null default 0 check (extra_needles >= 0),
    -- A manual final price in agorot that overrides the computed one; null when not set.
    price_override_agorot   bigint      check (price_override_agorot >= 0),
    -- Server-recomputed from the Settings row; never trusted from the client.
    computed_price_agorot   bigint      not null check (computed_price_agorot >= 0),
    final_price_agorot      bigint      not null check (final_price_agorot >= 0),
    estimated_minutes_total integer     not null check (estimated_minutes_total >= 0),
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    deleted_at              timestamptz,
    version                 bigint      not null default 0
);

create index quote_client on quote (client_id);

create table quote_item (
    id                         uuid    primary key,
    quote_id                   uuid    not null references quote (id),
    position                   integer not null check (position >= 0),
    description                text    not null check (char_length(description) <= 200),
    size                       text    not null check (size in ('XS', 'S', 'M', 'L', 'XL')),
    detail_level               text    not null check (detail_level in ('simple', 'medium', 'high')),
    shading                    text    not null check (shading in ('none', 'light', 'full')),
    body_placement             text    not null,
    design_source              text    not null
                                   check (design_source in ('artist_sketch', 'client_reference', 'custom_design')),
    -- Nullable, no FK until the Sketch epic adds the sketch table.
    sketch_id                  uuid,
    -- Hours of custom design work; only custom_design items add a design fee. Null otherwise.
    design_hours               numeric(6, 2) check (design_hours >= 0),
    -- Server-recomputed estimate; the override, when set, is what the visit minutes use.
    estimated_minutes          integer not null check (estimated_minutes >= 0),
    estimated_minutes_override integer check (estimated_minutes_override >= 0)
);

create index quote_item_quote on quote_item (quote_id, position);
