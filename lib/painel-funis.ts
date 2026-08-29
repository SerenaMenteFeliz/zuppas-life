import "server-only";
import type { EtapaContagem, EtapaGaleria } from "@/components/painel/Funil";
import { carregarCatalogo, type LivroBiblioteca } from "@/lib/catalogo-biblioteca";
import { somarDias } from "@/lib/datas";

/* Filtro de datas (28/08/2026, pedido do Yan: "zuppas life ainda não tem
   filtro por data"). `RangeDatas` trafega em ISO (`AAAA-MM-DD`), igual todo
   resto do app — ver o cabeçalho de `lib/datas.ts`. Sem `de`/`ate`, cada
   consulta cai no comportamento de sempre (janela de 90 dias fixa). */
export type RangeDatas = { de?: string; ate?: string };
export type EtapaLivro = LivroBiblioteca & { count: number };

function faixaPostHog(range?: RangeDatas): { date_from: string; date_to?: string } {
  if (!range?.de && !range?.ate) return { date_from: "-90d" };
  return {
    date_from: range.de ?? "-90d",
    // PostHog trata `date_to` como o FIM do dia informado — não precisa somar 1.
    ...(range.ate ? { date_to: range.ate } : {}),
  };
}

/** Mesmo range, em cláusula HogQL. `ate` é o fim do dia (exclusivo o dia seguinte). */
function faixaHogQL(range?: RangeDatas): { clausula: string; valores: Record<string, string> } {
  if (!range?.de && !range?.ate) {
    return { clausula: "timestamp > now() - INTERVAL 90 DAY", valores: {} };
  }
  const partes: string[] = [];
  const valores: Record<string, string> = {};
  if (range.de) {
    partes.push("timestamp >= toDateTime({desde})");
    valores.desde = range.de;
  }
  if (range.ate) {
    partes.push("timestamp < toDateTime({ateExclusivo})");
    valores.ateExclusivo = somarDias(range.ate, 1);
  }
  return { clausula: partes.join(" AND "), valores };
}

/** Mesmo range, em querystring do PostgREST (Supabase) sobre uma coluna timestamptz. */
function faixaSupabaseQS(range: RangeDatas | undefined, coluna: string): string {
  if (!range?.de && !range?.ate) return "";
  const partes: string[] = [];
  if (range.de) partes.push(`${coluna}=gte.${range.de}`);
  if (range.ate) partes.push(`${coluna}=lt.${somarDias(range.ate, 1)}`);
  return partes.length ? `&${partes.join("&")}` : "";
}

/* Camada de dados do painel de funis — extraída de app/painel/funis/page.tsx
   em 05/08 quando a tela virou lista + detalhe (antes era uma página só,
   tudo empilhado). FUNIS é o catálogo: cada entrada tem um `id` PRÓPRIO,
   independente do slug de produto — se um dia o Método Cálice ganhar um 2º
   funil (ex: webinar), ele entra como uma nova entrada aqui, não briga por
   slug com o quiz. */

export const POSTHOG_PROJECT_ID = "536747";
export const POSTHOG_HOST = "https://us.posthog.com";

export type TipoFunil = "Quiz" | "Landing" | "Catálogo";

export type FunilMeta = {
  id: string;
  produtoSlug: "lar-interior" | "metodo-calice" | "biblioteca-oculta";
  produto: string;
  tipo: TipoFunil;
  urlPublica: string;
};

export const FUNIS: FunilMeta[] = [
  {
    id: "metodo-calice-quiz",
    produtoSlug: "metodo-calice",
    produto: "Método Cálice",
    tipo: "Quiz",
    urlPublica: "https://metodocalice.serenamentefeliz.com/quiz",
  },
  {
    id: "lar-interior-landing",
    produtoSlug: "lar-interior",
    produto: "Lar Interior",
    tipo: "Landing",
    urlPublica: "https://larinterior.serenamentefeliz.com/desafio-7-dias",
  },
  {
    id: "biblioteca-oculta-catalogo",
    produtoSlug: "biblioteca-oculta",
    produto: "Biblioteca Oculta",
    tipo: "Catálogo",
    urlPublica: "https://bibliotecaoculta.serenamentefeliz.com/",
  },
];

type LeadEvent = { contact_id: string; product: string; signed_at: string };
type ProductAccess = { contact_id: string; product: string; status: string };

async function supabaseSelect<T>(path: string): Promise<T[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!resp.ok) return [];
  return resp.json();
}

function diasAtras(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

export type ResumoProduto = {
  produtoSlug: string;
  totalLeads: number;
  leads7d: number;
  totalCompras: number;
  conversao: number;
};

export async function carregarResumoProdutos(): Promise<ResumoProduto[]> {
  const [leads, acessos, vendasBiblioteca] = await Promise.all([
    supabaseSelect<LeadEvent>("lead_events?select=contact_id,product,signed_at"),
    supabaseSelect<ProductAccess>("product_access?select=contact_id,product,status&status=eq.active"),
    supabaseSelect<PedidoBiblioteca>("bo_pedidos?select=itens,status,total,criado_em"),
  ]);

  const produtosUnicos = [...new Set(FUNIS.map((f) => f.produtoSlug))];

  return produtosUnicos.map((produtoSlug) => {
    /* A Biblioteca não passa por `lead_events`/`product_access` de propósito:
       comprador de feitiço e lead da Liz não podem virar a mesma lista, e a
       migração `0001_bo_pedidos.sql` diz isso com todas as letras. Então o
       resumo dela sai da tabela própria. Aqui "leads" é PEDIDO CRIADO e
       "compras" é PEDIDO PAGO, e a lista troca o rótulo pra não mentir. */
    if (produtoSlug === "biblioteca-oculta") {
      /* `total > 0` exclui os pedidos de CORTESIA (acesso dado à mão pra a
         família revisar, gravados como `pago` com valor zero). Sem isso a lista
         mostrava 4 compras num dia de zero venda. Mesma régua de
         `carregarVendasBiblioteca`, e as duas precisam continuar iguais: se uma
         filtrar e a outra não, a lista e o detalhe do mesmo produto passam a
         discordar, que é pior que as duas erradas juntas. */
      const reais = vendasBiblioteca.filter((p) => (p.total ?? 0) > 0);
      const criados = reais.length;
      const pagos = reais.filter((p) => p.status === "pago").length;
      const criados7d = reais.filter((p) => diasAtras(p.criado_em) <= 7).length;
      return {
        produtoSlug,
        totalLeads: criados,
        leads7d: criados7d,
        totalCompras: pagos,
        conversao: criados ? (pagos / criados) * 100 : 0,
      };
    }

    const leadsDoProduto = leads.filter((l) => l.product === produtoSlug);
    const contatosUnicos = new Set(leadsDoProduto.map((l) => l.contact_id));
    const ultimos7d = new Set(
      leadsDoProduto.filter((l) => diasAtras(l.signed_at) <= 7).map((l) => l.contact_id)
    );
    const compras = new Set(
      acessos.filter((a) => a.product === produtoSlug.replace("-", "_")).map((a) => a.contact_id)
    );

    const totalLeads = contatosUnicos.size;
    const totalCompras = compras.size;
    const conversao = totalLeads > 0 ? (totalCompras / totalLeads) * 100 : 0;

    return { produtoSlug, totalLeads, leads7d: ultimos7d.size, totalCompras, conversao };
  });
}

/* Query API (HogQL) — a conta não tem acesso ao endpoint legado
   /insights/funnel/ ("Legacy insight endpoints are not available for this
   user"), então é FunnelsQuery via /query/ mesmo. */
export async function consultarFunilPostHog(
  eventos: string[],
  range?: RangeDatas
): Promise<EtapaContagem[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "FunnelsQuery",
        series: eventos.map((event) => ({ kind: "EventsNode", event })),
        dateRange: faixaPostHog(range),
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const steps = Array.isArray(data?.results) ? data.results : null;
  if (!steps) return null;

  return steps.map((s: { name?: string; custom_name?: string; count?: number }) => ({
    label: ROTULOS_EVENTO[s.custom_name || s.name || "?"] || s.custom_name || s.name || "?",
    count: s.count ?? 0,
  }));
}

const ROTULOS_EVENTO: Record<string, string> = {
  bo_vitrine_vista: "Abriu a vitrine",
  bo_livro_visto: "Abriu um livro",
  bo_add_carrinho: "Pôs no carrinho",
  bo_checkout_iniciado: "Foi pro checkout",
  bo_pedido_criado: "Gerou o Pix",
  bo_pagamento_confirmado: "Pagou",
  quiz_started: "Início do quiz",
  quiz_completed: "Quiz concluído",
  lead_submitted: "Virou lead",
  purchase: "Comprou",
};

/* Ordem exata das 18 telas do quiz (metodocalice-site/quiz/index.html),
   traçada linha a linha pela ordem real de stepsEl.appendChild(...) no
   código — não é suposição, é a sequência em que o DOM monta os steps. Se o
   quiz ganhar/perder uma tela, esse array (e só ele) precisa ser
   atualizado. */
const QUIZ_STEP_LABELS = [
  "Abertura (hook)",
  "Nome",
  "Pergunta 1",
  "Pergunta 2",
  "Pausa",
  "Pergunta 3",
  "Pergunta 4",
  "Pergunta 5",
  "Pausa",
  "Pergunta 6",
  "Pergunta 7",
  "Pausa",
  "Pergunta 8",
  "Virada de esperança",
  "Calculando",
  "Revelação parcial",
  "Captura de e-mail",
  "Resultado completo",
];

async function consultarStepsQuiz(range?: RangeDatas): Promise<EtapaGaleria[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "TrendsQuery",
        // math: "dau" (achado 04/08) — sem isso a contagem é de EVENTO bruto,
        // não de pessoa única, e cliques duplos infla a etapa visualmente.
        series: [{ kind: "EventsNode", event: "quiz_step_viewed", math: "dau" }],
        breakdownFilter: { breakdown_type: "event", breakdown: "step_index" },
        dateRange: faixaPostHog(range),
        interval: "day",
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const results = Array.isArray(data?.results) ? data.results : null;
  if (!results) return null;

  const porIndice = new Map<number, number>();
  for (const r of results as { breakdown_value?: string; count?: number }[]) {
    const idx = Number(r.breakdown_value);
    if (!Number.isNaN(idx)) porIndice.set(idx, r.count ?? 0);
  }

  return QUIZ_STEP_LABELS.map((label, idx) => ({ label, views: porIndice.get(idx) ?? 0 }));
}

/* Entrega do material gratuito "O Código Invisível" — fecha a ponta que as
   18 telas do quiz não cobrem. HogQLQuery (não TrendsQuery) por dois
   achados de 04/08: (1) contagem única de verdade pro período inteiro, não
   "dias com pelo menos 1 pessoa"; (2) exige JOIN com quem passou pelo
   Resultado completo (step_index = último), senão visita de aparelho
   diferente do quiz original contava como pessoa nova sem ligação. */
async function consultarMaterialViewed(range?: RangeDatas): Promise<number | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const { clausula, valores } = faixaHogQL(range);

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT count(DISTINCT person_id)
          FROM events
          WHERE event = {matEvent}
            AND ${clausula}
            AND person_id IN (
              SELECT DISTINCT person_id
              FROM events
              WHERE event = {quizEvent}
                AND properties.step_index = {stepIndex}
                AND ${clausula}
            )
        `,
        values: {
          matEvent: "material_viewed",
          quizEvent: "quiz_step_viewed",
          stepIndex: QUIZ_STEP_LABELS.length - 1,
          ...valores,
        },
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const val = data?.results?.[0]?.[0];
  return typeof val === "number" ? val : null;
}

/* Funil do Lar Interior: página única (não tem "telas" como o quiz), então
   as etapas são visita -> começou a preencher -> virou lead. */
async function consultarFunilLarInterior(range?: RangeDatas): Promise<EtapaGaleria[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "FunnelsQuery",
        series: [
          {
            kind: "EventsNode",
            event: "$pageview",
            properties: [
              { key: "$host", value: "larinterior.serenamentefeliz.com", operator: "exact", type: "event" },
            ],
          },
          { kind: "EventsNode", event: "form_started" },
          { kind: "EventsNode", event: "lead_submitted" },
        ],
        dateRange: faixaPostHog(range),
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const steps = Array.isArray(data?.results) ? data.results : null;
  if (!steps) return null;

  const rotulos: Record<string, string> = {
    $pageview: "Visitou a página",
    form_started: "Começou a preencher",
    lead_submitted: "Virou lead",
  };

  return steps.map((s: { name?: string; count?: number }) => ({
    label: rotulos[s.name ?? ""] || s.name || "?",
    views: s.count ?? 0,
  }));
}

export type DetalheFunil = {
  etapas: EtapaGaleria[];
  previewUrls: (string | null)[];
  vazio: string;
};

/* Dispatcher por id de funil — cada tipo de funil consulta a PostHog de um
   jeito diferente (quiz tem 18 telas navegáveis por step_index; landing é
   página única, "etapas" são estágios conceituais do mesmo pageview) e
   monta a URL de preview correspondente. */
export async function carregarDetalheFunil(id: string, range?: RangeDatas): Promise<DetalheFunil> {
  if (id === "metodo-calice-quiz") {
    const [stepsQuiz, materialViews] = await Promise.all([
      consultarStepsQuiz(range),
      consultarMaterialViewed(range),
    ]);

    if (stepsQuiz === null) {
      return { etapas: [], previewUrls: [], vazio: "Não consegui consultar a PostHog agora." };
    }

    // Card extra (19º) anexado só quando material também veio — "Resultado
    // completo" (última tela do quiz) ganha passagem/perda de verdade, e
    // responde "quantos chegaram no material?" na mesma galeria.
    const etapas = materialViews !== null ? [...stepsQuiz, { label: "Material entregue", views: materialViews }] : stepsQuiz;

    const previewUrls = etapas.map((_, i) =>
      i < QUIZ_STEP_LABELS.length
        ? `https://metodocalice.serenamentefeliz.com/quiz?preview=1&preview_step=${i}`
        : "https://metodocalice.serenamentefeliz.com/material?preview=1&r=aprovador"
    );

    return { etapas, previewUrls, vazio: "Sem visita registrada ainda nesse funil." };
  }

  if (id === "lar-interior-landing") {
    const etapas = await consultarFunilLarInterior(range);
    if (etapas === null) {
      return { etapas: [], previewUrls: [], vazio: "Não consegui consultar a PostHog agora." };
    }
    return {
      etapas,
      previewUrls: etapas.map(() => "https://larinterior.serenamentefeliz.com/desafio-7-dias?preview=1"),
      vazio: "Sem visita registrada ainda nesse funil.",
    };
  }

  if (id === "biblioteca-oculta-catalogo") {
    const etapas = await consultarFunilBiblioteca(range);
    if (etapas === null) {
      return { etapas: [], previewUrls: [], vazio: "Não consegui consultar a PostHog agora." };
    }
    // A galeria quer `views`; o funil devolve `count`. Mesma coisa, nome outro.
    const galeria = etapas.map((e) => ({ label: e.label, views: e.count }));
    const base = "https://bibliotecaoculta.serenamentefeliz.com";
    return {
      etapas: galeria,
      // A entrega e o leitor não entram no preview: são telas de quem já pagou
      // e exigem token, então mostrariam só o estado de erro.
      previewUrls: [`${base}/`, `${base}/livro/?t=ele-sumiu`, `${base}/carrinho/`, `${base}/carrinho/`, `${base}/checkout/`, `${base}/checkout/`],
      vazio: "Sem visita registrada ainda nesse funil.",
    };
  }

  return { etapas: [], previewUrls: [], vazio: "Funil não encontrado." };
}


/* ─────────────────────────── BIBLIOTECA OCULTA ───────────────────────────

   A Biblioteca não usa `lead_events`/`product_access`: ela tem tabela própria
   (`bo_pedidos`), porque comprador de feitiço e lead da Liz não podem virar a
   mesma lista. Então o funil dela se monta de duas fontes, e a divisão importa:

   - O TOPO vem da PostHog, e ele SUBESTIMA. Uma fatia do público chega pelo
     browser embutido do TikTok e bloqueia analytics. O site já manda os eventos
     por um proxy no próprio domínio pra reduzir isso, mas não zera.
   - O FUNDO (pedido e pagamento) vem do BANCO, e ele é exato.

   Por isso NÃO se divide "pagou" por "abriu a vitrine" e se chama aquilo de
   taxa de conversão: o numerador é completo e o denominador não. Pra comparar
   livros ENTRE SI os números servem, porque o viés é o mesmo pra todos.
*/

type OrigemPedido = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  ref: string | null;
  referrer: string | null;
  entrada: string | null;
} | null;

type PedidoBiblioteca = {
  itens: string[];
  status: string;
  total: number;
  criado_em: string;
  origem?: OrigemPedido;
};

/** Rótulo de origem: perfil (utm_content) é o mais específico, depois canal
    (utm_source), depois "direto" (chegou sem nenhum utm). Pedido gravado
    ANTES de 28/08/2026 (`bo_pedidos.origem` não existia) não vira "direto"
    por palpite — campo vazio é melhor que campo preenchido por adivinhação,
    então fica na própria categoria "sem registro". */
function rotuloOrigem(origem: OrigemPedido | undefined): string {
  if (origem === undefined || origem === null) return "sem registro (antes de 28/08)";
  return origem.utm_content || origem.utm_source || "direto";
}

/** Funil do catálogo: vitrine → livro → carrinho → checkout → Pix → pago.
    As duas últimas etapas só ligam com as primeiras a partir de 28/08/2026
    (`aparelho_id` viajando de `lib/aparelho.js` até o evento de servidor —
    ver CLAUDE.md do repo `biblioteca-oculta`); pedido pago ANTES disso nunca
    vai aparecer aqui, porque usava outra identidade no PostHog. */
export async function consultarFunilBiblioteca(range?: RangeDatas): Promise<EtapaContagem[] | null> {
  return consultarFunilPostHog(
    [
      "bo_vitrine_vista",
      "bo_livro_visto",
      "bo_add_carrinho",
      "bo_checkout_iniciado",
      "bo_pedido_criado",
      "bo_pagamento_confirmado",
    ],
    range
  );
}

/** De onde vêm as VISITAS (comportamento, PostHog) — perfil (utm_content),
    canal (utm_source) ou "direto". Super-propriedade registrada uma vez por
    aparelho em `lib/metrica.js`, presente em todo evento `bo_*` do
    navegador; por isso qualquer um deles serve de contagem, e `bo_vitrine_vista`
    é o de maior volume (entrada mais comum). */
export async function consultarOrigemBiblioteca(range?: RangeDatas): Promise<EtapaContagem[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const { clausula, valores } = faixaHogQL(range);

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT
            coalesce(nullIf(properties.utm_content, ''), nullIf(properties.utm_source, ''), 'direto') AS origem,
            count(DISTINCT person_id) AS pessoas
          FROM events
          WHERE event = 'bo_vitrine_vista'
            AND ${clausula}
          GROUP BY origem
          ORDER BY pessoas DESC
          LIMIT 12
        `,
        values: valores,
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const linhas = Array.isArray(data?.results) ? data.results : null;
  if (!linhas) return null;

  return linhas.map((l: [string, number]) => ({ label: l[0], count: l[1] }));
}

/** Ranking de livros por um evento, lido da propriedade `slug`, com capa e
    título de verdade (não derivado do slug — ver `lib/catalogo-biblioteca`). */
async function rankingPorSlug(
  evento: string,
  range?: RangeDatas,
  limite = 12
): Promise<EtapaLivro[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const { clausula, valores } = faixaHogQL(range);

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT properties.slug AS livro, count() AS total
          FROM events
          WHERE event = {evento}
            AND ${clausula}
            AND properties.slug != ''
          GROUP BY livro
          ORDER BY total DESC
          LIMIT {limite}
        `,
        values: { evento, limite, ...valores },
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const linhas = Array.isArray(data?.results) ? data.results : null;
  if (!linhas) return null;

  const catalogo = await carregarCatalogo();
  return linhas.map((l: [string, number]) => ({ ...catalogo(l[0]), count: l[1] }));
}

export type VendasBiblioteca = {
  pedidosPagos: number;
  pedidosAguardando: number;
  receitaCentavos: number;
  ticketMedioCentavos: number;
  maisComprados: EtapaLivro[];
  /** De qual perfil/canal veio a RECEITA (não a visita). Vazio até o primeiro
      pedido pago depois de `0003_bo_origem.sql` em produção. */
  porOrigem: EtapaContagem[];
};

/** Verdade do dinheiro: sai de `bo_pedidos`, não da PostHog. */
export async function carregarVendasBiblioteca(range?: RangeDatas): Promise<VendasBiblioteca | null> {
  const filtro = faixaSupabaseQS(range, "criado_em");
  const pedidos = await supabaseSelect<PedidoBiblioteca>(
    `bo_pedidos?select=itens,status,total,criado_em,origem${filtro}`
  );
  if (!Array.isArray(pedidos)) return null;

  /* VENDA É `status = pago` E `total > 0`, e a segunda metade foi aprendida caro
     (29/08/2026).

     `bo_pedidos` também guarda pedidos de CORTESIA: acesso dado à mão pra a
     família revisar os livros, gravados como `pago` com `total: 0` pra que o
     leitor os aceite. Contando só por `status`, quatro cortesias com os 31
     livros cada viravam "4 pedidos pagos" no card de vendas e enchiam o ranking
     de "livros mais comprados" com 31 livros empatados em 4, num dia de ZERO
     venda real. O Yan viu isso no painel minutos depois de pedir a limpeza das
     métricas.

     Receita R$ 0,00 já estava certa; o que mentia era a CONTAGEM. Número de
     pedidos e ranking de produto são tão métrica quanto dinheiro, e filtrar só
     onde se soma valor deixa os outros dois errados. */
  const pagos = pedidos.filter((p) => p.status === "pago" && (p.total ?? 0) > 0);
  const receita = pagos.reduce((soma, p) => soma + (p.total ?? 0), 0);

  const porLivro = new Map<string, number>();
  for (const pedido of pagos) {
    for (const slug of pedido.itens ?? []) {
      porLivro.set(slug, (porLivro.get(slug) ?? 0) + 1);
    }
  }

  const porOrigem = new Map<string, number>();
  for (const pedido of pagos) {
    const rotulo = rotuloOrigem(pedido.origem);
    porOrigem.set(rotulo, (porOrigem.get(rotulo) ?? 0) + 1);
  }

  // Catálogo ao vivo da Biblioteca (título e capa de verdade), com reserva local
  // se ela estiver fora do ar. Ver `lib/catalogo-biblioteca`.
  const catalogo = await carregarCatalogo();

  return {
    pedidosPagos: pagos.length,
    // Mesma régua do `pagos`: cortesia nunca fica "aguardando" (nasce paga), mas
    // filtrar aqui também impede que um dia alguém crie cortesia por outro
    // caminho e ela apareça como carrinho abandonado.
    pedidosAguardando: pedidos.filter((p) => p.status === "aguardando" && (p.total ?? 0) > 0).length,
    receitaCentavos: receita,
    ticketMedioCentavos: pagos.length ? Math.round(receita / pagos.length) : 0,
    maisComprados: [...porLivro.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([slug, n]) => ({ ...catalogo(slug), count: n })),
    porOrigem: [...porOrigem.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })),
  };
}

/** Os dois rankings de comportamento, em paralelo. */
export async function carregarLivrosBiblioteca(range?: RangeDatas) {
  const [vistos, noCarrinho] = await Promise.all([
    rankingPorSlug("bo_livro_visto", range),
    rankingPorSlug("bo_add_carrinho", range),
  ]);
  return { vistos, noCarrinho };
}
