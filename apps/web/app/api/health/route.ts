import { env } from "../../../lib/env";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  let dbOk = false;
  let authOk = false;

  try {
    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase.from("companies").select("id").limit(1);
    dbOk = !dbError;

    const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    authOk = !authError;
  } catch {
    dbOk = false;
    authOk = false;
  }

  const ok = dbOk && authOk;

  return Response.json(
    {
      ok,
      services: {
        db: dbOk,
        auth: authOk,
        agent: true,
        cron: true,
      },
      build: {
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
        deployedAt: new Date().toISOString(),
        env: env.APP_ENV,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
