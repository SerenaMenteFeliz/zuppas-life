/* Vocabulário do painel de conteúdo — tipos e listas fixas.

   Separado de lib/conteudo.ts (que é `server-only`) porque as telas de edição
   são componentes de cliente e precisam das mesmas listas pra montar os
   selects. Aqui não entra nada que toque no banco. */

/* "Pronto pra gravar" saiu em 21/08/2026, juntado com "Roteiro".

   A separação entre "escrevendo" e "pronto pra gravar" só se paga quando quem
   escreve e quem grava são pessoas diferentes: aí "pronto" é sinal de entrega,
   alguém para de escrever e outra pessoa começa a produzir. Hoje é a Ge fazendo
   as duas coisas, então o handoff não existe e a coluna virava lugar onde card
   entra e ninguém move. Status que ninguém preenche envenena o quadro inteiro,
   porque ensina que ele mente.

   Volta no dia em que a Liz gravar o que a Ge escreve. Feito agora custou zero
   porque não havia nenhum post no banco. */
export const STATUS = [
  "ideia",
  "roteiro",
  "gravado",
  "agendado",
  "postado",
  "descartado",
] as const;

export type Status = (typeof STATUS)[number];

/* Rótulo e explicação de cada status. A explicação existe porque o quadro é
   pra Ge e Liz também: rótulo sozinho não diz o que a etapa espera. */
export const STATUS_INFO: Record<Status, { rotulo: string; ajuda: string }> = {
  ideia: { rotulo: "Ideia", ajuda: "só o tema ou o gancho, sem roteiro ainda" },
  roteiro: { rotulo: "Roteiro", ajuda: "escrevendo as falas e planejando as cenas" },
  gravado: { rotulo: "Gravado", ajuda: "bruto na mão, falta editar" },
  agendado: { rotulo: "Agendado", ajuda: "editado, com data marcada" },
  postado: { rotulo: "Postado", ajuda: "no ar, com link" },
  descartado: { rotulo: "Descartado", ajuda: "não vai virar post" },
};

/* Linha morta que ainda pode existir no banco de instalações antigas. Cai em
   "roteiro", que é onde o trabalho dela estava, e não em "ideia", que jogaria o
   post pro começo da esteira. */
const STATUS_APOSENTADOS: Record<string, Status> = { pronto: "roteiro" };

export function statusVivo(bruto: unknown): Status {
  if (typeof bruto === "string" && bruto in STATUS_APOSENTADOS) return STATUS_APOSENTADOS[bruto];
  return STATUS.includes(bruto as Status) ? (bruto as Status) : "ideia";
}

/* O quadro mostra só o caminho normal. `descartado` fica de fora de propósito:
   é saída da esteira, não etapa dela, e uma coluna de descarte convida a
   encher de coisa morta. Continua acessível pelo filtro da lista. */
export const STATUS_QUADRO: Status[] = ["ideia", "roteiro", "gravado", "agendado", "postado"];

/* Perfis da rede (ver "Estratégia de Conteúdo - Fase 1" no vault: satélite
   diverge no topo, converge no fundo). A cor é usada no calendário pra dar
   leitura de quem posta o quê sem precisar de legenda.

   @consciente.momento saiu em 21/08/2026: o Yan não vai postar lá, e perfil que
   ninguém usa só ocupa espaço no filtro. A conta continua existindo no vault
   (ver "Estratégia de Conteúdo - Fase 1"); o que saiu foi a linha desta lista.

   Camilla saiu em 22/08/2026 ("por enquanto", palavra do Yan): o TikTok dela é
   satélite independente, com pauta e ritmo próprios, e não está sendo planejado
   aqui. Também nunca teve @ registrado no vault, o que já era sinal de que a
   linha existia antes do uso. Devolver a linha é o suficiente pra voltar.

   Post já gravado com `perfil: "camilla"` não some do banco — só deixa de ter
   rótulo, e cai no `?? p.perfil` das telas, mostrando o id cru. Hoje não existe
   nenhum; se existir quando ela voltar, volta a exibir sozinho. */
export const PERFIS = [
  { id: "liz", rotulo: "@liz.zuppa", dono: "Liz", cor: "var(--accent)" },
  { id: "geovana", rotulo: "@geovana_zuppa", dono: "Ge", cor: "var(--terracotta)" },
] as const;

export type PerfilId = (typeof PERFIS)[number]["id"];

export function perfilPorId(id: string) {
  return PERFIS.find((p) => p.id === id);
}

/* Pilares vêm da "Estratégia de Conteúdo - Fase 1" verbatim, não inventados
   aqui: o vault é fonte de verdade do significado, esta lista é só o espelho
   operável dele.

   Formato divergiu de propósito em 22/08/2026 (Yan). A lista da estratégia
   ("Reel com rosto", "Vídeo fundo simples", "Imagem → legenda") misturava DUAS
   perguntas: que mídia é isso, e como foi produzido. Escolher entre cinco
   opções toda vez, sendo que três delas são vídeo, é atrito na hora de criar,
   e ninguém estava preenchendo. Aqui ficou só a mídia; o "como" vive no
   roteiro, que é onde ele é de fato decidido.

   Valor antigo gravado num post continua no banco e continua sendo exibido nas
   listas — o `<select>` é que não oferece mais. Se aparecer um post velho, o
   campo mostra em branco na edição até alguém reescolher. */
export const FORMATOS = ["Vídeo", "Imagem", "Carrossel", "Story"] as const;

export const PILARES = [
  "Reflexão / Filosófico",
  "Storytelling / Parábola",
  "Validação Emocional",
  "Autoridade / Ensinamento",
] as const;

export const PRODUTOS = [
  { id: "", rotulo: "Nenhum (topo de funil)" },
  { id: "metodo-calice", rotulo: "Método Cálice" },
  { id: "lar-interior", rotulo: "Lar Interior" },
] as const;

/* Função da fala dentro do roteiro. É a estrutura que a pesquisa de roteiro de
   vídeo curto converge (gancho nos primeiros segundos → desenvolvimento →
   CTA único no fim); serve pra enxergar num relance se um roteiro tem gancho
   ou começa devagar. */
export const FUNCOES_FALA = ["gancho", "contexto", "virada", "prova", "cta"] as const;

export type FuncaoFala = (typeof FUNCOES_FALA)[number];

export type Fala = {
  id?: string;
  ordem: number;
  texto: string;
  funcao: string | null;
  enquadramento: string | null;
  cenario: string | null;
  acao: string | null;
  broll: string | null;
  texto_tela: string | null;
  observacao: string | null;
  gravada: boolean;
};

export type Post = {
  id: string;
  titulo: string;
  perfil: string;
  formato: string | null;
  pilar: string | null;
  produto: string | null;
  status: Status;
  data_planejada: string | null;
  data_publicada: string | null;
  link: string | null;
  legenda: string | null;
  hashtags: string | null;
  responsavel: string | null;
  referencia: string | null;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
};

/* Post recém-criado nasce sem título de propósito (21/08/2026): "Criar" é um
   clique só, e o campo abre vazio e focado na tela de detalhe pra escrever
   direto. Como o banco guarda string vazia e não NULL, quem exibe título
   precisa passar por aqui, senão o quadro mostra um card sem nada clicável. */
export function tituloDe(p: { titulo: string }): string {
  return p.titulo.trim() === "" ? "Sem título" : p.titulo;
}

export type Metrica = {
  id: string;
  post_id: string;
  coletado_em: string;
  views: number | null;
  alcance: number | null;
  salvos: number | null;
  compartilhamentos: number | null;
  comentarios: number | null;
  seguidores: number | null;
  cliques: number | null;
};

/** Data do post pra fins de calendário: publicada manda, planejada é a
    previsão. Um post publicado fora do dia planejado tem que aparecer no dia
    em que saiu, senão o calendário vira registro do que a gente pretendia em
    vez do que aconteceu. */
export function dataDoPost(post: Post): string | null {
  return post.data_publicada ?? post.data_planejada;
}
