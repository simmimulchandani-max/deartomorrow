import { getCapsuleByShareSlug, listCapsuleMemories } from "@/lib/capsules";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { removeMediaFolder } from "@/lib/privateMedia";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { dateOnly, isSafeIdentifier } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    return Response.json({
      capsule: {
        shareSlug: capsule.shareSlug,
        title: capsule.title,
        description: capsule.description,
        submissionDeadline: capsule.submissionDeadline,
        unlockDate: capsule.unlockDate,
        submissionsOpen: capsule.submissionDeadline >= dateOnly(new Date()),
      },
    });
  } catch (error) {
    console.error("Get public capsule error:", error);
    return Response.json({ error: "Failed to load capsule." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { id } = await context.params;
    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (capsule.ownerUserId !== auth.user.id) {
      return Response.json(
        { error: "Only the capsule owner can delete this capsule." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const memories = await listCapsuleMemories(capsule.id);

    for (const memory of memories) {
      const folder = `capsules/${capsule.id}/${memory.id}`;
      try {
        await removeMediaFolder(folder, memory.mediaUrls);
      } catch {
        return Response.json(
          { error: "Failed to delete capsule media files." },
          { status: 500 }
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("capsules")
      .delete()
      .eq("id", capsule.id)
      .eq("owner_user_id", auth.user.id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete capsule error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete capsule." },
      { status: 500 }
    );
  }
}
