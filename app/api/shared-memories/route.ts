import { hashMemoryPassword } from "@/lib/memorySecurity";
import { generateId } from "@/lib/generateId";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  MEMORY_MESSAGE_MAX,
  MEMORY_PASSWORD_MAX,
  MEMORY_TITLE_MAX,
  dateOnly,
  filterTrustedPublicUrls,
  isSafeIdentifier,
  isValidDateString,
  validateTextLength,
} from "@/lib/validation";

type CreateSharedMemoryRequest = {
  id?: string;
  title?: string;
  message?: string;
  unlockDate?: string;
  password?: string;
  mediaUrls?: string[];
};

export async function POST(request: Request) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return Response.json({ error: "JSON body is required." }, { status: 415 });
    }

    let body: CreateSharedMemoryRequest;
    try {
      body = (await request.json()) as CreateSharedMemoryRequest;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const rawId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : generateId();
    const id = isSafeIdentifier(rawId) ? rawId : generateId();
    const title = body.title?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const unlockDate = body.unlockDate?.trim() ?? "";
    const password = body.password?.trim() ?? "";
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    const trustedMediaUrls = filterTrustedPublicUrls(mediaUrls, `memories/${id}/`);
    const today = dateOnly(new Date());

    if (!title || !message || !unlockDate) {
      return Response.json(
        { error: "Title, message, and unlock date are required." },
        { status: 400 }
      );
    }

    const titleError = validateTextLength(title, "Title", MEMORY_TITLE_MAX);
    if (titleError) {
      return Response.json({ error: titleError }, { status: 400 });
    }

    const messageError = validateTextLength(message, "Message", MEMORY_MESSAGE_MAX);
    if (messageError) {
      return Response.json({ error: messageError }, { status: 400 });
    }

    const passwordError = validateTextLength(password, "Password", MEMORY_PASSWORD_MAX);
    if (passwordError) {
      return Response.json({ error: passwordError }, { status: 400 });
    }

    if (!isValidDateString(unlockDate)) {
      return Response.json(
        { error: "A valid unlock date is required." },
        { status: 400 }
      );
    }

    if (unlockDate < today) {
      return Response.json(
        { error: "Unlock date cannot be in the past." },
        { status: 400 }
      );
    }

    if (trustedMediaUrls.length !== mediaUrls.length) {
      return Response.json(
        { error: "One or more media URLs are invalid for this memory." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const passwordHash = password ? hashMemoryPassword(password) : null;
    const mediaUrl = trustedMediaUrls[0] ?? null;
    const { data, error } = await supabase
      .from("memories")
      .insert({
        id,
        title,
        message,
        unlock_date: unlockDate,
        media_url: mediaUrl,
        media_urls: trustedMediaUrls,
        password_hash: passwordHash,
        user_id: auth.user.id,
      })
      .select("id, title, message, unlock_date, media_url, media_urls, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ memory: data }, { status: 201 });
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
