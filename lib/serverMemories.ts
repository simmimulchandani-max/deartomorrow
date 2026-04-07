import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const SUPABASE_STORAGE_BUCKET = "dear tomorrow";

type RawMemoryRecord = {
  id: string;
  title: string;
  message: string;
  unlock_date: string;
  media_url?: string | null;
  created_at?: string | null;
  media_urls?: unknown;
  password_hash?: string | null;
};

export type SharedMemorySummary = {
  id: string;
  title: string;
  unlockDate: string;
  createdAt: string | null;
  hasPassword: boolean;
};

export type SharedMemoryContent = SharedMemorySummary & {
  message: string;
  mediaUrl: string | null;
  mediaUrls: string[];
};

export async function getSharedMemorySummary(memoryId: string): Promise<SharedMemorySummary | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id, title, unlock_date, created_at, password_hash")
    .eq("id", memoryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    unlockDate: data.unlock_date,
    createdAt: data.created_at ?? null,
    hasPassword: Boolean(data.password_hash),
  };
}

export async function getSharedMemoryContent(memoryId: string): Promise<SharedMemoryContent | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("id", memoryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as RawMemoryRecord;
  const storageMediaUrls = await listMemoryMediaUrls(memoryId);
  const fallbackMediaUrls =
    Array.isArray(row.media_urls) && row.media_urls.every((item) => typeof item === "string")
      ? row.media_urls
      : row.media_url
        ? [row.media_url]
        : [];

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    unlockDate: row.unlock_date,
    createdAt: row.created_at ?? null,
    hasPassword: Boolean(row.password_hash),
    mediaUrl: row.media_url ?? null,
    mediaUrls: storageMediaUrls.length > 0 ? storageMediaUrls : fallbackMediaUrls,
  };
}

export async function getMemoryPasswordHash(memoryId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memories")
    .select("password_hash")
    .eq("id", memoryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.password_hash ?? null;
}

async function listMemoryMediaUrls(memoryId: string) {
  const supabase = getSupabaseAdminClient();
  const folder = `memories/${memoryId}`;
  const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).list(folder, {
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
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(`${folder}/${item.name}`);

      return publicUrlData.publicUrl;
    })
    .filter(Boolean);
}
