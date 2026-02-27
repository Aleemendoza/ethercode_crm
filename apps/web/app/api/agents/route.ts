import { requireServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function assertAgentAdmin(request: Request) {
  const secret = request.headers.get("x-agent-secret");
  return secret && secret === requireServerEnv("AGENT_SECRET");
}

export async function GET(request: Request) {
  if (!assertAgentAdmin(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!companyId) return Response.json({ error: "companyId_required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .select("id,name,description,status,model,updated_at,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data });
}

export async function POST(request: Request) {
  if (!assertAgentAdmin(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();

  const supabase = getSupabaseAdmin();
  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      company_id: body.companyId,
      name: body.name,
      description: body.description,
      model: body.model ?? "gpt-4o",
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens ?? 800,
      system_prompt: body.systemPrompt ?? "",
    })
    .select("id")
    .single();

  if (error || !agent) return Response.json({ error: error?.message ?? "create_failed" }, { status: 500 });

  await supabase.from("agent_versions").insert({
    agent_id: agent.id,
    version: 1,
    system_prompt: body.systemPrompt ?? "",
    temperature: body.temperature ?? 0.7,
    max_tokens: body.maxTokens ?? 800,
    model: body.model ?? "gpt-4o",
    is_active: false,
  });

  return Response.json({ ok: true, id: agent.id }, { status: 201 });
}
