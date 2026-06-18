import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getCapsuleByShareSlug } from "@/lib/capsules";
import { isSafeIdentifier } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
    memoryId: string;
  }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id, memoryId } = await context.params;

    if (!isSafeIdentifier(id) || !isSafeIdentifier(memoryId)) {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("capsule_memories")
      .delete()
      .eq("id", memoryId)
      .eq("capsule_id", capsule.id);

    if (error) {
      throw new Error(error.message);
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