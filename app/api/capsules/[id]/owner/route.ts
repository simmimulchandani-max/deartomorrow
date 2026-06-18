import {
  buildCapsuleMemoryPath,
  buildCapsuleSharePath,
  buildCapsuleUnlockPath,
  countCapsuleMemories,
  getCapsuleByShareSlug,
  hasDateArrived,
  listCapsuleMemories,
} from "@/lib/capsules";
import { getUserFromRequest } from "@/lib/serverAuth";
import { isSafeIdentifier } from "@/lib/validation";
import { NextRequest } from "next/server";

type RouteContext = {
  params: {
    id: string;
  };
};


export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return Response.json(
        { error: "You need to be logged in." },
        { status: 401 }
      );
    }

    const { id } = context.params;

    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (capsule.ownerUserId !== user.id) {
      return Response.json(
        { error: "Only the capsule owner can view this." },
        { status: 403 }
      );
    }

    const unlocked = hasDateArrived(capsule.unlockDate);
    const submissionCount = await countCapsuleMemories(capsule.id);
    const memories = unlocked ? await listCapsuleMemories(capsule.id) : [];

    return Response.json({
      capsule,
      unlocked,
      submissionCount,
      sharePath: buildCapsuleSharePath(capsule.shareSlug),
      unlockPath: buildCapsuleUnlockPath(capsule.shareSlug),

      // IMPORTANT: normalize shape so frontend NEVER breaks again
      memories: memories.map((memory) => ({
        id: memory.id,
        capsuleId: memory.capsuleId,
        contributorName: memory.contributorName,
        title: memory.title,
        message: memory.message,
        mediaUrls: memory.mediaUrls,
        createdAt: memory.createdAt,
        href: buildCapsuleMemoryPath(capsule.shareSlug, memory.id),
      })),
    });
  } catch (error) {
    console.error("Get owner capsule error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load capsule.",
      },
      { status: 500 }
    );
  }
}