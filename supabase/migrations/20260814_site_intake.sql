-- skyball.us interim site intake — mirrors skyball-backend 0026_site_intake.sql.
-- Deltas vs 0026 (and only these): countries FK -> CHECK; set_updated_at() created here.
--
-- Applied to the website project (cnhxpeadrylpssryywsd) by hand on 2026-08-14.
-- Committed here as the tracked record and so scripts/local-db/setup.sh can
-- reproduce it locally. Never run against prod by an agent.

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at := now(); return new; end;
$$;

create table public.notification_signups (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null,
  phone              text,
  country_code       text not null
                     constraint notification_signups_country_code_check
                     check (country_code ~ '^[A-Z]{2}$'),   -- 0026: FK -> countries(code)
  locality           text not null,
  notification_types text[] not null
                     constraint notification_signups_types_check
                     check (
                       cardinality(notification_types) >= 1
                       and notification_types <@ array['open_play','tournaments','pop_ups','special_events','newsletter']::text[]
                     ),
  source             text not null
                     constraint notification_signups_source_check
                     check (source in ('notification_form', 'newsletter_form')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index notification_signups_email_country_key
  on public.notification_signups (lower(email), country_code);
create index notification_signups_country_code_idx
  on public.notification_signups (country_code);
create index notification_signups_types_idx
  on public.notification_signups using gin (notification_types);

create trigger notification_signups_set_updated_at
  before update on public.notification_signups
  for each row execute function public.set_updated_at();

create table public.site_inquiries (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null
               constraint site_inquiries_kind_check
               check (kind in ('school', 'host', 'where_to_play', 'general')),
  name         text not null,
  email        text,
  phone        text,
  message      text,
  locality     text,
  country_code text not null
               constraint site_inquiries_country_code_check
               check (country_code ~ '^[A-Z]{2}$'),          -- 0026: FK -> countries(code)
  details      jsonb,
  created_at   timestamptz not null default now(),
  constraint site_inquiries_contact_check
    check (email is not null or phone is not null)
);

create index site_inquiries_kind_created_idx on public.site_inquiries (kind, created_at desc);
create index site_inquiries_country_code_idx on public.site_inquiries (country_code);

create function public.upsert_notification_signup(
  p_name text, p_email text, p_country_code text, p_locality text,
  p_types text[], p_source text, p_phone text default null
) returns public.notification_signups
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.notification_signups%rowtype;
begin
  if p_name is null or btrim(p_name) = ''
     or p_email is null or btrim(p_email) = ''
     or p_locality is null or btrim(p_locality) = '' then
    raise exception 'upsert_notification_signup: name, email, and locality are required';
  end if;

  insert into public.notification_signups
    (name, email, phone, country_code, locality, notification_types, source)
  values
    (btrim(p_name), btrim(p_email), nullif(btrim(p_phone), ''), p_country_code,
     btrim(p_locality), p_types, p_source)
  on conflict (lower(email), country_code) do update
    set name               = excluded.name,
        email              = excluded.email,
        phone              = coalesce(excluded.phone, notification_signups.phone),
        locality           = excluded.locality,
        source             = excluded.source,
        notification_types = (
          select array_agg(distinct t)
          from unnest(notification_signups.notification_types || excluded.notification_types) as t
        )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_notification_signup(text, text, text, text, text[], text, text) from public;
grant execute on function public.upsert_notification_signup(text, text, text, text, text[], text, text) to service_role;

-- PII: deny-all, service-role only (D6). Explicit revokes because this legacy
-- project auto-exposes new tables to the Data API.
revoke all on public.notification_signups, public.site_inquiries from anon, authenticated;
grant all on public.notification_signups, public.site_inquiries to service_role;
alter table public.notification_signups enable row level security;
alter table public.site_inquiries       enable row level security;
-- deliberately no policies
