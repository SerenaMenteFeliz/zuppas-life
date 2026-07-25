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
   5. Blocos do dia e vigência (`valeDe`/`valeAte`) entraram porque a casa real
      usa os dois: o dia da família é organizado por janela e não por horário, e
      os itens de escola não valem durante as férias.

   Revisão de 25/07/2026, depois de o Yan revisar item por item quem faz o quê.
   A casa não funciona por atribuição, funciona por mural:

   6. **Rodízio saiu.** Varrer e banheiro giravam entre Yan, Ge e Camilla por
      semana ISO. Escala automática só funciona quando a semana de todo mundo é
      igual, e não é. Virou mural: aberto, qualquer um pega.
   7. **Participação virou uma linha por pessoa.** Ver `Conclusao`. Sem isso,
      "cozinhar" tinha que ser de uma pessoa só, e são três.
   8. **`bloco` virou opcional.** Ver `Faixa`.
   9. **A tela da Akiane deixou de ser deduzida do dono** e passou a ser uma
      marca explícita (`akiane`).

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

/* Nem tudo cabe num bloco.

   A meditação da Liz é o caso que forçou isso em 25/07: ela precisa acontecer
   todo dia e não precisa acontecer de manhã. Obrigar um horário a uma coisa que
   é flexível faz a tela mentir duas vezes, porque ela cobra cedo e depois some
   do lugar onde a pessoa ia procurar. Item sem bloco vira a faixa "a qualquer
   hora", que fica no topo do dia e não sai de lá até ser resolvida. */

export type Faixa = Bloco | "solto";

export const FAIXAS: Faixa[] = ["solto", "manha", "tarde", "noite"];

export const FAIXA_LABEL: Record<Faixa, string> = {
  solto: "A qualquer hora",
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const FAIXA_JANELA: Record<Faixa, string> = {
  solto: "quando der, no dia",
  manha: "até 12h",
  tarde: "12h às 18h",
  noite: "depois do jantar",
};

export function faixaDe(o: { bloco?: Bloco }): Faixa {
  return o.bloco ?? "solto";
}

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
  /** Ausente = a qualquer hora do dia. Ver `Faixa` acima. */
  bloco?: Bloco;
  /** Horário fixo, quando existe de verdade (escola tem, cozinhar não). */
  horario?: string;
  recorrencia: Recorrencia;
  /** Dono. `"Casa"` quer dizer **mural**: a tarefa não é de ninguém até alguém
      pegar, e quem pegar fica registrado. Ver `ehDoMural` em `agenda.ts`. */
  dono: Dono;
  /** Quem participa além do dono. "Liz leva a Akiane" é da Liz e é da Akiane. */
  envolve?: Pessoa[];
  /** Quem não participa, mesmo sendo item da Casa. */
  exceto?: Pessoa[];
  /** Âncora define se o dia da casa contou. Ver a regra das 3 no vault. */
  ancora: boolean;
  /** Entra na tela da Akiane.

      É uma marca explícita e não uma dedução a partir do dono, porque desde
      25/07 quase toda tarefa da casa é do mural, e deduzir faria a tela dela
      listar mercado, banheiro e louça. A sequência da criança é curta por
      desenho: o que ela reconhece, na mesma ordem, todo dia. */
  akiane?: boolean;
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

/* ── Participação ────────────────────────────────────────────────────────────
   A única linha que se grava de um item recorrente.

   Mudou em 25/07 e é a mudança mais importante desta rodada. Antes era **uma**
   linha por ocorrência: quem marcasse por último era o dono do registro, e
   marcar de novo desmarcava o do outro. Isso não descreve esta casa. Cozinhar é
   a Liz, a Ge e a Camilla; o passeio da noite é o Yan, a Ge e a Camilla; e a
   Akiane participa de coisa que ela não faz sozinha.

   Agora é **uma linha por pessoa por ocorrência**. A ocorrência continua tendo
   a chave `id|data`, e várias participações compartilham essa chave. Quem
   entrou depois soma, não substitui. */

export type TipoConclusao = "pego" | "feito" | "pulado";

export interface Conclusao {
  /** Da ocorrência: `id|data`. Repetida entre as pessoas que participaram. */
  chave: string;
  itemId: string;
  /** ISO YYYY-MM-DD */
  data: string;
  pessoa: Pessoa;
  /** ISO completo, com fuso */
  feitoEm: string;
  /** "pego" é assumir sem ter terminado.

      Existe pelo problema mais comum de casa cheia, que a rotina no vault já
      descrevia: "achei que você tinha levado". Com o mural, ninguém tem dono
      atribuído, então avisar que pegou é o que impede duas pessoas fazerem a
      mesma coisa e ninguém fazer a outra.

      "pulado" é resolvido, não é feito. Existe porque a Akiane precisa poder
      sair de uma etapa sem que a tela fique cobrando: ficar preso numa etapa
      que não vai acontecer é pior que não ter agenda nenhuma. Vale pra casa
      toda pelo mesmo motivo.

      Só "feito" fecha o dia e conta pra corrente. */
  tipo: TipoConclusao;
}

/** Chave da ocorrência (o que aconteceu naquele dia), não da pessoa. */
export function chaveConclusao(itemId: string, data: string): string {
  return `${itemId}|${data}`;
}

/* ── Preferências ────────────────────────────────────────────────────────────
   Personalização é requisito de acessibilidade, não enfeite. A pesquisa sobre
   interface pra pessoa neurodivergente é insistente em dois itens: **tamanho de
   texto ajustável** e um **modo de baixa estimulação** que esconde o que não é
   essencial. Numa casa com uma criança autista, isso não é hipótese. */

export type TamanhoTexto = "normal" | "grande" | "maior";

export const ESCALA_TEXTO: Record<TamanhoTexto, number> = {
  normal: 1,
  grande: 1.12,
  maior: 1.25,
};

export interface Preferencias {
  /** Esconde números do negócio, citações e enfeites. Menos coisa na tela. */
  modoCalmo: boolean;
  tamanhoTexto: TamanhoTexto;
  /** Uma folga por semana antes da corrente quebrar. Ver `corrente()`. */
  folgaSemanal: boolean;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  modoCalmo: false,
  tamanhoTexto: "normal",
  folgaSemanal: true,
};

/* ── Cor por pessoa ──────────────────────────────────────────────────────────
   Padrão de qualquer agenda de família: cada pessoa tem uma cor, e ela é a
   mesma em todas as telas. A cor nunca é a única pista (ícone, inicial e nome
   sempre acompanham), porque cor sozinha exclui quem não distingue as duas
   pontas do espectro. */

export const COR_PESSOA: Record<Pessoa, string> = {
  Yan: "#5b7355",
  Liz: "#c08a4a",
  Ge: "#8fadb8",
  Camilla: "#c17d5c",
  André: "#7a8fb0",
  Akiane: "#a98bb5",
};

export function corDoDono(dono: Dono): string {
  return dono === "Casa" ? "var(--ink-soft)" : COR_PESSOA[dono];
}

/* Os números do negócio saíram da TV em 25/07, a pedido do Yan. Estavam
   mockados em zero desde sempre e ocupavam um quarto da coluna direita da
   parede da sala. Número que não veio de lugar nenhum é pior que espaço vazio:
   ensina a casa a não olhar pro painel. Voltam quando o Supabase do
   `serena-app` puder ser lido de verdade. */

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
  /** Ausente = a qualquer hora. */
  bloco?: Bloco;
  horario?: string;
  dono: Dono;
  ancora: boolean;
  data: string;
  /** Compromisso agendado pode ser apagado; item recorrente não. */
  removivel: boolean;
  vaultNota?: string;
  envolve?: Pessoa[];
  exceto?: Pessoa[];
  akiane?: boolean;
}
