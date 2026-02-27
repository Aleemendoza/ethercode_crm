const base = process.env.APP_BASE_URL;
if (!base) {
  throw new Error("APP_BASE_URL is required");
}

const checks = ["/api/health", "/api/version", "/login"];
for (const path of checks) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    throw new Error(`Smoke test failed: ${path} -> ${res.status}`);
  }
  console.log(`OK ${path}`);
}
