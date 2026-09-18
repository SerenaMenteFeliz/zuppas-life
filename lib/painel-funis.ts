import "server-only";
import type { EtapaContagem, EtapaGaleria } from "@/components/painel/Funil";
import { carregarCatalogo, type LivroBiblioteca } from "@/lib/catalogo-biblioteca";
import { hojeISO, inicioDaSemana, somarDias } from "@/lib/datas";
import { URL_QUIZ_CALICE, VARIANTE_LEGADO, temOferta, type VarianteQuiz } from "@/lib/quiz-variantes";

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
  } else {
    // Só `ate`: mesmo início padrão do `faixaPostHog` (-90d), senão virava "desde sempre".
    partes.push("timestamp > now() - INTERVAL 90 DAY");
  }
  if (range.ate) {
    partes.push("timestamp < toDateTime({ateExclusivo})");
    valores.ateExclusivo = somarDias(range.ate, 1);
  }
  return { clausula: partes.join(" AND "), valores };
}

/** Mesmo range, em querystring do PostgREST (Supabase) sobre uma coluna timestamptz.

    Sem filtro, cai nos mesmos 90 dias da PostHog (11/09/2026). Antes devolvia
    "sem limite", então a mesma tela misturava 90 dias de comportamento com
    dinheiro e leads desde sempre, e o filtro passou a exibir "90 dias" aceso
    como padrão: o rótulo tem que ser verdade pras duas fontes. */
function faixaSupabaseQS(range: RangeDatas | undefined, coluna: string): string {
  if (!range?.de && !range?.ate) return `&${coluna}=gte.${somarDias(hojeISO(), -90)}`;
  const partes: string[] = [];
  // Só `ate`: o início continua sendo o padrão de 90 dias, igual à PostHog.
  partes.push(`${coluna}=gte.${range.de ?? somarDias(hojeISO(), -90)}`);
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

/** Filtro de propriedade de evento no formato da FunnelsQuery. */
export type FiltroEvento = { key: string; value: string[]; operator: "exact" | "is_not"; type: "event" };

/* Query API (HogQL) — a conta não tem acesso ao endpoint legado
   /insights/funnel/ ("Legacy insight endpoints are not available for this
   user"), então é FunnelsQuery via /query/ mesmo.

   `filtroInicio` filtra só a PRIMEIRA etapa (12/09/2026, variantes do quiz):
   o funil exige a mesma pessoa nas etapas seguintes, então filtrar a entrada
   já recorta a coorte inteira. Filtrar as outras não daria: `purchase` vem do
   serena-app e nunca vai saber a variante do quiz. */
export async function consultarFunilPostHog(
  eventos: string[],
  range?: RangeDatas,
  filtroInicio?: FiltroEvento[]
): Promise<EtapaContagem[] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;

  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: {
        kind: "FunnelsQuery",
        series: eventos.map((event, i) => ({
          kind: "EventsNode",
          event,
          ...(i === 0 && filtroInicio?.length ? { properties: filtroInicio } : {}),
        })),
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
  // Variante que vende dentro do quiz (sem captura) não produz
  // `lead_submitted` nenhum: quem não compra não deixa nada. Ver
  // `eventosVisaoGeral` no detalhe do funil.
  offer_viewed: "Chegou na oferta",
  offer_cta_clicked: "Clicou em comprar",
  purchase: "Comprou",
};

/* As telas do quiz não moram aqui desde 12/09/2026: vêm de `quiz/variantes.json`
   do site, lido em `lib/quiz-variantes.ts`. Até essa data havia uma lista com a
   ordem das 18 telas escrita à mão, que mentiria em silêncio no dia em que uma
   tela entrasse ou saísse.

   O que sobra aqui é a ordem em que os eventos ANTIGOS gravaram as telas. Até
   12/09/2026 o `quiz_step_viewed` só levava a posição (`step_index`); dali em
   diante leva o `step_id`. Isto não é cópia do quiz atual: é um fato sobre
   eventos que já aconteceram e não mudam mais, então continua certo mesmo que
   o V1 seja editado. */
const TELAS_ANTES_DAS_VARIANTES = [
  "abertura", "nome", "p1", "p2", "pausa-1", "p3", "p4", "p5", "pausa-2",
  "p6", "p7", "pausa-3", "p8", "virada", "calculando", "revelacao", "captura", "resultado",
];

/** A tela de um `quiz_step_viewed`: o `step_id` quando o evento traz, senão a
    posição traduzida pela ordem antiga. As duas caem na MESMA chave, então
    quem viu a tela antes e depois de 12/09 conta uma vez só. */
const TELA_DO_EVENTO = `coalesce(properties.step_id, arrayElement([${TELAS_ANTES_DAS_VARIANTES.map((id) => `'${id}'`).join(", ")}], toInt(properties.step_index) + 1))`;

/** Eventos de uma variante. Evento sem `quiz_variant` é de antes de existir
    variante, então é do V1. Usa o placeholder `{variante}`. */
function filtroVarianteHogQL(varianteId: string): string {
  return varianteId === VARIANTE_LEGADO
    ? "(properties.quiz_variant = {variante} OR properties.quiz_variant IS NULL)"
    : "properties.quiz_variant = {variante}";
}

/* Pessoas ÚNICAS por tela no período inteiro (11/09/2026), agora por variante.

   Antes era TrendsQuery com `math: "dau"` e `interval: "day"`, e o `count` que
   ela devolve é a SOMA dos únicos de cada dia: quem abriu o quiz em três dias
   diferentes contava três vezes. Medido na troca: a Abertura mostrava 403 onde
   havia 384 pessoas. O `consultarMaterialViewed` abaixo já tinha trocado pra
   HogQL pelo mesmo motivo em 04/08; as 18 telas tinham ficado pra trás.

   Conta por id de tela e devolve na ordem do JSON. Tela que saiu da variante
   some da lista; tela nova aparece com zero até alguém passar por ela. */
async function consultarStepsQuiz(variante: VarianteQuiz, range?: RangeDatas): Promise<EtapaGaleria[] | null> {
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
          SELECT ${TELA_DO_EVENTO} AS tela, count(DISTINCT person_id) AS pessoas
          FROM events
          WHERE event = {evento}
            AND ${filtroVarianteHogQL(variante.id)}
            AND ${clausula}
          GROUP BY tela
        `,
        values: { evento: "quiz_step_viewed", variante: variante.id, ...valores },
      },
    }),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const linhas = Array.isArray(data?.results) ? data.results : null;
  if (!linhas) return null;

  const porTela = new Map<string, number>();
  for (const [tela, pessoas] of linhas as [string | null, number][]) {
    if (typeof tela === "string") porTela.set(tela, pessoas ?? 0);
  }

  return variante.telas.map((t) => ({ label: t.rotulo, views: porTela.get(t.id) ?? 0, id: t.id, tipo: t.tipo }));
}

/* Entrega do material gratuito "O Código Invisível" — fecha a ponta que as
   18 telas do quiz não cobrem. HogQLQuery (não TrendsQuery) por dois
   achados de 04/08: (1) contagem única de verdade pro período inteiro, não
   "dias com pelo menos 1 pessoa"; (2) exige JOIN com quem passou pelo
   Resultado completo (a última tela da variante), senão visita de aparelho
   diferente do quiz original contava como pessoa nova sem ligação. O JOIN
   com a variante é o que separa o material do V1 do material do V2. */
async function consultarMaterialViewed(variante: VarianteQuiz, range?: RangeDatas): Promise<number | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const ultima = variante.telas[variante.telas.length - 1]?.id;
  if (!key || !ultima) return null;

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
                AND ${filtroVarianteHogQL(variante.id)}
                AND ${TELA_DO_EVENTO} = {ultima}
                AND ${clausula}
            )
        `,
        values: {
          matEvent: "material_viewed",
          quizEvent: "quiz_step_viewed",
          variante: variante.id,
          ultima,
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
   jeito diferente (quiz tem telas navegáveis, definidas por variante em
   `quiz/variantes.json`; landing é página única, "etapas" são estágios
   conceituais do mesmo pageview) e monta a URL de preview correspondente.
   `variante` só vale pro quiz, e sem ela o quiz não tem telas pra mostrar. */
export async function carregarDetalheFunil(
  id: string,
  range?: RangeDatas,
  variante?: VarianteQuiz | null
): Promise<DetalheFunil> {
  if (id === "metodo-calice-quiz") {
    if (!variante) {
      return {
        etapas: [],
        previewUrls: [],
        vazio: "Não consegui ler as telas do quiz no site (quiz/variantes.json do metodocalice-site).",
      };
    }

    // Variante que termina em paywall não entrega material nenhum: a última
    // tela dela é a oferta. Consultar `material_viewed` ali traria as visitas
    // ao material de OUTRAS variantes e anexaria uma 17ª etapa que não existe
    // nesse funil (vista em 18/09/2026, "Etapa 1 de 17" num quiz de 16 telas).
    const vendeNoQuiz = temOferta(variante);

    const [stepsQuiz, materialViews] = await Promise.all([
      consultarStepsQuiz(variante, range),
      vendeNoQuiz ? Promise.resolve(null) : consultarMaterialViewed(variante, range),
    ]);

    if (stepsQuiz === null) {
      return { etapas: [], previewUrls: [], vazio: "Não consegui consultar a PostHog agora." };
    }

    // Etapa extra anexada só quando o material também veio. Com ela, o
    // "Resultado completo" (última tela do quiz) ganha passagem e perda de
    // verdade, e a lista responde "quantos chegaram no material?".
    const etapas = materialViews !== null ? [...stepsQuiz, { label: "Material entregue", views: materialViews }] : stepsQuiz;

    // Preview pelo id da tela e não pela posição: se o JSON mudar entre esta
    // carga e o clique, a posição apontaria pra tela vizinha.
    const previewUrls = etapas.map((e) =>
      e.id
        ? `${URL_QUIZ_CALICE}/quiz?preview=1&v=${variante.id}&preview_step=${e.id}`
        : `${URL_QUIZ_CALICE}/material?preview=1&r=aprovador`
    );

    return {
      etapas,
      previewUrls,
      vazio:
        variante.status === "ativa"
          ? "Sem visita registrada ainda nesse funil."
          : `Nenhuma visita no ${variante.nome} ainda: ele está em ${variante.status} e só abre por ?v=${variante.id}.`,
    };
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


/* ─────────────────────────── LEADS DO MÉTODO CÁLICE ───────────────────────

   O que o banco sabe de cada lead e nenhuma tela lia até 11/09/2026: de onde a
   pessoa veio (`utm_*`) e o arquétipo que o quiz deu (`quiz_result`). Os dois
   são gravados em todo opt-in por `metodocalice-site/api/subscribe.js`.

   A unidade é a PESSOA, e a linha que vale é o PRIMEIRO opt-in dela no período:
   133 linhas eram 126 pessoas quando isto foi escrito, porque quem refaz o quiz
   grava outra linha. Contar linha faria origem e arquétipo somarem mais que o
   total de leads, e o total bater com a lista de funis é o que dá confiança no
   resto. */

type LeadCalice = {
  contact_id: string;
  signed_at: string;
  utm_source: string | null;
  utm_content: string | null;
  quiz_result: string | null;
};

/** `atual`: é a semana de hoje, ainda enchendo. `completa`: os 7 dias dela
    estão dentro do período filtrado e já passaram. Só semana completa entra em
    média: com o filtro de 7 dias, a semana anterior chegava cortada em 2 dias
    e puxava a "média semanal" pra 4. */
export type SemanaLeads = { inicio: string; count: number; atual: boolean; completa: boolean };

/** `semVariante`: o banco ainda não tem `lead_events.quiz_variant` (migration
    0004 do metodocalice-site, aplicada à mão). "todas" = mostrando os leads
    de todas as variantes juntos, que é o que dá pra fazer no V1; "indisponivel"
    = outra variante, que sem a coluna não tem como separar. */
export type LeadsCalice = {
  total: number;
  porSemana: SemanaLeads[];
  porOrigem: EtapaContagem[];
  porResultado: EtapaContagem[];
  semVariante?: "todas" | "indisponivel";
};

const ROTULOS_ARQUETIPO: Record<string, string> = {
  controlador: "Controlador",
  aprovador: "Aprovador",
  sabotador: "Sabotador",
  ausente: "Ausente",
};

function contar(itens: string[]): EtapaContagem[] {
  const mapa = new Map<string, number>();
  for (const item of itens) mapa.set(item, (mapa.get(item) ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

/** Leads de uma variante do quiz. Linha sem `quiz_variant` é de antes de
    existir variante, então conta no V1 (mesma régua dos eventos). Se a coluna
    ainda não existe, o PostgREST devolve 42703 e cai no `semVariante`. */
async function selecionarLeadsCalice(
  base: string,
  varianteId: string | undefined
): Promise<{ linhas: LeadCalice[]; semVariante?: LeadsCalice["semVariante"] }> {
  if (!varianteId) return { linhas: await supabaseSelect<LeadCalice>(base) };

  const filtro =
    varianteId === VARIANTE_LEGADO
      ? `&or=(quiz_variant.eq.${varianteId},quiz_variant.is.null)`
      : `&quiz_variant=eq.${encodeURIComponent(varianteId)}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${base}${filtro}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (resp.ok) return { linhas: await resp.json() };

  const erro = await resp.json().catch(() => null);
  if (erro?.code !== "42703") return { linhas: [] };
  if (varianteId !== VARIANTE_LEGADO) return { linhas: [], semVariante: "indisponivel" };
  return { linhas: await supabaseSelect<LeadCalice>(base), semVariante: "todas" };
}

export async function carregarLeadsCalice(range?: RangeDatas, varianteId?: string): Promise<LeadsCalice | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const filtro = faixaSupabaseQS(range, "signed_at");
  const { linhas, semVariante } = await selecionarLeadsCalice(
    `lead_events?select=contact_id,signed_at,utm_source,utm_content,quiz_result&product=eq.metodo-calice&order=signed_at.asc${filtro}`,
    varianteId
  );

  // `order=signed_at.asc` faz a primeira ocorrência de cada pessoa ser o primeiro opt-in.
  const porPessoa = new Map<string, LeadCalice>();
  for (const l of linhas) if (!porPessoa.has(l.contact_id)) porPessoa.set(l.contact_id, l);
  const leads = [...porPessoa.values()];

  /* Semana começando na segunda, no fuso de Ubatuba (mesma régua do resto do
     app, ver `lib/datas.ts`). Vai da primeira semana com lead até a semana de
     hoje ou do fim do filtro, preenchendo semana vazia com zero: semana sem
     lead é dado, e pular ela desenharia uma linha contínua que não existiu. */
  const contagem = new Map<string, number>();
  for (const l of leads) {
    const semana = inicioDaSemana(hojeISO(new Date(l.signed_at)));
    contagem.set(semana, (contagem.get(semana) ?? 0) + 1);
  }
  const hoje = hojeISO();
  const primeiroDia = range?.de ?? somarDias(hoje, -90);
  const ultimoDia = range?.ate && range.ate < hoje ? range.ate : hoje;
  const semanaAtual = inicioDaSemana(hoje);
  const porSemana: SemanaLeads[] = [];
  const primeira = [...contagem.keys()].sort()[0];
  if (primeira) {
    for (let s = primeira; s <= inicioDaSemana(ultimoDia); s = somarDias(s, 7)) {
      porSemana.push({
        inicio: s,
        count: contagem.get(s) ?? 0,
        atual: s === semanaAtual,
        completa: s >= primeiroDia && somarDias(s, 6) <= ultimoDia && s !== semanaAtual,
      });
    }
  }

  return {
    total: leads.length,
    porSemana,
    // Mesma régua do `rotuloOrigem` da Biblioteca: perfil, senão canal, senão "direto".
    porOrigem: contar(leads.map((l) => l.utm_content || l.utm_source || "direto")),
    porResultado: contar(
      leads.map((l) => (l.quiz_result ? ROTULOS_ARQUETIPO[l.quiz_result] ?? l.quiz_result : "sem resultado"))
    ),
    semVariante,
  };
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
