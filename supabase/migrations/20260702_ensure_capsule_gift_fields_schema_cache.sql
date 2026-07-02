create extension if not exists pgcrypto;

create or replace function public.jsonb_is_text_array(value jsonb)
returns boolean
language sql
immutable
as $$
  select value is not null
    and jsonb_typeof(value) = 'array'
    and coalesce(
      (
        select bool_and(jsonb_typeof(item) = 'string')
        from jsonb_array_elements(value) as item
      ),
      true
    );
$$;

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  unlock_date date not null,
  media_url text,
  media_urls jsonb not null default '[]'::jsonb,
  password_hash text,
  created_at timestamptz not null default now(),
  unlock_email_sent_at timestamptz,
  unlock_email_attempted_at timestamptz,
  unlock_email_last_error text,
  unlocked_email_sent boolean not null default false,
  unlocked_email_sent_at timestamptz
);

create table if not exists capsules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  title text not null,
  description text,
  submission_deadline date not null,
  unlock_date date not null,
  share_slug text not null unique,
  created_at timestamptz not null default now(),
  unlock_email_sent_at timestamptz,
  unlock_email_attempted_at timestamptz,
  unlock_email_last_error text,
  capsule_unlock_email_sent_at timestamptz,
  is_gift boolean not null default false,
  recipient_name text,
  recipient_email text,
  recipient_note text,
  recipient_email_sent_at timestamptz,
  owner_gift_confirmation_sent_at timestamptz,
  constraint capsules_deadline_before_unlock check (submission_deadline < unlock_date)
);

create table if not exists capsule_memories (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references capsules(id) on delete cascade,
  contributor_name text not null,
  title text not null,
  message text not null,
  media_url text,
  media_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  title text not null,
  description text not null,
  rating text,
  screenshot_url text,
  created_at timestamptz not null default now()
);

alter table if exists memories
  add column if not exists id uuid default gen_random_uuid();
alter table if exists memories
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists memories
  add column if not exists title text;
alter table if exists memories
  add column if not exists message text;
alter table if exists memories
  add column if not exists unlock_date date;
alter table if exists memories
  add column if not exists media_url text;
alter table if exists memories
  add column if not exists media_urls jsonb not null default '[]'::jsonb;
alter table if exists memories
  add column if not exists password_hash text;
alter table if exists memories
  add column if not exists created_at timestamptz not null default now();
alter table if exists memories
  add column if not exists unlock_email_sent_at timestamptz;
alter table if exists memories
  add column if not exists unlock_email_attempted_at timestamptz;
alter table if exists memories
  add column if not exists unlock_email_last_error text;
alter table if exists memories
  add column if not exists unlocked_email_sent boolean not null default false;
alter table if exists memories
  add column if not exists unlocked_email_sent_at timestamptz;

update memories
set media_urls = '[]'::jsonb
where media_urls is null;

alter table if exists capsules
  add column if not exists id uuid default gen_random_uuid();
alter table if exists capsules
  add column if not exists owner_user_id uuid;
alter table if exists capsules
  add column if not exists title text;
alter table if exists capsules
  add column if not exists description text;
alter table if exists capsules
  add column if not exists submission_deadline date;
alter table if exists capsules
  add column if not exists unlock_date date;
alter table if exists capsules
  add column if not exists share_slug text;
alter table if exists capsules
  add column if not exists created_at timestamptz not null default now();
alter table if exists capsules
  add column if not exists unlock_email_sent_at timestamptz;
alter table if exists capsules
  add column if not exists unlock_email_attempted_at timestamptz;
alter table if exists capsules
  add column if not exists unlock_email_last_error text;
alter table if exists capsules
  add column if not exists capsule_unlock_email_sent_at timestamptz;
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

update capsules
set is_gift = false
where is_gift is null;

alter table if exists capsule_memories
  add column if not exists id uuid default gen_random_uuid();
alter table if exists capsule_memories
  add column if not exists capsule_id uuid references capsules(id) on delete cascade;
alter table if exists capsule_memories
  add column if not exists contributor_name text;
alter table if exists capsule_memories
  add column if not exists title text;
alter table if exists capsule_memories
  add column if not exists message text;
alter table if exists capsule_memories
  add column if not exists media_url text;
alter table if exists capsule_memories
  add column if not exists media_urls jsonb not null default '[]'::jsonb;
alter table if exists capsule_memories
  add column if not exists created_at timestamptz not null default now();

update capsule_memories
set media_urls = '[]'::jsonb
where media_urls is null;

alter table if exists feedback
  add column if not exists id uuid default gen_random_uuid();
alter table if exists feedback
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table if exists feedback
  add column if not exists email text;
alter table if exists feedback
  add column if not exists title text;
alter table if exists feedback
  add column if not exists description text;
alter table if exists feedback
  add column if not exists rating text;
alter table if exists feedback
  add column if not exists screenshot_url text;
alter table if exists feedback
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if to_regclass('public.memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'memories_title_length_check'
        and conrelid = 'public.memories'::regclass
    )
  then
    alter table memories
      add constraint memories_title_length_check
      check (title is null or char_length(btrim(title)) between 1 and 140) not valid;
  end if;

  if to_regclass('public.memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'memories_message_length_check'
        and conrelid = 'public.memories'::regclass
    )
  then
    alter table memories
      add constraint memories_message_length_check
      check (message is null or char_length(btrim(message)) between 1 and 4000) not valid;
  end if;

  if to_regclass('public.memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'memories_password_hash_length_check'
        and conrelid = 'public.memories'::regclass
    )
  then
    alter table memories
      add constraint memories_password_hash_length_check
      check (password_hash is null or char_length(password_hash) <= 255) not valid;
  end if;

  if to_regclass('public.memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'memories_media_urls_string_array_check'
        and conrelid = 'public.memories'::regclass
    )
  then
    alter table memories
      add constraint memories_media_urls_string_array_check
      check (media_urls is null or public.jsonb_is_text_array(media_urls)) not valid;
  end if;

  if to_regclass('public.capsules') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsules_deadline_before_unlock'
        and conrelid = 'public.capsules'::regclass
    )
  then
    alter table capsules
      add constraint capsules_deadline_before_unlock
      check (
        submission_deadline is null
        or unlock_date is null
        or submission_deadline < unlock_date
      ) not valid;
  end if;

  if to_regclass('public.capsules') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsules_title_length_check'
        and conrelid = 'public.capsules'::regclass
    )
  then
    alter table capsules
      add constraint capsules_title_length_check
      check (title is null or char_length(btrim(title)) between 1 and 140) not valid;
  end if;

  if to_regclass('public.capsules') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsules_description_length_check'
        and conrelid = 'public.capsules'::regclass
    )
  then
    alter table capsules
      add constraint capsules_description_length_check
      check (description is null or char_length(description) <= 1200) not valid;
  end if;

  if to_regclass('public.capsules') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsules_share_slug_format_check'
        and conrelid = 'public.capsules'::regclass
    )
  then
    alter table capsules
      add constraint capsules_share_slug_format_check
      check (share_slug is null or share_slug ~ '^[a-zA-Z0-9_-]{8,80}$') not valid;
  end if;

  if to_regclass('public.capsule_memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsule_memories_contributor_name_length_check'
        and conrelid = 'public.capsule_memories'::regclass
    )
  then
    alter table capsule_memories
      add constraint capsule_memories_contributor_name_length_check
      check (contributor_name is null or char_length(btrim(contributor_name)) between 1 and 80) not valid;
  end if;

  if to_regclass('public.capsule_memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsule_memories_title_length_check'
        and conrelid = 'public.capsule_memories'::regclass
    )
  then
    alter table capsule_memories
      add constraint capsule_memories_title_length_check
      check (title is null or char_length(btrim(title)) between 1 and 140) not valid;
  end if;

  if to_regclass('public.capsule_memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsule_memories_message_length_check'
        and conrelid = 'public.capsule_memories'::regclass
    )
  then
    alter table capsule_memories
      add constraint capsule_memories_message_length_check
      check (message is null or char_length(btrim(message)) between 1 and 4000) not valid;
  end if;

  if to_regclass('public.capsule_memories') is not null
    and not exists (
      select 1 from pg_constraint
      where conname = 'capsule_memories_media_urls_string_array_check'
        and conrelid = 'public.capsule_memories'::regclass
    )
  then
    alter table capsule_memories
      add constraint capsule_memories_media_urls_string_array_check
      check (media_urls is null or public.jsonb_is_text_array(media_urls)) not valid;
  end if;
end $$;

create index if not exists memories_user_created_at_idx
  on memories(user_id, created_at desc);
create index if not exists memories_user_unlock_date_idx
  on memories(user_id, unlock_date);
create index if not exists memories_unlock_email_due_idx
  on memories(unlock_date, unlock_email_sent_at)
  where unlock_email_sent_at is null;
create index if not exists memories_unlocked_email_due_idx
  on memories(unlock_date, unlocked_email_sent)
  where unlocked_email_sent = false;

create index if not exists capsules_owner_user_id_idx
  on capsules(owner_user_id);
create index if not exists capsules_share_slug_idx
  on capsules(share_slug);
create index if not exists capsules_owner_created_at_idx
  on capsules(owner_user_id, created_at desc);
create index if not exists capsules_owner_unlock_date_idx
  on capsules(owner_user_id, unlock_date);
create index if not exists capsules_unlock_email_due_idx
  on capsules(unlock_date, unlock_email_sent_at)
  where unlock_email_sent_at is null;
create index if not exists capsules_capsule_unlock_email_due_idx
  on capsules(unlock_date, capsule_unlock_email_sent_at)
  where capsule_unlock_email_sent_at is null;
create index if not exists capsules_gift_recipient_email_due_idx
  on capsules(unlock_date, recipient_email_sent_at)
  where is_gift = true
    and recipient_email is not null
    and recipient_email_sent_at is null;
create index if not exists capsules_gift_owner_confirmation_due_idx
  on capsules(unlock_date, owner_gift_confirmation_sent_at)
  where is_gift = true
    and owner_gift_confirmation_sent_at is null;

create index if not exists capsule_memories_capsule_id_created_at_idx
  on capsule_memories(capsule_id, created_at);

create index if not exists feedback_user_created_at_idx
  on feedback(user_id, created_at desc);
create index if not exists feedback_created_at_idx
  on feedback(created_at desc);

do $$
begin
  if to_regclass('public.capsules_share_slug_unique_idx') is null then
    if exists (
      select 1
      from capsules
      where share_slug is not null
      group by share_slug
      having count(*) > 1
    ) then
      raise notice 'Skipping capsules_share_slug_unique_idx because duplicate share_slug values exist.';
    else
      create unique index capsules_share_slug_unique_idx
        on capsules(share_slug);
    end if;
  end if;
end $$;

alter table memories enable row level security;
alter table capsules enable row level security;
alter table capsule_memories enable row level security;
alter table feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'memories'
      and policyname = 'Users can read their own memories'
  ) then
    create policy "Users can read their own memories"
      on memories for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'memories'
      and policyname = 'Users can insert their own memories'
  ) then
    create policy "Users can insert their own memories"
      on memories for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'memories'
      and policyname = 'Users can update their own memories'
  ) then
    create policy "Users can update their own memories"
      on memories for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'memories'
      and policyname = 'Users can delete their own memories'
  ) then
    create policy "Users can delete their own memories"
      on memories for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'capsules'
      and policyname = 'Capsule owners can read their capsules'
  ) then
    create policy "Capsule owners can read their capsules"
      on capsules for select
      using (auth.uid() = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'capsules'
      and policyname = 'Capsule owners can create capsules'
  ) then
    create policy "Capsule owners can create capsules"
      on capsules for insert
      with check (auth.uid() = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'capsules'
      and policyname = 'Capsule owners can delete their capsules'
  ) then
    create policy "Capsule owners can delete their capsules"
      on capsules for delete
      using (auth.uid() = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'capsule_memories'
      and policyname = 'Capsule owners can read unlocked capsule memories'
  ) then
    create policy "Capsule owners can read unlocked capsule memories"
      on capsule_memories for select
      using (
        exists (
          select 1
          from capsules
          where capsules.id = capsule_memories.capsule_id
            and capsules.owner_user_id = auth.uid()
            and capsules.unlock_date <= current_date
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'capsule_memories'
      and policyname = 'Anyone can contribute capsule memories before deadline'
  ) then
    create policy "Anyone can contribute capsule memories before deadline"
      on capsule_memories for insert
      with check (
        exists (
          select 1
          from capsules
          where capsules.id = capsule_memories.capsule_id
            and capsules.submission_deadline >= current_date
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'capsule_memories'
      and policyname = 'Capsule owners can delete capsule memories'
  ) then
    create policy "Capsule owners can delete capsule memories"
      on capsule_memories for delete
      using (
        exists (
          select 1
          from capsules
          where capsules.id = capsule_memories.capsule_id
            and capsules.owner_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'Authenticated users can insert their own feedback'
  ) then
    create policy "Authenticated users can insert their own feedback"
      on feedback for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'Service role can read all feedback'
  ) then
    create policy "Service role can read all feedback"
      on feedback for select
      using (auth.role() = 'service_role');
  end if;
end $$;

notify pgrst, 'reload schema';
