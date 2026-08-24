import "server-only";

import { getStorageBucketName } from "@/lib/storageBucket";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const PRIVATE_MEDIA_BUCKET = "dear-tomorrow-private";
export const MEDIA_SIGNED_URL_TTL_SECONDS = 10 * 60;

export function getPrivateMediaBucket() {
  return process.env.SUPABASE_PRIVATE_MEDIA_BUCKET?.trim() || PRIVATE_MEDIA_BUCKET;
}

export function isPrivateMediaPath(value: string, prefix?: string) {
  return !value.includes("://") && (!prefix || value.startsWith(prefix));
}

export function isTrustedPrivateMediaPaths(values: string[], prefix: string) {
  return values.filter((value) => isPrivateMediaPath(value, prefix));
}

export function extractLegacyPublicStoragePath(value: string) {
  try {
    const url = new URL(value);
    const bucket = getStorageBucketName();
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    return markerIndex === -1
      ? null
      : decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function createAuthorizedMediaUrls(references: string[]) {
  const supabase = getSupabaseAdminClient();
  const bucket = getPrivateMediaBucket();

  return Promise.all(
    references.map(async (reference) => {
      if (!isPrivateMediaPath(reference)) {
        return reference;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(reference, MEDIA_SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to create a media download URL.");
      }

      return data.signedUrl;
    })
  );
}

export async function removeMediaFolder(folder: string, references: string[]) {
  const supabase = getSupabaseAdminClient();
  const privateBucket = getPrivateMediaBucket();
  const legacyBucket = getStorageBucketName();
  const [privateResult, legacyResult] = await Promise.all([
    supabase.storage.from(privateBucket).list(folder, { limit: 1000 }),
    supabase.storage.from(legacyBucket).list(folder, { limit: 1000 }),
  ]);

  if (privateResult.error || legacyResult.error) {
    throw new Error("Failed to inspect media files for deletion.");
  }

  const privatePaths = new Set<string>([
    ...(privateResult.data ?? []).filter((file) => file.name).map((file) => `${folder}/${file.name}`),
    ...references.filter((reference) => isPrivateMediaPath(reference, `${folder}/`)),
  ]);
  const legacyPaths = new Set<string>([
    ...(legacyResult.data ?? []).filter((file) => file.name).map((file) => `${folder}/${file.name}`),
    ...references
      .map(extractLegacyPublicStoragePath)
      .filter((path): path is string => Boolean(path?.startsWith(`${folder}/`))),
  ]);

  const removals = await Promise.all([
    privatePaths.size > 0
      ? supabase.storage.from(privateBucket).remove([...privatePaths])
      : Promise.resolve({ error: null }),
    legacyPaths.size > 0
      ? supabase.storage.from(legacyBucket).remove([...legacyPaths])
      : Promise.resolve({ error: null }),
  ]);

  if (removals.some((result) => result.error)) {
    throw new Error("Failed to delete media files.");
  }
}
