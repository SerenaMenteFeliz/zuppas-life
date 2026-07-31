import { Rotulo, Vazio } from "@/components/ui";

/* Painel interno de funis — só pro Yan (protegido em middleware.ts, não é
   conteúdo de família, por isso fora do Nav). Server Component: os dados vêm
   direto do Supabase "Serena Mente Feliz" + da API da PostHog a cada
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

    return {
      slug,
      nome,
      totalLeads,
      leads7d: ultimos7d.size,
      totalCompras,
      conversao,
    };
  });
}

type EtapaFunilPostHog = { name: string; count: number };

/* Query API (HogQL) — a conta não tem acesso ao endpoint legado
   /insights/funnel/ ("Legacy insight endpoints are not available for this
   user"), então é FunnelsQuery via /query/ mesmo. Cada string em `eventos`
   é o nome exato do evento que instrumentamos (ver assets/posthog-init.js
   do quiz e o webhook do Asaas no serena-app). */
async function consultarFunilPostHog(
  eventos: string[]
): Promise<EtapaFunilPostHog[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
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
    name: s.custom_name || s.name || "?",
    count: s.count ?? 0,
  }));
}

const ROTULOS_EVENTO: Record<string, string> = {
  quiz_started: "Início do quiz",
  quiz_completed: "Quiz concluído",
  lead_submitted: "Virou lead",
  purchase: "Comprou",
};

type EtapaGaleria = { label: string; views: number };

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
   diferente do consultarFunilPostHog acima, que soma eventos distintos. */
async function consultarStepsQuiz(): Promise<EtapaGaleria[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "TrendsQuery",
        series: [{ kind: "EventsNode", event: "quiz_step_viewed" }],
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
              {
                key: "$host",
                value: "larinterior.serenamentefeliz.com",
                operator: "exact",
                type: "event",
              },
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

export default async function Funis() {
  const funis = await carregarFunis();
  const semDados = funis.every((f) => f.totalLeads === 0);

  const [funilQuiz, stepsQuiz, funilLarInterior] = await Promise.all([
    consultarFunilPostHog(["quiz_started", "quiz_completed", "lead_submitted", "purchase"]),
    consultarStepsQuiz(),
    consultarFunilLarInterior(),
  ]);

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1400px] lg:px-10 lg:pt-10">
        <header className="mb-7">
          <p className="tv-rotulo mb-2">Painel interno · não é conteúdo de família</p>
          <h1
            className="text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
          >
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
                <CardFunil key={f.slug} {...f} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <Rotulo>Quiz → lead → compra, visão geral</Rotulo>
          {funilQuiz === null ? (
            <Vazio>
              Não consegui consultar a PostHog agora — confere se
              POSTHOG_PERSONAL_API_KEY está setada (Vercel → zuppas-life → env
              vars) e se o scope inclui leitura de Insight/Query.
            </Vazio>
          ) : (
            <FunilEtapas etapas={funilQuiz} />
          )}
        </section>

        <section className="mb-8">
          <Rotulo>Quiz do Método Cálice — as 18 telas, uma por uma</Rotulo>
          {stepsQuiz === null ? (
            <Vazio>Não consegui consultar a PostHog agora.</Vazio>
          ) : (
            <GaleriaFunil etapas={stepsQuiz} />
          )}
        </section>

        <section className="mb-8">
          <Rotulo>Lar Interior — funil de captura</Rotulo>
          {funilLarInterior === null ? (
            <Vazio>Não consegui consultar a PostHog agora.</Vazio>
          ) : (
            <GaleriaFunil etapas={funilLarInterior} />
          )}
        </section>
      </div>
    </main>
  );
}

function CardFunil({
  nome,
  totalLeads,
  leads7d,
  totalCompras,
  conversao,
}: {
  nome: string;
  totalLeads: number;
  leads7d: number;
  totalCompras: number;
  conversao: number;
}) {
  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 text-lg" style={{ fontFamily: "var(--font-display)" }}>
        {nome}
      </h3>

      <div className="flex items-stretch gap-3">
        <Etapa rotulo="Leads" valor={totalLeads} nota={`+${leads7d} nos últimos 7 dias`} />
        <Seta />
        <Etapa rotulo="Compras" valor={totalCompras} nota={`${conversao.toFixed(1)}% de conversão`} />
      </div>
    </div>
  );
}

function Etapa({ rotulo, valor, nota }: { rotulo: string; valor: number; nota: string }) {
  return (
    <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: "var(--glass)" }}>
      <p className="text-[0.7rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {valor}
      </p>
      <p className="text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
        {nota}
      </p>
    </div>
  );
}

function Seta() {
  return (
    <div className="flex flex-none items-center" style={{ color: "var(--ink-soft)" }}>
      →
    </div>
  );
}

/* Gallery view de uma linha só — um card por etapa, rolagem horizontal.
   Cada card mostra o que o Yan pediu: views totais, % do início (taxa de
   visualização), % de passagem pra próxima etapa e % de perda. Sem preview
   visual da tela em si (não existe sistema de screenshot por etapa) —
   avisado como limitação, não fingido. */
function GaleriaFunil({ etapas }: { etapas: EtapaGaleria[] }) {
  if (etapas.length === 0 || etapas.every((e) => e.views === 0)) {
    return <Vazio>Sem visita registrada ainda nesse funil.</Vazio>;
  }

  const topo = etapas[0].views || 1;

  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:px-0">
      {etapas.map((etapa, i) => {
        const anterior = i > 0 ? etapas[i - 1].views : null;
        const passagem = anterior && anterior > 0 ? (etapa.views / anterior) * 100 : null;
        const perda = passagem !== null ? 100 - passagem : null;
        const doTopo = (etapa.views / topo) * 100;

        return (
          <div
            key={`${etapa.label}-${i}`}
            className="glass-card w-[168px] flex-none p-4"
          >
            <p className="text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
              Etapa {i + 1}
            </p>
            <h4 className="mb-3 text-sm font-semibold leading-snug">{etapa.label}</h4>

            <p className="text-[0.65rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
              Total de views
            </p>
            <p className="mb-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {etapa.views}
            </p>
            <p className="mb-3 text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
              {doTopo.toFixed(1)}% do início
            </p>

            <div className="border-t pt-2" style={{ borderColor: "var(--line)" }}>
              <p className="text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                Passagem próxima etapa
              </p>
              <p
                className="mb-1 text-sm font-semibold"
                style={{ color: passagem === null ? "var(--ink-soft)" : "var(--accent)" }}
              >
                {passagem === null ? "—" : `${passagem.toFixed(1)}%`}
              </p>
              <p className="text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                Perda: {perda === null ? "—" : `${perda.toFixed(1)}%`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FunilEtapas({ etapas }: { etapas: EtapaFunilPostHog[] }) {
  if (etapas.length === 0 || etapas.every((e) => e.count === 0)) {
    return <Vazio>Sem evento suficiente ainda pra montar esse funil.</Vazio>;
  }

  const primeira = etapas[0].count || 1;

  return (
    <div className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-stretch sm:gap-2">
      {etapas.map((etapa, i) => {
        const anterior = i > 0 ? etapas[i - 1].count : null;
        const passagem = anterior && anterior > 0 ? (etapa.count / anterior) * 100 : null;
        const doTotal = (etapa.count / primeira) * 100;

        return (
          <div key={`${etapa.name}-${i}`} className="flex flex-1 items-stretch gap-2">
            <div
              className="flex-1 rounded-2xl p-3 text-center"
              style={{ background: "var(--glass)" }}
            >
              <p
                className="text-[0.7rem] uppercase tracking-widest"
                style={{ color: "var(--ink-soft)" }}
              >
                {ROTULOS_EVENTO[etapa.name] || etapa.name}
              </p>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {etapa.count}
              </p>
              <p className="text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
                {i === 0 ? "100% (base)" : `${doTotal.toFixed(1)}% do início`}
              </p>
            </div>
            {i < etapas.length - 1 && (
              <div
                className="flex flex-none flex-col items-center justify-center gap-1"
                style={{ color: "var(--ink-soft)" }}
              >
                <span>→</span>
                {passagem !== null && (
                  <span className="text-[0.65rem] font-semibold">{passagem.toFixed(0)}%</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
