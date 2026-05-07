import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { dateOnly } from "@/lib/validation";
import {
  buildCapsuleUnlockEmailTemplate,
  buildMemoryUnlockEmailTemplate,
} from "@/lib/emailTemplates";
import { Resend } from "resend";
import type React from "react";

type MemoryUnlockRow = {
  id: string;
  user_id: string | null;
  unlock_date: string;
};

type CapsuleUnlockRow = {
  id: string;
  share_slug: string;
  owner_user_id: string;
  unlock_date: string;
};

type SendResult = {
  found: number;
  sent: number;
  skippedNoUser: number;
  skippedDryRun: number;
  skippedClaimed: number;
  failed: number;
};

const MAX_RECORDS_PER_TYPE = 200;
const DEFAULT_FROM_EMAIL = "Until Tomorrow <onboarding@resend.dev>";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleUnlockEmailRequest(request);
}

export async function POST(request: Request) {
  return handleUnlockEmailRequest(request);
}

async function handleUnlockEmailRequest(request: Request) {
  const runId = crypto.randomUUID();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const isLocalDev = process.env.NODE_ENV !== "production";
  const dryRun = url.searchParams.get("dryRun") === "true";
  const testEmail = url.searchParams.get("testEmail")?.trim() || null;

  if (!isLocalDev && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    console.warn("[unlock-email-cron] Unauthorized request", {
      runId,
      hasCronSecret: Boolean(cronSecret),
      hasAuthorizationHeader: Boolean(authHeader),
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

  console.log("[unlock-email-cron] Starting run", {
    runId,
    dryRun,
    testMode: Boolean(testEmail),
    nodeEnv: process.env.NODE_ENV,
    utcNow: new Date().toISOString(),
    fromEmail,
    hasResendApiKey: Boolean(resendApiKey),
    hasSiteUrl: Boolean(siteUrl),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    vercelCronSchedule: "0 * * * *",
    cronTimezone: "UTC",
  });

  if (!resendApiKey) {
    console.error("[unlock-email-cron] Missing RESEND_API_KEY", { runId });
    return Response.json({ error: "Missing RESEND_API_KEY." }, { status: 500 });
  }

  if (!siteUrl) {
    console.error("[unlock-email-cron] Missing NEXT_PUBLIC_SITE_URL", { runId });
    return Response.json({ error: "Missing NEXT_PUBLIC_SITE_URL." }, { status: 500 });
  }

  try {
    const resend = new Resend(resendApiKey);
    const today = dateOnly(new Date());

    if (testEmail) {
      const template = buildMemoryUnlockEmailTemplate(new URL("/timeline", siteUrl).toString());
      const emailResponse = dryRun
        ? null
        : await sendEmailViaResend({
            resend,
            from: fromEmail,
            to: testEmail,
            subject: "Test: your memory is ready to open",
            text: template.text,
            react: template.react,
            runId,
            recordType: "test",
            recordId: "manual-test",
          });

      console.log("[unlock-email-cron] Completed manual test", {
        runId,
        dryRun,
        testEmail,
        resendId: emailResponse?.data?.id ?? null,
      });

      return Response.json({
        ok: true,
        mode: "test",
        dryRun,
        date: today,
        sentTo: dryRun ? null : testEmail,
        resendId: emailResponse?.data?.id ?? null,
      });
    }

    const supabase = getSupabaseAdminClient();
    const emailCache = new Map<string, string | null>();

    const memoryResult = await sendMemoryUnlockEmails({
      supabase,
      resend,
      today,
      siteUrl,
      from: fromEmail,
      emailCache,
      dryRun,
      runId,
    });
    const capsuleResult = await sendCapsuleUnlockEmails({
      supabase,
      resend,
      today,
      siteUrl,
      from: fromEmail,
      emailCache,
      dryRun,
      runId,
    });

    const failed = memoryResult.failed + capsuleResult.failed;
    console.log("[unlock-email-cron] Finished run", {
      runId,
      today,
      dryRun,
      memories: memoryResult,
      capsules: capsuleResult,
    });

    return Response.json({
      ok: failed === 0,
      date: today,
      dryRun,
      runId,
      memories: memoryResult,
      capsules: capsuleResult,
    }, { status: failed > 0 ? 207 : 200 });
  } catch (error) {
    console.error("[unlock-email-cron] Fatal error", { runId, error });
    return Response.json(
      {
        ok: false,
        runId,
        error: error instanceof Error ? error.message : "Unknown cron failure.",
      },
      { status: 500 }
    );
  }
}

async function sendMemoryUnlockEmails(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  resend: Resend;
  today: string;
  siteUrl: string;
  from: string;
  emailCache: Map<string, string | null>;
  dryRun: boolean;
  runId: string;
}) {
  const rows = await fetchUnsentMemories(input.supabase, input.today);
  const result: SendResult = {
    found: rows.length,
    sent: 0,
    skippedNoUser: 0,
    skippedDryRun: 0,
    skippedClaimed: 0,
    failed: 0,
  };

  console.log("[unlock-email-cron] Memories ready for email", {
    runId: input.runId,
    today: input.today,
    found: rows.length,
  });

  for (const memory of rows) {
    if (!memory.user_id) {
      result.skippedNoUser += 1;
      console.warn("[unlock-email-cron] Skipping memory without user", {
        runId: input.runId,
        memoryId: memory.id,
      });
      continue;
    }

    try {
      const recipient = await getUserEmail(input.supabase, memory.user_id, input.emailCache);
      if (!recipient) {
        result.skippedNoUser += 1;
        console.warn("[unlock-email-cron] Skipping memory without recipient email", {
          runId: input.runId,
          memoryId: memory.id,
          userId: memory.user_id,
        });
        continue;
      }

      const memoryLink = new URL(`/memory/${memory.id}`, input.siteUrl).toString();
      const template = buildMemoryUnlockEmailTemplate(memoryLink);

      console.log("[unlock-email-cron] Attempting memory email", {
        runId: input.runId,
        memoryId: memory.id,
        unlockDate: memory.unlock_date,
        recipient,
      });

      if (input.dryRun) {
        result.skippedDryRun += 1;
        continue;
      }

      const claimed = await claimEmailAttempt({
        supabase: input.supabase,
        table: "memories",
        id: memory.id,
        runId: input.runId,
      });
      if (!claimed) {
        result.skippedClaimed += 1;
        continue;
      }

      const emailResponse = await sendEmailViaResend({
        resend: input.resend,
        from: input.from,
        to: recipient,
        subject: "Your memory is ready to open",
        text: template.text,
        react: template.react,
        runId: input.runId,
        recordType: "memory",
        recordId: memory.id,
      });

      await markEmailSent({
        supabase: input.supabase,
        table: "memories",
        id: memory.id,
        runId: input.runId,
        resendId: emailResponse.data?.id ?? null,
      });

      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      await saveEmailFailure({
        supabase: input.supabase,
        table: "memories",
        id: memory.id,
        error,
      });
      console.error("[unlock-email-cron] Failed memory email", {
        runId: input.runId,
        memoryId: memory.id,
        error,
      });
    }
  }

  return result;
}

async function sendCapsuleUnlockEmails(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  resend: Resend;
  today: string;
  siteUrl: string;
  from: string;
  emailCache: Map<string, string | null>;
  dryRun: boolean;
  runId: string;
}) {
  const rows = await fetchUnsentCapsules(input.supabase, input.today);
  const result: SendResult = {
    found: rows.length,
    sent: 0,
    skippedNoUser: 0,
    skippedDryRun: 0,
    skippedClaimed: 0,
    failed: 0,
  };

  console.log("[unlock-email-cron] Capsules ready for email", {
    runId: input.runId,
    today: input.today,
    found: rows.length,
  });

  for (const capsule of rows) {
    try {
      const recipient = await getUserEmail(input.supabase, capsule.owner_user_id, input.emailCache);
      if (!recipient) {
        result.skippedNoUser += 1;
        console.warn("[unlock-email-cron] Skipping capsule without recipient email", {
          runId: input.runId,
          capsuleId: capsule.id,
          userId: capsule.owner_user_id,
        });
        continue;
      }

      const unlockLink = new URL(`/capsule/${capsule.share_slug}/unlock`, input.siteUrl).toString();
      const template = buildCapsuleUnlockEmailTemplate(unlockLink);

      console.log("[unlock-email-cron] Attempting capsule email", {
        runId: input.runId,
        capsuleId: capsule.id,
        unlockDate: capsule.unlock_date,
        recipient,
      });

      if (input.dryRun) {
        result.skippedDryRun += 1;
        continue;
      }

      const claimed = await claimEmailAttempt({
        supabase: input.supabase,
        table: "capsules",
        id: capsule.id,
        runId: input.runId,
      });
      if (!claimed) {
        result.skippedClaimed += 1;
        continue;
      }

      const emailResponse = await sendEmailViaResend({
        resend: input.resend,
        from: input.from,
        to: recipient,
        subject: "Your capsule is ready to unlock",
        text: template.text,
        react: template.react,
        runId: input.runId,
        recordType: "capsule",
        recordId: capsule.id,
      });

      await markEmailSent({
        supabase: input.supabase,
        table: "capsules",
        id: capsule.id,
        runId: input.runId,
        resendId: emailResponse.data?.id ?? null,
      });

      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      await saveEmailFailure({
        supabase: input.supabase,
        table: "capsules",
        id: capsule.id,
        error,
      });
      console.error("[unlock-email-cron] Failed capsule email", {
        runId: input.runId,
        capsuleId: capsule.id,
        error,
      });
    }
  }

  return result;
}

async function fetchUnsentMemories(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  today: string
) {
  const { data, error } = await supabase
    .from("memories")
    .select("id, user_id, unlock_date")
    .lte("unlock_date", today)
    .is("unlock_email_sent_at", null)
    .not("user_id", "is", null)
    .order("unlock_date", { ascending: true })
    .limit(MAX_RECORDS_PER_TYPE);

  if (error) {
    throw new Error(`Failed to query memories: ${error.message}`);
  }

  return (data ?? []) as MemoryUnlockRow[];
}

async function fetchUnsentCapsules(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  today: string
) {
  const { data, error } = await supabase
    .from("capsules")
    .select("id, share_slug, owner_user_id, unlock_date")
    .lte("unlock_date", today)
    .is("unlock_email_sent_at", null)
    .order("unlock_date", { ascending: true })
    .limit(MAX_RECORDS_PER_TYPE);

  if (error) {
    throw new Error(`Failed to query capsules: ${error.message}`);
  }

  return (data ?? []) as CapsuleUnlockRow[];
}

async function getUserEmail(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  cache: Map<string, string | null>
) {
  if (cache.has(userId)) {
    return cache.get(userId) ?? null;
  }

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    console.warn("[unlock-email-cron] Could not resolve user email", {
      userId,
      error: error?.message ?? null,
    });
    cache.set(userId, null);
    return null;
  }

  const email = data.user.email.trim().toLowerCase();
  cache.set(userId, email);
  return email;
}

async function sendEmailViaResend(input: {
  resend: Resend;
  from: string;
  to: string;
  subject: string;
  text: string;
  react: React.ReactElement;
  runId: string;
  recordType: string;
  recordId: string;
}) {
  const response = await input.resend.emails.send({
    from: input.from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    react: input.react,
  });

  console.log("[unlock-email-cron] Resend response", {
    runId: input.runId,
    recordType: input.recordType,
    recordId: input.recordId,
    to: input.to,
    resendId: response.data?.id ?? null,
    error: response.error ?? null,
  });

  if (response.error) {
    throw new Error(`Resend API error: ${response.error.message}`);
  }

  return response;
}

async function markEmailSent(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  table: "memories" | "capsules";
  id: string;
  runId: string;
  resendId: string | null;
}) {
  const { data, error } = await input.supabase
    .from(input.table)
    .update({
      unlock_email_sent_at: new Date().toISOString(),
      unlock_email_last_error: null,
    })
    .eq("id", input.id)
    .is("unlock_email_sent_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed marking ${input.table} ${input.id} emailed: ${error.message}`);
  }

  if (!data) {
    console.warn("[unlock-email-cron] Email sent but row was already marked by another run", {
      runId: input.runId,
      table: input.table,
      id: input.id,
      resendId: input.resendId,
    });
    return;
  }

  console.log("[unlock-email-cron] Marked email as sent", {
    runId: input.runId,
    table: input.table,
    id: input.id,
    resendId: input.resendId,
  });
}

async function claimEmailAttempt(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  table: "memories" | "capsules";
  id: string;
  runId: string;
}) {
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await input.supabase
    .from(input.table)
    .update({
      unlock_email_attempted_at: new Date().toISOString(),
      unlock_email_last_error: null,
    })
    .eq("id", input.id)
    .is("unlock_email_sent_at", null)
    .or(`unlock_email_attempted_at.is.null,unlock_email_attempted_at.lt.${staleCutoff}`)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed claiming ${input.table} ${input.id}: ${error.message}`);
  }

  if (!data) {
    console.warn("[unlock-email-cron] Skipping row already claimed by another run", {
      runId: input.runId,
      table: input.table,
      id: input.id,
    });
    return false;
  }

  console.log("[unlock-email-cron] Claimed email attempt", {
    runId: input.runId,
    table: input.table,
    id: input.id,
  });
  return true;
}

async function saveEmailFailure(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  table: "memories" | "capsules";
  id: string;
  error: unknown;
}) {
  const message =
    input.error instanceof Error ? input.error.message : "Unknown email failure.";
  const { error } = await input.supabase
    .from(input.table)
    .update({ unlock_email_last_error: message.slice(0, 1000) })
    .eq("id", input.id)
    .is("unlock_email_sent_at", null);

  if (error) {
    console.error("[unlock-email-cron] Failed saving email failure", {
      table: input.table,
      id: input.id,
      error,
    });
  }
}

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}
