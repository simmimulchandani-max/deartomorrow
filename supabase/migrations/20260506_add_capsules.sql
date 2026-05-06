create table if not exists capsules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  title text not null,
  description text,
  submission_deadline date not null,
  unlock_date date not null,
  share_slug text not null unique,
  created_at timestamptz not null default now(),
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

create index if not exists capsules_owner_user_id_idx on capsules(owner_user_id);
create index if not exists capsules_share_slug_idx on capsules(share_slug);
create index if not exists capsule_memories_capsule_id_created_at_idx
  on capsule_memories(capsule_id, created_at);

alter table capsules enable row level security;
alter table capsule_memories enable row level security;

drop policy if exists "Capsule owners can read their capsules" on capsules;
create policy "Capsule owners can read their capsules"
  on capsules for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Capsule owners can create capsules" on capsules;
create policy "Capsule owners can create capsules"
  on capsules for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "Capsule owners can read unlocked capsule memories" on capsule_memories;
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

drop policy if exists "Anyone can contribute capsule memories before deadline" on capsule_memories;
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
