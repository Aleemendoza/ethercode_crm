import crypto from "node:crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import { log } from "./logger";

export type RunAgentPayload = {
  input: Record<string, unknown>;
  leadId?: string;
  memoryQueryEmbedding?: number[];
};

type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export async function validateCompanyApiKey(rawApiKey: string) {
  const supabase = getSupabaseAdmin();
  const apiKeyHash = hashApiKey(rawApiKey);

  const { data, error } = await supabase
    .from("company_api_keys")
    .select("id, company_id, requests_per_minute, tokens_per_minute, active")
    .eq("api_key_hash", apiKeyHash)
    .maybeSingle();

  if (error || !data || !data.active) {
    return null;
  }

  return data;
}

async function enforceRateLimits(companyId: string, requestsPerMinute: number, tokensPerMinute: number) {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 60_000).toISOString();

  const { data, error } = await supabase
    .from("agent_requests")
    .select("tokens_prompt,tokens_completion", { count: "exact" })
    .eq("company_id", companyId)
    .gte("created_at", since);

  if (error) throw error;

  const requestCount = data?.length ?? 0;
  const minuteTokens = (data ?? []).reduce((acc, row) => acc + (row.tokens_prompt ?? 0) + (row.tokens_completion ?? 0), 0);

  if (requestCount >= requestsPerMinute) {
    return { allowed: false, reason: "requests_per_minute_exceeded" };
  }

  if (minuteTokens >= tokensPerMinute) {
    return { allowed: false, reason: "tokens_per_minute_exceeded" };
  }

  return { allowed: true, reason: null };
}

async function enforcePlanQuota(companyId: string) {
  const supabase = getSupabaseAdmin();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .single();

  if (companyError) throw companyError;

  const { data: limits, error: limitsError } = await supabase
    .from("plan_limits")
    .select("max_requests,max_tokens,allow_override")
    .eq("plan", company.plan)
    .single();

  if (limitsError || !limits) return { allowed: true, reason: null };

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: usage, error: usageError } = await supabase
    .from("billing_usage")
    .select("total_requests,total_tokens")
    .eq("company_id", companyId)
    .eq("period_start", monthStart.toISOString().slice(0, 10))
    .maybeSingle();

  if (usageError) throw usageError;

  if (!limits.allow_override && limits.max_requests && (usage?.total_requests ?? 0) >= limits.max_requests) {
    return { allowed: false, reason: "monthly_request_quota_exceeded" };
  }

  if (!limits.allow_override && limits.max_tokens && (usage?.total_tokens ?? 0) >= limits.max_tokens) {
    return { allowed: false, reason: "monthly_token_quota_exceeded" };
  }

  return { allowed: true, reason: null };
}

async function detectIntent(input: Record<string, unknown>): Promise<string> {
  const text = JSON.stringify(input).toLowerCase();
  if (text.includes("cotización") || text.includes("cotizacion") || text.includes("precio")) return "quote_request";
  if (text.includes("reserva") || text.includes("reservar")) return "reservation";
  if (text.includes("demo")) return "demo_request";
  return "general";
}

function evaluateResponse(outputText: string) {
  const coherence = outputText.length > 20 ? 0.9 : 0.5;
  const utility = outputText.includes("próximo paso") ? 0.9 : 0.7;
  const risk = /password|tarjeta|secreto/i.test(outputText) ? 0.2 : 0.9;
  return { coherence, utility, risk, flagged: coherence < 0.6 || utility < 0.6 || risk < 0.6 };
}

async function callModel(model: string, systemPrompt: string, userInput: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const content = `Respuesta simulada (${model}): recibido ${JSON.stringify(userInput)}`;
    return { content, usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 } as Usage };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userInput) },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`model_call_failed_${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  const usage = (json?.usage ?? {}) as Usage;
  return { content, usage };
}

async function emitCRMEvents(params: {
  companyId: string;
  leadId?: string;
  agentId: string;
  intent: string;
  output: string;
}) {
  const { companyId, leadId, intent, output, agentId } = params;
  const supabase = getSupabaseAdmin();

  if (intent === "quote_request" || intent === "reservation") {
    await supabase.from("lead_events").insert({
      lead_id: leadId,
      type: "agent_response",
      payload: {
        source: "eap",
        company_id: companyId,
        agent_id: agentId,
        intent,
        action: "upsert_lead_and_create_task",
        summary: output.slice(0, 300),
      },
    });
  }
}

async function dispatchWebhooks(companyId: string, agentId: string, eventType: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { data: hooks } = await supabase
    .from("agent_webhooks")
    .select("url,headers")
    .eq("company_id", companyId)
    .eq("agent_id", agentId)
    .eq("event_type", eventType)
    .eq("active", true);

  for (const hook of hooks ?? []) {
    try {
      const once = await fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(hook.headers as Record<string, string>) },
        body: JSON.stringify(payload),
      });

      if (!once.ok) {
        await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(hook.headers as Record<string, string>) },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      log("warn", "webhook_dispatch_failed", { agentId, companyId, error: String(error) });
    }
  }
}

export async function runAgent(agentId: string, apiKey: string, payload: RunAgentPayload) {
  const startedAt = Date.now();
  const supabase = getSupabaseAdmin();
  const apiKeyData = await validateCompanyApiKey(apiKey);

  if (!apiKeyData) {
    return { status: 401, body: { error: "invalid_api_key" } };
  }

  const companyId = apiKeyData.company_id;
  const rateLimit = await enforceRateLimits(companyId, apiKeyData.requests_per_minute, apiKeyData.tokens_per_minute);
  if (!rateLimit.allowed) {
    return { status: 429, body: { error: rateLimit.reason } };
  }

  const quota = await enforcePlanQuota(companyId);
  if (!quota.allowed) {
    await supabase.from("billing_alerts").insert({ company_id: companyId, alert_type: quota.reason, details: { agent_id: agentId } });
    return { status: 402, body: { error: quota.reason } };
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,company_id,name,status,deployed_version_id,model,temperature,max_tokens,system_prompt")
    .eq("id", agentId)
    .eq("company_id", companyId)
    .single();

  if (agentError || !agent) return { status: 404, body: { error: "agent_not_found" } };
  if (agent.status !== "deployed") return { status: 409, body: { error: "agent_not_deployed" } };

  const { data: version } = await supabase
    .from("agent_versions")
    .select("system_prompt,temperature,max_tokens,model")
    .eq("agent_id", agent.id)
    .eq("is_active", true)
    .maybeSingle();

  const model = version?.model ?? agent.model;
  const systemPrompt = version?.system_prompt ?? agent.system_prompt ?? "Eres un agente útil y seguro para CRM.";

  const { data: memoryRows } = await supabase
    .from("agent_memory")
    .select("memory")
    .eq("company_id", companyId)
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const memoryContext = (memoryRows ?? []).map((m) => m.memory);
  const optimizedPrompt = `${systemPrompt}\n\nContexto memoria:${JSON.stringify(memoryContext).slice(0, 2000)}`;

  let requestId: string | null = null;
  try {
    const intent = await detectIntent(payload.input);
    const modelResult = await callModel(model, optimizedPrompt, payload.input);
    const evaluation = evaluateResponse(modelResult.content);

    const promptTokens = modelResult.usage.prompt_tokens ?? 0;
    const completionTokens = modelResult.usage.completion_tokens ?? 0;

    const { data: costData } = await supabase.rpc("calculate_request_cost_usd", {
      p_model: model,
      p_tokens_prompt: promptTokens,
      p_tokens_completion: completionTokens,
    });

    const costUsd = Number(costData ?? 0);
    const latency = Date.now() - startedAt;

    const { data: inserted, error: reqError } = await supabase
      .from("agent_requests")
      .insert({
        agent_id: agent.id,
        company_id: companyId,
        lead_id: payload.leadId,
        input: payload.input,
        output: { text: modelResult.content },
        tokens_prompt: promptTokens,
        tokens_completion: completionTokens,
        cost_usd: costUsd,
        latency_ms: latency,
        status: "ok",
        intent,
        evaluation,
      })
      .select("id")
      .single();

    if (reqError) throw reqError;
    requestId = inserted.id;

    const { data: company } = await supabase.from("companies").select("plan").eq("id", companyId).single();
    const { data: plan } = await supabase.from("plan_limits").select("price_per_request_usd").eq("plan", company?.plan ?? "basic").single();

    await supabase.rpc("upsert_billing_usage", {
      p_company_id: companyId,
      p_request_increment: 1,
      p_tokens_increment: promptTokens + completionTokens,
      p_cost_increment: costUsd,
      p_revenue_increment: Number(plan?.price_per_request_usd ?? 0.01),
    });

    await emitCRMEvents({ companyId, leadId: payload.leadId, agentId: agent.id, intent, output: modelResult.content });

    await dispatchWebhooks(companyId, agent.id, "agent.response.created", {
      request_id: requestId,
      agent_id: agent.id,
      intent,
      output: modelResult.content,
      evaluation,
      cost_usd: costUsd,
    });

    return {
      status: 200,
      body: {
        request_id: requestId,
        agent_id: agent.id,
        output: modelResult.content,
        intent,
        evaluation,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          cost_usd: costUsd,
          latency_ms: latency,
        },
      },
    };
  } catch (error) {
    await supabase.from("agent_requests").insert({
      agent_id: agent.id,
      company_id: companyId,
      lead_id: payload.leadId,
      input: payload.input,
      output: null,
      status: "error",
      error: String(error),
      latency_ms: Date.now() - startedAt,
    });

    return { status: 500, body: { error: "agent_runtime_error", request_id: requestId } };
  }
}
