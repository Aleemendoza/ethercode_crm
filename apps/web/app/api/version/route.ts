export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    deployedAt: new Date().toISOString(),
    appEnv: process.env.APP_ENV ?? "preview",
  });
}
