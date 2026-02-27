import { assertCronAuth } from "../../../../lib/cron-auth";
import { processJobs } from "../../../../lib/jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const result = await processJobs();
  return Response.json({ ok: true, ...result });
}
