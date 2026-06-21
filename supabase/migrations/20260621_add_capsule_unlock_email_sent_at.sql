alter table if exists capsules
  add column if not exists capsule_unlock_email_sent_at timestamptz;

update capsules
set capsule_unlock_email_sent_at = unlock_email_sent_at
where capsule_unlock_email_sent_at is null
  and unlock_email_sent_at is not null;

create index if not exists capsules_capsule_unlock_email_due_idx
  on capsules(unlock_date, capsule_unlock_email_sent_at)
  where capsule_unlock_email_sent_at is null;
