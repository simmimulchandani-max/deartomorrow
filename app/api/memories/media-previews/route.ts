import { createAuthorizedMediaUrls } from "@/lib/privateMedia";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { dateOnly, isSafeIdentifier } from "@/lib/validation";

type RequestBody = { ids?: string[] };

function isImageReference(value: string) {
  return /\.(avif|gif|heic|jpeg|jpg|png|webp)(?:$|[?#])/i.test(value);
}

export async function POST(request: Request) {
  const auth = await requireUserFromRequest(request);
  if (auth.response || !auth.user) return auth.response;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && isSafeIdentifier(id)).slice(0, 100)
    : [];
  if (ids.length === 0) return Response.json({ previews: {} });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id, media_url, media_urls")
    .eq("user_id", auth.user.id)
    .lte("unlock_date", dateOnly(new Date()))
    .is("password_hash", null)
    .in("id", ids);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const previews = Object.fromEntries(
    await Promise.all(
      (data ?? []).map(async (memory) => {
        const references = Array.isArray(memory.media_urls)
          ? memory.media_urls.filter((value): value is string => typeof value === "string")
          : memory.media_url
            ? [memory.media_url]
            : [];
        const imageReference = references.find(isImageReference);
        const [preview] = imageReference ? await createAuthorizedMediaUrls([imageReference]) : [];
        return [memory.id, preview ?? null] as const;
      })
    )
  );

  return Response.json({ previews });
}
