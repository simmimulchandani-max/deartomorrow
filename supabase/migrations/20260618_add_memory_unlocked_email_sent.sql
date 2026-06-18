alter table if exists memories
  add column if not exists unlocked_email_sent boolean not null default false;

alter table if exists memories
  add column if not exists unlocked_email_sent_at timestamptz;

update memories
set unlocked_email_sent = true,
    unlocked_email_sent_at = coalesce(unlocked_email_sent_at, unlock_email_sent_at)
where unlock_email_sent_at is not null
  and unlocked_email_sent = false;

create index if not exists memories_unlocked_email_due_idx
  on memories(unlock_date, unlocked_email_sent)
  where unlocked_email_sent = false;
