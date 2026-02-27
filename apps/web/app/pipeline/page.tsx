import { Shell } from "@/components/shell";
import { leads } from "@/lib/mock-data";

const statuses = ["nuevo", "contactado", "propuesta", "ganado"] as const;

export default function PipelinePage() {
  return (
    <Shell title="Pipeline Visual">
      <section className="kanban">
        {statuses.map((status) => (
          <article key={status} className="column">
            <p className="muted" style={{ textTransform: "capitalize" }}>{status}</p>
            <div className="grid">
              {leads.filter((lead) => lead.status === status).map((lead) => (
                <div key={lead.id} className="card">
                  <strong>{lead.name}</strong>
                  <p className="hint">{lead.company}</p>
                  <p className="hint">Score {lead.aiScore} · ${lead.estimatedValue}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </Shell>
  );
}
