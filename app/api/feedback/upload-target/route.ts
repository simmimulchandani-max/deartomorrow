import { generateId } from "@/lib/generateId";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { getStorageBucketName } from "@/lib/storageBucket";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type UploadTargetRequest = {
  file?: {
    name?: string;
    type?: string;
    size?: number;
  };
};

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

function getFileExtension(fileName: string) {
  if (!fileName.includes(".")) {
    return "png";
  }

  return fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "png";
}

export async function POST(request: Request) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response) {
      return auth.response;
    }

    let body: UploadTargetRequest;
    try {
      body = (await request.json()) as UploadTargetRequest;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const file = body.file;
    const fileName = typeof file?.name === "string" ? file.name.trim() : "";
    const fileType = typeof file?.type === "string" ? file.type.trim() : "";
    const fileSize = typeof file?.size === "number" ? file.size : 0;

    if (!fileName) {
      return Response.json({ error: "Screenshot needs a file name." }, { status: 400 });
    }

    if (!fileType.toLowerCase().startsWith("image/")) {
      return Response.json({ error: "Screenshot must be an image." }, { status: 400 });
    }

    if (fileSize <= 0 || fileSize > MAX_SCREENSHOT_BYTES) {
      return Response.json(
        { error: "Screenshot must be 10MB or smaller." },
        { status: 400 }
      );
    }

    const storageBucket = getStorageBucketName();
    const storagePath = `feedback/${auth.user.id}/${Date.now()}-${generateId()}.${getFileExtension(fileName)}`;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw new Error(error?.message || "Failed to create an upload target.");
    }

    const { data: publicUrlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(storagePath);

    return Response.json({
      contentType: fileType,
      signedUrl: encodeURI(data.signedUrl),
      path: data.path,
      token: data.token,
      publicUrl: encodeURI(publicUrlData.publicUrl),
    });
  } catch (error) {
    console.error("Create feedback upload target error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare screenshot upload.",
      },
      { status: 500 }
    );
  }
}
