import { generateId } from "@/lib/generateId";
import { getCapsuleByShareSlug } from "@/lib/capsules";
import { getStorageBucketName } from "@/lib/storageBucket";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { dateOnly, isSafeIdentifier, validateMediaFiles } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UploadTargetsRequest = {
  memoryId?: string;
  files?: Array<{
    name?: string;
    type?: string;
    size?: number;
  }>;
};

function getFileExtension(fileName: string) {
  if (!fileName.includes(".")) {
    return "file";
  }

  return fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "file";
}

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

    let body: UploadTargetsRequest;
    try {
      body = (await request.json()) as UploadTargetsRequest;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    const rawMemoryId =
      typeof body.memoryId === "string" && body.memoryId.trim()
        ? body.memoryId.trim()
        : generateId();
    const memoryId = isSafeIdentifier(rawMemoryId) ? rawMemoryId : generateId();
    const files = Array.isArray(body.files) ? body.files : [];
    const normalizedFiles = files.map((file) => ({
      name: typeof file.name === "string" ? file.name.trim() : "",
      type: typeof file.type === "string" ? file.type.trim() : "",
      size: typeof file.size === "number" ? file.size : 0,
    }));
    const mediaValidationError = validateMediaFiles(normalizedFiles);
    if (mediaValidationError) {
      return Response.json({ error: mediaValidationError }, { status: 400 });
    }

    if (normalizedFiles.length === 0) {
      return Response.json({ memoryId, uploads: [] });
    }

    const supabase = getSupabaseAdminClient();
    const storageBucket = getStorageBucketName();
    const uploads = await Promise.all(
      normalizedFiles.map(async (file) => {
        const fileName = file.name;

        if (!fileName) {
          throw new Error("Each upload target needs a file name.");
        }

        const storagePath = `capsules/${capsule.id}/${memoryId}/${Date.now()}-${generateId()}.${getFileExtension(fileName)}`;
        const { data, error } = await supabase.storage
          .from(storageBucket)
          .createSignedUploadUrl(storagePath);

        if (error || !data) {
          throw new Error(error?.message || "Failed to create an upload target.");
        }

        const { data: publicUrlData } = supabase.storage
          .from(storageBucket)
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

    return Response.json({ memoryId, uploads });
  } catch (error) {
    console.error("Create capsule upload targets error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to prepare uploads." },
      { status: 500 }
    );
  }
}
