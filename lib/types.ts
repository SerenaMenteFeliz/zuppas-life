/* Modelo de objetos do Zuppas Life.

   Revisado em 24/07/2026 depois da auditoria do código contra o escopo
   (ver [[Zuppas Life - Revisão e Direções de Produto]] no vault). O que mudou
   em relação ao modelo de 20/07, e por quê:

   1. Rotina virou `ItemRecorrente` com regra de recorrência de verdade. O
      reenquadramento de 19/07 já dizia que linha estática não representa
      "cumpriu hoje", e o código ainda tinha a linha estática.
   2. Conclusão virou objeto próprio (`Conclusao`). A definição fica na regra,
      e só grava linha quando alguém marca. Sem cron, sem tabela inflando, e a
      corrente de constância vira uma contagem em cima do que existe.
   3. `Lembrete` foi absorvido por `Compromisso`, que agora tem hora. Eram o
      mesmo objeto com nomes diferentes, e o de lembrete não tinha hora, o que
      inviabilizava a notificação da fase 5.
   4. Akiane entrou em `PESSOAS`. É filha da casa e a razão do desenho de duas
      camadas da rotina existir; estava fora do app.
   5. Rodízio, blocos do dia e vigência (`valeDe`/`valeAte`) entraram porque a
      casa real usa os três: varrer/banheiro rodam entre três pessoas, o dia da
      família é organizado por janela e não por horário, e os itens de escola
      não valem durante as férias.

   Sem campo `workspace`: a Appyon saiu do escopo em 19/07. */

/* ── Pessoas ─────────────────────────────────────────────────────────────── */

export type Pessoa = "Yan" | "Liz" | "Ge" | "Camilla" | "André" | "Akiane";

/** Quem aparece na parede. Não é a mesma lista de quem loga: André e Akiane
    existem no painel sem necessariamente ter conta (decisão em aberto). */
export const PESSOAS: Pessoa[] = ["Yan", "Liz", "Ge", "Camilla", "André", "Akiane"];

/** Dono de uma tarefa. "Casa" é a família inteira, não uma pessoa. */
export type Dono = Pessoa | "Casa";

export const INICIAL: Record<Pessoa, string> = {
  Yan: "Y",
  Liz: "L",
  Ge: "G",
  Camilla: "C",
  André: "A",
  Akiane: "K",
};

/* ── Blocos do dia ───────────────────────────────────────────────────────────
   Janela, não horário fixo. A [[Rotina - Família (Semana 1)]] é explícita:
   "não é horário fixo, é uma janela, a família tem liberdade dentro do bloco". */

export type Bloco = "manha" | "tarde" | "noite";

export const BLOCOS: Bloco[] = ["manha", "tarde", "noite"];

export const BLOCO_LABEL: Record<Bloco, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const BLOCO_JANELA: Record<Bloco, string> = {
  manha: "até 12h",
  tarde: "12h às 17h",
  noite: "depois do jantar",
};

/** Em que bloco cai o relógio agora. Serve pra abrir a aba certa. */
export function blocoDaHora(hora: number): Bloco {
  if (hora < 12) return "manha";
  if (hora < 18) return "tarde";
  return "noite";
}

/* ── Categorias ──────────────────────────────────────────────────────────── */

export type Categoria =
  | "ancora"
  | "biro"
  | "casa"
  | "escola"
  | "pessoal"
  | "compromisso"
  | "lembrete"
  | "pendencia";

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  ancora: "Âncora",
  biro: "Biro",
  casa: "Casa",
  escola: "Escola",
  pessoal: "Pessoal",
  compromisso: "Compromisso",
  lembrete: "Lembrete",
  pendencia: "Pendência",
};

/* ── Recorrência ─────────────────────────────────────────────────────────────
   A regra, não as ocorrências. Materializar uma linha por dia exigiria cron e
   uma tabela que só cresce; guardar a regra e gerar sob demanda custa uma
   função. `dias` usa 0 = domingo, igual a `Date.getDay()`. */

export type Recorrencia =
  | { tipo: "diario" }
  | { tipo: "dias-uteis" }
  | { tipo: "fim-de-semana" }
  | { tipo: "semanal"; dias: number[] };

/* ── Item recorrente ─────────────────────────────────────────────────────────
   Um tipo só cobre âncora, passeio do Biro, tarefa de casa e horário escolar.
   Eram quatro coisas diferentes no papel e são a mesma no modelo: algo que se
   repete, tem dono e a pergunta é "aconteceu hoje". */

export interface ItemRecorrente {
  id: string;
  titulo: string;
  detalhe?: string;
  categoria: Categoria;
  bloco: Bloco;
  /** Horário fixo, quando existe de verdade (escola tem, cozinhar não). */
  horario?: string;
  recorrencia: Recorrencia;
  /** Dono fixo. Ignorado quando há `rodizio`. */
  dono: Dono;
  /** Quando preenchido, o dono roda por semana entre estas pessoas. */
  rodizio?: Pessoa[];
  /** Quem participa além do dono. "Liz leva a Akiane" é da Liz e é da Akiane:
      sem isso, o dia da Akiane fica vazio na tela dela. */
  envolve?: Pessoa[];
  /** Quem não participa, mesmo sendo item da Casa. O alongamento é de todos
      menos a Akiane, e mostrar pra ela uma coisa que não é dela quebra
      justamente a previsibilidade que a tela existe pra dar. */
  exceto?: Pessoa[];
  /** Âncora define se o dia da casa contou. Ver a regra das 3 no vault. */
  ancora: boolean;
  /** Vigência. Os itens de escola não valem durante as férias. */
  valeDe?: string;
  valeAte?: string;
  /** Nota do vault que explica o item. Abre no Obsidian, inerte pro resto. */
  vaultNota?: string;
}

/* ── Compromisso ─────────────────────────────────────────────────────────────
   Data marcada. Absorveu o antigo `Lembrete`: a diferença entre os dois é o
   que a pessoa faz com ele, não a forma do dado. */

export interface Compromisso {
  id: string;
  titulo: string;
  detalhe?: string;
  /** ISO YYYY-MM-DD */
  data: string;
  /** HH:MM, opcional */
  horario?: string;
  bloco: Bloco;
  para: Dono;
  tipo: "compromisso" | "lembrete";
  criadoPor?: Pessoa;
}

/* ── Pendência ───────────────────────────────────────────────────────────────
   Sem data de acontecer, com dono, ligada a um projeto do vault. É o que hoje
   mora nas memórias e só a IA enxerga. */

export type PendenciaStatus = "aberta" | "em-andamento" | "bloqueada" | "concluida";

export const STATUS_LABEL: Record<PendenciaStatus, string> = {
  aberta: "Aberta",
  "em-andamento": "Em andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
};

export interface Pendencia {
  id: string;
  projeto: string;
  titulo: string;
  status: PendenciaStatus;
  responsavel: Pessoa;
  nota?: string;
  /** ISO YYYY-MM-DD. Alimenta o "parada há N dias". */
  atualizado: string;
  prazo?: string;
  /** A única que fica na parede até ser resolvida. Só uma por vez. */
  bloqueio?: boolean;
  vaultNota?: string;
}

/* ── Lista da casa ───────────────────────────────────────────────────────── */

export interface ItemCasa {
  id: string;
  titulo: string;
  por: Pessoa;
  feito: boolean;
  criadoEm: string;
}

/* ── Conclusão ───────────────────────────────────────────────────────────────
   A única linha que se grava de um item recorrente. Chave é `id|data`, o que
   torna a marcação idempotente e a corrente uma contagem. */

export type TipoConclusao = "feito" | "pulado";

export interface Conclusao {
  chave: string;
  itemId: string;
  /** ISO YYYY-MM-DD */
  data: string;
  pessoa: Pessoa;
  /** ISO completo, com fuso */
  feitoEm: string;
  /** "pulado" é resolvido, não é feito.

      Existe porque a Akiane precisa poder sair de uma etapa sem que a tela
      fique cobrando: numa agenda visual, ficar preso numa etapa que não vai
      acontecer é pior que não ter agenda nenhuma. Vale pra casa toda pelo
      mesmo motivo, e a rotina já é desenhada em duas camadas justamente pra
      que um dia ruim não vire fracasso.

      Pular não fecha o dia: só "feito" conta pra corrente. */
  tipo: TipoConclusao;
}

export function chaveConclusao(itemId: string, data: string): string {
  return `${itemId}|${data}`;
}

/* ── Número agregado do negócio, pra TV ──────────────────────────────────────
   Só o agregado atravessa, nunca as linhas de lead. A decisão de 19/07 de
   manter os bancos separados foi sobre não copiar dado de cliente pra um
   painel que a família abre. Um contador não é dado de cliente. */

export interface NumeroNegocio {
  rotulo: string;
  valor: number;
  detalhe: string;
}

/* ── Ocorrência ──────────────────────────────────────────────────────────────
   O que as telas realmente renderizam: um item recorrente ou um compromisso já
   resolvido para uma data específica, com dono do rodízio calculado. Nunca é
   persistida, é derivada. */

export interface Ocorrencia {
  /** Única por dia: `${id}|${data}` */
  chave: string;
  id: string;
  titulo: string;
  detalhe?: string;
  categoria: Categoria;
  bloco: Bloco;
  horario?: string;
  dono: Dono;
  ancora: boolean;
  data: string;
  /** Compromisso agendado pode ser apagado; item recorrente não. */
  removivel: boolean;
  vaultNota?: string;
  envolve?: Pessoa[];
  exceto?: Pessoa[];
}
