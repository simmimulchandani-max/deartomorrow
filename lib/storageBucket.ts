const DEFAULT_STORAGE_BUCKET = "dear-tomorrow";

export function getStorageBucketName() {
  return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;
}
