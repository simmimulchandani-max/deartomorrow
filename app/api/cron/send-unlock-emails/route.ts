import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { dateOnly } from "@/lib/validation";
import {
  buildCapsuleUnlockEmailTemplate,
  buildGiftCapsuleOwnerConfirmationEmailTemplate,
  buildGiftCapsuleRecipientEmailTemplate,
  buildMemoryUnlockEmailTemplate,
} from "@/lib/emailTemplates";
import { Resend } from "resend";
import type React from "react";

type MemoryUnlockRow = {
  id: string;
  user_id: string | null;
  title: string;
  unlock_date: string;
  media_url?: string | null;
  media_urls?: unknown;
};

type CapsuleUnlockRow = {
  id: string;
  share_slug: string;
  owner_user_id: string;
  title: string;
  unlock_date: string;
};

type GiftCapsuleUnlockRow = CapsuleUnlockRow & {
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_note: string | null;
  recipient_email_sent_at: string | null;
  owner_gift_confirmation_sent_at: string | null;
};

type SendResult = {
  found: number;
  sent: number;
  skippedNoUser: number;
  skippedDryRun: number;
  skippedClaimed: number;
  failed: number;
};

type UnlockEmailDiagnostics = {
  memories: {
    due: number;
    unsent: number;
    unsentWithUser: number;
  };
  capsules: {
    due: number;
    unsentOwner: number;
    unsentGift: number;
  };
};

const MAX_RECORDS_PER_TYPE = 200;
const DEFAULT_FROM_EMAIL = "Until Tomorrow <hello@until-tomorrow.com>";
const CAPSULE_SENT_COLUMN = "capsule_unlock_email_sent_at";
const APP_TIME_ZONE = "America/New_York";
const LOGO_PATH = "/logo.png";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const vercelCronSchedule = request.headers.get("x-vercel-cron-schedule");
  const testSecret = process.env.TEST_UNLOCK_EMAIL_SECRET;
  const suppliedTestSecret =
    request.headers.get("x-unlock-test-secret") ??
    url.searchParams.get("testSecret");
  const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isTestAuthorized = Boolean(testSecret && suppliedTestSecret === testSecret);

  if (!isLocalDev && !isCronAuthorized && !isTestAuthorized) {
    console.warn("[unlock-email-cron] Unauthorized request", {
      runId,
      hasCronSecret: Boolean(cronSecret),
      hasTestUnlockEmailSecret: Boolean(testSecret),
      hasAuthorizationHeader: Boolean(authHeader),
      hasSuppliedTestSecret: Boolean(suppliedTestSecret),
      vercelCronSchedule,
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const siteUrl =
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

  console.log("[unlock-email-cron] Starting run", {
    runId,
    dryRun,
    testMode: Boolean(testEmail),
    authMode: isCronAuthorized ? "cron" : isTestAuthorized ? "manual-test" : "local",
    nodeEnv: process.env.NODE_ENV,
    utcNow: new Date().toISOString(),
    fromEmail,
    hasResendApiKey: Boolean(resendApiKey),
    hasNextPublicSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    hasVercelUrl: Boolean(process.env.VERCEL_URL),
    hasResolvedSiteUrl: Boolean(siteUrl),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasTestUnlockEmailSecret: Boolean(testSecret),
    vercelCronSchedule: "0 14 * * *",
    vercelCronScheduleHeader: vercelCronSchedule,
    cronTimezone: "UTC",
    appTimeZone: APP_TIME_ZONE,
  });

  if (!resendApiKey) {
    console.error("[unlock-email-cron] Missing RESEND_API_KEY", { runId });
    return Response.json({ error: "Missing RESEND_API_KEY." }, { status: 500 });
  }

  if (!siteUrl) {
    console.error("[unlock-email-cron] Missing app URL", { runId });
    return Response.json(
      { error: "Missing NEXT_PUBLIC_SITE_URL or VERCEL_URL." },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(resendApiKey);
    const now = new Date();
    const today = dateInTimeZone(now, APP_TIME_ZONE);
    const logoUrl = new URL(LOGO_PATH, siteUrl).toString();
    let diagnostics: UnlockEmailDiagnostics | null = null;

    if (testEmail) {
      const template = buildCapsuleUnlockEmailTemplate({
        logoUrl,
        capsuleTitle: url.searchParams.get("title")?.trim() || "Test Capsule",
        unlockDate: formatEmailDate(today),
        unlockUrl: new URL("/capsule/test/unlock", siteUrl).toString(),
        memoryCount: 3,
      });
      const emailResponse = dryRun
        ? null
        : await sendEmailViaResend({
            resend,
            from: fromEmail,
            to: testEmail,
            subject: "Your capsule is ready to open \uD83D\uDC8C",
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
        appTimeZone: APP_TIME_ZONE,
        sentTo: dryRun ? null : testEmail,
        resendId: emailResponse?.data?.id ?? null,
      });
    }

    const supabase = getSupabaseAdminClient();
    const emailCache = new Map<string, string | null>();
    const displayNameCache = new Map<string, string | null>();
    diagnostics = await logUnlockEmailDiagnostics({
      supabase,
      today,
      runId,
    });

    const memoryResult = await sendMemoryUnlockEmails({
      supabase,
      resend,
      today,
      siteUrl,
      logoUrl,
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
      logoUrl,
      from: fromEmail,
      emailCache,
      displayNameCache,
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
      diagnostics,
    });

    return Response.json({
      ok: failed === 0,
      date: today,
      appTimeZone: APP_TIME_ZONE,
      dryRun,
      runId,
      memories: memoryResult,
      capsules: capsuleResult,
      diagnostics,
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
  logoUrl: string;
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
      const template = buildMemoryUnlockEmailTemplate({
        logoUrl: input.logoUrl,
        memoryTitle: memory.title,
        unlockDate: formatEmailDate(memory.unlock_date),
        unlockUrl: memoryLink,
        previewImageUrl: firstImageUrl(memory),
      });

      console.log("[unlock-email-cron] Attempting memory email", {
        runId: input.runId,
        memoryId: memory.id,
        title: memory.title,
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
        subject: "Your memory is ready to unlock \uD83D\uDC8C",
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
  logoUrl: string;
  from: string;
  emailCache: Map<string, string | null>;
  displayNameCache: Map<string, string | null>;
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
      console.log("[unlock-email-cron] Processing capsule", {
        runId: input.runId,
        capsuleId: capsule.id,
        title: capsule.title,
        ownerUserId: capsule.owner_user_id,
        unlockDate: capsule.unlock_date,
      });

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
      const memoryCount = await countCapsuleMemories(input.supabase, capsule.id);
      const template = buildCapsuleUnlockEmailTemplate({
        logoUrl: input.logoUrl,
        capsuleTitle: capsule.title,
        unlockDate: formatEmailDate(capsule.unlock_date),
        unlockUrl: unlockLink,
        memoryCount,
      });

      console.log("[unlock-email-cron] Owner email found; attempting capsule email", {
        runId: input.runId,
        capsuleId: capsule.id,
        title: capsule.title,
        unlockDate: capsule.unlock_date,
        memoryCount,
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
        subject: "Your capsule is ready to open \uD83D\uDC8C",
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

  const giftRows = await fetchUnsentGiftCapsules(input.supabase, input.today);
  result.found += giftRows.length;

  console.log("[unlock-email-cron] Gift capsules ready for email", {
    runId: input.runId,
    today: input.today,
    found: giftRows.length,
  });

  for (const capsule of giftRows) {
    try {
      const recipient = capsule.recipient_email?.trim().toLowerCase() || null;
      if (!recipient) {
        result.skippedNoUser += 1;
        console.warn("[unlock-email-cron] Skipping gift capsule without recipient email", {
          runId: input.runId,
          capsuleId: capsule.id,
        });
        continue;
      }

      const ownerEmail = await getUserEmail(input.supabase, capsule.owner_user_id, input.emailCache);
      const ownerDisplayName = await getUserDisplayName(
        input.supabase,
        capsule.owner_user_id,
        input.displayNameCache
      );
      const unlockLink = new URL(`/capsule/${capsule.share_slug}/unlock`, input.siteUrl).toString();

      console.log("[unlock-email-cron] Processing gift capsule", {
        runId: input.runId,
        capsuleId: capsule.id,
        title: capsule.title,
        ownerUserId: capsule.owner_user_id,
        unlockDate: capsule.unlock_date,
        recipient,
        hasOwnerEmail: Boolean(ownerEmail),
      });

      if (input.dryRun) {
        result.skippedDryRun += 1;
        continue;
      }

      const claimed = await claimGiftCapsuleEmailAttempt({
        supabase: input.supabase,
        id: capsule.id,
        runId: input.runId,
      });
      if (!claimed) {
        result.skippedClaimed += 1;
        continue;
      }

      if (!capsule.recipient_email_sent_at) {
        const template = buildGiftCapsuleRecipientEmailTemplate({
          logoUrl: input.logoUrl,
          recipientName: capsule.recipient_name,
          ownerDisplayName,
          recipientNote: capsule.recipient_note,
          unlockUrl: unlockLink,
        });
        const emailResponse = await sendEmailViaResend({
          resend: input.resend,
          from: input.from,
          to: recipient,
          subject: "Your friends made you something for your birthday \uD83D\uDC8C",
          text: template.text,
          react: template.react,
          runId: input.runId,
          recordType: "gift-capsule-recipient",
          recordId: capsule.id,
        });

        await markGiftCapsuleEmailSent({
          supabase: input.supabase,
          id: capsule.id,
          column: "recipient_email_sent_at",
          runId: input.runId,
          resendId: emailResponse.data?.id ?? null,
        });
        result.sent += 1;
      }

      if (!capsule.owner_gift_confirmation_sent_at) {
        if (!ownerEmail) {
          result.skippedNoUser += 1;
          console.warn("[unlock-email-cron] Skipping gift owner confirmation without owner email", {
            runId: input.runId,
            capsuleId: capsule.id,
            userId: capsule.owner_user_id,
          });
          continue;
        }

        const template = buildGiftCapsuleOwnerConfirmationEmailTemplate({
          logoUrl: input.logoUrl,
          recipientName: capsule.recipient_name,
        });
        const emailResponse = await sendEmailViaResend({
          resend: input.resend,
          from: input.from,
          to: ownerEmail,
          subject: "Your gift capsule was sent \uD83D\uDC8C",
          text: template.text,
          react: template.react,
          runId: input.runId,
          recordType: "gift-capsule-owner-confirmation",
          recordId: capsule.id,
        });

        await markGiftCapsuleEmailSent({
          supabase: input.supabase,
          id: capsule.id,
          column: "owner_gift_confirmation_sent_at",
          runId: input.runId,
          resendId: emailResponse.data?.id ?? null,
        });
        result.sent += 1;
      }
    } catch (error) {
      result.failed += 1;
      await saveEmailFailure({
        supabase: input.supabase,
        table: "capsules",
        id: capsule.id,
        error,
      });
      console.error("[unlock-email-cron] Failed gift capsule email", {
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
    .select("id, user_id, title, unlock_date, media_url, media_urls")
    .lte("unlock_date", today)
    .eq("unlocked_email_sent", false)
    .not("user_id", "is", null)
    .order("unlock_date", { ascending: true })
    .limit(MAX_RECORDS_PER_TYPE);

  if (error) {
    throw new Error(`Failed to query memories: ${error.message}`);
  }

  return (data ?? []) as MemoryUnlockRow[];
}

async function logUnlockEmailDiagnostics(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  today: string;
  runId: string;
}): Promise<UnlockEmailDiagnostics | null> {
  try {
    const [
      dueMemories,
      unsentMemories,
      unsentMemoriesWithUser,
      dueCapsules,
      unsentOwnerCapsules,
      unsentGiftCapsules,
    ] = await Promise.all([
      countRows(
        input.supabase
          .from("memories")
          .select("id", { count: "exact", head: true })
          .lte("unlock_date", input.today)
      ),
      countRows(
        input.supabase
          .from("memories")
          .select("id", { count: "exact", head: true })
          .lte("unlock_date", input.today)
          .eq("unlocked_email_sent", false)
      ),
      countRows(
        input.supabase
          .from("memories")
          .select("id", { count: "exact", head: true })
          .lte("unlock_date", input.today)
          .eq("unlocked_email_sent", false)
          .not("user_id", "is", null)
      ),
      countRows(
        input.supabase
          .from("capsules")
          .select("id", { count: "exact", head: true })
          .lte("unlock_date", input.today)
      ),
      countRows(
        input.supabase
          .from("capsules")
          .select("id", { count: "exact", head: true })
          .lte("unlock_date", input.today)
          .eq("is_gift", false)
          .is(CAPSULE_SENT_COLUMN, null)
      ),
      countRows(
        input.supabase
          .from("capsules")
          .select("id", { count: "exact", head: true })
          .lte("unlock_date", input.today)
          .eq("is_gift", true)
          .not("recipient_email", "is", null)
          .or("recipient_email_sent_at.is.null,owner_gift_confirmation_sent_at.is.null")
      ),
    ]);

    const diagnostics = {
      memories: {
        due: dueMemories,
        unsent: unsentMemories,
        unsentWithUser: unsentMemoriesWithUser,
      },
      capsules: {
        due: dueCapsules,
        unsentOwner: unsentOwnerCapsules,
        unsentGift: unsentGiftCapsules,
      },
    };

    console.log("[unlock-email-cron] Query diagnostics", {
      runId: input.runId,
      today: input.today,
      ...diagnostics,
    });

    return diagnostics;
  } catch (error) {
    console.error("[unlock-email-cron] Query diagnostics failed", {
      runId: input.runId,
      today: input.today,
      error,
    });
    return null;
  }
}

async function countRows(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>
) {
  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countCapsuleMemories(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  capsuleId: string
) {
  const { count, error } = await supabase
    .from("capsule_memories")
    .select("id", { count: "exact", head: true })
    .eq("capsule_id", capsuleId);

  if (error) {
    console.warn("[unlock-email-cron] Could not count capsule memories", {
      capsuleId,
      error: error.message,
    });
    return null;
  }

  return count ?? 0;
}

async function fetchUnsentCapsules(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  today: string
) {
  const { data, error } = await supabase
    .from("capsules")
    .select("id, share_slug, owner_user_id, title, unlock_date")
    .lte("unlock_date", today)
    .eq("is_gift", false)
    .is(CAPSULE_SENT_COLUMN, null)
    .order("unlock_date", { ascending: true })
    .limit(MAX_RECORDS_PER_TYPE);

  if (error) {
    throw new Error(`Failed to query capsules: ${error.message}`);
  }

  return (data ?? []) as CapsuleUnlockRow[];
}

async function fetchUnsentGiftCapsules(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  today: string
) {
  const { data, error } = await supabase
    .from("capsules")
    .select("id, share_slug, owner_user_id, title, unlock_date, recipient_name, recipient_email, recipient_note, recipient_email_sent_at, owner_gift_confirmation_sent_at")
    .lte("unlock_date", today)
    .eq("is_gift", true)
    .not("recipient_email", "is", null)
    .or("recipient_email_sent_at.is.null,owner_gift_confirmation_sent_at.is.null")
    .order("unlock_date", { ascending: true })
    .limit(MAX_RECORDS_PER_TYPE);

  if (error) {
    throw new Error(`Failed to query gift capsules: ${error.message}`);
  }

  return (data ?? []) as GiftCapsuleUnlockRow[];
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

async function getUserDisplayName(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  cache: Map<string, string | null>
) {
  if (cache.has(userId)) {
    return cache.get(userId) ?? null;
  }

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) {
    console.warn("[unlock-email-cron] Could not resolve user display name", {
      userId,
      error: error?.message ?? null,
    });
    cache.set(userId, null);
    return null;
  }

  const metadata = data.user.user_metadata as Record<string, unknown>;
  const displayName = ["full_name", "name", "display_name"]
    .map((key) => metadata[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim() ?? null;

  cache.set(userId, displayName);
  return displayName;
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
  const now = new Date().toISOString();
  const update =
    input.table === "memories"
      ? {
          unlocked_email_sent: true,
          unlocked_email_sent_at: now,
          unlock_email_sent_at: now,
          unlock_email_last_error: null,
        }
      : {
          capsule_unlock_email_sent_at: now,
          unlock_email_sent_at: now,
          unlock_email_last_error: null,
        };
  const query = input.supabase
    .from(input.table)
    .update(update)
    .eq("id", input.id)
    .select("id");

  const { data, error } =
    input.table === "memories"
      ? await query.eq("unlocked_email_sent", false).maybeSingle()
      : await query.is(CAPSULE_SENT_COLUMN, null).maybeSingle();

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

async function markGiftCapsuleEmailSent(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  id: string;
  column: "recipient_email_sent_at" | "owner_gift_confirmation_sent_at";
  runId: string;
  resendId: string | null;
}) {
  const now = new Date().toISOString();
  const { data, error } = await input.supabase
    .from("capsules")
    .update({
      [input.column]: now,
      unlock_email_last_error: null,
    })
    .eq("id", input.id)
    .is(input.column, null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed marking gift capsule ${input.id} ${input.column}: ${error.message}`);
  }

  if (!data) {
    console.warn("[unlock-email-cron] Gift email sent but row was already marked by another run", {
      runId: input.runId,
      id: input.id,
      column: input.column,
      resendId: input.resendId,
    });
    return;
  }

  console.log("[unlock-email-cron] Marked gift email as sent", {
    runId: input.runId,
    id: input.id,
    column: input.column,
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
  const query = input.supabase
    .from(input.table)
    .update({
      unlock_email_attempted_at: new Date().toISOString(),
      unlock_email_last_error: null,
    })
    .eq("id", input.id)
    .or(`unlock_email_attempted_at.is.null,unlock_email_attempted_at.lt.${staleCutoff}`)
    .select("id");

  const { data, error } =
    input.table === "memories"
      ? await query.eq("unlocked_email_sent", false).maybeSingle()
      : await query.is(CAPSULE_SENT_COLUMN, null).maybeSingle();

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

async function claimGiftCapsuleEmailAttempt(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  id: string;
  runId: string;
}) {
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await input.supabase
    .from("capsules")
    .update({
      unlock_email_attempted_at: new Date().toISOString(),
      unlock_email_last_error: null,
    })
    .eq("id", input.id)
    .eq("is_gift", true)
    .or("recipient_email_sent_at.is.null,owner_gift_confirmation_sent_at.is.null")
    .or(`unlock_email_attempted_at.is.null,unlock_email_attempted_at.lt.${staleCutoff}`)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed claiming gift capsule ${input.id}: ${error.message}`);
  }

  if (!data) {
    console.warn("[unlock-email-cron] Skipping gift capsule already claimed by another run", {
      runId: input.runId,
      id: input.id,
    });
    return false;
  }

  console.log("[unlock-email-cron] Claimed gift capsule email attempt", {
    runId: input.runId,
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
  const sentColumn =
    input.table === "memories" ? "unlock_email_sent_at" : CAPSULE_SENT_COLUMN;
  const { error } = await input.supabase
    .from(input.table)
    .update({ unlock_email_last_error: message.slice(0, 1000) })
    .eq("id", input.id)
    .is(sentColumn, null);

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

function formatEmailDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

function firstImageUrl(memory: MemoryUnlockRow) {
  const mediaUrls = Array.isArray(memory.media_urls)
    ? memory.media_urls.filter((item): item is string => typeof item === "string")
    : [];
  const firstUrl = [...mediaUrls, memory.media_url]
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .find((url) => !isVideoUrl(url));

  return firstUrl ?? null;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes("video");
}

function dateInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return dateOnly(value);
  }

  return `${year}-${month}-${day}`;
}
