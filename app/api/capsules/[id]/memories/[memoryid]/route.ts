import { getCapsuleByShareSlug } from "@/lib/capsules";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { removeMediaFolder } from "@/lib/privateMedia";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isSafeIdentifier } from "@/lib/validation";

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/capsules/[id]/memories/[memoryid]">
) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { id, memoryid } = await context.params;

    if (!isSafeIdentifier(id) || !isSafeIdentifier(memoryid)) {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (capsule.ownerUserId !== auth.user.id) {
      return Response.json(
        { error: "Only the capsule owner can delete this memory." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: memory, error: memoryError } = await supabase
      .from("capsule_memories")
      .select("id, media_url, media_urls")
      .eq("id", memoryid)
      .eq("capsule_id", capsule.id)
      .maybeSingle();

    if (memoryError) {
      return Response.json({ error: memoryError.message }, { status: 500 });
    }

    if (!memory) {
      return Response.json({ error: "Memory not found." }, { status: 404 });
    }

    const folder = `capsules/${capsule.id}/${memory.id}`;
    const storedUrls = Array.isArray(memory.media_urls)
      ? memory.media_urls.filter((value): value is string => typeof value === "string")
      : [];
    try {
      await removeMediaFolder(folder, [...storedUrls, memory.media_url].filter(
        (value): value is string => typeof value === "string"
      ));
    } catch {
      return Response.json({ error: "Failed to delete memory media files." }, { status: 500 });
    }

    const { error } = await supabase
      .from("capsule_memories")
      .delete()
      .eq("id", memoryid)
      .eq("capsule_id", capsule.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete capsule memory error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete capsule memory.",
      },
      { status: 500 }
    );
  }
}
