/* Modelo de objetos do Zuppas Life.

   Quatro tipos, não um. O v1 de 14/07 previa só `tasks` e o reenquadramento
   de 19/07 mostrou que não bastava: rotina é recorrente (a pergunta é
   "cumpriu hoje", não "está aberta") e lembrete exige escrita e aviso.

   Sem campo `workspace`: a Appyon saiu do escopo em 19/07 e só existe um
   vault de origem. */

export type Pessoa = "Yan" | "Liz" | "Ge" | "Camilla" | "André";

export const PESSOAS: Pessoa[] = ["Yan", "Liz", "Ge", "Camilla", "André"];

/* Iniciais pro avatar da TV — evita depender de imagem. */
export const INICIAL: Record<Pessoa, string> = {
  Yan: "Y",
  Liz: "L",
  Ge: "G",
  Camilla: "C",
  André: "A",
};

export type PendenciaStatus = "aberta" | "em-andamento" | "bloqueada" | "concluida";

export const STATUS_LABEL: Record<PendenciaStatus, string> = {
  aberta: "Aberta",
  "em-andamento": "Em andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
};

/** Uma pendência real, com dono. Aponta pro projeto que a explica no vault. */
export interface Pendencia {
  id: string;
  projeto: string;
  titulo: string;
  status: PendenciaStatus;
  responsavel: Pessoa;
  nota?: string;
  /** ISO YYYY-MM-DD */
  atualizado: string;
  /** ISO YYYY-MM-DD, opcional */
  prazo?: string;
}

/** Rotina recorrente. `ancora` marca as que definem se o dia contou. */
export interface Rotina {
  id: string;
  titulo: string;
  detalhe?: string;
  horario?: string;
  responsavel: Pessoa | "Casa";
  ancora: boolean;
}

export interface Lembrete {
  id: string;
  titulo: string;
  /** ISO YYYY-MM-DD */
  quando: string;
  para: Pessoa | "Casa";
}

export interface ItemCasa {
  id: string;
  titulo: string;
  por: Pessoa;
  feito: boolean;
}

/** Número agregado do negócio, pra TV.

    Só o agregado atravessa, nunca as linhas de lead — a decisão de 19/07 de
    manter os bancos separados foi sobre não copiar dado de cliente pra um
    painel que a família abre. Um contador não é dado de cliente. */
export interface NumeroNegocio {
  rotulo: string;
  valor: number;
  detalhe: string;
}
