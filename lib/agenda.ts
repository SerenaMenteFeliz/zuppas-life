import {
  chaveConclusao,
  faixaDe,
  type Compromisso,
  type Conclusao,
  type Faixa,
  type ItemRecorrente,
  type Ocorrencia,
  type Pessoa,
} from "./types";
import { diaDaSemana, ehFimDeSemana, inicioDaSemana, somarDias } from "./datas";

/* Motor de agenda: transforma regra em ocorrência.

   O modelo guarda a regra ("varrer, segunda e quinta, mural da casa") e grava
   linha só quando alguém marca. Esta é a função que fecha a distância entre as
   duas coisas: dada uma data, quais itens valem, de quem é cada um, e em que
   faixa do dia caem.

   O padrão vem da pesquisa de 24/07: materializar uma linha por dia exigiria
   cron e uma tabela que só cresce, e quebra quando a regra muda. Gerar sob
   demanda custa esta função e o histórico continua sendo só o que aconteceu de
   verdade. */

/** O item se repete nesta data? Cobre a regra e a vigência. */
export function valeNoDia(item: ItemRecorrente, data: string): boolean {
  if (item.valeDe && data < item.valeDe) return false;
  if (item.valeAte && data > item.valeAte) return false;

  const r = item.recorrencia;
  switch (r.tipo) {
    case "diario":
      return true;
    case "dias-uteis":
      return !ehFimDeSemana(data);
    case "fim-de-semana":
      return ehFimDeSemana(data);
    case "semanal":
      return r.dias.includes(diaDaSemana(data));
  }
}

function deItem(item: ItemRecorrente, data: string): Ocorrencia {
  return {
    chave: chaveConclusao(item.id, data),
    id: item.id,
    titulo: item.titulo,
    detalhe: item.detalhe,
    categoria: item.categoria,
    bloco: item.bloco,
    horario: item.horario,
    dono: item.dono,
    ancora: item.ancora,
    data,
    removivel: false,
    vaultNota: item.vaultNota,
    envolve: item.envolve,
    exceto: item.exceto,
    akiane: item.akiane,
  };
}

function deCompromisso(c: Compromisso): Ocorrencia {
  return {
    chave: chaveConclusao(c.id, c.data),
    id: c.id,
    titulo: c.titulo,
    detalhe: c.detalhe,
    categoria: c.tipo,
    bloco: c.bloco,
    horario: c.horario,
    dono: c.para,
    ancora: false,
    data: c.data,
    removivel: true,
  };
}

/** Ordem dentro do dia: o que não tem hora nenhuma abre (fica disponível o dia
    todo), depois manhã, tarde e noite. Dentro da faixa, hora marcada primeiro,
    âncora antes do resto. */
const PESO_FAIXA: Record<Faixa, number> = { solto: 0, manha: 1, tarde: 2, noite: 3 };

export function ordenar(ocorrencias: Ocorrencia[]): Ocorrencia[] {
  return [...ocorrencias].sort((a, b) => {
    const fa = PESO_FAIXA[faixaDe(a)];
    const fb = PESO_FAIXA[faixaDe(b)];
    if (fa !== fb) return fa - fb;
    if (a.ancora !== b.ancora) return a.ancora ? -1 : 1;
    if (a.horario && b.horario) return a.horario.localeCompare(b.horario);
    if (a.horario) return -1;
    if (b.horario) return 1;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
}

/** Tudo que acontece numa data, já resolvido e ordenado. */
export function ocorrenciasDoDia(
  data: string,
  itens: ItemRecorrente[],
  compromissos: Compromisso[]
): Ocorrencia[] {
  const doDia = itens.filter((i) => valeNoDia(i, data)).map((i) => deItem(i, data));
  const marcados = compromissos.filter((c) => c.data === data).map(deCompromisso);
  return ordenar([...doDia, ...marcados]);
}

/** É **explicitamente** desta pessoa: ela é a dona, ou participa por desenho
    (a Akiane na escola).

    Mudou em 25/07: antes, item da Casa respondia `true` pra todo mundo. Fazia
    sentido quando "Casa" era exceção e quase tudo tinha nome. Depois que a
    casa virou mural, isso passou a responder `true` pra quase tudo, o que
    tornava o filtro por pessoa inútil e enchia a tela da Akiane com a casa
    inteira. Mural agora é uma pergunta separada, `ehDoMural`. */
export function ehDe(ocorrencia: Ocorrencia, pessoa: Pessoa): boolean {
  if (ocorrencia.exceto?.includes(pessoa)) return false;
  if (ocorrencia.dono === pessoa) return true;
  return ocorrencia.envolve?.includes(pessoa) ?? false;
}

/** Está no mural: não é de ninguém até alguém pegar. */
export function ehDoMural(ocorrencia: Ocorrencia): boolean {
  return ocorrencia.dono === "Casa";
}

/** Do jeito que a pessoa lê "o que é meu hoje": o que é dela por desenho, mais
    o que ela pegou ou fez com as próprias mãos. O mural inteiro fica de fora,
    senão "meu" volta a querer dizer "tudo". */
export function ehComigo(
  ocorrencia: Ocorrencia,
  pessoa: Pessoa,
  marcas: Marcas
): boolean {
  if (ehDe(ocorrencia, pessoa)) return true;
  return participou(ocorrencia.chave, pessoa, marcas);
}

/* ── Corrente de constância ──────────────────────────────────────────────────
   Deixou de ser a constante `DIAS_FECHADOS = 4` e virou contagem em cima das
   conclusões reais. É a peça que a auditoria de 24/07 apontou como o motor
   emocional do produto rodando sem nenhum dado por trás. */

/** Um dia fecha quando todas as âncoras válidas nele foram **feitas**.

    Pular não fecha. É a diferença entre "resolvi" e "aconteceu", e a corrente
    só faz sentido se contar a segunda coisa. */
export function diaFechado(
  data: string,
  itens: ItemRecorrente[],
  concluidas: Set<string>
): boolean {
  const ancoras = itens.filter((i) => i.ancora && valeNoDia(i, data));
  if (ancoras.length === 0) return false;
  return ancoras.every((i) => concluidas.has(chaveConclusao(i.id, data)));
}

/** Dias seguidos em que a casa fechou as âncoras, contando pra trás.

    Duas regras de justiça, e as duas mudam o resultado:

    **O dia de hoje ainda não acabou.** Se ele não fechou, a corrente é a de
    ontem. Quebrar a corrente às 8h da manhã porque o dia mal começou seria
    punir a família por nada, e o efeito da corrente depende dela ser justa.

    **Uma folga por semana** (opcional, ligada por padrão). A corrente funciona
    por aversão à perda: perder uma sequência de 15 dias dói cerca do dobro do
    que ganhar 15 dias agrada, e é isso que faz alguém não querer quebrá-la. O
    problema é que o mesmo mecanismo, sem válvula, faz a pessoa abandonar tudo
    no primeiro dia perdido. Por isso as ferramentas maduras têm folga ou
    recuperação. Aqui a folga não é comprada nem ganha: é uma por semana, de
    graça, porque a própria rotina da casa foi escrita partindo do princípio de
    que o dia vai ser interrompido. Um dia salvo no caos ainda conta.

    A folga **estende** uma corrente, nunca cria uma do nada. */
export function corrente(
  hoje: string,
  itens: ItemRecorrente[],
  concluidas: Set<string>,
  folgaSemanal = false
): number {
  return detalheDaCorrente(hoje, itens, concluidas, folgaSemanal).dias;
}

export interface DetalheCorrente {
  dias: number;
  /** Datas que quebrariam a corrente e foram perdoadas pela folga da semana. */
  folgas: string[];
}

export function detalheDaCorrente(
  hoje: string,
  itens: ItemRecorrente[],
  concluidas: Set<string>,
  folgaSemanal = false
): DetalheCorrente {
  let cursor = diaFechado(hoje, itens, concluidas) ? hoje : somarDias(hoje, -1);
  let dias = 0;
  const folgas: string[] = [];
  const usadaNaSemana = new Set<string>();

  /* Uma folga só vale se a corrente **continuar** depois dela. A folga gasta no
     dia em que a sequência morre de qualquer jeito não perdoou nada, e marcá-la
     no tracker faria a tela dizer que aquele dia foi salvo quando não foi. Por
     isso ela fica pendente até um dia seguinte ser efetivamente contado. */
  let pendente: string | null = null;

  /* Trava de segurança: sem ela, um bug de data vira laço infinito na tela da
     família. Um ano de corrente já é mais do que a casa precisa exibir. */
  for (let passo = 0; passo < 366; passo++) {
    if (diaFechado(cursor, itens, concluidas)) {
      dias += 1;
      if (pendente) {
        folgas.push(pendente);
        pendente = null;
      }
      cursor = somarDias(cursor, -1);
      continue;
    }

    /* Sem folga, ou ainda sem corrente pra estender, para aqui. */
    if (!folgaSemanal || dias === 0) break;

    const semana = inicioDaSemana(cursor);
    if (usadaNaSemana.has(semana)) break;

    usadaNaSemana.add(semana);
    pendente = cursor;
    cursor = somarDias(cursor, -1);
  }

  return { dias, folgas };
}

/** Índice rápido das participações, pra não varrer o array a cada linha.

    Guarda conjunto **e** lista de gente. O conjunto responde "aconteceu?" em
    tempo constante, que é o que as contagens e a corrente perguntam; a lista
    responde "quem?", que é o que a tela mostra desde 25/07 e é a peça que faz o
    mural não virar terra de ninguém. */
export interface Marcas {
  feitas: Set<string>;
  puladas: Set<string>;
  pegas: Set<string>;
  quemFez: Map<string, Pessoa[]>;
  quemPegou: Map<string, Pessoa[]>;
}

function juntar(mapa: Map<string, Pessoa[]>, chave: string, pessoa: Pessoa) {
  const atual = mapa.get(chave);
  if (!atual) {
    mapa.set(chave, [pessoa]);
    return;
  }
  if (!atual.includes(pessoa)) atual.push(pessoa);
}

export function indexar(conclusoes: Conclusao[]): Marcas {
  const feitas = new Set<string>();
  const puladas = new Set<string>();
  const pegas = new Set<string>();
  const quemFez = new Map<string, Pessoa[]>();
  const quemPegou = new Map<string, Pessoa[]>();

  for (const c of conclusoes) {
    if (c.tipo === "pulado") {
      puladas.add(c.chave);
    } else if (c.tipo === "pego") {
      pegas.add(c.chave);
      juntar(quemPegou, c.chave, c.pessoa);
    } else {
      /* Sem `tipo` é registro gravado antes do recurso de pular existir, e
         naquela época marcar só podia significar feito. */
      feitas.add(c.chave);
      juntar(quemFez, c.chave, c.pessoa);
    }
  }

  return { feitas, puladas, pegas, quemFez, quemPegou };
}

/** Estado da ocorrência, com uma ordem de precedência que importa.

    Feito ganha de tudo: se uma pessoa pulou e outra fez, a coisa aconteceu.
    Pego ganha de pulado pelo mesmo motivo invertido: alguém assumiu depois de
    outro ter desistido, e a tela precisa mostrar que está de pé. */
export function estadoDa(
  chave: string,
  marcas: Marcas
): "feito" | "pego" | "pulado" | "aberto" {
  if (marcas.feitas.has(chave)) return "feito";
  if (marcas.pegas.has(chave)) return "pego";
  if (marcas.puladas.has(chave)) return "pulado";
  return "aberto";
}

export type EstadoOcorrencia = ReturnType<typeof estadoDa>;

/** "Pego" ainda é coisa em aberto: alguém assumiu, ninguém terminou. Contar
    como resolvido faria o dia parecer fechado com a louça na pia. */
export function emAberto(estado: EstadoOcorrencia): boolean {
  return estado === "aberto" || estado === "pego";
}

export function quemFez(chave: string, marcas: Marcas): Pessoa[] {
  return marcas.quemFez.get(chave) ?? [];
}

export function quemPegou(chave: string, marcas: Marcas): Pessoa[] {
  return marcas.quemPegou.get(chave) ?? [];
}

/** Esta pessoa encostou nesta ocorrência (pegou ou fez). */
export function participou(chave: string, pessoa: Pessoa, marcas: Marcas): boolean {
  return (
    quemFez(chave, marcas).includes(pessoa) ||
    quemPegou(chave, marcas).includes(pessoa)
  );
}

/* ── Progresso ───────────────────────────────────────────────────────────────
   O que alimenta o tracker de semanas que o Yan pediu. Uma casa que só vê
   "hoje" nunca sabe se está melhorando; ver oito semanas lado a lado responde
   isso sem ninguém precisar abrir planilha. */

export interface DiaDoTracker {
  data: string;
  fechado: boolean;
  /** Quantas das âncoras do dia foram feitas, e de quantas. */
  feitas: number;
  total: number;
  futuro: boolean;
}

export function diaDoTracker(
  data: string,
  hoje: string,
  itens: ItemRecorrente[],
  feitas: Set<string>
): DiaDoTracker {
  const ancoras = itens.filter((i) => i.ancora && valeNoDia(i, data));
  const marcadas = ancoras.filter((i) => feitas.has(chaveConclusao(i.id, data)));
  return {
    data,
    fechado: ancoras.length > 0 && marcadas.length === ancoras.length,
    feitas: marcadas.length,
    total: ancoras.length,
    futuro: data > hoje,
  };
}

/** A melhor sequência que a casa já fez. Recorde importa: sem ele, a corrente
    de hoje não tem contra o que ser comparada. */
export function melhorCorrente(
  hoje: string,
  itens: ItemRecorrente[],
  feitas: Set<string>,
  janelaEmDias = 180
): number {
  let melhor = 0;
  let atual = 0;
  for (let i = janelaEmDias; i >= 0; i--) {
    const dia = somarDias(hoje, -i);
    if (diaFechado(dia, itens, feitas)) {
      atual += 1;
      if (atual > melhor) melhor = atual;
    } else if (dia < hoje) {
      /* O dia de hoje ainda não acabou: não zera o recorde por estar em
         andamento. */
      atual = 0;
    }
  }
  return melhor;
}

/* ── Placar da casa ──────────────────────────────────────────────────────────
   Quem fez quanta coisa nos últimos dias.

   Esta é a contrapartida obrigatória de ter tirado os nomes das tarefas em
   25/07. Mural sem placar não distribui trabalho, distribui a possibilidade de
   não fazer: some o "é sua vez" e não entra nada no lugar, então quem já
   puxava continua puxando e agora sem ninguém conseguir apontar.

   Não é gamificação. Sem ponto, sem prêmio, sem vencedor, sem meta por pessoa,
   e de propósito: a pesquisa de 25/07 sobre recompensa em painel de família foi
   o motivo de não existir sistema de pontos pra criança aqui, e valeria o mesmo
   pra adulto. É contagem seca do que aconteceu. Se a semana ficou torta, a tela
   mostra torto e a conversa acontece entre as pessoas, não pelo app. */

export interface LinhaDoPlacar {
  pessoa: Pessoa;
  feitas: number;
  /** Assumidas e ainda não terminadas. */
  pegas: number;
}

export function placar(
  hoje: string,
  conclusoes: Conclusao[],
  pessoas: Pessoa[],
  janelaEmDias = 7
): LinhaDoPlacar[] {
  const desde = somarDias(hoje, -(janelaEmDias - 1));
  const feitas = new Map<Pessoa, number>();
  const pegas = new Map<Pessoa, number>();

  for (const c of conclusoes) {
    if (c.data < desde || c.data > hoje) continue;
    const mapa = c.tipo === "pego" ? pegas : c.tipo === "pulado" ? null : feitas;
    if (!mapa) continue;
    mapa.set(c.pessoa, (mapa.get(c.pessoa) ?? 0) + 1);
  }

  return pessoas
    .map((pessoa) => ({
      pessoa,
      feitas: feitas.get(pessoa) ?? 0,
      pegas: pegas.get(pessoa) ?? 0,
    }))
    .sort((a, b) => b.feitas - a.feitas || a.pessoa.localeCompare(b.pessoa, "pt-BR"));
}
