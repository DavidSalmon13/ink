-- V6: marketing consent (marketing-consent AC1). consent_event is the append-only audit trail;
-- client.marketing_consent / consent_updated_at cache the latest event. unsubscribe_token is the
-- per-client secret for the Phase 2 unsubscribe link and never leaves the API. No extensions:
-- gen_random_uuid() is built into PostgreSQL 13+.

create table consent_event (
    id        uuid        primary key,
    client_id uuid        not null references client (id),
    action    text        not null check (action in ('granted', 'revoked')),
    source    text        not null check (source in ('app', 'unsubscribe_link')),
    at        timestamptz not null
);

create index consent_event_client_at on consent_event (client_id, at);

alter table client
    add column marketing_consent  text not null default 'none'
        check (marketing_consent in ('none', 'granted', 'revoked')),
    add column consent_updated_at timestamptz,
    add column unsubscribe_token  text;

-- Two random UUIDs without dashes: 64 hex characters (244 random bits) per existing client.
update client
   set unsubscribe_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

alter table client
    alter column unsubscribe_token set not null,
    add constraint client_unsubscribe_token_key unique (unsubscribe_token);
