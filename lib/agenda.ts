import {
  chaveConclusao,
  type Bloco,
  type Compromisso,
  type Conclusao,
  type Dono,
  type ItemRecorrente,
  type Ocorrencia,
  type Pessoa,
} from "./types";
import {
  diaDaSemana,
  ehFimDeSemana,
  inicioDaSemana,
  semanaISO,
  somarDias,
} from "./datas";

/* Motor de agenda: transforma regra em ocorrência.

   O modelo guarda a regra ("varrer, segunda e quinta, rodízio entre Yan, Ge e
   Camilla") e grava linha só quando alguém marca. Esta é a função que fecha a
   distância entre as duas coisas: dada uma data, quais itens valem, de quem é
   cada um naquela semana, e em que bloco do dia caem.

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

/** De quem é o item nesta data.

    Sem rodízio, é o dono fixo. Com rodízio, gira por semana ISO: quem varre
    esta semana sai de `semana % tamanho`, sem precisar guardar estado nenhum.
    Isso é o que faz "de quem é a vez" existir sem tabela de escala. */
export function donoNoDia(item: ItemRecorrente, data: string): Dono {
  if (!item.rodizio || item.rodizio.length === 0) return item.dono;
  return item.rodizio[semanaISO(data) % item.rodizio.length];
}

/** Quem pega o item na próxima semana. Prévia importa: saber o que vem evita
    a discussão de "por que sempre eu". */
export function proximoDono(item: ItemRecorrente, data: string): Dono | null {
  if (!item.rodizio || item.rodizio.length === 0) return null;
  return donoNoDia(item, somarDias(data, 7));
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
    dono: donoNoDia(item, data),
    ancora: item.ancora,
    data,
    removivel: false,
    vaultNota: item.vaultNota,
    envolve: item.envolve,
    exceto: item.exceto,
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

/** Ordem dentro do dia: quem tem hora marcada vem primeiro, na hora; o resto
    segue por bloco e depois por âncora. */
const PESO_BLOCO: Record<Bloco, number> = { manha: 0, tarde: 1, noite: 2 };

export function ordenar(ocorrencias: Ocorrencia[]): Ocorrencia[] {
  return [...ocorrencias].sort((a, b) => {
    if (PESO_BLOCO[a.bloco] !== PESO_BLOCO[b.bloco]) {
      return PESO_BLOCO[a.bloco] - PESO_BLOCO[b.bloco];
    }
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

/** Filtro de "é meu". "Casa" aparece pra todo mundo de propósito: se é da
    casa, é de quem estiver olhando, a menos que a pessoa esteja de fora. */
export function ehDe(ocorrencia: Ocorrencia, pessoa: Pessoa): boolean {
  if (ocorrencia.exceto?.includes(pessoa)) return false;
  if (ocorrencia.dono === pessoa) return true;
  if (ocorrencia.envolve?.includes(pessoa)) return true;
  return ocorrencia.dono === "Casa";
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

/** Índice rápido de conclusões, pra não varrer o array a cada linha.

    Dois conjuntos e não um: feito e pulado são estados diferentes na tela
    (um risca, o outro apaga) e diferentes na corrente (só feito conta). */
export interface Marcas {
  feitas: Set<string>;
  puladas: Set<string>;
}

export function indexar(conclusoes: Conclusao[]): Marcas {
  const feitas = new Set<string>();
  const puladas = new Set<string>();
  for (const c of conclusoes) {
    /* Sem `tipo` é registro gravado antes do recurso de pular existir, e
       naquela época marcar só podia significar feito. */
    if (c.tipo === "pulado") puladas.add(c.chave);
    else feitas.add(c.chave);
  }
  return { feitas, puladas };
}

export function estadoDa(chave: string, marcas: Marcas): "feito" | "pulado" | "aberto" {
  if (marcas.feitas.has(chave)) return "feito";
  if (marcas.puladas.has(chave)) return "pulado";
  return "aberto";
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
