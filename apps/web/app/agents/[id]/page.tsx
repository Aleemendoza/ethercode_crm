import { Shell } from "@/components/shell";
import { getAgentDetail, getDashboardCompanyId } from "@/lib/agents-dashboard";

export const runtime = "nodejs";

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const companyId = await getDashboardCompanyId();
  const detail = companyId ? await getAgentDetail(companyId, params.id) : null;

  if (!detail) {
    return (
      <Shell title={`Agent Detail · ${params.id}`}>
        <article className="card">
          <p className="muted">No se encontró el agente para la compañía activa.</p>
        </article>
      </Shell>
    );
  }

  return (
    <Shell title={`Agent Detail · ${detail.agent.name}`}>
      <section className="grid cols-4">
        <article className="card">
          <p className="muted">Total requests</p>
          <h3>{detail.metrics.totalRequests}</h3>
        </article>
        <article className="card">
          <p className="muted">Tokens consumidos</p>
          <h3>{detail.metrics.totalTokens}</h3>
        </article>
        <article className="card">
          <p className="muted">Costo acumulado</p>
          <h3>${detail.metrics.totalCost.toFixed(4)}</h3>
        </article>
        <article className="card">
          <p className="muted">Latencia promedio</p>
          <h3>{detail.metrics.avgLatency}ms</h3>
        </article>
      </section>

      <section className="grid cols-2" style={{ marginTop: 12 }}>
        <article className="card">
          <p className="muted">Top intents</p>
          <ul className="stack">
            {detail.topIntents.map((item) => (
              <li key={item.intent}>
                {item.intent} ({item.count})
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <p className="muted">Uso diario (7 días)</p>
          <ul className="stack">
            {detail.usageDaily.map((item) => (
              <li key={item.day}>
                {item.day}: {item.count} req
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid cols-2" style={{ marginTop: 12 }}>
        <article className="card">
          <p className="muted">Últimos 20 inputs</p>
          <ul className="stack">
            {detail.latestInputs.map((input, idx) => (
              <li key={`in-${idx}`}>{JSON.stringify(input).slice(0, 180)}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <p className="muted">Últimos 20 outputs</p>
          <ul className="stack">
            {detail.latestOutputs.map((output, idx) => (
              <li key={`out-${idx}`}>{JSON.stringify(output).slice(0, 180)}</li>
            ))}
          </ul>
        </article>
      </section>
    </Shell>
  );
}
