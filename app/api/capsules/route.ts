import { createCapsule, getCapsuleById, listCapsules } from "@/lib/store";

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const capsule = await getCapsuleById(id);

    if (!capsule) {
      return Response.json({ error: "Capsule not found." }, { status: 404 });
    }

    return Response.json({ capsule });
  }

  const capsules = await listCapsules();
  return Response.json({ capsules });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    unlockDate?: string;
  };

  const title = body.title?.trim() ?? "";
  const unlockDate = body.unlockDate?.trim() ?? "";

  if (!title) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }

  if (!isValidDateString(unlockDate)) {
    return Response.json(
      { error: "A valid unlock date is required." },
      { status: 400 }
    );
  }

  const capsule = await createCapsule({
    id: crypto.randomUUID(),
    title,
    unlockDate,
  });

  return Response.json({ capsule }, { status: 201 });
}
