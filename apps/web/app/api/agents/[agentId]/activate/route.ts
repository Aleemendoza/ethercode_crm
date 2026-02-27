import { requireServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function assertAgentAdmin(request: Request) {
  const secret = request.headers.get("x-agent-secret");
  return secret && secret === requireServerEnv("AGENT_SECRET");
}

export async function POST(request: Request, { params }: { params: { agentId: string } }) {
  if (!assertAgentAdmin(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("activate_agent_version", {
    p_agent_id: params.agentId,
    p_version_id: body.versionId,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
