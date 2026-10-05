import { diaDaSemana } from "./datas";
import type { Pessoa } from "./types";

/* O Quadro da semana: o essencial e obrigatório de todo dia, pra casa inteira.

   Nasceu em 04/10/2026, pedido do Yan: uma visão de segunda a domingo, geral,
   sem dono por tarefa, que a TV mostra e o desktop marca. Substitui aos poucos
   as telas antigas.

   O critério pra uma linha entrar aqui, e ele é o que segura a lista curta:
   acontece todo dia (ou todo dia útil), dá pra responder "fez ou não fez" com
   honestidade, e a casa sente quando não acontece. Por isso ficaram de fora a
   "Organização geral" (é regra de convivência, não dá pra marcar), o Brincar e
   o Ajudar (são da rotina da Akiane, que tem aba própria) e as semanais
   (varrer, banheiros, roupa, mercado, marmitas e as de domingo).

   O teto é umas 9 linhas: a TV fica a uns 3 metros, e linha a mais encolhe a
   letra até ninguém ler do sofá. Antes de acrescentar, tirar. */

export type Parte = { id: string; rotulo: string };

export type LinhaQuadro = {
  id: string;
  rotulo: string;
  /** "uteis" = segunda a sexta. */
  dias: "todos" | "uteis";
  /** Linha com partes vira bolinhas dentro da célula (os 4 passeios do Biro).
      Sem partes, a célula é uma marcação só. */
  partes?: Parte[];
  ancora?: boolean;
};

const ESCOLA: Parte[] = [
  { id: "levar", rotulo: "Levar" },
  { id: "buscar", rotulo: "Buscar" },
];

export const LINHAS_QUADRO: LinhaQuadro[] = [
  { id: "alongamento", rotulo: "Alongamento ao acordar", dias: "todos", ancora: true },
  { id: "meditacao", rotulo: "Meditação guiada pela Liz", dias: "todos", ancora: true },
  { id: "cardapio", rotulo: "Comer pelo cardápio", dias: "todos", ancora: true },
  {
    id: "biro",
    rotulo: "Biro",
    dias: "todos",
    partes: [
      { id: "manha", rotulo: "Manhã" },
      { id: "almoco", rotulo: "Almoço" },
      { id: "tarde", rotulo: "Tarde" },
      { id: "noite", rotulo: "Noite" },
    ],
  },
  { id: "cozinhar", rotulo: "Cozinhar", dias: "todos" },
  { id: "louca", rotulo: "Louça", dias: "todos" },
  { id: "lixo", rotulo: "Lixo", dias: "todos" },
  { id: "escola-andre", rotulo: "Escola do André", dias: "uteis", partes: ESCOLA },
  /* A Akiane voltou às aulas (confirmado pelo Yan em 04/10/2026). */
  { id: "escola-akiane", rotulo: "Escola da Akiane", dias: "uteis", partes: ESCOLA },
];

/** Partes de uma linha, com a parte única ('') quando ela não tem partes. */
export function partesDe(linha: LinhaQuadro): Parte[] {
  return linha.partes ?? [{ id: "", rotulo: linha.rotulo }];
}

/** Primeiro dia que o Quadro cobra. Antes dele as células ficam neutras: sem
    isso a TV estrearia com a semana anterior inteira tingida de "faltou", uma
    cobrança sobre dias que a família nunca combinou. Mudar quando a reunião de
    rotina definir o começo de verdade. */
export const INICIO_QUADRO = "2026-10-05";

export function valeNoDia(linha: LinhaQuadro, iso: string): boolean {
  if (iso < INICIO_QUADRO) return false;
  if (linha.dias === "todos") return true;
  const d = diaDaSemana(iso);
  return d >= 1 && d <= 5;
}

export type Marcacao = {
  item: string;
  data: string;
  parte: string;
  pessoa: Pessoa;
};

export function chaveCelula(item: string, data: string, parte: string): string {
  return `${item}|${data}|${parte}`;
}

/** Quem marcou cada parte de cada célula. */
export function indexarMarcacoes(marcacoes: Marcacao[]): Map<string, Pessoa[]> {
  const mapa = new Map<string, Pessoa[]>();
  for (const m of marcacoes) {
    const chave = chaveCelula(m.item, m.data, m.parte);
    const lista = mapa.get(chave) ?? [];
    lista.push(m.pessoa);
    mapa.set(chave, lista);
  }
  return mapa;
}
