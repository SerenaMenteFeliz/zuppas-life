import { ITENS } from "./dados";
import { ocorrenciasDoDia } from "./agenda";
import { blocoDaHora, type Bloco, type Compromisso, type Dono, type Ocorrencia, type Pessoa } from "./types";

/* O Quadro da semana: a rotina completa da casa, por período do dia, mais o que
   foi agendado com horário. Nasceu em 04/10/2026 (pedido do Yan): a TV mostra
   o dia de hoje na altura toda, o que vem agora e a semana; o desktop marca.

   A rotina é a mesma do resto do app (ITENS, em lib/dados.ts) e o dia é
   montado pela mesma função (`ocorrenciasDoDia`). O que o Quadro tem de novo
   é onde o estado mora: marcações e agendados vão pro Supabase, porque a TV
   abre o site sozinha e precisa ver o que foi marcado no PC. */

/** Primeiro dia que o Quadro cobra. Antes dele a semana não tinge nada de
    "faltou": sem isso a TV estrearia cobrando dias que a família nunca
    combinou. Mudar quando a reunião de rotina definir o começo de verdade. */
export const INICIO_QUADRO = "2026-10-05";

export type Marcacao = {
  item: string;
  data: string;
  parte: string;
  pessoa: Pessoa;
};

export type Agendado = {
  id: string;
  titulo: string;
  data: string;
  horario: string | null;
  bloco: Bloco;
  para: Dono;
  criado_por: Pessoa | null;
};

export type NovoAgendado = Omit<Agendado, "id">;

export function chaveMarca(item: string, data: string): string {
  return `${item}|${data}`;
}

/** Quem marcou cada ocorrência (`item|data`). */
export function indexarMarcacoes(marcacoes: Marcacao[]): Map<string, Pessoa[]> {
  const mapa = new Map<string, Pessoa[]>();
  for (const m of marcacoes) {
    const chave = chaveMarca(m.item, m.data);
    const lista = mapa.get(chave) ?? [];
    if (!lista.includes(m.pessoa)) lista.push(m.pessoa);
    mapa.set(chave, lista);
  }
  return mapa;
}

/** Período de um horário "HH:MM". Agendado com hora não precisa que alguém
    escolha o período à mão. */
export function blocoDoHorario(horario: string): Bloco {
  return blocoDaHora(Number(horario.slice(0, 2)));
}

function paraCompromisso(a: Agendado): Compromisso {
  return {
    id: a.id,
    titulo: a.titulo,
    data: a.data,
    horario: a.horario ?? undefined,
    bloco: a.bloco,
    para: a.para,
    tipo: "compromisso",
    criadoPor: a.criado_por ?? undefined,
  };
}

/** O dia inteiro: rotina que vale naquela data mais os agendados dela. */
export function diaDoQuadro(data: string, agenda: Agendado[]): Ocorrencia[] {
  return ocorrenciasDoDia(data, ITENS, agenda.map(paraCompromisso));
}

export function minutos(horario: string): number {
  return Number(horario.slice(0, 2)) * 60 + Number(horario.slice(3, 5));
}

export const IDS_DA_ROTINA = new Set(ITENS.map((i) => i.id));
