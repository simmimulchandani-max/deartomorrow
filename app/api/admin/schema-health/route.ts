import { checkRequiredDatabaseColumns } from "@/lib/schemaHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isLocalDev = process.env.NODE_ENV !== "production";
  const configuredSecret = process.env.SCHEMA_HEALTH_SECRET;
  const url = new URL(request.url);
  const suppliedSecret =
    request.headers.get("x-schema-health-secret") ?? url.searchParams.get("secret");
  const isAuthorized = isLocalDev || Boolean(configuredSecret && suppliedSecret === configuredSecret);

  if (!isAuthorized) {
    console.warn("[schema-health] Unauthorized request", {
      hasSchemaHealthSecret: Boolean(configuredSecret),
      hasSuppliedSecret: Boolean(suppliedSecret),
      nodeEnv: process.env.NODE_ENV,
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkRequiredDatabaseColumns();
    return Response.json(
      {
        ...result,
        checkedAt: new Date().toISOString(),
        env: {
          hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      },
      { status: result.ok ? 200 : 500 }
    );
  } catch (error) {
    console.error("[schema-health] Schema check failed", { error });
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown schema health failure.",
      },
      { status: 500 }
    );
  }
}
