import { generateId } from "@/lib/generateId";
import {
  buildCapsuleSharePath,
  buildCapsuleStatusPath,
  createCapsule,
  dateOnly,
  isValidDateString,
  listCapsulesForOwner,
} from "@/lib/capsules";
import { getUserFromRequest } from "@/lib/serverAuth";

type CreateCapsuleRequest = {
  title?: string;
  description?: string;
  submissionDeadline?: string;
  unlockDate?: string;
};

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return Response.json({ error: "You need to be logged in." }, { status: 401 });
    }

    const capsules = await listCapsulesForOwner(user.id);
    return Response.json({ capsules });
  } catch (error) {
    console.error("List capsules error:", error);
    return Response.json({ error: "Failed to load capsules." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return Response.json({ error: "You need to be logged in to create a capsule." }, { status: 401 });
    }

    const body = (await request.json()) as CreateCapsuleRequest;
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() || null;
    const submissionDeadline = body.submissionDeadline?.trim() ?? "";
    const unlockDate = body.unlockDate?.trim() ?? "";
    const today = dateOnly(new Date());

    if (!title) {
      return Response.json({ error: "Capsule title is required." }, { status: 400 });
    }

    if (!isValidDateString(submissionDeadline) || !isValidDateString(unlockDate)) {
      return Response.json({ error: "Valid deadline and unlock dates are required." }, { status: 400 });
    }

    if (unlockDate < today) {
      return Response.json({ error: "Unlock date cannot be in the past." }, { status: 400 });
    }

    if (submissionDeadline >= unlockDate) {
      return Response.json(
        { error: "Submission deadline must be before the unlock date." },
        { status: 400 }
      );
    }

    const capsule = await createCapsule({
      ownerUserId: user.id,
      title,
      description,
      submissionDeadline,
      unlockDate,
      shareSlug: generateId(),
    });

    return Response.json(
      {
        capsule,
        sharePath: buildCapsuleSharePath(capsule.shareSlug),
        statusPath: buildCapsuleStatusPath(capsule.shareSlug),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create capsule error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create capsule." },
      { status: 500 }
    );
  }
}
