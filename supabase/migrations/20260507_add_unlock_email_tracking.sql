alter table if exists memories
  add column if not exists unlock_email_sent_at timestamptz;
alter table if exists memories
  add column if not exists unlock_email_attempted_at timestamptz;
alter table if exists memories
  add column if not exists unlock_email_last_error text;

alter table if exists capsules
  add column if not exists unlock_email_sent_at timestamptz;
alter table if exists capsules
  add column if not exists unlock_email_attempted_at timestamptz;
alter table if exists capsules
  add column if not exists unlock_email_last_error text;

create index if not exists memories_unlock_email_due_idx
  on memories(unlock_date, unlock_email_sent_at)
  where unlock_email_sent_at is null;

create index if not exists capsules_unlock_email_due_idx
  on capsules(unlock_date, unlock_email_sent_at)
  where unlock_email_sent_at is null;
