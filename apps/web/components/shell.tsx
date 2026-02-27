import Link from "next/link";
import { ReactNode } from "react";

const items = [
  ["/dashboard", "Dashboard"],
  ["/leads", "Leads"],
  ["/pipeline", "Pipeline"],
  ["/tasks", "Tareas"],
  ["/automations", "Automatizaciones"],
  ["/agents", "Agents"],
  ["/settings", "Settings"]
] as const;

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>EtherCode CRM OS</h1>
        <p>Modo SaaS multi-proyecto</p>
        <nav>
          {items.map(([href, label]) => (
            <Link key={href} href={href} className="navLink">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="pill">Company: EtherCode Demo</div>
        </header>
        {children}
      </main>
    </div>
  );
}
