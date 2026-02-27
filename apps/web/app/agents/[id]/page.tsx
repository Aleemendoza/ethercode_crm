import { Shell } from "@/components/shell";

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  return (
    <Shell title={`Agent Detail · ${params.id}`}>
      <section className="grid cols-4">
        <article className="card"><p className="muted">Total requests</p><h3>2,401</h3></article>
        <article className="card"><p className="muted">Tokens consumidos</p><h3>1.2M</h3></article>
        <article className="card"><p className="muted">Costo acumulado</p><h3>$39.11</h3></article>
        <article className="card"><p className="muted">Latencia promedio</p><h3>612ms</h3></article>
      </section>

      <section className="grid cols-2" style={{ marginTop: 12 }}>
        <article className="card">
          <p className="muted">Top intents</p>
          <ul className="stack">
            <li>reservation (42%)</li>
            <li>quote_request (31%)</li>
            <li>general (27%)</li>
          </ul>
        </article>
        <article className="card">
          <p className="muted">Uso diario (7 días)</p>
          <ul className="stack">
            <li>Lun: 210 req</li>
            <li>Mar: 287 req</li>
            <li>Mié: 301 req</li>
            <li>Jue: 356 req</li>
            <li>Vie: 412 req</li>
          </ul>
        </article>
      </section>
    </Shell>
  );
}
