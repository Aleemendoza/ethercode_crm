import { env } from "./env";

export function assertCronAuth(request: Request): Response | null {
  const expected = env.CRON_SECRET;
  if (!expected) {
    return new Response(JSON.stringify({ ok: false, error: "CRON_SECRET is not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const header = request.headers.get("authorization");
  if (!header || header !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
