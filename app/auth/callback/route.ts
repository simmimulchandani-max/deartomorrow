import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedDestination = searchParams.get("next");
  const allowedDestinations = new Set(["/create/memory", "/create/capsule"]);
  const destination =
    requestedDestination && allowedDestinations.has(requestedDestination)
      ? requestedDestination
      : "/timeline";

  if (!code) {
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(new URL(destination, origin));
}
