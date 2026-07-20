"use client";

import { useMemo, useState } from "react";
import { mockTasks } from "@/lib/mock-tasks";
import { STATUS_LABEL, STATUS_ORDER, Task, TaskStatus, Workspace } from "@/lib/types";

const WORKSPACE_LABEL: Record<Workspace, string> = {
  zuppas: "Zuppas",
  appyon: "Appyon",
};

const STATUS_STYLE: Record<TaskStatus, { dot: string; border: string; text: string }> = {
  "em-andamento": { dot: "bg-sky-400", border: "border-sky-900/60", text: "text-sky-300" },
  aberta: { dot: "bg-zinc-400", border: "border-zinc-800", text: "text-zinc-300" },
  bloqueada: { dot: "bg-amber-400", border: "border-amber-900/60", text: "text-amber-300" },
  concluida: { dot: "bg-emerald-400", border: "border-emerald-900/60", text: "text-emerald-300" },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function TaskCard({ task }: { task: Task }) {
  const style = STATUS_STYLE[task.status];
  return (
    <div
      className={`rounded-lg border ${style.border} bg-zinc-900/60 p-3 flex flex-col gap-2 hover:bg-zinc-900 transition-colors`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm leading-snug text-zinc-100">{task.titulo}</span>
      </div>
      {task.nota && (
        <p className="text-xs text-zinc-500 leading-snug">{task.nota}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
            {task.projeto}
          </span>
          {task.responsavel && (
            <span className="text-[10px] rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">
              {task.responsavel}
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-600">{formatDate(task.atualizado)}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>("zuppas");
  const [projetoFilter, setProjetoFilter] = useState<string | null>(null);

  const tasksInWorkspace = useMemo(
    () => mockTasks.filter((t) => t.workspace === workspace),
    [workspace]
  );

  const projetos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasksInWorkspace) {
      counts.set(t.projeto, (counts.get(t.projeto) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [tasksInWorkspace]);

  const filteredTasks = useMemo(
    () =>
      projetoFilter
        ? tasksInWorkspace.filter((t) => t.projeto === projetoFilter)
        : tasksInWorkspace,
    [tasksInWorkspace, projetoFilter]
  );

  const columns = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const t of filteredTasks) map.get(t.status)?.push(t);
    return map;
  }, [filteredTasks]);

  const workspaceCounts: Record<Workspace, number> = {
    zuppas: mockTasks.filter((t) => t.workspace === "zuppas" && t.status !== "concluida").length,
    appyon: mockTasks.filter((t) => t.workspace === "appyon" && t.status !== "concluida").length,
  };

  return (
    <div className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-6 py-8 gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Zuppas Ops</h1>
          <p className="text-sm text-zinc-500">
            Todas as tasks abertas, num lugar só — sem gastar token perguntando.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(Object.keys(WORKSPACE_LABEL) as Workspace[]).map((ws) => (
            <button
              key={ws}
              onClick={() => {
                setWorkspace(ws);
                setProjetoFilter(null);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                workspace === ws
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {WORKSPACE_LABEL[ws]}
              <span
                className={`ml-2 text-xs ${
                  workspace === ws ? "text-zinc-500" : "text-zinc-600"
                }`}
              >
                {workspaceCounts[ws]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setProjetoFilter(null)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              projetoFilter === null
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Todos
          </button>
          {projetos.map(([projeto, count]) => (
            <button
              key={projeto}
              onClick={() => setProjetoFilter(projeto)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                projetoFilter === projeto
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {projeto} <span className="text-zinc-600">{count}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {STATUS_ORDER.map((status) => {
          const tasks = columns.get(status) ?? [];
          const style = STATUS_STYLE[status];
          return (
            <div key={status} className="flex flex-col gap-3 min-h-0">
              <div className="flex items-center gap-2 px-1">
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <h2 className={`text-xs font-medium uppercase tracking-wide ${style.text}`}>
                  {STATUS_LABEL[status]}
                </h2>
                <span className="text-xs text-zinc-600">{tasks.length}</span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">
                {tasks.length === 0 && (
                  <p className="text-xs text-zinc-700 px-1">Nada aqui.</p>
                )}
                {tasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
