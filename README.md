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
