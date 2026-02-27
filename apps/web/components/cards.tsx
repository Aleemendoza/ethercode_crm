import Link from "next/link";
import { Lead } from "@/lib/mock-data";

export function MetricsCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="card">
      <p className="muted">{label}</p>
      <h3>{value}</h3>
      <small>{hint}</small>
    </article>
  );
}

export function LeadRow({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`} className="tableRow">
      <span>{lead.name}</span>
      <span>{lead.company}</span>
      <span>{lead.status}</span>
      <span>{lead.aiScore}</span>
      <span>${lead.estimatedValue}</span>
      <span>{lead.updatedAt}</span>
    </Link>
  );
}

export function AgentPanel() {
  return (
    <article className="card">
      <p className="muted">Agent panel · realtime</p>
      <ul className="stack">
        <li>✓ Clasificó 12 leads en la última hora</li>
        <li>✓ Detectó 2 leads calientes sin respuesta</li>
        <li>✓ Creó 4 tareas automáticas</li>
      </ul>
      <p className="hint">Sin botones extra: solo acciones sugeridas y estado actual.</p>
    </article>
  );
}
