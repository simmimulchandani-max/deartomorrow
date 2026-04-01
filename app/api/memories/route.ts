import {
  addMemory,
  getCapsuleById,
  getMemoriesByCapsuleId,
} from "@/lib/store";

function todayInLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const capsuleId = searchParams.get("capsuleId");

  if (!capsuleId) {
    return Response.json(
      { error: "capsuleId is required." },
      { status: 400 }
    );
  }

  const memories = await getMemoriesByCapsuleId(capsuleId);

  return Response.json({
    memories,
    count: memories.length,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    capsuleId?: string;
    message?: string;
    name?: string;
  };

  const capsuleId = body.capsuleId?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const name = body.name?.trim() ?? "";

  if (!capsuleId) {
    return Response.json(
      { error: "capsuleId is required." },
      { status: 400 }
    );
  }

  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const capsule = await getCapsuleById(capsuleId);

  if (!capsule) {
    return Response.json({ error: "Capsule not found." }, { status: 404 });
  }

  if (todayInLocalDate() >= capsule.unlockDate) {
    return Response.json(
      { error: "This capsule is already unlocked." },
      { status: 400 }
    );
  }

  const memory = await addMemory({
    capsuleId,
    message,
    name,
  });

  return Response.json({ memory }, { status: 201 });
}
