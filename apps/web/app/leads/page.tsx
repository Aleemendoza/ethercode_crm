import { LeadRow } from "@/components/cards";
import { Shell } from "@/components/shell";
import { leads } from "@/lib/mock-data";

export default function LeadsPage() {
  return (
    <Shell title="Leads · Modo Operativo">
      <article className="card table">
        <div className="tableHeader">
          <span>Lead</span><span>Empresa</span><span>Estado</span><span>Score</span><span>Valor</span><span>Actividad</span>
        </div>
        {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
      </article>
    </Shell>
  );
}
