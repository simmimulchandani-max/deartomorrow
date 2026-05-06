import { getCapsuleByShareSlug } from "@/lib/capsules";
import { dateOnly, isSafeIdentifier } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    return Response.json({
      capsule: {
        shareSlug: capsule.shareSlug,
        title: capsule.title,
        description: capsule.description,
        submissionDeadline: capsule.submissionDeadline,
        unlockDate: capsule.unlockDate,
        submissionsOpen: capsule.submissionDeadline >= dateOnly(new Date()),
      },
    });
  } catch (error) {
    console.error("Get public capsule error:", error);
    return Response.json({ error: "Failed to load capsule." }, { status: 500 });
  }
}
