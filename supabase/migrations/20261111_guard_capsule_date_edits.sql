-- PROPOSED: apply only after review, together with the Eastern-date policies.
-- The API verifies the owner. Existing RLS grants no direct client UPDATE.
-- This guard also covers privileged writes, concurrent cron claims, and a save
-- that waits for a row lock across Eastern midnight. No data is backfilled.
create or replace function public.guard_capsule_date_edits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  checked_at timestamptz;
  eastern_today date;
begin
  if new.submission_deadline is not distinct from old.submission_deadline
     and new.unlock_date is not distinct from old.unlock_date then
    return new;
  end if;

  -- clock_timestamp, rather than transaction-start time, handles lock waits.
  checked_at := clock_timestamp();
  eastern_today := (checked_at at time zone 'America/New_York')::date;
  if old.unlock_date <= eastern_today then
    raise exception 'Capsule dates cannot change after unlock.' using errcode = 'P0001';
  end if;
  if old.capsule_unlock_email_sent_at is not null
     or old.unlock_email_sent_at is not null
     or old.recipient_email_sent_at is not null
     or old.owner_gift_confirmation_sent_at is not null
     or new.capsule_unlock_email_sent_at is distinct from old.capsule_unlock_email_sent_at
     or new.unlock_email_sent_at is distinct from old.unlock_email_sent_at
     or new.recipient_email_sent_at is distinct from old.recipient_email_sent_at
     or new.owner_gift_confirmation_sent_at is distinct from old.owner_gift_confirmation_sent_at then
    raise exception 'Capsule dates cannot change after an unlock notification or gift confirmation.' using errcode = 'P0001';
  end if;
  if old.unlock_email_attempted_at >= checked_at - interval '15 minutes' then
    raise exception 'An email attempt is in progress.' using errcode = 'P0001';
  end if;
  if new.unlock_date <= eastern_today then
    raise exception 'The new unlock date must be after today in Eastern time.' using errcode = 'P0001';
  end if;
  -- The existing capsules_deadline_before_unlock CHECK remains authoritative.
  return new;
end;
$$;

revoke all on function public.guard_capsule_date_edits() from public, anon, authenticated;

drop trigger if exists guard_capsule_date_edits on public.capsules;
create trigger guard_capsule_date_edits
  before update of submission_deadline, unlock_date on public.capsules
  for each row execute function public.guard_capsule_date_edits();
