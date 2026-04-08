import { hashMemoryPassword } from "@/lib/memorySecurity";
import { generateId } from "@/lib/generateId";
import { getStorageBucketName } from "@/lib/storageBucket";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
    const contentType = request.headers.get("content-type") || "";

    let id = generateId();
    let title = "";
    let message = "";
    let unlockDate = "";
    let password = "";
    let mediaUrls: string[] = [];

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as CreateSharedMemoryRequest;
      id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : generateId();
      title = body.title?.trim() ?? "";
      message = body.message?.trim() ?? "";
      unlockDate = body.unlockDate?.trim() ?? "";
      password = body.password?.trim() ?? "";
      mediaUrls = Array.isArray(body.mediaUrls)
        ? body.mediaUrls.filter((item): item is string => typeof item === "string" && item.length > 0)
        : [];
    } else {
      const formData = await request.formData();
      id = String(formData.get("id") ?? "").trim() || generateId();
      title = String(formData.get("title") ?? "").trim();
      message = String(formData.get("message") ?? "").trim();
      unlockDate = String(formData.get("unlockDate") ?? "").trim();
      password = String(formData.get("password") ?? "").trim();
      const files = formData
        .getAll("media")
        .filter((value): value is File => value instanceof File && value.size > 0);

      const supabase = getSupabaseAdminClient();
      const storageBucket = getStorageBucketName();
      const uploadedMedia: Array<{ path: string; publicUrl: string }> = [];

      try {
        for (const file of files) {
          try {
            const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
            const safeExtension = extension?.replace(/[^a-zA-Z0-9]/g, "") || "file";
            const storagePath = `memories/${id}/${Date.now()}-${generateId()}.${safeExtension}`;
            const fileBytes = new Uint8Array(await file.arrayBuffer());

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(storageBucket)
              .upload(storagePath, fileBytes, {
                cacheControl: "3600",
                contentType: file.type || "application/octet-stream",
              });

            if (uploadError) {
              throw new Error(uploadError.message);
            }

            const { data: publicUrlData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(uploadData.path);

            if (!publicUrlData.publicUrl) {
              throw new Error("Failed to generate a public URL for the uploaded media.");
            }

            uploadedMedia.push({
              path: uploadData.path,
              publicUrl: publicUrlData.publicUrl,
            });
          } catch (uploadError) {
            console.error("Shared memory media upload error:", uploadError);
          }
        }

        mediaUrls = uploadedMedia.map((item) => item.publicUrl);
      } catch (error) {
        if (uploadedMedia.length > 0) {
          await supabase.storage
            .from(storageBucket)
            .remove(uploadedMedia.map((item) => item.path));
        }

        throw error;
      }
    }

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
    const mediaUrl = mediaUrls[0] ?? null;
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
      throw new Error(error.message);
    }

    const insertedMemory = Array.isArray(data) ? data[0] ?? null : null;

    console.log("Shared memory insert response:", data);

    if (!insertedMemory) {
      throw new Error("Memory was created, but no row was returned from Supabase.");
    }

    return Response.json(
      {
        memory: {
          ...insertedMemory,
          media_urls: mediaUrls,
        },
      },
      { status: 201 }
    );
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
