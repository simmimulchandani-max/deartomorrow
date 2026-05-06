import { createCapsuleMemory, getCapsuleByShareSlug, hasDateArrived } from "@/lib/capsules";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateCapsuleMemoryRequest = {
  memoryId?: string;
  contributorName?: string;
  title?: string;
  message?: string;
  mediaUrls?: string[];
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (hasDateArrived(nextDate(capsule.submissionDeadline))) {
      return Response.json(
        { error: "This capsule is closed for submissions." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateCapsuleMemoryRequest;
    const contributorName = body.contributorName?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];

    if (!contributorName || !title || !message) {
      return Response.json(
        { error: "Your name, memory title, and message are required." },
        { status: 400 }
      );
    }

    const memory = await createCapsuleMemory({
      id: body.memoryId,
      capsuleId: capsule.id,
      contributorName,
      title,
      message,
      mediaUrls,
    });

    return Response.json({ memory: { id: memory.id } }, { status: 201 });
  } catch (error) {
    console.error("Create capsule memory error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to submit memory." },
      { status: 500 }
    );
  }
}

function nextDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
