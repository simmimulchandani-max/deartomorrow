# Capsule timezone and Edit Dates release review

Status: NO-GO pending live RLS/history verification and real PostgreSQL integration tests.
No production writes, deployments, email sends, or migration applications were performed.

## Evidence

- Read-only production REST checks found Emma's capsule with deadline 2026-11-10,
  unlock date 2026-11-11, recipient email present, recipient_email_sent_at NULL,
  and owner_gift_confirmation_sent_at populated. Both regular owner notification
  fields are NULL. The last attempt is 2026-11-10T14:41:00.7Z, stale by tomorrow.
- Production REST schema includes every column referenced by the two migrations.
- REST does not establish the actual RLS policy expressions, grants, constraints,
  other triggers, migration history, database timezone, or installed function bodies.
- Historical files reuse migration versions 20260506 and 20260621. A blanket
  `supabase db push` is not safe until the actual migration ledger is reconciled.
  Do not rename already-applied migration files or mark them applied speculatively.
- The repository defines both policy names altered by the Eastern migration and
  no direct client UPDATE policy for capsules. These assumptions need live checks.
- 45 application tests pass, including mocked cron delivery and editor interactions.
  They do not execute the PostgreSQL migrations or prove live delivery.
- No separate staging connection or local Supabase configuration was found.
  Account-level staging existence is unconfirmed. The Supabase project listing
  could not complete in this environment; the Vercel CLI token is invalid.

## Compatibility and impact

The Eastern migration changes two capsule_memories policy expressions only; it
does not change capsule dates or the deadline-before-unlock CHECK. Existing roles,
policy commands, and permissive/restrictive settings are retained by ALTER POLICY.
Additional permissive policies can still grant access, so review all live policies.

The guard runs only on UPDATE statements targeting capsule date columns and exits
when dates are unchanged. It does not run on capsule creation, memory INSERT,
storage uploads, SELECT/access, or cron updates containing only email tracking
columns. It blocks date changes after unlock, after any tracked notification or
gift delivery confirmation, during recent email attempts, or to a nonfuture unlock.
It also applies to service-role/manual date updates. No existing rows are rewritten.

Emma's already-applied manual date correction is unaffected. Her owner confirmation
locks further date editing, but is not a gate for recipient delivery or access.
The gift cron selects her because recipient_email_sent_at is NULL, sends only the
recipient notification, and preserves/skips the populated owner confirmation.
The schedule is 14:00 UTC: 9 AM Eastern on November 11. Delivery still depends on
Vercel configuration, email credentials/provider success, and the 200-row batch.

All capsules use inclusive Eastern deadline dates and unlock at the beginning of
the Eastern unlock date. DST is handled by Intl in the app and the named zone in
PostgreSQL. Existing capsules in the former UTC-midnight-to-Eastern-midnight window
can appear locked again until Eastern midnight. Earlier unlocked dates stay open.
Already-issued URLs and content someone has already seen cannot be recalled.

## Read-only production preflight

Run these SELECTs using an authorized database connection and save the results
outside the public repository. These are proposed checks, not executed here.

```sql
SELECT current_setting('TimeZone') AS database_timezone;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('capsules', 'capsule_memories')
ORDER BY table_name, ordinal_position;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('capsules', 'capsule_memories')
ORDER BY tablename, policyname;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.capsules'::regclass;

SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid),
       pg_get_functiondef(t.tgfoid)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgrelid IN ('public.capsules'::regclass, 'public.capsule_memories'::regclass)
  AND NOT t.tgisinternal;

SELECT to_regprocedure('public.guard_capsule_date_edits()') AS existing_guard_function;

SELECT version
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

If the history table is absent, establish an audited baseline rather than applying
all historical repository migrations. Verify the two named policies exist, capture
their exact original expressions, and review any existing guard name collision.
Also capture grants, existing function privileges, deployed Vercel ID, production
cron configuration, and required environment variable presence without disclosing secrets.

## Validation without production changes

Use a disposable local Supabase/PostgreSQL instance or a separate project restored
from a schema-only production export. Include auth/storage schemas, roles, policies,
grants, constraints, and triggers. Use synthetic accounts and synthetic capsule
rows with Emma's flag pattern; never connect a test app to the production database.
Disable outbound email or use a mock transport. Do not call the live cron to test.

Apply both migrations there. Exercise authenticated owner, recipient, stranger,
anonymous, and service-role paths; both sides of midnight; DST dates; unchanged
date updates; date-only edits; timestamp-only email updates; direct RLS reads and
inserts; the existing CHECK; and the old-code/new-policy transition. Use an isolated
test-clock harness for boundaries; production clock functions must remain unchanged.
Test concurrent updates/row-lock waits and both migration rollbacks there.

## Exact release sequence after blockers are cleared

1. Record the verified production deployment ID and database policy/trigger/function
   snapshots. Reconcile migration history and prepare the inverse SQL from those
   snapshots. Review the migration dry run: only 20261110 and 20261111 may be pending.
2. Build and test the final commit against the isolated database. Prepare the Vercel
   production-target build without switching live domains; verify its production
   database target and required secrets. Restore authorized dashboard/CLI access.
3. Choose a quiet daytime window outside the cron run and outside the Eastern/UTC
   date disagreement window. For November 10, finish before 7 PM Eastern; do not
   release across midnight or the November 11 9 AM cron window. Ensure no in-flight
   cron run is active. If timing cannot be met, keep NO-GO or use explicit maintenance.
4. Through the verified migration runner, apply 20261110 (Eastern RLS), then 20261111
   (date-edit guard), with transactional DDL and a short lock timeout (e.g. 5 seconds).
   Record both in migration history. Stop on any failure; do not promote partial work.
5. Immediately promote the prepared production build. A brief old-code/new-policy
   mismatch exists: the old API uses service-role access and still applies UTC checks.
   Database policies alone cannot fix those API checks. Finish within the safe window.
6. Perform read-only production smoke checks: the capsule details load; only owners
   see editing; Emma's dates/timestamps remain unchanged; existing unlocked capsules
   load; and the 14:00 UTC cron and production secrets are configured. Keep write,
   upload, and actual email smoke tests in the isolated environment.
7. Monitor the naturally scheduled November 11 run. Confirm one recipient delivery,
   recipient timestamp populated, owner confirmation unchanged, and successful access
   for Emma's confirmed recipient account. Do not manually trigger or reset timestamps.

## Rollback

Prefer an editor-only rollback retaining the Eastern fixes when available. For a
full emergency rollback, switch Vercel to the recorded known-good production
deployment first; this removes the new editor while both DB migrations remain
backward-compatible. Verify the restored deployment's own environment and cron
configuration. Vercel rollback does not undo external database changes.

If the guard itself is faulty, remove it in a new compensating migration, after
disabling/removing date editing. If preflight confirmed these objects were new:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS guard_capsule_date_edits ON public.capsules;
DROP FUNCTION IF EXISTS public.guard_capsule_date_edits();
COMMIT;
```

If either object existed before release, restore its captured definition/privileges
instead. Do not use CASCADE. Do not change any capsule rows or sent-email timestamps.

For the Eastern migration, use a separate compensating migration restoring the
exact preflight qual/with_check expressions for the two policies. If and only if
production matches the repository's original definitions, the inverse is:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER POLICY "Capsule owners can read unlocked capsule memories"
ON public.capsule_memories USING (
  EXISTS (
    SELECT 1 FROM public.capsules
    WHERE capsules.id = capsule_memories.capsule_id
      AND capsules.owner_user_id = auth.uid()
      AND capsules.unlock_date <= current_date
  )
);
ALTER POLICY "Anyone can contribute capsule memories before deadline"
ON public.capsule_memories WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.capsules
    WHERE capsules.id = capsule_memories.capsule_id
      AND capsules.submission_deadline >= current_date
  )
);
COMMIT;
```

Restoring old code/policies reintroduces the UTC bug. An old service-role API can
allow early access even if Eastern RLS remains installed. During the affected
evening window, restrict capsule access while recovering or roll forward instead.
Leave legitimate owner date edits and all contribution/email data intact. Track
rollback SQL as new migrations: migration-history repair alone does not undo SQL.
