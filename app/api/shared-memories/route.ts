import { hashMemoryPassword } from "@/lib/memorySecurity";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CreateSharedMemoryRequest = {
  id?: string;
  title?: string;
  message?: string;
  unlockDate?: string;
  mediaUrl?: string | null;
  password?: string;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSharedMemoryRequest;
    const id = body.id?.trim() ?? crypto.randomUUID();
    const title = body.title?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const unlockDate = body.unlockDate?.trim() ?? "";
    const mediaUrl = body.mediaUrl?.trim() ?? null;
    const password = body.password?.trim() ?? "";

    if (!title || !message || !unlockDate) {
      return Response.json(
        { error: "Title, message, and unlock date are required." },
        { status: 400 }
      );
    }

    if (!isValidDateString(unlockDate)) {
      return Response.json(
        { error: "A valid unlock date is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const passwordHash = password ? hashMemoryPassword(password) : null;

    const { data, error } = await supabase
      .from("memories")
      .insert({
        id,
        title,
        message,
        unlock_date: unlockDate,
        media_url: mediaUrl,
        password_hash: passwordHash,
      })
      .select("id, title, message, unlock_date, media_url, created_at");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const insertedMemory = Array.isArray(data) ? data[0] ?? null : null;

    console.log("Shared memory insert response:", data);

    if (!insertedMemory) {
      return Response.json(
        { error: "Memory was created, but no row was returned from Supabase." },
        { status: 500 }
      );
    }

    return Response.json({ memory: insertedMemory }, { status: 201 });
  } catch (error) {
    console.error("Create shared memory route error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create memory.",
      },
      { status: 500 }
    );
  }
}
