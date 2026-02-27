import { getSupabaseAdmin } from "./supabase-admin";

export async function getDashboardCompanyId(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("companies").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function getAgentsWithStats(companyId: string) {
  const supabase = getSupabaseAdmin();

  const { data: agents, error } = await supabase
    .from("agents")
    .select("id,name,status,model,created_at,updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const items = await Promise.all(
    (agents ?? []).map(async (agent) => {
      const { data: reqs } = await supabase
        .from("agent_requests")
        .select("cost_usd")
        .eq("company_id", companyId)
        .eq("agent_id", agent.id);

      const requests = reqs?.length ?? 0;
      const totalCost = (reqs ?? []).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0);

      return {
        ...agent,
        requests,
        totalCost,
      };
    }),
  );

  return items;
}

export async function getAgentDetail(companyId: string, agentId: string) {
  const supabase = getSupabaseAdmin();

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,name,status,model")
    .eq("company_id", companyId)
    .eq("id", agentId)
    .maybeSingle();

  if (agentError) throw agentError;
  if (!agent) return null;

  const { data: requests, error: reqError } = await supabase
    .from("agent_requests")
    .select("id,input,output,tokens_prompt,tokens_completion,cost_usd,latency_ms,intent,created_at")
    .eq("company_id", companyId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (reqError) throw reqError;

  const totalRequests = requests?.length ?? 0;
  const totalTokens = (requests ?? []).reduce((acc, row) => acc + (row.tokens_prompt ?? 0) + (row.tokens_completion ?? 0), 0);
  const totalCost = (requests ?? []).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0);
  const avgLatency = totalRequests ? Math.round((requests ?? []).reduce((acc, row) => acc + (row.latency_ms ?? 0), 0) / totalRequests) : 0;

  const intentMap = new Map<string, number>();
  for (const row of requests ?? []) {
    const key = row.intent ?? "unknown";
    intentMap.set(key, (intentMap.get(key) ?? 0) + 1);
  }

  const topIntents = [...intentMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([intent, count]) => ({ intent, count }));

  const dailyMap = new Map<string, number>();
  for (const row of requests ?? []) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }

  const usageDaily = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([day, count]) => ({ day, count }));

  return {
    agent,
    metrics: {
      totalRequests,
      totalTokens,
      totalCost,
      avgLatency,
    },
    latestInputs: (requests ?? []).slice(0, 20).map((r) => r.input),
    latestOutputs: (requests ?? []).slice(0, 20).map((r) => r.output),
    topIntents,
    usageDaily,
  };
}
