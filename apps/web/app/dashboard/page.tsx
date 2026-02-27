import { AgentPanel, LeadRow, MetricsCard } from "@/components/cards";
import { Shell } from "@/components/shell";
import { leads, metrics } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <Shell title="Dashboard · Modo Ejecutivo">
      <section className="grid cols-4">
        <MetricsCard label="Valor potencial" value={`$${metrics.potentialValue}`} hint="+12% vs semana pasada" />
        <MetricsCard label="Conversión" value={`${metrics.conversionRate}%`} hint="Objetivo mensual: 30%" />
        <MetricsCard label="Score promedio" value={`${metrics.averageScore}`} hint="Basado en IA + histórico" />
        <MetricsCard label="Resp. promedio" value={`${metrics.avgResponseHours}h`} hint="Meta: < 2h" />
      </section>

      <section className="grid cols-2" style={{ marginTop: 12 }}>
        <article className="card table">
          <div className="tableHeader">
            <span>Lead</span><span>Empresa</span><span>Estado</span><span>Score</span><span>Valor</span><span>Actividad</span>
          </div>
          {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
        </article>
        <AgentPanel />
      </section>
    </Shell>
  );
}
