import { getCapsuleByShareSlug, listCapsuleMemories } from "@/lib/capsules";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { getStorageBucketName } from "@/lib/storageBucket";
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
    const bucket = getStorageBucketName();
    const memories = await listCapsuleMemories(capsule.id);
    const storagePaths = new Set<string>();

    for (const memory of memories) {
      for (const mediaUrl of memory.mediaUrls) {
        const path = extractStoragePath(mediaUrl, bucket);
        if (path?.startsWith(`capsules/${capsule.id}/${memory.id}/`)) {
          storagePaths.add(path);
        }
      }

      const folder = `capsules/${capsule.id}/${memory.id}`;
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(folder, { limit: 1000 });

      if (listError) {
        return Response.json(
          { error: "Failed to inspect capsule media files." },
          { status: 500 }
        );
      }

      for (const file of files ?? []) {
        if (file.name) {
          storagePaths.add(`${folder}/${file.name}`);
        }
      }
    }

    if (storagePaths.size > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(Array.from(storagePaths));

      if (removeError) {
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

function extractStoragePath(publicUrl: string, bucket: string) {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}
