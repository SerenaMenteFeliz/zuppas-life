import { Rotulo, Vazio } from "@/components/ui";
import { CardMetrica, FunilEtapas, GaleriaFunil, type EtapaContagem, type EtapaGaleria } from "@/components/painel/Funil";

/* Painel interno de funis — migrado de app/funis (01/08) pra dentro da
   sidebar do painel, ver app/painel/layout.tsx. Server Component: os dados
   vêm direto do Supabase "Serena Mente Feliz" + da API da PostHog a cada
   carregamento, sem cache — é um painel de negócio, não uma tela que a
   família revisita o dia inteiro, então correção importa mais que
   velocidade aqui.

   Dois tipos de dado, duas fontes: contagem de lead/compra por produto vem
   do Supabase (fonte de registro); a passagem etapa-a-etapa dentro do quiz
   (quiz_started, cada pergunta, conclusão) só existe como evento na
   PostHog, não tem coluna nenhuma no banco. Ver [[Arquitetura - Dados e
   Tracking]] no Vault Zuppas pro racional completo de identidade/eventos. */

export const dynamic = "force-dynamic";

const POSTHOG_PROJECT_ID = "536747";
const POSTHOG_HOST = "https://us.posthog.com";

const PRODUTOS = [
  { slug: "lar-interior", nome: "Lar Interior" },
  { slug: "metodo-calice", nome: "Método Cálice" },
] as const;

type LeadEvent = {
  contact_id: string;
  product: string;
  signed_at: string;
};

type ProductAccess = {
  contact_id: string;
  product: string;
  status: string;
};

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

async function carregarFunis() {
  const [leads, acessos] = await Promise.all([
    supabaseSelect<LeadEvent>("lead_events?select=contact_id,product,signed_at"),
    supabaseSelect<ProductAccess>("product_access?select=contact_id,product,status&status=eq.active"),
  ]);

  return PRODUTOS.map(({ slug, nome }) => {
    const leadsDoProduto = leads.filter((l) => l.product === slug);
    const contatosUnicos = new Set(leadsDoProduto.map((l) => l.contact_id));
    const ultimos7d = new Set(
      leadsDoProduto.filter((l) => diasAtras(l.signed_at) <= 7).map((l) => l.contact_id)
    );
    const compras = new Set(
      acessos.filter((a) => a.product === slug.replace("-", "_")).map((a) => a.contact_id)
    );

    const totalLeads = contatosUnicos.size;
    const totalCompras = compras.size;
    const conversao = totalLeads > 0 ? (totalCompras / totalLeads) * 100 : 0;

    return { slug, nome, totalLeads, leads7d: ultimos7d.size, totalCompras, conversao };
  });
}

/* Query API (HogQL) — a conta não tem acesso ao endpoint legado
   /insights/funnel/ ("Legacy insight endpoints are not available for this
   user"), então é FunnelsQuery via /query/ mesmo. Cada string em `eventos`
   é o nome exato do evento que instrumentamos (ver assets/posthog-init.js
   do quiz e o webhook do Asaas no serena-app). */
async function consultarFunilPostHog(eventos: string[]): Promise<EtapaContagem[] | null> {
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
   código — não é suposição, é a sequência em que o DOM monta os steps:
   hook, nome, então pra cada uma das 8 perguntas (com pausa/bridge depois
   das perguntas 2, 5 e 7), virada de esperança, loading, revelação,
   captura de e-mail, resultado. Bate com os 18 valores de step_index (0–17)
   que a PostHog realmente reporta. Se o quiz ganhar/perder uma tela, esse
   array (e só ele) precisa ser atualizado — o resto do código não assume
   quantidade fixa. */
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

/* Detalhe por tela do quiz, via TrendsQuery com breakdown na propriedade
   `step_index` (gravada em cada quiz_step_viewed, ver assets/posthog-init.js
   + quiz/index.html). Um evento só, quebrado por valor de propriedade —
   diferente do consultarFunilPostHog acima, que soma eventos distintos.

   math: "dau" (achado 04/08) — sem isso a contagem é de EVENTO bruto, não
   de pessoa única, e goToStep() no quiz não tem trava contra clique duplo
   (toque duplo no "Continuar" antes do fade de 160ms terminar dispara
   quiz_step_viewed duas vezes pra mesma pessoa). Com ~18-20 visitas totais
   um único evento duplicado já inverte a direção do funil visualmente
   (etapa "ganhando" gente em vez de perder). dau resolve porque conta cada
   pessoa uma vez por dia, não por clique. */
async function consultarStepsQuiz(): Promise<EtapaGaleria[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "TrendsQuery",
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

/* Entrega do material gratuito "O Código Invisível" (material/index.html no
   metodocalice-site) — fecha a ponta que as 18 telas do quiz não cobrem:
   `material_viewed` é disparado em toda visita à página, fora da árvore de
   `[data-step]` do quiz, por isso não aparece em QUIZ_STEP_LABELS.

   HogQLQuery (não TrendsQuery) por dois motivos, os dois achados reais de
   04/08: (1) math:"dau" somado por dia conta quem volta a ler em dias
   diferentes mais de uma vez ("continuar de onde parei" existe de
   propósito) — 17 pessoas vira o número errado; contagem única de verdade
   pro período inteiro é o que responde "quantas pessoas", não "quantos
   dias com pelo menos 1 pessoa". (2) "veio do quiz" exige o JOIN: só conta
   quem também tem quiz_step_viewed com step_index=17 (Resultado completo)
   no mesmo período — sem isso, visita de outra sessão/aparelho (ex: clicar
   o link do e-mail de nutrição num celular diferente de onde fez o quiz)
   contava como pessoa nova sem ligação com o quiz nenhum. A correção real
   da atribuição é do lado da captura (?cid= em material/index.html +
   quiz/index.html + lib/nutricao-sequence.js, identifica a visita não
   importa o aparelho); esta query já reflete isso pra quem tiver o cid. */
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
          // último índice de QUIZ_STEP_LABELS ("Resultado completo"), não
          // hardcoded — achado na revisão (04/08): estava fixo em 17 mesmo
          // o código já tendo o padrão de derivar de QUIZ_STEP_LABELS.length
          // em outro lugar (previewUrlsQuiz); se o quiz ganhar/perder uma
          // tela, esse número tinha que ser lembrado à mão nos dois lugares.
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
   as etapas são visita -> começou a preencher -> virou lead. $pageview
   filtrado por $host porque o mesmo projeto PostHog cobre os 3 sites — sem
   o filtro, contaria visita de qualquer um dos outros dois junto. */
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

export default async function FunisPage() {
  const funis = await carregarFunis();
  const semDados = funis.every((f) => f.totalLeads === 0);

  const [funilQuiz, stepsQuiz, materialViews, funilLarInterior] = await Promise.all([
    consultarFunilPostHog(["quiz_started", "quiz_completed", "lead_submitted", "purchase"]),
    consultarStepsQuiz(),
    consultarMaterialViewed(),
    consultarFunilLarInterior(),
  ]);

  // Card extra (19º) anexado só quando as 18 telas vieram — dá pra "Resultado
  // completo" (a última tela do quiz) ter passagem/perda de verdade em vez
  // de "—", e responde "quantos chegaram no material?" na mesma galeria.
  const stepsComMaterial =
    stepsQuiz && materialViews !== null
      ? [...stepsQuiz, { label: "Material entregue", views: materialViews }]
      : stepsQuiz;
  const previewUrlsQuiz = stepsComMaterial?.map((_, i) =>
    i < QUIZ_STEP_LABELS.length
      ? `https://metodocalice.serenamentefeliz.com/quiz?preview=1&preview_step=${i}`
      : "https://metodocalice.serenamentefeliz.com/material?preview=1&r=aprovador"
  );

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <header className="mb-8">
        <p className="text-[0.68rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
          Painel interno
        </p>
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
          Funis
        </h1>
      </header>

      {semDados ? (
        <Vazio>
          Sem dado ainda — confere se SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY estão
          setadas nesse projeto (Vercel → zuppas-life → env vars).
        </Vazio>
      ) : (
        <section className="mb-8">
          <Rotulo>Aquisição → compra, por produto</Rotulo>
          <div className="grid gap-4 sm:grid-cols-2">
            {funis.map((f) => (
              <CardMetrica
                key={f.slug}
                titulo={f.nome}
                principalRotulo="Leads"
                principal={f.totalLeads}
                principalNota={`+${f.leads7d} nos últimos 7 dias`}
                secundarioRotulo="Compras"
                secundario={f.totalCompras}
                secundarioNota={`${f.conversao.toFixed(1)}% de conversão`}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <Rotulo>Quiz → lead → compra, visão geral</Rotulo>
        <FunilEtapas
          etapas={funilQuiz ?? []}
          vazio={
            funilQuiz === null
              ? "Não consegui consultar a PostHog agora — confere se POSTHOG_PERSONAL_API_KEY está setada (Vercel → zuppas-life → env vars) e se o scope inclui leitura de Insight/Query."
              : "Sem evento suficiente ainda pra montar esse funil."
          }
        />
      </section>

      <section className="mb-8">
        <Rotulo>Quiz do Método Cálice — as 18 telas + entrega do material</Rotulo>
        <GaleriaFunil
          etapas={stepsComMaterial ?? []}
          vazio={stepsQuiz === null ? "Não consegui consultar a PostHog agora." : "Sem visita registrada ainda nesse funil."}
          previewUrls={previewUrlsQuiz}
        />
      </section>

      <section className="mb-8">
        <Rotulo>Lar Interior — funil de captura</Rotulo>
        <GaleriaFunil
          etapas={funilLarInterior ?? []}
          vazio={funilLarInterior === null ? "Não consegui consultar a PostHog agora." : "Sem visita registrada ainda nesse funil."}
          previewUrls={funilLarInterior?.map(() => "https://larinterior.serenamentefeliz.com/desafio-7-dias?preview=1")}
        />
      </section>
    </div>
  );
}
