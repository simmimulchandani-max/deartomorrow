import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const REQUIRED_DATABASE_COLUMNS = {
  memories: [
    "id",
    "user_id",
    "title",
    "message",
    "unlock_date",
    "media_url",
    "media_urls",
    "password_hash",
    "created_at",
    "unlock_email_sent_at",
    "unlock_email_attempted_at",
    "unlock_email_last_error",
    "unlocked_email_sent",
    "unlocked_email_sent_at",
  ],
  capsules: [
    "id",
    "owner_user_id",
    "title",
    "description",
    "submission_deadline",
    "unlock_date",
    "share_slug",
    "created_at",
    "unlock_email_sent_at",
    "unlock_email_attempted_at",
    "unlock_email_last_error",
    "capsule_unlock_email_sent_at",
    "is_gift",
    "recipient_name",
    "recipient_email",
    "recipient_note",
    "recipient_email_sent_at",
    "owner_gift_confirmation_sent_at",
  ],
  capsule_memories: [
    "id",
    "capsule_id",
    "contributor_name",
    "title",
    "message",
    "media_url",
    "media_urls",
    "created_at",
  ],
  feedback: [
    "id",
    "user_id",
    "email",
    "title",
    "description",
    "rating",
    "screenshot_url",
    "created_at",
  ],
} as const;

type RequiredTable = keyof typeof REQUIRED_DATABASE_COLUMNS;

export type MissingDatabaseColumn = {
  table: RequiredTable;
  column: string;
  error: string;
};

export type SchemaHealthResult = {
  ok: boolean;
  checkedCount: number;
  missing: MissingDatabaseColumn[];
};

export async function checkRequiredDatabaseColumns(): Promise<SchemaHealthResult> {
  const supabase = getSupabaseAdminClient();
  const missing: MissingDatabaseColumn[] = [];
  let checkedCount = 0;

  for (const [table, columns] of Object.entries(REQUIRED_DATABASE_COLUMNS) as Array<
    [RequiredTable, readonly string[]]
  >) {
    for (const column of columns) {
      checkedCount += 1;
      const { error } = await supabase
        .from(table)
        .select(column, { head: true })
        .limit(0);

      if (error) {
        const missingColumn = {
          table,
          column,
          error: error.message,
        };

        missing.push(missingColumn);
        console.error("[schema-health] Missing or unavailable database column", missingColumn);
      }
    }
  }

  if (missing.length === 0) {
    console.log("[schema-health] Database schema check passed", { checkedCount });
  }

  return {
    ok: missing.length === 0,
    checkedCount,
    missing,
  };
}
