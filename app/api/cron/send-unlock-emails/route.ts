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
};

type CapsuleUnlockRow = {
  id: string;
  share_slug: string;
  owner_user_id: string;
};

type SendResult = {
  sent: number;
  skippedNoUser: number;
  failed: number;
};

const MAX_RECORDS_PER_TYPE = 200;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (!resendApiKey) {
    return Response.json({ error: "Missing RESEND_API_KEY." }, { status: 500 });
  }

  if (!siteUrl) {
    return Response.json({ error: "Missing NEXT_PUBLIC_SITE_URL." }, { status: 500 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const resend = new Resend(resendApiKey);
    const today = dateOnly(new Date());
    const emailCache = new Map<string, string | null>();

    const memoryResult = await sendMemoryUnlockEmails({
      supabase,
      resend,
      today,
      siteUrl,
      emailCache,
    });
    const capsuleResult = await sendCapsuleUnlockEmails({
      supabase,
      resend,
      today,
      siteUrl,
      emailCache,
    });

    return Response.json({
      ok: true,
      date: today,
      memories: memoryResult,
      capsules: capsuleResult,
    });
  } catch (error) {
    console.error("Cron send-unlock-emails error:", error);
    return Response.json(
      {
        ok: false,
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
  emailCache: Map<string, string | null>;
}) {
  const rows = await fetchUnsentMemories(input.supabase, input.today);
  const result: SendResult = { sent: 0, skippedNoUser: 0, failed: 0 };

  for (const memory of rows) {
    if (!memory.user_id) {
      result.skippedNoUser += 1;
      continue;
    }

    try {
      const recipient = await getUserEmail(input.supabase, memory.user_id, input.emailCache);
      if (!recipient) {
        result.skippedNoUser += 1;
        continue;
      }

      const memoryLink = new URL(`/memory/${memory.id}`, input.siteUrl).toString();
      const template = buildMemoryUnlockEmailTemplate(memoryLink);
      await sendEmailViaResend({
        resend: input.resend,
        to: recipient,
        subject: "Your memory is ready to open",
        text: template.text,
        react: template.react,
      });

      const { error } = await input.supabase
        .from("memories")
        .update({ unlock_email_sent_at: new Date().toISOString() })
        .eq("id", memory.id)
        .is("unlock_email_sent_at", null);

      if (error) {
        throw new Error(error.message);
      }

      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Failed sending memory unlock email for ${memory.id}:`, error);
    }
  }

  return result;
}

async function sendCapsuleUnlockEmails(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  resend: Resend;
  today: string;
  siteUrl: string;
  emailCache: Map<string, string | null>;
}) {
  const rows = await fetchUnsentCapsules(input.supabase, input.today);
  const result: SendResult = { sent: 0, skippedNoUser: 0, failed: 0 };

  for (const capsule of rows) {
    try {
      const recipient = await getUserEmail(input.supabase, capsule.owner_user_id, input.emailCache);
      if (!recipient) {
        result.skippedNoUser += 1;
        continue;
      }

      const unlockLink = new URL(`/capsule/${capsule.share_slug}/unlock`, input.siteUrl).toString();
      const template = buildCapsuleUnlockEmailTemplate(unlockLink);
      await sendEmailViaResend({
        resend: input.resend,
        to: recipient,
        subject: "Your capsule is ready to unlock",
        text: template.text,
        react: template.react,
      });

      const { error } = await input.supabase
        .from("capsules")
        .update({ unlock_email_sent_at: new Date().toISOString() })
        .eq("id", capsule.id)
        .is("unlock_email_sent_at", null);

      if (error) {
        throw new Error(error.message);
      }

      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Failed sending capsule unlock email for ${capsule.id}:`, error);
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
    .select("id, user_id")
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
    .select("id, share_slug, owner_user_id")
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
    cache.set(userId, null);
    return null;
  }

  const email = data.user.email.trim().toLowerCase();
  cache.set(userId, email);
  return email;
}

async function sendEmailViaResend(input: {
  resend: Resend;
  to: string;
  subject: string;
  text: string;
  react: React.ReactElement;
}) {
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Until Tomorrow <onboarding@resend.dev>";
  const { error } = await input.resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    react: input.react,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
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
