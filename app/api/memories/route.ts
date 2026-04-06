import { createTimelineMemory, listTimelineMemories } from "@/lib/store";

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

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET() {
  try {
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
    const body = (await request.json()) as CreateMemoryRequest;

    const payload = {
      title: body.title?.trim() ?? "",
      message: body.message?.trim() ?? "",
      unlockDate: body.unlockDate?.trim() ?? "",
      media: Array.isArray(body.media)
        ? body.media
            .filter((item) => item && typeof item.name === "string")
            .map((item) => ({
              name: item.name?.trim() ?? "",
              type: item.type?.trim() ?? "",
              size: typeof item.size === "number" ? item.size : 0,
            }))
            .filter((item) => item.name)
        : [],
    };

    console.log("Create memory payload:", payload);

    if (!payload.title) {
      return Response.json(
        { message: "Title is required." },
        { status: 400 }
      );
    }

    if (!payload.message) {
      return Response.json(
        { message: "Message is required." },
        { status: 400 }
      );
    }

    if (!isValidDateString(payload.unlockDate)) {
      return Response.json(
        { message: "A valid unlock date is required." },
        { status: 400 }
      );
    }

    const memory = await createTimelineMemory({
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      unlockDate: payload.unlockDate,
      media: payload.media,
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
