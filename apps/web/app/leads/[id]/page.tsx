import { Shell } from "@/components/shell";
import { leads } from "@/lib/mock-data";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = leads.find((item) => item.id === params.id) ?? leads[0];

  return (
    <Shell title={`Lead ${lead.id}`}>
      <section className="grid cols-2">
        <article className="card">
          <p className="muted">Resumen comercial</p>
          <h3>{lead.name}</h3>
          <p>{lead.company} · {lead.source}</p>
          <p>Urgencia: <span className="badge">{lead.urgency}</span></p>
          <p>Valor estimado: ${lead.estimatedValue}</p>
        </article>
        <article className="card">
          <p className="muted">Siguiente mejor acción</p>
          <ul className="stack">
            <li>Enviar follow-up corto con caso similar de éxito.</li>
            <li>Crear tarea de llamada en 2 horas.</li>
            <li>Mover a “propuesta” si responde positivamente.</li>
          </ul>
        </article>
      </section>
    </Shell>
  );
}
