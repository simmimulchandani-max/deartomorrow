-- PROPOSED: apply separately after review. No stored dates or constraints change.
-- Match the app's Eastern calendar date for clients accessing Supabase directly.
alter policy "Capsule owners can read unlocked capsule memories"
  on public.capsule_memories
  using (
    exists (
      select 1 from public.capsules
      where capsules.id = capsule_memories.capsule_id
        and capsules.owner_user_id = auth.uid()
        and capsules.unlock_date <= (clock_timestamp() at time zone 'America/New_York')::date
    )
  );

alter policy "Anyone can contribute capsule memories before deadline"
  on public.capsule_memories
  with check (
    exists (
      select 1 from public.capsules
      where capsules.id = capsule_memories.capsule_id
        and capsules.submission_deadline >= (clock_timestamp() at time zone 'America/New_York')::date
    )
  );
