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
import {
  CAPSULE_DESCRIPTION_MAX,
  CAPSULE_TITLE_MAX,
  validateTextLength,
} from "@/lib/validation";

type CreateCapsuleRequest = {
  title?: string;
  description?: string;
  submissionDeadline?: string;
  unlockDate?: string;
  isGift?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  recipientNote?: string;
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

    let body: CreateCapsuleRequest;
    try {
      body = (await request.json()) as CreateCapsuleRequest;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() || null;
    const submissionDeadline = body.submissionDeadline?.trim() ?? "";
    const unlockDate = body.unlockDate?.trim() ?? "";
    const isGift = body.isGift === true;
    const recipientName = isGift ? body.recipientName?.trim() || null : null;
    const recipientEmail = isGift ? body.recipientEmail?.trim().toLowerCase() || null : null;
    const recipientNote = isGift ? body.recipientNote?.trim() || null : null;
    const today = dateOnly(new Date());

    if (!title) {
      return Response.json({ error: "Capsule title is required." }, { status: 400 });
    }

    const titleError = validateTextLength(title, "Capsule title", CAPSULE_TITLE_MAX);
    if (titleError) {
      return Response.json({ error: titleError }, { status: 400 });
    }

    if (description) {
      const descriptionError = validateTextLength(
        description,
        "Capsule description",
        CAPSULE_DESCRIPTION_MAX
      );
      if (descriptionError) {
        return Response.json({ error: descriptionError }, { status: 400 });
      }
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

    if (isGift && !recipientEmail) {
      return Response.json({ error: "Recipient email is required for gift capsules." }, { status: 400 });
    }

    const capsule = await createCapsule({
      ownerUserId: user.id,
      title,
      description,
      submissionDeadline,
      unlockDate,
      shareSlug: generateId(),
      isGift,
      recipientName,
      recipientEmail,
      recipientNote,
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
