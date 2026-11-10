import { capsuleDateOnly, capsuleSubmissionsOpen } from "@/lib/capsuleDates";
import { getCapsuleByShareSlug, listCapsuleMemories } from "@/lib/capsules";
import { requireUserFromRequest } from "@/lib/serverAuth";
import { removeMediaFolder } from "@/lib/privateMedia";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isSafeIdentifier, isValidDateString } from "@/lib/validation";

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
        submissionsOpen: capsuleSubmissionsOpen(capsule.submissionDeadline),
      },
    });
  } catch (error) {
    console.error("Get public capsule error:", error);
    return Response.json({ error: "Failed to load capsule." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireUserFromRequest(request);
    if (!auth.user) return auth.response;

    const { id } = await context.params;
    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }
    const capsule = await getCapsuleByShareSlug(id);
    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }
    if (capsule.ownerUserId !== auth.user.id) {
      return Response.json({ error: "Only the capsule owner can edit dates." }, { status: 403 });
    }
    if (capsule.dateEditBlockedReason) {
      return Response.json({ error: capsule.dateEditBlockedReason }, { status: 409 });
    }

    let body: Record<string, unknown>;
    try {
      const value: unknown = await request.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      body = value as Record<string, unknown>;
    } catch {
      return Response.json({ error: "A JSON object is required." }, { status: 400 });
    }
    const allowed = ["submissionDeadline", "unlockDate", "expectedSubmissionDeadline", "expectedUnlockDate"];
    if (Object.keys(body).some(key => !allowed.includes(key)) ||
        !("submissionDeadline" in body || "unlockDate" in body)) {
      return Response.json({ error: "Provide only capsule date fields." }, { status: 400 });
    }
    // The browser supplies its original dates to detect stale forms; these never
    // determine authorization, current time, or which capsule gets updated.
    if ((body.expectedSubmissionDeadline !== undefined && body.expectedSubmissionDeadline !== capsule.submissionDeadline) ||
        (body.expectedUnlockDate !== undefined && body.expectedUnlockDate !== capsule.unlockDate)) {
      return Response.json({ error: "Dates changed since you opened this form. Refresh and try again." }, { status: 409 });
    }
    const submissionDeadline = body.submissionDeadline === undefined ? capsule.submissionDeadline : body.submissionDeadline;
    const unlockDate = body.unlockDate === undefined ? capsule.unlockDate : body.unlockDate;
    if (typeof submissionDeadline !== "string" || typeof unlockDate !== "string" ||
        !isValidDateString(submissionDeadline) || !isValidDateString(unlockDate)) {
      return Response.json({ error: "Valid submission deadline and unlock dates are required." }, { status: 400 });
    }
    if (submissionDeadline >= unlockDate) {
      return Response.json({ error: "Submission deadline must be before the unlock date." }, { status: 400 });
    }
    const now = new Date();
    const today = capsuleDateOnly(now);
    if (unlockDate <= today) {
      return Response.json({ error: "Choose an unlock date after today in Eastern time." }, { status: 400 });
    }

    // Compare-and-update protects concurrent saves and email claims. The pending
    // database trigger repeats time/email checks after acquiring the row lock.
    const { data, error } = await getSupabaseAdminClient()
      .from("capsules")
      .update({ submission_deadline: submissionDeadline, unlock_date: unlockDate })
      .eq("id", capsule.id)
      .eq("owner_user_id", auth.user.id)
      .eq("submission_deadline", capsule.submissionDeadline)
      .eq("unlock_date", capsule.unlockDate)
      .gt("unlock_date", today)
      .is("capsule_unlock_email_sent_at", null)
      .is("unlock_email_sent_at", null)
      .is("recipient_email_sent_at", null)
      .is("owner_gift_confirmation_sent_at", null)
      .or(`unlock_email_attempted_at.is.null,unlock_email_attempted_at.lt.${new Date(now.getTime() - 15 * 60 * 1000).toISOString()}`)
      .select("id, submission_deadline, unlock_date")
      .maybeSingle();
    if (error) {
      if (error.code === "P0001" || error.code === "23514") {
        return Response.json({ error: "Dates could not be changed. The capsule may have unlocked or an email may be in progress. Refresh and try again." }, { status: 409 });
      }
      console.error("Update capsule dates error:", error);
      return Response.json({ error: "Failed to save capsule dates. Please try again." }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: "The capsule changed or is no longer editable. Refresh and try again." }, { status: 409 });
    }
    return Response.json({
      success: true,
      submissionDeadline: data.submission_deadline,
      unlockDate: data.unlock_date,
    });
  } catch (error) {
    console.error("Update capsule dates error:", error);
    return Response.json({ error: "Failed to save capsule dates. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireUserFromRequest(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { id } = await context.params;
    if (!isSafeIdentifier(id)) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    const capsule = await getCapsuleByShareSlug(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    if (capsule.ownerUserId !== auth.user.id) {
      return Response.json(
        { error: "Only the capsule owner can delete this capsule." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const memories = await listCapsuleMemories(capsule.id);

    for (const memory of memories) {
      const folder = `capsules/${capsule.id}/${memory.id}`;
      try {
        await removeMediaFolder(folder, memory.mediaUrls);
      } catch {
        return Response.json(
          { error: "Failed to delete capsule media files." },
          { status: 500 }
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("capsules")
      .delete()
      .eq("id", capsule.id)
      .eq("owner_user_id", auth.user.id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete capsule error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete capsule." },
      { status: 500 }
    );
  }
}
