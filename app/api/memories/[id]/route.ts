import { deleteTimelineMemory } from "@/lib/store";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;

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