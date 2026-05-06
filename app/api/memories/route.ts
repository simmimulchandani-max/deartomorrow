import { createTimelineMemory, listTimelineMemories } from "@/lib/store";
import { requireUserFromRequest } from "@/lib/serverAuth";
import {
  MEMORY_MESSAGE_MAX,
  MEMORY_TITLE_MAX,
  dateOnly,
  isValidDateString,
  validateTextLength,
} from "@/lib/validation";

type CreateMemoryRequest = {
  title?: string;
  message?: string;
  unlockDate?: string;
  media?: Array<{
    name?: string;
    type?: string;
    size?: number;
  }>;
};

export async function GET(request: Request) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const memories = await listTimelineMemories();
    return Response.json({ memories });
  } catch (error) {
    console.error("List memories error:", error);
    return Response.json(
      { message: "Failed to load memories." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response) {
      return auth.response;
    }

    let body: CreateMemoryRequest;
    try {
      body = (await request.json()) as CreateMemoryRequest;
    } catch {
      return Response.json({ message: "Invalid JSON payload." }, { status: 400 });
    }
    const title = body.title?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const unlockDate = body.unlockDate?.trim() ?? "";
    const today = dateOnly(new Date());
    const media = Array.isArray(body.media)
      ? body.media
          .filter((item) => item && typeof item.name === "string")
          .map((item) => ({
            name: item.name?.trim() ?? "",
            type: item.type?.trim() ?? "",
            size: typeof item.size === "number" ? item.size : 0,
          }))
          .filter((item) => item.name)
      : [];

    if (!title || !message || !unlockDate) {
      return Response.json(
        { message: "Title, message, and unlock date are required." },
        { status: 400 }
      );
    }

    if (!isValidDateString(unlockDate) || unlockDate < today) {
      return Response.json(
        { message: "A valid future unlock date is required." },
        { status: 400 }
      );
    }

    const titleError = validateTextLength(title, "Title", MEMORY_TITLE_MAX);
    if (titleError) {
      return Response.json({ message: titleError }, { status: 400 });
    }

    const messageError = validateTextLength(message, "Message", MEMORY_MESSAGE_MAX);
    if (messageError) {
      return Response.json({ message: messageError }, { status: 400 });
    }

    const memory = await createTimelineMemory({
      id: crypto.randomUUID(),
      title,
      message,
      unlockDate,
      media,
    });

    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    console.error("Create memory error:", error);
    return Response.json(
      { message: "Failed to create memory." },
      { status: 500 }
    );
  }
}
