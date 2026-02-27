# EtherCode CRM OS MVP Ops Baseline

Este repo define una base monorepo para operar EtherCode CRM en Vercel + Supabase con enfoque multi-tenant, cron jobs idempotentes, observabilidad y runbooks.

## Estructura

- `apps/web`: Next.js App Router (API endpoints internos, healthchecks y cron handlers).
- `supabase/migrations`: esquema SQL (RLS, jobs, runbooks, automation traces).
- `supabase/seed.sql`: seed idempotente para demo/staging.
- `scripts`: scripts operativos (smoke tests).
- `.github/workflows`: CI/CD para PR, staging y producción.

## Endpoints operativos

- `GET /api/health`: valida DB y auth de Supabase + metadata build.
- `GET /api/version`: hash de commit y entorno.
- `GET /api/cron/poll-events`: transforma `lead_events` en `jobs`.
- `GET /api/cron/job-runner`: procesa jobs en lotes de 50.
- `GET /api/cron/nightly`: encola mantenimiento nocturno por empresa.

Todos los cron endpoints requieren `Authorization: Bearer ${CRON_SECRET}`.

## Variables de entorno mínimas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)
- `OPENAI_API_KEY` (solo server)
- `APP_ENV` (`preview|staging|production`)
- `APP_BASE_URL`
- `CRON_SECRET`
- `AGENT_SECRET`
- `LOG_LEVEL`

## Job model

La tabla `jobs` implementa:

- estados: `queued|running|done|failed|dead`
- lock con `locked_at` + `lock_token`
- reintentos con backoff exponencial y dead-letter al 5º fallo
- trazabilidad en `job_runs`

## Runbooks

La tabla `runbooks` permite guardar condiciones + acciones automáticas para autocorrección, por ejemplo:

- desactivar automations inválidas
- re-encolar scoring de leads sin score
- liberar locks colgados
- reducir batch cuando hay timeouts

## Notas de despliegue

- Preview: Vercel por PR.
- Staging: rama `staging`, Supabase separado y migraciones automáticas.
- Production: rama `main`, migración bajo environment gate/manual approval.

## EtherCode Agent Platform (EAP) · conexión y despliegue

### 1) Conectar base de datos Supabase

1. Crear proyecto en Supabase.
2. Configurar variables en Vercel (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `CRON_SECRET`
   - `AGENT_SECRET`
   - `APP_ENV`
   - `APP_BASE_URL`
3. Ejecutar migraciones SQL en orden:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_eap.sql`
4. Cargar datos iniciales:
   - `supabase/seed.sql`

### 2) Credencial API key por cliente

- La tabla `company_api_keys` guarda `api_key_hash` (SHA-256), nunca la key en texto plano.
- Ejemplo SQL para crear una key real de producción:

```sql
insert into public.company_api_keys (company_id, label, api_key_hash, requests_per_minute, tokens_per_minute, active)
values (
  '<company_uuid>',
  'prod-key-1',
  encode(digest('<raw_api_key>', 'sha256'), 'hex'),
  120,
  250000,
  true
);
```

### 3) Despliegue en Vercel

1. Conectar el repo a Vercel.
2. Framework Preset: **Next.js**.
3. Root Directory: `apps/web`.
4. Build Command: `npm run build`.
5. Output: `.next` (por defecto Next.js).
6. Configurar variables por entorno (Preview/Production) con los valores de Supabase y secretos.
7. Verificar endpoints:
   - `GET /api/health`
   - `POST /api/agents/{agentId}/run`
8. Configurar cron jobs en Vercel para:
   - `/api/cron/poll-events`
   - `/api/cron/job-runner`
   - `/api/cron/nightly`
   con `Authorization: Bearer ${CRON_SECRET}`.

### 4) Checklist producción EAP

- `agents`, `agent_versions`, `agent_requests`, `agent_memory`, `billing_usage` con RLS activo.
- Pricing por modelo cargado en `model_pricing`.
- Planes y cuotas cargados en `plan_limits`.
- Al menos una `company_api_keys` activa por cliente.
- `OPENAI_API_KEY` configurada (sin fallback mock).
- Monitoreo de errores y latencia desde logs estructurados.
