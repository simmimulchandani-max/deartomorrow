import { createCapsuleMemory, getCapsuleByShareSlug } from "@/lib/capsules";
import {
  CONTRIBUTOR_NAME_MAX,
  MEMORY_MESSAGE_MAX,
  MEMORY_TITLE_MAX,
  dateOnly,
  filterTrustedPublicUrls,
  isSafeIdentifier,
  validateTextLength,
} from "@/lib/validation";

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
    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (capsule.submissionDeadline < dateOnly(new Date())) {
      return Response.json(
        { error: "This capsule is closed for submissions." },
        { status: 403 }
      );
    }

    let body: CreateCapsuleMemoryRequest;
    try {
      body = (await request.json()) as CreateCapsuleMemoryRequest;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const memoryId =
      typeof body.memoryId === "string" && isSafeIdentifier(body.memoryId.trim())
        ? body.memoryId.trim()
        : undefined;
    const contributorName = body.contributorName?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    const trustedMediaUrls = memoryId
      ? filterTrustedPublicUrls(mediaUrls, `capsules/${capsule.id}/${memoryId}/`)
      : [];

    if (!contributorName || !title || !message) {
      return Response.json(
        { error: "Your name, memory title, and message are required." },
        { status: 400 }
      );
    }

    if (!memoryId && mediaUrls.length > 0) {
      return Response.json(
        { error: "Attachment metadata is invalid for this submission." },
        { status: 400 }
      );
    }

    const contributorError = validateTextLength(
      contributorName,
      "Your name",
      CONTRIBUTOR_NAME_MAX
    );
    if (contributorError) {
      return Response.json({ error: contributorError }, { status: 400 });
    }

    const titleError = validateTextLength(title, "Memory title", MEMORY_TITLE_MAX);
    if (titleError) {
      return Response.json({ error: titleError }, { status: 400 });
    }

    const messageError = validateTextLength(message, "Message", MEMORY_MESSAGE_MAX);
    if (messageError) {
      return Response.json({ error: messageError }, { status: 400 });
    }

    if (memoryId && trustedMediaUrls.length !== mediaUrls.length) {
      return Response.json(
        { error: "One or more media URLs are invalid for this capsule memory." },
        { status: 400 }
      );
    }

    const memory = await createCapsuleMemory({
      id: memoryId,
      capsuleId: capsule.id,
      contributorName,
      title,
      message,
      mediaUrls: trustedMediaUrls,
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
