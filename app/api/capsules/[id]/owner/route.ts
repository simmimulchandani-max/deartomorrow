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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return Response.json({ error: "You need to be logged in." }, { status: 401 });
    }

    const { id } = await context.params;
    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (capsule.ownerUserId !== user.id) {
      return Response.json({ error: "Only the capsule owner can view this." }, { status: 403 });
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
      memories: memories.map((memory) => ({
        ...memory,
        href: buildCapsuleMemoryPath(capsule.shareSlug, memory.id),
      })),
    });
  } catch (error) {
    console.error("Get owner capsule error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load capsule." },
      { status: 500 }
    );
  }
}
