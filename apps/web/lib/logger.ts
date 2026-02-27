type LogLevel = "debug" | "info" | "warn" | "error";

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}
