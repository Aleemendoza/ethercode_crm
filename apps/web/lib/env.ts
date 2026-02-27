export const env = {
  APP_ENV: process.env.APP_ENV ?? "preview",
  APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  CRON_SECRET: process.env.CRON_SECRET,
  AGENT_SECRET: process.env.AGENT_SECRET,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export function requireServerEnv(name: keyof typeof env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
