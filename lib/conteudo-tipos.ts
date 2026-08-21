/* Vocabulário do painel de conteúdo — tipos e listas fixas.

   Separado de lib/conteudo.ts (que é `server-only`) porque as telas de edição
   são componentes de cliente e precisam das mesmas listas pra montar os
   selects. Aqui não entra nada que toque no banco. */

export const STATUS = [
  "ideia",
  "roteiro",
  "pronto",
  "gravado",
  "agendado",
  "postado",
  "descartado",
] as const;

export type Status = (typeof STATUS)[number];

/* Rótulo e explicação de cada status. A explicação existe porque o quadro é
   pra Ge e Liz também: "pronto" sozinho não diz pronto pra quê. */
export const STATUS_INFO: Record<Status, { rotulo: string; ajuda: string }> = {
  ideia: { rotulo: "Ideia", ajuda: "só o tema ou o gancho, sem roteiro ainda" },
  roteiro: { rotulo: "Roteiro", ajuda: "escrevendo as falas" },
  pronto: { rotulo: "Pronto pra gravar", ajuda: "roteiro fechado, cenas planejadas" },
  gravado: { rotulo: "Gravado", ajuda: "bruto na mão, falta editar" },
  agendado: { rotulo: "Agendado", ajuda: "editado, com data marcada" },
  postado: { rotulo: "Postado", ajuda: "no ar, com link" },
  descartado: { rotulo: "Descartado", ajuda: "não vai virar post" },
};

/* O quadro mostra só o caminho normal. `descartado` fica de fora de propósito:
   é saída da esteira, não etapa dela, e uma coluna de descarte convida a
   encher de coisa morta. Continua acessível pelo filtro da lista. */
export const STATUS_QUADRO: Status[] = [
  "ideia",
  "roteiro",
  "pronto",
  "gravado",
  "agendado",
  "postado",
];

/* Perfis da rede (ver "Estratégia de Conteúdo - Fase 1" no vault: satélite
   diverge no topo, converge no fundo). A cor é usada no calendário pra dar
   leitura de quem posta o quê sem precisar de legenda.

   Camilla entra sem @ porque o handle do TikTok dela não está registrado em
   lugar nenhum do vault — preencher com palpite viraria dado errado com cara
   de dado certo. Corrigir aqui quando o Yan confirmar. */
export const PERFIS = [
  { id: "liz", rotulo: "@liz.zuppa", dono: "Liz", cor: "var(--accent)" },
  { id: "geovana", rotulo: "@geovana_zuppa", dono: "Ge", cor: "var(--terracotta)" },
  { id: "consciente", rotulo: "@consciente.momento", dono: "Yan", cor: "var(--sage)" },
  { id: "camilla", rotulo: "Camilla (TikTok)", dono: "Camilla", cor: "var(--gold)" },
] as const;

export type PerfilId = (typeof PERFIS)[number]["id"];

export function perfilPorId(id: string) {
  return PERFIS.find((p) => p.id === id);
}

/* Formatos e pilares vêm da "Estratégia de Conteúdo - Fase 1" verbatim, não
   inventados aqui — o vault é fonte de verdade do significado, esta lista é
   só o espelho operável dele. */
export const FORMATOS = [
  "Reel com rosto",
  "Vídeo fundo simples",
  "Carrossel",
  "Imagem → legenda",
  "Story",
] as const;

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
