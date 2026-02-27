import { assertCronAuth } from "../../../../lib/cron-auth";
import { enqueueJob } from "../../../../lib/jobs";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  const { data: events, error } = await supabase
    .from("lead_events")
    .select("id, lead_id, type")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  for (const event of events ?? []) {
    await enqueueJob("00000000-0000-0000-0000-000000000001", "lead_scoring", {
      event_id: event.id,
      lead_id: event.lead_id,
      event_type: event.type,
    });
  }

  const ids = (events ?? []).map((e) => e.id);
  if (ids.length > 0) {
    await supabase.from("lead_events").update({ processed: true }).in("id", ids);
  }

  return Response.json({ ok: true, queued: ids.length });
}
