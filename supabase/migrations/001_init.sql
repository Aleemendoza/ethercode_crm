create extension if not exists vector;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'basic',
  created_at timestamptz default now()
);

create table if not exists public.users (
  id uuid primary key,
  company_id uuid references public.companies(id),
  role text check (role in ('admin','sales','viewer')),
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  name text,
  company text,
  email text,
  phone text,
  source text,
  status text default 'nuevo',
  ai_score integer default 0,
  estimated_value numeric,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id),
  type text not null,
  payload jsonb default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id),
  company_id uuid references public.companies(id),
  title text,
  description text,
  priority text,
  due_date timestamptz,
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  trigger_event text,
  condition jsonb,
  action jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  lead_id uuid references public.leads(id),
  input jsonb,
  output jsonb,
  created_at timestamptz default now()
);

create table if not exists public.embeddings_leads (
  lead_id uuid primary key references public.leads(id),
  embedding vector(1536)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','done','failed','dead')),
  attempts integer not null default 0,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_token text,
  last_error text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists jobs_company_idempotency_idx
  on public.jobs (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists jobs_polling_idx
  on public.jobs (status, run_at, locked_at);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null,
  error text,
  duration_ms integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  lead_id uuid references public.leads(id),
  automation_id uuid references public.automations(id),
  action_hash text,
  status text not null,
  payload jsonb default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.runbooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  name text not null,
  condition jsonb not null,
  actions jsonb not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.tasks enable row level security;
alter table public.automations enable row level security;
alter table public.agent_logs enable row level security;
alter table public.embeddings_leads enable row level security;
alter table public.jobs enable row level security;
alter table public.job_runs enable row level security;
alter table public.automation_runs enable row level security;
alter table public.runbooks enable row level security;

create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.users where id = auth.uid()
$$;

create policy if not exists company_isolation_leads on public.leads
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_tasks on public.tasks
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_automations on public.automations
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_agent_logs on public.agent_logs
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_jobs on public.jobs
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_runbooks on public.runbooks
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy if not exists company_isolation_lead_events on public.lead_events
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id and l.company_id = public.current_company_id()
    )
  );

create policy if not exists company_isolation_job_runs on public.job_runs
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.company_id = public.current_company_id()
    )
  );

create or replace function public.claim_jobs(p_limit integer default 50)
returns setof public.jobs
language plpgsql
security definer
as $$
declare
  v_lock_token text := gen_random_uuid()::text;
begin
  return query
  with candidates as (
    select id
    from public.jobs
    where status in ('queued','failed')
      and run_at <= now()
      and (locked_at is null or locked_at < now() - interval '15 minutes')
      and attempts < 5
    order by run_at asc
    limit p_limit
    for update skip locked
  ), updated as (
    update public.jobs j
    set status = 'running',
        locked_at = now(),
        lock_token = v_lock_token,
        updated_at = now()
    from candidates
    where j.id = candidates.id
    returning j.*
  )
  select * from updated;
end;
$$;

create or replace function public.finish_job(p_job_id uuid, p_status text, p_error text)
returns void
language plpgsql
security definer
as $$
declare
  v_attempts integer;
  v_next_run timestamptz;
begin
  select attempts into v_attempts from public.jobs where id = p_job_id;

  if p_status = 'done' then
    update public.jobs
    set status = 'done', locked_at = null, lock_token = null, last_error = null, updated_at = now()
    where id = p_job_id;
  else
    v_attempts := coalesce(v_attempts, 0) + 1;
    v_next_run := now() + make_interval(mins => least(60, power(2, v_attempts)::int));

    update public.jobs
    set status = case when v_attempts >= 5 then 'dead' else 'failed' end,
        attempts = v_attempts,
        run_at = v_next_run,
        locked_at = null,
        lock_token = null,
        last_error = p_error,
        updated_at = now()
    where id = p_job_id;
  end if;

  insert into public.job_runs (job_id, status, error)
  values (p_job_id, p_status, p_error);
end;
$$;
