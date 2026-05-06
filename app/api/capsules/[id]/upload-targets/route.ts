import { generateId } from "@/lib/generateId";
import { getCapsuleByShareSlug, hasDateArrived } from "@/lib/capsules";
import { getStorageBucketName } from "@/lib/storageBucket";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

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
    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (hasDateArrived(nextDate(capsule.submissionDeadline))) {
      return Response.json(
        { error: "This capsule is closed for submissions." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UploadTargetsRequest;
    const memoryId =
      typeof body.memoryId === "string" && body.memoryId.trim()
        ? body.memoryId.trim()
        : generateId();
    const files = Array.isArray(body.files) ? body.files : [];

    if (files.length === 0) {
      return Response.json({ memoryId, uploads: [] });
    }

    const supabase = getSupabaseAdminClient();
    const storageBucket = getStorageBucketName();
    const uploads = await Promise.all(
      files.map(async (file) => {
        const fileName = typeof file.name === "string" ? file.name.trim() : "";

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

function nextDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
