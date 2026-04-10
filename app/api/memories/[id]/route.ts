import { deleteTimelineMemory } from "@/lib/store";
import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: "Missing memory id." },
        { status: 400 }
      );
    }

    await deleteTimelineMemory(id);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete memory error:", error);

    return Response.json(
      { error: "Failed to delete memory." },
      { status: 500 }
    );
  }
}