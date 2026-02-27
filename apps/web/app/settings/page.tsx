import { Shell } from "@/components/shell";

export default function SettingsPage() {
  return (
    <Shell title="Configuración">
      <section className="grid cols-2">
        <article className="card">
          <p className="muted">Modo de uso</p>
          <h3 style={{ fontSize: 20 }}>Ejecutivo / Operativo</h3>
          <p className="hint">La interfaz prioriza claridad: pocos controles, decisiones accionables y contexto AI.</p>
        </article>
        <article className="card">
          <p className="muted">Multi-proyecto</p>
          <p>Preparado para segmentación por empresa, plan y límites por tenant.</p>
          <p className="hint">Siguiente paso: conectar selector de company con políticas RLS reales.</p>
        </article>
      </section>
    </Shell>
  );
}
