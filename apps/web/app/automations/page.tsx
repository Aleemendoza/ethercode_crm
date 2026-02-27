import { Shell } from "@/components/shell";
import { automations } from "@/lib/mock-data";

export default function AutomationsPage() {
  return (
    <Shell title="Automatizaciones">
      <section className="grid cols-2">
        {automations.map((automation) => (
          <article key={automation.id} className="card">
            <p className="muted">{automation.id}</p>
            <strong>{automation.name}</strong>
            <p className="hint">Estado: <span className="badge">{automation.active ? "Activa" : "Pausada"}</span></p>
          </article>
        ))}
      </section>
    </Shell>
  );
}
