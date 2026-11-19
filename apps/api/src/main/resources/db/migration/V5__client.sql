-- V5: clients (client-list). The display fields are stored as entered; search_name, phone_digits and
-- instagram_norm hold the ClientSearch-normalized forms, written on every save, so search is a plain
-- substring match (AC5). No extensions; no hard deletes.

create table client (
    id             uuid        primary key,
    name           text        not null check (char_length(name) between 1 and 100),
    phone          text,
    email          text,
    instagram      text,
    notes          text        check (char_length(notes) <= 2000),
    -- Lowercase, no niqqud, Hebrew final letters mapped, spaces collapsed.
    search_name    text        not null,
    -- Digits only, a leading 972 replaced by 0; null without a phone.
    phone_digits   text,
    -- Lowercase, without a leading @; null without a handle.
    instagram_norm text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    deleted_at     timestamptz,
    version        bigint      not null default 0
);

create index client_search_name on client (search_name);
create index client_phone_digits on client (phone_digits);
create index client_instagram_norm on client (instagram_norm);
