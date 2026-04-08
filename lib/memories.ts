import { getSupabaseClient } from "@/lib/supabaseClient";

const SUPABASE_STORAGE_BUCKET = "dear tomorrow";

type RawMemoryRecord = {
  id: string;
  title: string;
  message: string;
  unlock_date: string;
  media_url?: string | null;
  created_at?: string | null;
  media_urls?: unknown;
};

export type SharedMemory = {
  id: string;
  title: string;
  message: string;
  unlockDate: string;
  mediaUrl: string | null;
  mediaUrls: string[];
  createdAt: string | null;
};

export async function getMemoryById(memoryId: string): Promise<SharedMemory | null> {
  const supabase = getSupabaseClient();
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
    mediaUrl: row.media_url ?? null,
    mediaUrls: storageMediaUrls.length > 0 ? storageMediaUrls : fallbackMediaUrls,
    createdAt: row.created_at ?? null,
  };
}

async function listMemoryMediaUrls(memoryId: string) {
  const supabase = getSupabaseClient();
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
