import Link from "next/link";
import { Shell } from "@/components/shell";

const sampleAgents = [
  { id: "agent-whatsapp", name: "Atención WhatsApp", status: "deployed", model: "gpt-4o", req: 2401, cost: 39.11 },
  { id: "agent-cotizaciones", name: "Cotizaciones", status: "paused", model: "gpt-4o-mini", req: 901, cost: 7.04 },
];

export default function AgentsPage() {
  return (
    <Shell title="Agents · EtherCode Agent Platform">
      <section className="grid cols-2">
        <article className="card">
          <p className="muted">Crear agente</p>
          <div className="stack">
            <span>• Nombre, modelo, temperatura y max tokens</span>
            <span>• Prompt del sistema versionado</span>
            <span>• Activación de versión y despliegue</span>
            <span>• Endpoint único: /api/agents/{"{agentId}"}/run</span>
          </div>
        </article>
        <article className="card">
          <p className="muted">Seguridad y facturación</p>
          <div className="stack">
            <span>• API key por cliente + límites por minuto</span>
            <span>• Registro total de requests/tokens/costo</span>
            <span>• Bloqueo por cuota de plan</span>
            <span>• Aislamiento multi-tenant con RLS</span>
          </div>
        </article>
      </section>

      <article className="card table" style={{ marginTop: 12 }}>
        <div className="tableHeader">
          <span>Agente</span><span>Estado</span><span>Modelo</span><span>Requests</span><span>Costo</span><span>Detalle</span>
        </div>
        {sampleAgents.map((agent) => (
          <div className="tableRow" key={agent.id}>
            <span>{agent.name}</span>
            <span>{agent.status}</span>
            <span>{agent.model}</span>
            <span>{agent.req}</span>
            <span>${agent.cost.toFixed(2)}</span>
            <span><Link href={`/agents/${agent.id}`}>Ver</Link></span>
          </div>
        ))}
      </article>
    </Shell>
  );
}
