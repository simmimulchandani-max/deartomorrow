import type { NextRequest } from "next/server";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getStorageBucketName } from "@/lib/storageBucket";
import { isSafeIdentifier } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { id } = await context.params;

    if (!id || !isSafeIdentifier(id)) {
      return Response.json(
        { error: "Missing memory id." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: memory, error: memoryError } = await supabase
      .from("memories")
      .select("id, user_id, media_url, media_urls")
      .eq("id", id)
      .maybeSingle();

    if (memoryError) {
      return Response.json(
        { error: memoryError.message },
        { status: 500 }
      );
    }

    if (!memory) {
      return Response.json(
        { error: "Memory not found." },
        { status: 404 }
      );
    }

    if (!memory.user_id || memory.user_id !== auth.user.id) {
      return Response.json(
        { error: "You do not have permission to delete this memory." },
        { status: 403 }
      );
    }

    const bucket = getStorageBucketName();
    const folder = `memories/${id}`;

    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 1000,
      });

    if (listError) {
      console.error("List storage files error:", { memoryId: id, error: listError });
    }

    const listedFilePaths = (files ?? [])
      .filter((file) => file.name)
      .map((file) => `${folder}/${file.name}`);
    const mediaUrls = Array.isArray(memory.media_urls)
      ? memory.media_urls.filter((item): item is string => typeof item === "string")
      : [];
    const storedUrlPaths = [...mediaUrls, memory.media_url]
      .filter((item): item is string => typeof item === "string" && item.length > 0)
      .map((url) => extractStoragePath(url, bucket))
      .filter((path): path is string => path !== null && path.startsWith(`${folder}/`));
    const filePaths = Array.from(new Set([...listedFilePaths, ...storedUrlPaths]));

    if (filePaths.length > 0) {
      const { error: removeFilesError } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (removeFilesError) {
        console.error("Remove storage files error:", {
          memoryId: id,
          filePaths,
          error: removeFilesError,
        });
      }
    }

    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (deleteError) {
      return Response.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete memory error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete memory.",
      },
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
