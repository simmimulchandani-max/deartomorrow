export const PRIVATE_MEDIA_BUCKET = "dear-tomorrow-private";

export function getPrivateMediaBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_PRIVATE_MEDIA_BUCKET?.trim() || PRIVATE_MEDIA_BUCKET;
}
