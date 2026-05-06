create extension if not exists pgcrypto;

alter table if exists memories
  add column if not exists media_urls jsonb not null default '[]'::jsonb;

update memories
set media_urls = '[]'::jsonb
where media_urls is null;

alter table if exists memories
  drop constraint if exists memories_title_length_check;
alter table if exists memories
  add constraint memories_title_length_check
    check (char_length(btrim(title)) between 1 and 140) not valid;
alter table if exists memories
  drop constraint if exists memories_message_length_check;
alter table if exists memories
  add constraint memories_message_length_check
    check (char_length(btrim(message)) between 1 and 4000) not valid;
alter table if exists memories
  drop constraint if exists memories_password_hash_length_check;
alter table if exists memories
  add constraint memories_password_hash_length_check
    check (password_hash is null or char_length(password_hash) <= 255) not valid;
alter table if exists memories
  drop constraint if exists memories_media_urls_string_array_check;
alter table if exists memories
  add constraint memories_media_urls_string_array_check
    check (
      jsonb_typeof(media_urls) = 'array'
      and not exists (
        select 1
        from jsonb_array_elements(media_urls) as item
        where jsonb_typeof(item) <> 'string'
      )
    ) not valid;

alter table if exists capsules
  drop constraint if exists capsules_title_length_check;
alter table if exists capsules
  add constraint capsules_title_length_check
    check (char_length(btrim(title)) between 1 and 140) not valid;
alter table if exists capsules
  drop constraint if exists capsules_description_length_check;
alter table if exists capsules
  add constraint capsules_description_length_check
    check (description is null or char_length(description) <= 1200) not valid;
alter table if exists capsules
  drop constraint if exists capsules_share_slug_format_check;
alter table if exists capsules
  add constraint capsules_share_slug_format_check
    check (share_slug ~ '^[a-zA-Z0-9_-]{8,80}$') not valid;

alter table if exists capsule_memories
  drop constraint if exists capsule_memories_contributor_name_length_check;
alter table if exists capsule_memories
  add constraint capsule_memories_contributor_name_length_check
    check (char_length(btrim(contributor_name)) between 1 and 80) not valid;
alter table if exists capsule_memories
  drop constraint if exists capsule_memories_title_length_check;
alter table if exists capsule_memories
  add constraint capsule_memories_title_length_check
    check (char_length(btrim(title)) between 1 and 140) not valid;
alter table if exists capsule_memories
  drop constraint if exists capsule_memories_message_length_check;
alter table if exists capsule_memories
  add constraint capsule_memories_message_length_check
    check (char_length(btrim(message)) between 1 and 4000) not valid;
alter table if exists capsule_memories
  drop constraint if exists capsule_memories_media_urls_string_array_check;
alter table if exists capsule_memories
  add constraint capsule_memories_media_urls_string_array_check
    check (
      jsonb_typeof(media_urls) = 'array'
      and not exists (
        select 1
        from jsonb_array_elements(media_urls) as item
        where jsonb_typeof(item) <> 'string'
      )
    ) not valid;

create index if not exists memories_user_created_at_idx
  on memories(user_id, created_at desc);
create index if not exists memories_user_unlock_date_idx
  on memories(user_id, unlock_date);
create index if not exists capsules_owner_created_at_idx
  on capsules(owner_user_id, created_at desc);
create index if not exists capsules_owner_unlock_date_idx
  on capsules(owner_user_id, unlock_date);

alter table if exists memories enable row level security;

drop policy if exists "Users can read their own memories" on memories;
create policy "Users can read their own memories"
  on memories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own memories" on memories;
create policy "Users can insert their own memories"
  on memories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own memories" on memories;
create policy "Users can update their own memories"
  on memories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own memories" on memories;
create policy "Users can delete their own memories"
  on memories for delete
  using (auth.uid() = user_id);
