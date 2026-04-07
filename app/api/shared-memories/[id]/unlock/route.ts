import { verifyMemoryPassword } from "@/lib/memorySecurity";
import { getMemoryPasswordHash, getSharedMemoryContent } from "@/lib/serverMemories";

type UnlockRequestBody = {
  password?: string;
};

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const body = (await request.json()) as UnlockRequestBody;
  const password = body.password?.trim() ?? "";

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
