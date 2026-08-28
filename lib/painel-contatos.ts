/* Camada de dados da aba Contatos (28/08/2026).

   O pedido do Yan foi "tudo precisa estar lá". Hoje as pessoas que o negócio
   conhece estão espalhadas por quatro tabelas que NÃO se conversam:

     contacts        quem deixou e-mail (quiz, isca do Lar Interior)
     lead_events     o que cada uma fez, e de qual campanha veio
     product_access  quem tem acesso a produto pago
     bo_pedidos      quem comprou na Biblioteca Oculta

   A JUNÇÃO É POR E-MAIL, e isso é uma escolha com custo declarado.
   `bo_pedidos` não tem `contact_id`: a Biblioteca vende sem conta, de
   propósito (o token do pedido é a credencial), então ela nunca criou linha
   em `contacts`. Sem chave estrangeira, e-mail em minúscula é o único elo
   possível. Duas consequências que a tela precisa deixar claras:

     1. quem compra com um e-mail e faz o quiz com outro aparece DUAS vezes,
        e não há como saber que é a mesma pessoa;
     2. e-mail digitado errado vira pessoa nova.

   Preferi isso a inventar um `contact_id` pro comprador da Biblioteca: criar
   vínculo que o sistema não tem é dado inferido com cara de dado real, e é o
   que o princípio 12 do vault manda não fazer.

   A data de `lead_events` é `signed_at`, nunca `created_at`: convenção da
   casa, ver .claude/rules/dados-lead-events.md no vault. E `source` é coluna
   gerada, então nunca entra em escrita nenhuma. */

const COLUNA_DATA_LEAD_EVENTS = "signed_at";

export type FonteContato = "quiz" | "biblioteca" | "acesso";

export type EventoContato = {
  quando: string | null;
  rotulo: string;
  detalhe: string | null;
  fonte: FonteContato;
};

export type Pessoa = {
  chave: string;
  email: string;
  nome: string | null;
  whatsapp: string | null;
  primeiroContato: string | null;
  ultimaAtividade: string | null;
  origem: string | null;
  fontes: FonteContato[];
  eventos: EventoContato[];
  gastoCentavos: number;
  pedidosPagos: number;
  produtos: string[];
};

type ContactRow = {
  id: string;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
  created_at: string | null;
};

type LeadEventRow = {
  contact_id: string | null;
  event_type: string | null;
  offer: string | null;
  product: string | null;
  signed_at: string | null;
  utm_source: string | null;
};

type AcessoRow = {
  contact_id: string | null;
  product: string | null;
  status: string | null;
  purchased_at: string | null;
};

type PedidoRow = {
  token: string;
  email: string | null;
  nome: string | null;
  status: string | null;
  total: number | null;
  itens: string[] | null;
  criado_em: string | null;
  pago_em: string | null;
  origem: { utm_source?: string | null } | null;
};

export type Resultado<T> = { ok: boolean; linhas: T[]; erro: string | null };

/* Mesmo helper das outras telas do painel, com UMA diferença que importa:
   este devolve o status, não só a lista. A aba Automações usa uma versão que
   engole o erro em `[]`, e foi assim que ela passou a mostrar "0 e-mails
   enviados" pra duas tabelas que nem existem no banco (achado em 28/08/2026).
   Zero medido e zero por tabela ausente precisam ser distinguíveis na tela. */
export async function buscar<T>(path: string): Promise<Resultado<T>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, linhas: [], erro: "SUPABASE_URL ou SERVICE_ROLE_KEY ausente neste projeto" };
  }

  try {
    const resp = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!resp.ok) {
      const corpo = await resp.text();
      let msg = `HTTP ${resp.status}`;
      try {
        msg = JSON.parse(corpo).message ?? msg;
      } catch {
        /* corpo nao-JSON: fica o status mesmo */
      }
      return { ok: false, linhas: [], erro: msg };
    }
    return { ok: true, linhas: (await resp.json()) as T[], erro: null };
  } catch (e) {
    return { ok: false, linhas: [], erro: e instanceof Error ? e.message : "falha de rede" };
  }
}

const normalizar = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

const maisRecente = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
};

const maisAntigo = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
};

export async function carregarContatos(): Promise<{
  pessoas: Pessoa[];
  problemas: string[];
  compradoresSemCadastro: number;
}> {
  const [contatos, eventos, acessos, pedidos] = await Promise.all([
    buscar<ContactRow>("contacts?select=id,email,name,whatsapp,created_at&order=created_at.desc"),
    buscar<LeadEventRow>(
      `lead_events?select=contact_id,event_type,offer,product,${COLUNA_DATA_LEAD_EVENTS},utm_source&order=${COLUNA_DATA_LEAD_EVENTS}.desc`
    ),
    buscar<AcessoRow>("product_access?select=contact_id,product,status,purchased_at"),
    buscar<PedidoRow>(
      "bo_pedidos?select=token,email,nome,status,total,itens,criado_em,pago_em,origem&order=criado_em.desc"
    ),
  ]);

  const problemas: string[] = [];
  const fontes: [string, Resultado<unknown>][] = [
    ["contacts", contatos],
    ["lead_events", eventos],
    ["product_access", acessos],
    ["bo_pedidos", pedidos],
  ];
  for (const [nome, r] of fontes) {
    if (!r.ok) problemas.push(`${nome}: ${r.erro}`);
  }

  const porId = new Map<string, ContactRow>();
  for (const c of contatos.linhas) porId.set(c.id, c);

  const emailsCadastrados = new Set(contatos.linhas.map((c) => normalizar(c.email)));
  const pessoas = new Map<string, Pessoa>();

  const pegar = (email: string | null, nome: string | null): Pessoa | null => {
    const chave = normalizar(email);
    if (!chave) return null;
    let p = pessoas.get(chave);
    if (!p) {
      p = {
        chave,
        email: (email ?? "").trim(),
        nome,
        whatsapp: null,
        primeiroContato: null,
        ultimaAtividade: null,
        origem: null,
        fontes: [],
        eventos: [],
        gastoCentavos: 0,
        pedidosPagos: 0,
        produtos: [],
      };
      pessoas.set(chave, p);
    }
    if (!p.nome && nome) p.nome = nome;
    return p;
  };

  const marcarFonte = (p: Pessoa, f: FonteContato) => {
    if (!p.fontes.includes(f)) p.fontes.push(f);
  };

  for (const c of contatos.linhas) {
    const p = pegar(c.email, c.name);
    if (!p) continue;
    if (!p.whatsapp && c.whatsapp) p.whatsapp = c.whatsapp;
    p.primeiroContato = maisAntigo(p.primeiroContato, c.created_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, c.created_at);
  }

  for (const ev of eventos.linhas) {
    const dono = ev.contact_id ? porId.get(ev.contact_id) : null;
    const p = pegar(dono?.email ?? null, dono?.name ?? null);
    if (!p) continue;
    marcarFonte(p, "quiz");
    if (!p.origem && ev.utm_source) p.origem = ev.utm_source;
    p.primeiroContato = maisAntigo(p.primeiroContato, ev.signed_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, ev.signed_at);
    p.eventos.push({
      quando: ev.signed_at,
      rotulo: ev.event_type ?? "evento",
      detalhe: [ev.offer, ev.product].filter(Boolean).join(" · ") || null,
      fonte: "quiz",
    });
  }

  for (const a of acessos.linhas) {
    const dono = a.contact_id ? porId.get(a.contact_id) : null;
    const p = pegar(dono?.email ?? null, dono?.name ?? null);
    if (!p) continue;
    marcarFonte(p, "acesso");
    if (a.product && !p.produtos.includes(a.product)) p.produtos.push(a.product);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, a.purchased_at);
    p.eventos.push({
      quando: a.purchased_at,
      rotulo: "acesso a produto",
      detalhe: [a.product, a.status].filter(Boolean).join(" · ") || null,
      fonte: "acesso",
    });
  }

  let compradoresSemCadastro = 0;
  for (const ped of pedidos.linhas) {
    const p = pegar(ped.email, ped.nome);
    if (!p) continue;
    marcarFonte(p, "biblioteca");
    if (!p.origem && ped.origem?.utm_source) p.origem = ped.origem.utm_source;
    if (!emailsCadastrados.has(p.chave)) compradoresSemCadastro += 1;
    p.primeiroContato = maisAntigo(p.primeiroContato, ped.criado_em);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, ped.pago_em ?? ped.criado_em);
    if (ped.status === "pago") {
      p.pedidosPagos += 1;
      p.gastoCentavos += ped.total ?? 0;
    }
    p.eventos.push({
      quando: ped.pago_em ?? ped.criado_em,
      rotulo: ped.status === "pago" ? "compra paga" : `pedido ${ped.status ?? "aberto"}`,
      detalhe: `${(ped.itens ?? []).length} livro(s)`,
      fonte: "biblioteca",
    });
  }

  for (const p of pessoas.values()) {
    p.eventos.sort((a, b) => (b.quando ?? "").localeCompare(a.quando ?? ""));
  }

  const lista = [...pessoas.values()].sort((a, b) =>
    (b.ultimaAtividade ?? "").localeCompare(a.ultimaAtividade ?? "")
  );

  return { pessoas: lista, problemas, compradoresSemCadastro };
}
