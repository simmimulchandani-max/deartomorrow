import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireUserFromRequest(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      user: null,
      response: Response.json({ error: "You need to be logged in." }, { status: 401 }),
    };
  }

  return { user, response: null };
}
