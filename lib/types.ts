export type Workspace = "zuppas" | "appyon";

export type TaskStatus = "aberta" | "em-andamento" | "bloqueada" | "concluida";

export interface Task {
  id: string;
  workspace: Workspace;
  projeto: string;
  titulo: string;
  status: TaskStatus;
  responsavel?: string;
  nota?: string;
  atualizado: string;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  aberta: "Aberta",
  "em-andamento": "Em andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
};

export const STATUS_ORDER: TaskStatus[] = [
  "em-andamento",
  "aberta",
  "bloqueada",
  "concluida",
];
