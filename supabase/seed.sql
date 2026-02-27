insert into public.companies (id, name, plan)
values ('00000000-0000-0000-0000-000000000001', 'EtherCode Demo', 'pro')
on conflict (id) do update set name = excluded.name, plan = excluded.plan;

insert into public.automations (company_id, trigger_event, condition, action, active)
values
  ('00000000-0000-0000-0000-000000000001', 'lead_created', '{"source":{"equals":"web"}}', '{"type":"create_task","priority":"alta"}', true),
  ('00000000-0000-0000-0000-000000000001', 'score_updated', '{"ai_score":{"greater_than":70}}', '{"type":"send_whatsapp_mock"}', true)
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
