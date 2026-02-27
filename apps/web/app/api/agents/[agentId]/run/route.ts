import { runAgent } from "@/lib/agents";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { agentId: string } }) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return Response.json({ error: "missing_api_key" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await runAgent(params.agentId, token, {
    input: body?.input ?? {},
    leadId: body?.leadId,
    memoryQueryEmbedding: body?.memoryQueryEmbedding,
  });

  return Response.json(result.body, { status: result.status });
}
