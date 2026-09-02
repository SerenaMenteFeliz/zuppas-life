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

/* Rótulo, explicação e cor de cada status.

   A explicação existe porque o quadro é pra Ge e Liz também: rótulo sozinho não
   diz o que a etapa espera. Ela começa com maiúscula desde 22/08/2026 — antes
   era tudo minúsculo, herança de tratar o texto como legenda em vez de frase.

   A COR (22/08/2026) segue o caminho do trabalho e não é decoração: começa
   neutra na ideia, esquenta enquanto está na mão de alguém (roxo escrevendo,
   dourado gravado), esfria pro azul quando já está pronta e esperando data, e
   fecha em verde quando está no ar. Descartado é cinza, fora da escala, porque
   não é etapa: é saída.

   Sai de `var()` e não de hex fixo pelo mesmo motivo registrado na revisão de
   04/08: cor travada sobrevive a uma troca de tema por coincidência de
   contraste, não porque segue o tema. */
export const STATUS_INFO: Record<
  Status,
  { rotulo: string; ajuda: string; cor: string }
> = {
  ideia: {
    rotulo: "Ideia",
    ajuda: "Só o tema ou o gancho, sem roteiro ainda",
    cor: "var(--ink-soft)",
  },
  roteiro: {
    rotulo: "Roteiro",
    ajuda: "Escrevendo as falas e planejando as cenas",
    cor: "var(--accent)",
  },
  gravado: {
    rotulo: "Gravado",
    ajuda: "Bruto na mão, falta editar",
    cor: "var(--gold)",
  },
  agendado: {
    rotulo: "Agendado",
    ajuda: "Editado, com data marcada",
    cor: "var(--sky)",
  },
  postado: {
    rotulo: "Postado",
    ajuda: "No ar, com link",
    cor: "var(--sage)",
  },
  descartado: {
    rotulo: "Descartado",
    ajuda: "Não vai virar post",
    cor: "var(--ink-soft)",
  },
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
  /* Rosa desde 22/08/2026 (Yan). Era terracotta, que além de ser escolha dele
     agora colide de propósito com o `--perigo`: são as duas cores quentes da
     paleta, e "apagar" não pode compartilhar família com "post da Ge". */
  { id: "geovana", rotulo: "@geovana_zuppa", dono: "Ge", cor: "var(--rosa)" },
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

/* Função da fala dentro do roteiro: que trabalho esta frase faz na história.
   É a estrutura em que a pesquisa de roteiro de vídeo curto converge (gancho
   nos primeiros segundos → desenvolvimento → CTA único no fim), e serve pra
   enxergar num relance se um roteiro tem gancho ou começa devagar.

   O VALOR fica minúsculo porque é dado gravado no banco e chave de comparação;
   o RÓTULO é apresentação e vai capitalizado (Yan, 22/08/2026: "por que os
   itens estão tudo minúsculo?" — estavam porque a tela exibia o valor cru).
   A `ajuda` aparece embaixo do rótulo no dropdown: "função" não se explica
   sozinho, e explicar no momento da escolha é melhor que explicar depois. */
export const FUNCOES_FALA = ["gancho", "contexto", "virada", "prova", "cta"] as const;

export type FuncaoFala = (typeof FUNCOES_FALA)[number];

export const FUNCAO_INFO: Record<FuncaoFala, { rotulo: string; ajuda: string }> = {
  gancho: { rotulo: "Gancho", ajuda: "A primeira frase, que segura quem ia passar direto" },
  contexto: { rotulo: "Contexto", ajuda: "Situa a dor ou a cena antes de propor algo" },
  virada: { rotulo: "Virada", ajuda: "O ponto em que muda de ideia sobre o assunto" },
  prova: { rotulo: "Prova", ajuda: "História, número ou exemplo que sustenta a virada" },
  cta: { rotulo: "CTA", ajuda: "O único pedido do vídeo: comenta, salva, clica" },
};

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

/** A cena de uma fala numa linha só, na ordem em que ela é lida: onde a câmera
    está, onde a pessoa está, o que ela faz, o que entra por cima e o que aparece
    escrito.

    Mora aqui e não no editor porque a tela de gravação lê a MESMA cena, e duas
    cópias dessa ordem dessincronizam na primeira vez que alguém mexer numa. */
export function resumoDaCena(f: Fala): string {
  const partes = [f.enquadramento, f.cenario, f.acao, f.broll, f.texto_tela].filter(
    (p) => p && p.trim() !== "",
  );
  return partes.length === 0 ? "Cena não planejada" : partes.join(" · ");
}

/** Se há cena planejada de verdade. A tela de gravação não desenha a linha de
    cena quando não há o que dizer: espaço vertical ali é o recurso escasso. */
export function temCena(f: Fala): boolean {
  return [f.enquadramento, f.cenario, f.acao, f.broll, f.texto_tela, f.observacao].some(
    (p) => p && p.trim() !== "",
  );
}

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
  /* Onde este post vai ser gravado (22/08/2026, migration 0002).

     Propriedade do POST e não da fala: escolhe uma vez e todas as falas
     herdam. Fala 3 na praia e fala 4 em casa existe, mas é exceção, e modelar
     a exceção custaria um campo a mais em cada linha do roteiro pra um valor
     que quase nunca muda entre elas.

     O vocabulário vive em lib/ia/inteligencia.ts, alimentado pelo vault, e não
     aqui: local é INTELIGÊNCIA (o que existe em cada lugar, quanto custa ir
     até lá), enquanto este arquivo é o vocabulário estável da tela. */
  local: string | null;
  criado_em: string;
  atualizado_em: string;
};

/* O post como as TRÊS VISÕES da lista o enxergam (30/08/2026).

   Quadro, calendário e lista renderizam nove campos; a linha inteira tem
   dezenove, e os dez que sobram são os textões (legenda, hashtags, observação,
   referência). Medido em produção: a linha inteira dos 46 posts são 44 KB por
   carregamento, e estes nove campos são 12,5 KB. Os 31 KB de diferença
   atravessavam o Atlântico do banco pra função e da função pro navegador pra
   não serem lidos por ninguém.

   É um `Pick` e não um tipo escrito à mão de propósito: assim, campo que mudar
   de forma em `Post` muda aqui junto, e adicionar campo à visão é adicionar o
   nome em dois lugares (aqui e no `COLUNAS_LISTA` de lib/conteudo.ts) em vez de
   descobrir na tela que ele veio `undefined`.

   A tela de detalhe continua carregando o `Post` inteiro, que é onde os textões
   de fato aparecem. */
export type PostResumo = Pick<
  Post,
  | "id"
  | "titulo"
  | "perfil"
  | "formato"
  | "pilar"
  | "status"
  | "data_planejada"
  | "data_publicada"
  | "criado_em"
>;

/* Post recém-criado nasce sem título de propósito (21/08/2026): "Criar" é um
   clique só, e o campo abre vazio e focado na tela de detalhe pra escrever
   direto. Como o banco guarda string vazia e não NULL, quem exibe título
   precisa passar por aqui, senão o quadro mostra um card sem nada clicável. */
export function tituloDe(p: { titulo: string }): string {
  return p.titulo.trim() === "" ? "Sem título" : p.titulo;
}

/* `montarContagemDeFalas` e o tipo `ContagemDeFalas` moravam aqui e foram
   apagados em 01/09/2026, junto com o `contarFalas` de lib/conteudo.ts: ver o
   porquê lá. Os 6 testes deles saíram do `npm run verificar` na mesma passada,
   porque teste de código morto envelhece dizendo que alguma coisa está viva. */

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
export function dataDoPost(
  post: Pick<Post, "data_publicada" | "data_planejada">,
): string | null {
  return post.data_publicada ?? post.data_planejada;
}
