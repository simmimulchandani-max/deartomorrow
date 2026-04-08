import { generateId } from "@/lib/generateId";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const SUPABASE_STORAGE_BUCKET = "dear tomorrow";

type UploadTargetsRequest = {
  id?: string;
  files?: Array<{
    name?: string;
    type?: string;
  }>;
};

function getFileExtension(fileName: string) {
  if (!fileName.includes(".")) {
    return "file";
  }

  return fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "file";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadTargetsRequest;
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : generateId();
    const files = Array.isArray(body.files) ? body.files : [];

    if (files.length === 0) {
      return Response.json({ uploads: [] });
    }

    const supabase = getSupabaseAdminClient();
    const uploads = await Promise.all(
      files.map(async (file) => {
        const fileName = typeof file.name === "string" ? file.name.trim() : "";

        if (!fileName) {
          throw new Error("Each upload target needs a file name.");
        }

        const storagePath = `memories/${id}/${Date.now()}-${generateId()}.${getFileExtension(fileName)}`;
        const { data, error } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .createSignedUploadUrl(storagePath);

        if (error || !data) {
          throw new Error(error?.message || "Failed to create an upload target.");
        }

        const { data: publicUrlData } = supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        return {
          fileName,
          contentType:
            typeof file.type === "string" && file.type.trim()
              ? file.type.trim()
              : "application/octet-stream",
          signedUrl: encodeURI(data.signedUrl),
          path: data.path,
          token: data.token,
          publicUrl: encodeURI(publicUrlData.publicUrl),
        };
      })
    );

    return Response.json({ id, uploads });
  } catch (error) {
    console.error("Create upload targets error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare uploads.",
      },
      { status: 500 }
    );
  }
}
