import { getCapsuleByShareSlug, hasDateArrived } from "@/lib/capsules";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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
        submissionsOpen: !hasDateArrived(nextDate(capsule.submissionDeadline)),
      },
    });
  } catch (error) {
    console.error("Get public capsule error:", error);
    return Response.json({ error: "Failed to load capsule." }, { status: 500 });
  }
}

function nextDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
