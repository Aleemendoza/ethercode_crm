create extension if not exists pgcrypto;

insert into public.companies (id, name, plan)
values ('00000000-0000-0000-0000-000000000001', 'EtherCode Demo', 'pro')
on conflict (id) do update set name = excluded.name, plan = excluded.plan;

insert into public.automations (company_id, trigger_event, condition, action, active)
values
  ('00000000-0000-0000-0000-000000000001', 'lead_created', '{"source":{"equals":"web"}}', '{"type":"create_task","priority":"alta"}', true),
  ('00000000-0000-0000-0000-000000000001', 'score_updated', '{"ai_score":{"greater_than":70}}', '{"type":"send_whatsapp"}', true)
on conflict do nothing;

insert into public.tasks (company_id, title, description, priority)
select '00000000-0000-0000-0000-000000000001',
       concat('Demo Task #', gs),
       'Auto-generated staging task',
       case when gs % 2 = 0 then 'alta' else 'media' end
from generate_series(1,20) gs
where not exists (
  select 1 from public.tasks t
  where t.company_id = '00000000-0000-0000-0000-000000000001' and t.title = concat('Demo Task #', gs)
);

-- EAP base catalog and demo wiring (no mocked UI data, DB-backed)
insert into public.model_pricing (model, prompt_price_per_1k, completion_price_per_1k)
values
  ('gpt-4o', 0.005, 0.015),
  ('gpt-4o-mini', 0.00015, 0.0006)
on conflict (model) do update
set prompt_price_per_1k = excluded.prompt_price_per_1k,
    completion_price_per_1k = excluded.completion_price_per_1k;

insert into public.plan_limits (plan, max_requests, max_tokens, max_agents, allow_override, price_per_request_usd)
values
  ('basic', 10000, 3000000, 3, false, 0.01),
  ('pro', 100000, 50000000, null, true, 0.008),
  ('enterprise', null, null, null, true, 0.0)
on conflict (plan) do update
set max_requests = excluded.max_requests,
    max_tokens = excluded.max_tokens,
    max_agents = excluded.max_agents,
    allow_override = excluded.allow_override,
    price_per_request_usd = excluded.price_per_request_usd;

insert into public.company_api_keys (company_id, label, api_key_hash, requests_per_minute, tokens_per_minute, active)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Demo integration key',
    encode(digest('demo-eap-key-change-in-prod', 'sha256'), 'hex'),
    60,
    120000,
    true
  )
on conflict (api_key_hash) do nothing;

insert into public.agents (id, company_id, name, description, status, model, temperature, max_tokens, system_prompt)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Atención WhatsApp',
    'Agente de atención para restaurante',
    'deployed',
    'gpt-4o-mini',
    0.5,
    600,
    'Eres un agente de atención para restaurante. Identifica intención de reserva o cotización y responde en español.'
  )
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    model = excluded.model,
    temperature = excluded.temperature,
    max_tokens = excluded.max_tokens,
    system_prompt = excluded.system_prompt,
    updated_at = now();

insert into public.agent_versions (id, agent_id, version, system_prompt, temperature, max_tokens, model, is_active)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    1,
    'Eres un agente de atención para restaurante. Responde con precisión y propone próximo paso.',
    0.5,
    600,
    'gpt-4o-mini',
    true
  )
on conflict (id) do update
set system_prompt = excluded.system_prompt,
    temperature = excluded.temperature,
    max_tokens = excluded.max_tokens,
    model = excluded.model,
    is_active = excluded.is_active;

update public.agents
set deployed_version_id = '20000000-0000-0000-0000-000000000001',
    status = 'deployed',
    updated_at = now()
where id = '10000000-0000-0000-0000-000000000001';
