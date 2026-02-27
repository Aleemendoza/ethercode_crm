import { Shell } from "@/components/shell";

const tasks = [
  "Llamar lead caliente L-101",
  "Enviar propuesta a L-103",
  "Verificar objeción de precio L-102",
  "Actualizar estimación de L-104"
];

export default function TasksPage() {
  return (
    <Shell title="Tareas">
      <article className="card">
        <p className="muted">Priorización inteligente</p>
        <ul className="stack">
          {tasks.map((task) => <li key={task}>{task}</li>)}
        </ul>
      </article>
    </Shell>
  );
}
