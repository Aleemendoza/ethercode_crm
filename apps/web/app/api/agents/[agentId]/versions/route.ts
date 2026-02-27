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

  const { data: latest } = await supabase
    .from("agent_versions")
    .select("version")
    .eq("agent_id", params.agentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("agent_versions")
    .insert({
      agent_id: params.agentId,
      version: nextVersion,
      system_prompt: body.systemPrompt,
      temperature: body.temperature,
      max_tokens: body.maxTokens,
      model: body.model,
      is_active: false,
    })
    .select("id,version")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, version: data });
}
