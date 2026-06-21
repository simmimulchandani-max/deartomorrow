drop policy if exists "Capsule owners can delete their capsules" on capsules;
create policy "Capsule owners can delete their capsules"
  on capsules for delete
  using (auth.uid() = owner_user_id);

drop policy if exists "Capsule owners can delete capsule memories" on capsule_memories;
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
