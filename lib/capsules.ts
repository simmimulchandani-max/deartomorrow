import "server-only";

import { getStorageBucketName } from "@/lib/storageBucket";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
export { dateOnly, hasDateArrived } from "@/lib/unlockDates";

export type CapsuleSummary = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  submissionDeadline: string;
  unlockDate: string;
  shareSlug: string;
  createdAt: string | null;
  isGift: boolean;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientNote: string | null;
};

export type CapsuleMemory = {
  id: string;
  capsuleId: string;
  contributorName: string;
  title: string;
  message: string;
  mediaUrl: string | null;
  mediaUrls: string[];
  createdAt: string | null;
};

type RawCapsule = {
  id: string;
  owner_user_id: string;
  title: string;
  description?: string | null;
  submission_deadline: string;
  unlock_date: string;
  share_slug: string;
  created_at?: string | null;
  is_gift?: boolean | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_note?: string | null;
};

type RawCapsuleMemory = {
  id: string;
  capsule_id: string;
  contributor_name: string;
  title: string;
  message: string;
  media_url?: string | null;
  media_urls?: unknown;
  created_at?: string | null;
};

export function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeCapsule(row: RawCapsule): CapsuleSummary {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description ?? null,
    submissionDeadline: row.submission_deadline,
    unlockDate: row.unlock_date,
    shareSlug: row.share_slug,
    createdAt: row.created_at ?? null,
    isGift: row.is_gift ?? false,
    recipientName: row.recipient_name ?? null,
    recipientEmail: row.recipient_email ?? null,
    recipientNote: row.recipient_note ?? null,
  };
}

export function normalizeCapsuleMemory(row: RawCapsuleMemory): CapsuleMemory {
  const mediaUrls =
    Array.isArray(row.media_urls) && row.media_urls.every((item) => typeof item === "string")
      ? row.media_urls
      : row.media_url
        ? [row.media_url]
        : [];

  return {
    id: row.id,
    capsuleId: row.capsule_id,
    contributorName: row.contributor_name,
    title: row.title,
    message: row.message,
    mediaUrl: row.media_url ?? null,
    mediaUrls,
    createdAt: row.created_at ?? null,
  };
}

export function buildCapsuleSharePath(shareSlug: string) {
  return `/capsule/${shareSlug}`;
}

export function buildCapsuleStatusPath(shareSlug: string) {
  return `/capsule/${shareSlug}/status`;
}

export function buildCapsuleUnlockPath(shareSlug: string) {
  return `/capsule/${shareSlug}/unlock`;
}

export function buildCapsuleMemoryPath(shareSlug: string, memoryId: string) {
  return `/capsule/${shareSlug}/memory/${memoryId}`;
}

export async function createCapsule(input: {
  ownerUserId: string;
  title: string;
  description: string | null;
  submissionDeadline: string;
  unlockDate: string;
  shareSlug: string;
  isGift?: boolean;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientNote?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("capsules")
    .insert({
      owner_user_id: input.ownerUserId,
      title: input.title,
      description: input.description,
      submission_deadline: input.submissionDeadline,
      unlock_date: input.unlockDate,
      share_slug: input.shareSlug,
      is_gift: input.isGift ?? false,
      recipient_name: input.isGift ? input.recipientName : null,
      recipient_email: input.isGift ? input.recipientEmail : null,
      recipient_note: input.isGift ? input.recipientNote : null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCapsule(data as RawCapsule);
}

export async function getCapsuleByShareSlug(shareSlug: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("capsules")
    .select("*")
    .eq("share_slug", shareSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeCapsule(data as RawCapsule) : null;
}

export async function listCapsulesForOwner(ownerUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("capsules")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RawCapsule[]).map(normalizeCapsule);
}

export async function countCapsuleMemories(capsuleId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("capsule_memories")
    .select("id", { count: "exact", head: true })
    .eq("capsule_id", capsuleId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function createCapsuleMemory(input: {
  id?: string;
  capsuleId: string;
  contributorName: string;
  title: string;
  message: string;
  mediaUrls: string[];
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("capsule_memories")
    .insert({
      id: input.id,
      capsule_id: input.capsuleId,
      contributor_name: input.contributorName,
      title: input.title,
      message: input.message,
      media_url: input.mediaUrls[0] ?? null,
      media_urls: input.mediaUrls,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Create capsule memory insert error:", {
      capsuleId: input.capsuleId,
      memoryId: input.id,
      mediaUrlCount: input.mediaUrls.length,
      error,
    });
    throw new Error(error.message);
  }

  return normalizeCapsuleMemory(data as RawCapsuleMemory);
}

export async function listCapsuleMemories(capsuleId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("capsule_memories")
    .select("*")
    .eq("capsule_id", capsuleId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RawCapsuleMemory[]).map(normalizeCapsuleMemory);
}

export async function getCapsuleMemory(memoryId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("capsule_memories")
    .select("*")
    .eq("id", memoryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeCapsuleMemory(data as RawCapsuleMemory) : null;
}

export async function listCapsuleMemoryMediaUrls(capsuleId: string, memoryId: string) {
  const supabase = getSupabaseAdminClient();
  const folder = `capsules/${capsuleId}/${memoryId}`;
  const storageBucket = getStorageBucketName();
  const { data, error } = await supabase.storage.from(storageBucket).list(folder, {
    limit: 100,
    sortBy: {
      column: "name",
      order: "asc",
    },
  });

  if (error || !data) {
    return [];
  }

  return data
    .filter((item) => item.name)
    .map((item) => {
      const { data: publicUrlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(`${folder}/${item.name}`);

      return publicUrlData.publicUrl;
    })
    .filter(Boolean);
}
