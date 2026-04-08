import { hashMemoryPassword } from "@/lib/memorySecurity";
import { generateId } from "@/lib/generateId";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const SUPABASE_STORAGE_BUCKET = "dear tomorrow";

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = String(formData.get("id") ?? "").trim() || generateId();
    const title = String(formData.get("title") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const unlockDate = String(formData.get("unlockDate") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const files = formData
      .getAll("media")
      .filter((value): value is File => value instanceof File && value.size > 0);

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
    const uploadedMedia: Array<{ path: string; publicUrl: string }> = [];
    const uploadWarnings: string[] = [];

    try {
      for (const file of files) {
        try {
          const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
          const safeExtension = extension?.replace(/[^a-zA-Z0-9]/g, "") || "file";
          const storagePath = `memories/${id}/${Date.now()}-${generateId()}.${safeExtension}`;
          const fileBytes = new Uint8Array(await file.arrayBuffer());

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(storagePath, fileBytes, {
              cacheControl: "3600",
              contentType: file.type || "application/octet-stream",
            });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
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
          uploadWarnings.push(file.name || "One attachment");
        }
      }

      const mediaUrls = uploadedMedia.map((item) => item.publicUrl);
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
          warning:
            uploadWarnings.length > 0
              ? `Created the memory, but couldn't upload ${uploadWarnings.length} attachment${uploadWarnings.length === 1 ? "" : "s"}.`
              : undefined,
        },
        { status: 201 }
      );
    } catch (error) {
      if (uploadedMedia.length > 0) {
        await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .remove(uploadedMedia.map((item) => item.path));
      }

      throw error;
    }
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
