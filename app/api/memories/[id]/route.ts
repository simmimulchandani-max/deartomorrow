import type { NextRequest } from "next/server";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { removeMediaFolder } from "@/lib/privateMedia";
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

    const folder = `memories/${id}`;
    const mediaUrls = Array.isArray(memory.media_urls)
      ? memory.media_urls.filter((item): item is string => typeof item === "string")
      : [];
    try {
      await removeMediaFolder(folder, [...mediaUrls, memory.media_url].filter(
        (item): item is string => typeof item === "string" && item.length > 0
      ));
    } catch (error) {
      console.error("Remove storage files error:", { memoryId: id, error });
      return Response.json({ error: "Failed to delete memory media files." }, { status: 500 });
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
