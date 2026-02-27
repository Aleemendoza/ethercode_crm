create extension if not exists vector;

create table if not exists public.model_pricing (
  model text primary key,
  prompt_price_per_1k numeric not null,
  completion_price_per_1k numeric not null,
  created_at timestamptz default now()
);

insert into public.model_pricing (model, prompt_price_per_1k, completion_price_per_1k)
values
  ('gpt-4o', 0.005, 0.015),
  ('gpt-4o-mini', 0.00015, 0.0006)
on conflict (model) do nothing;

create table if not exists public.company_api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  api_key_hash text not null unique,
  requests_per_minute integer not null default 60,
  tokens_per_minute integer not null default 120000,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','deployed','paused')),
  model text not null default 'gpt-4o',
  temperature numeric not null default 0.7,
  max_tokens integer not null default 800,
  system_prompt text,
  deployed_version_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists agents_company_idx on public.agents(company_id, created_at desc);

create table if not exists public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  version integer not null,
  system_prompt text,
  temperature numeric,
  max_tokens integer,
  model text,
  created_at timestamptz default now(),
  is_active boolean not null default false,
  unique(agent_id, version)
);

create unique index if not exists agent_versions_single_active_idx
on public.agent_versions(agent_id)
where is_active = true;

alter table public.agents
  add constraint agents_deployed_version_fk
  foreign key (deployed_version_id) references public.agent_versions(id);

create table if not exists public.agent_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  tokens_prompt integer not null default 0,
  tokens_completion integer not null default 0,
  cost_usd numeric not null default 0,
  latency_ms integer,
  status text not null default 'ok',
  intent text,
  evaluation jsonb,
  error text,
  created_at timestamptz default now()
);

create index if not exists agent_requests_company_created_idx on public.agent_requests(company_id, created_at desc);
create index if not exists agent_requests_agent_created_idx on public.agent_requests(agent_id, created_at desc);

create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  memory jsonb not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists agent_memory_company_agent_idx on public.agent_memory(company_id, agent_id, created_at desc);

create table if not exists public.agent_webhooks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  url text not null,
  headers jsonb default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.billing_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_requests integer not null default 0,
  total_tokens integer not null default 0,
  total_cost_usd numeric not null default 0,
  gross_revenue_usd numeric not null default 0,
  created_at timestamptz default now(),
  unique(company_id, period_start, period_end)
);

create table if not exists public.billing_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  alert_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.plan_limits (
  plan text primary key,
  max_requests integer,
  max_tokens integer,
  max_agents integer,
  allow_override boolean not null default false,
  price_per_request_usd numeric not null default 0.01
);

insert into public.plan_limits(plan, max_requests, max_tokens, max_agents, allow_override, price_per_request_usd)
values
  ('basic', 10000, 3000000, 3, false, 0.01),
  ('pro', 100000, 50000000, null, true, 0.008),
  ('enterprise', null, null, null, true, 0.0)
on conflict (plan) do nothing;

alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;
alter table public.agent_requests enable row level security;
alter table public.agent_memory enable row level security;
alter table public.billing_usage enable row level security;
alter table public.agent_webhooks enable row level security;
alter table public.company_api_keys enable row level security;
alter table public.billing_alerts enable row level security;

create policy if not exists company_isolation_agents on public.agents
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_agent_versions on public.agent_versions
  for all using (
    exists (
      select 1 from public.agents a
      where a.id = agent_id and a.company_id = public.current_company_id()
    )
  )
  with check (
    exists (
      select 1 from public.agents a
      where a.id = agent_id and a.company_id = public.current_company_id()
    )
  );

create policy if not exists company_isolation_agent_requests on public.agent_requests
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_agent_memory on public.agent_memory
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_billing_usage on public.billing_usage
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_agent_webhooks on public.agent_webhooks
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_company_api_keys on public.company_api_keys
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_billing_alerts on public.billing_alerts
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create or replace function public.calculate_request_cost_usd(
  p_model text,
  p_tokens_prompt integer,
  p_tokens_completion integer
)
returns numeric
language sql
stable
as $$
  select coalesce(((p_tokens_prompt::numeric / 1000.0) * mp.prompt_price_per_1k), 0)
       + coalesce(((p_tokens_completion::numeric / 1000.0) * mp.completion_price_per_1k), 0)
  from public.model_pricing mp
  where mp.model = p_model
$$;

create or replace function public.activate_agent_version(p_agent_id uuid, p_version_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.agent_versions
  set is_active = false
  where agent_id = p_agent_id;

  update public.agent_versions
  set is_active = true
  where id = p_version_id and agent_id = p_agent_id;

  update public.agents
  set deployed_version_id = p_version_id,
      status = 'deployed',
      updated_at = now()
  where id = p_agent_id;
end;
$$;

create or replace function public.upsert_billing_usage(
  p_company_id uuid,
  p_request_increment integer,
  p_tokens_increment integer,
  p_cost_increment numeric,
  p_revenue_increment numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
begin
  insert into public.billing_usage (company_id, period_start, period_end, total_requests, total_tokens, total_cost_usd, gross_revenue_usd)
  values (p_company_id, v_period_start, v_period_end, p_request_increment, p_tokens_increment, p_cost_increment, p_revenue_increment)
  on conflict (company_id, period_start, period_end)
  do update set
    total_requests = public.billing_usage.total_requests + excluded.total_requests,
    total_tokens = public.billing_usage.total_tokens + excluded.total_tokens,
    total_cost_usd = public.billing_usage.total_cost_usd + excluded.total_cost_usd,
    gross_revenue_usd = public.billing_usage.gross_revenue_usd + excluded.gross_revenue_usd;
end;
$$;
