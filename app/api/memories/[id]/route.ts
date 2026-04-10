import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getStorageBucketName } from "@/lib/storageBucket";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: "Missing memory id." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const bucket = getStorageBucketName();
    const folder = `memories/${id}`;

    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
      });

    if (listError) {
      console.error("List storage files error:", listError);
    }

    if (files && files.length > 0) {
      const filePaths = files
        .filter((file) => file.name)
        .map((file) => `${folder}/${file.name}`);

      const { error: removeFilesError } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (removeFilesError) {
        console.error("Remove storage files error:", removeFilesError);
      }
    }

    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return Response.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete memory error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete memory.",
      },
      { status: 500 }
    );
  }
}