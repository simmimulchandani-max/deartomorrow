import { verifyMemoryPassword } from "@/lib/memorySecurity";
import {
  getMemoryPasswordHash,
  getSharedMemoryContent,
  getSharedMemorySummary,
} from "@/lib/serverMemories";
import { dateOnly, isSafeIdentifier } from "@/lib/validation";

type UnlockRequestBody = {
  password?: string;
};

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  if (!isSafeIdentifier(id)) {
    return Response.json({ error: "Memory not found." }, { status: 404 });
  }

  let body: UnlockRequestBody;
  try {
    body = (await request.json()) as UnlockRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const password = body.password?.trim() ?? "";
  const summary = await getSharedMemorySummary(id);

  if (!summary) {
    return Response.json({ error: "Memory not found." }, { status: 404 });
  }

  if (summary.unlockDate > dateOnly(new Date())) {
    return Response.json(
      { error: "This memory cannot be unlocked yet." },
      { status: 423 }
    );
  }

  const passwordHash = await getMemoryPasswordHash(id);

  if (passwordHash && !verifyMemoryPassword(password, passwordHash)) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  const memory = await getSharedMemoryContent(id);

  if (!memory) {
    return Response.json({ error: "Memory not found." }, { status: 404 });
  }

  return Response.json({ memory });
}
