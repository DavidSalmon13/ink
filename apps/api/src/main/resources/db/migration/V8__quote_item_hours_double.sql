-- design_hours is a Double in the JPA entity and the pricing calculator does double arithmetic with it,
-- so the column must be double precision; V7 created it as numeric(6, 2), which fails schema validation.
-- The check constraint (design_hours >= 0) carries over the column type change automatically.
alter table quote_item
    alter column design_hours type double precision;
