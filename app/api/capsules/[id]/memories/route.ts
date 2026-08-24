import {
  createCapsuleMemory,
  getCapsuleByShareSlug,
} from "@/lib/capsules";
import {
  CONTRIBUTOR_NAME_MAX,
  MEMORY_MESSAGE_MAX,
  MEMORY_TITLE_MAX,
  dateOnly,
  filterTrustedPrivateMediaPaths,
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return Response.json({ error: "JSON body is required." }, { status: 415 });
    }

    let body: CreateCapsuleMemoryRequest;
    try {
      body = (await request.json()) as CreateCapsuleMemoryRequest;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const memoryId =
      typeof body.memoryId === "string" && body.memoryId.trim()
        ? body.memoryId.trim()
        : crypto.randomUUID();
    const contributorName = body.contributorName?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    const trustedMediaUrls = filterTrustedPrivateMediaPaths(
      mediaUrls,
      `capsules/${capsule.id}/${memoryId}/`
    );

    if (!UUID_PATTERN.test(memoryId)) {
      console.error("Create capsule memory invalid memory id:", { memoryId, capsuleId: capsule.id });
      return Response.json({ error: "Invalid memory id." }, { status: 400 });
    }

    if (!contributorName || !title || !message) {
      return Response.json(
        { error: "Your name, title, and message are required." },
        { status: 400 }
      );
    }

    const contributorNameError = validateTextLength(
      contributorName,
      "Your name",
      CONTRIBUTOR_NAME_MAX
    );
    if (contributorNameError) {
      return Response.json({ error: contributorNameError }, { status: 400 });
    }

    const titleError = validateTextLength(title, "Title", MEMORY_TITLE_MAX);
    if (titleError) {
      return Response.json({ error: titleError }, { status: 400 });
    }

    const messageError = validateTextLength(message, "Message", MEMORY_MESSAGE_MAX);
    if (messageError) {
      return Response.json({ error: messageError }, { status: 400 });
    }

    if (trustedMediaUrls.length !== mediaUrls.length) {
      console.error("Create capsule memory rejected untrusted media URLs:", {
        capsuleId: capsule.id,
        memoryId,
        mediaUrls,
      });
      return Response.json(
        { error: "One or more uploaded media URLs are invalid for this capsule." },
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

    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    console.error("Create capsule memory error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit memory.",
      },
      { status: 500 }
    );
  }
}
