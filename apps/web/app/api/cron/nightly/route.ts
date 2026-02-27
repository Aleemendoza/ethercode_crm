import { assertCronAuth } from "../../../../lib/cron-auth";
import { enqueueJob } from "../../../../lib/jobs";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

const NIGHTLY_JOB_TYPES = [
  "normalize_contacts",
  "lead_scoring",
  "refresh_embedding",
  "daily_sales_brief",
  "validate_automations",
  "rls_smoke_test",
  "lead_risk_detector",
  "next_best_action",
] as const;

export async function GET(request: Request) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  const { data: companies, error } = await supabase.from("companies").select("id");
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let enqueued = 0;
  for (const company of companies ?? []) {
    for (const jobType of NIGHTLY_JOB_TYPES) {
      await enqueueJob(company.id, jobType, { source: "nightly" });
      enqueued += 1;
    }
  }

  return Response.json({ ok: true, companies: companies?.length ?? 0, enqueued });
}
