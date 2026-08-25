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
import { createAuthorizedMediaUrls } from "@/lib/privateMedia";
import { isSafeIdentifier } from "@/lib/validation";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/capsules/[id]/owner">
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return Response.json(
        { error: "You need to be logged in." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!isSafeIdentifier(id)) {
      return Response.json(
        { error: "Capsule not found." },
        { status: 404 }
      );
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json(
        { error: "Capsule not found." },
        { status: 404 }
      );
    }

    const isOwner = capsule.ownerUserId === user.id;
    const recipientEmail = normalizeEmail(capsule.recipientEmail);
    const userEmail = normalizeEmail(user.email);
    const isMatchingGiftRecipient =
      capsule.isGift &&
      Boolean(recipientEmail) &&
      Boolean(userEmail) &&
      Boolean(user.email_confirmed_at) &&
      recipientEmail === userEmail;
    const unlocked = hasDateArrived(capsule.unlockDate);

    if (!isOwner && !isMatchingGiftRecipient) {
      return Response.json(
        { error: "Only the capsule owner can view this." },
        { status: 403 }
      );
    }

    if (!isOwner && !unlocked) {
      return Response.json(
        { error: "This capsule is not ready to unlock yet." },
        { status: 403 }
      );
    }

    const submissionCount = await countCapsuleMemories(capsule.id);

    const memories = unlocked
      ? await listCapsuleMemories(capsule.id)
      : [];

    const serializedMemories = await Promise.all(
      memories.map(async (memory) => ({
        id: memory.id,
        capsuleId: memory.capsuleId,
        contributorName: memory.contributorName,
        title: memory.title,
        message: memory.message,
        mediaUrls: await createAuthorizedMediaUrls(memory.mediaUrls ?? []),
        createdAt: memory.createdAt,
        href: buildCapsuleMemoryPath(capsule.shareSlug, memory.id),
      }))
    );

    return Response.json({
      capsule: isOwner
        ? capsule
        : {
            title: capsule.title,
            description: capsule.description,
            submissionDeadline: capsule.submissionDeadline,
            unlockDate: capsule.unlockDate,
            shareSlug: capsule.shareSlug,
          },
      unlocked,
      viewerIsOwner: isOwner,
      submissionCount,
      sharePath: buildCapsuleSharePath(capsule.shareSlug),
      unlockPath: buildCapsuleUnlockPath(capsule.shareSlug),
      memories: serializedMemories,
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
