import "server-only";
import type { EtapaContagem, EtapaGaleria } from "@/components/painel/Funil";

/* Camada de dados do painel de funis — extraída de app/painel/funis/page.tsx
   em 05/08 quando a tela virou lista + detalhe (antes era uma página só,
   tudo empilhado). FUNIS é o catálogo: cada entrada tem um `id` PRÓPRIO,
   independente do slug de produto — se um dia o Método Cálice ganhar um 2º
   funil (ex: webinar), ele entra como uma nova entrada aqui, não briga por
   slug com o quiz. */

export const POSTHOG_PROJECT_ID = "536747";
export const POSTHOG_HOST = "https://us.posthog.com";

export type TipoFunil = "Quiz" | "Landing";

export type FunilMeta = {
  id: string;
  produtoSlug: "lar-interior" | "metodo-calice";
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
  const [leads, acessos] = await Promise.all([
    supabaseSelect<LeadEvent>("lead_events?select=contact_id,product,signed_at"),
    supabaseSelect<ProductAccess>("product_access?select=contact_id,product,status&status=eq.active"),
  ]);

  const produtosUnicos = [...new Set(FUNIS.map((f) => f.produtoSlug))];

  return produtosUnicos.map((produtoSlug) => {
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
export async function consultarFunilPostHog(eventos: string[]): Promise<EtapaContagem[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "FunnelsQuery",
        series: eventos.map((event) => ({ kind: "EventsNode", event })),
        dateRange: { date_from: "-90d" },
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

async function consultarStepsQuiz(): Promise<EtapaGaleria[] | null> {
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
        dateRange: { date_from: "-90d" },
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
async function consultarMaterialViewed(): Promise<number | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

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
            AND timestamp > now() - INTERVAL 90 DAY
            AND person_id IN (
              SELECT DISTINCT person_id
              FROM events
              WHERE event = {quizEvent}
                AND properties.step_index = {stepIndex}
                AND timestamp > now() - INTERVAL 90 DAY
            )
        `,
        values: {
          matEvent: "material_viewed",
          quizEvent: "quiz_step_viewed",
          stepIndex: QUIZ_STEP_LABELS.length - 1,
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
async function consultarFunilLarInterior(): Promise<EtapaGaleria[] | null> {
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
        dateRange: { date_from: "-90d" },
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
export async function carregarDetalheFunil(id: string): Promise<DetalheFunil> {
  if (id === "metodo-calice-quiz") {
    const [stepsQuiz, materialViews] = await Promise.all([consultarStepsQuiz(), consultarMaterialViewed()]);

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
    const etapas = await consultarFunilLarInterior();
    if (etapas === null) {
      return { etapas: [], previewUrls: [], vazio: "Não consegui consultar a PostHog agora." };
    }
    return {
      etapas,
      previewUrls: etapas.map(() => "https://larinterior.serenamentefeliz.com/desafio-7-dias?preview=1"),
      vazio: "Sem visita registrada ainda nesse funil.",
    };
  }

  return { etapas: [], previewUrls: [], vazio: "Funil não encontrado." };
}
