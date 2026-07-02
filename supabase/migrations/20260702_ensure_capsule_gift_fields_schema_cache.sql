alter table if exists capsules
  add column if not exists is_gift boolean not null default false;

alter table if exists capsules
  add column if not exists recipient_name text;

alter table if exists capsules
  add column if not exists recipient_email text;

alter table if exists capsules
  add column if not exists recipient_note text;

alter table if exists capsules
  add column if not exists recipient_email_sent_at timestamptz;

alter table if exists capsules
  add column if not exists owner_gift_confirmation_sent_at timestamptz;

create index if not exists capsules_gift_recipient_email_due_idx
  on capsules(unlock_date, recipient_email_sent_at)
  where is_gift = true
    and recipient_email is not null
    and recipient_email_sent_at is null;

create index if not exists capsules_gift_owner_confirmation_due_idx
  on capsules(unlock_date, owner_gift_confirmation_sent_at)
  where is_gift = true
    and owner_gift_confirmation_sent_at is null;

notify pgrst, 'reload schema';
