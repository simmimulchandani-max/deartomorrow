create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  title text not null,
  description text not null,
  rating text not null,
  screenshot_url text,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "Authenticated users can insert their own feedback" on feedback;
create policy "Authenticated users can insert their own feedback"
  on feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Service role can read all feedback" on feedback;
create policy "Service role can read all feedback"
  on feedback for select
  to service_role
  using (true);

create index if not exists feedback_user_created_at_idx
  on feedback(user_id, created_at desc);

create index if not exists feedback_created_at_idx
  on feedback(created_at desc);
