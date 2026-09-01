/* Camada de dados da aba Contatos (28/08/2026, reescrita em 01/09/2026).

   O pedido do Yan foi "tudo precisa estar lá", e em 01/09 ele foi explícito:
   esta aba é a FONTE DE VERDADE de todo contato de toda oferta e projeto. Isso
   trocou o desenho. A primeira versão lia quatro tabelas e mostrava três
   origens; ela deixava de fora justamente quem já entrou no produto:

     contacts        quem deixou e-mail (quiz, isca do Lar Interior)
     lead_events     o que cada uma fez, e de qual campanha veio
     product_access  quem tem acesso a produto pago
     bo_pedidos      quem comprou na Biblioteca Oculta
     pix_charges     quem gerou Pix do Método Cálice (novo aqui)
     product_events  o que a pessoa fez DENTRO do app (novo aqui)
     lesson_progress aula concluída (novo aqui)
     book_progress   até que capítulo leu (novo aqui)

   As quatro últimas eram o buraco: uma pessoa podia ter lido 20 capítulos do
   Método Cálice e a aba jurava que ela era só um e-mail de quiz.

   A JUNÇÃO É POR E-MAIL, e isso é uma escolha com custo declarado.
   `bo_pedidos` não tem `contact_id`: a Biblioteca vende sem conta, de
   propósito (o token do pedido é a credencial), então ela nunca criou linha
   em `contacts`. Sem chave estrangeira, e-mail em minúscula é o único elo
   possível. Duas consequências:

     1. quem compra com um e-mail e faz o quiz com outro aparece DUAS vezes,
        e não há como saber que é a mesma pessoa;
     2. e-mail digitado errado vira pessoa nova.

   Preferi isso a inventar um `contact_id` pro comprador da Biblioteca: criar
   vínculo que o sistema não tem é dado inferido com cara de dado real, e é o
   que o princípio 12 do vault manda não fazer. É também por isso que a edição
   de e-mail (abaixo) se recusa a fundir duas pessoas sozinha.

   A data de `lead_events` é `signed_at`, nunca `created_at`: convenção da
   casa, ver .claude/rules/dados-lead-events.md no vault. E `source` é coluna
   gerada, então nunca entra em escrita nenhuma. */

const COLUNA_DATA_LEAD_EVENTS = "signed_at";

/* Rótulo legível por event_type de `lead_events`. `bo_checkout_identificado` e
   `bo_pix_gerado` entraram em 28/08/2026 com a captura de lead da Biblioteca,
   e a diferença entre os dois é o que a ficha precisa deixar óbvia:

     identificado, sem pix   desistiu ANTES de ver o valor final
     pix gerado, sem compra  desistiu na hora de pagar

   Medido em 01/09/2026: as 112 linhas da tabela são todas `isca`, nenhuma
   dessas duas existe ainda no banco. Os rótulos ficam porque a instrumentação
   está no ar do lado da Biblioteca; se ela começar a gravar, a ficha lê. */
const ROTULO_EVENTO: Record<string, string> = {
  isca: "baixou a isca",
  bo_checkout_identificado: "escreveu o e-mail no checkout",
  bo_pix_gerado: "gerou o Pix",
};

/* Rótulo dos eventos de dentro do app (`product_events`). Os tipos vivos em
   01/09/2026 são estes quatro; um tipo novo aparece com o slug cru, que é
   feio mas honesto, em vez de sumir da linha do tempo. */
const ROTULO_EVENTO_APP: Record<string, string> = {
  chapter_read: "leu capítulo",
  lesson_completed: "concluiu aula",
  product_completed: "terminou o produto",
  pace_chosen: "escolheu o ritmo",
};

const PRODUTO_BIBLIOTECA = "biblioteca-oculta";

/** As ofertas que o negócio tem hoje. É isto que os chips da lista mostram:
    a pergunta útil não é "de qual tabela essa pessoa veio", é "com qual das
    nossas ofertas ela tem relação". */
export type Oferta = "quiz" | "calice" | "lar" | "biblioteca";

export const OFERTA_ROTULO: Record<Oferta, string> = {
  quiz: "Quiz",
  calice: "Método Cálice",
  lar: "Lar Interior",
  biblioteca: "Biblioteca",
};

export const OFERTA_COR: Record<Oferta, string> = {
  quiz: "rgba(120,110,190,.20)",
  calice: "rgba(75,46,131,.34)",
  lar: "rgba(90,150,120,.24)",
  biblioteca: "rgba(190,120,70,.24)",
};

/** De `product_events.product` / `product_access.product` (enum product_slug)
    pra oferta. Slug desconhecido não vira oferta nenhuma em vez de virar a
    errada. */
function ofertaDoProduto(produto: string | null): Oferta | null {
  if (produto === "metodo_calice" || produto === "metodo-calice") return "calice";
  if (produto === "lar_interior" || produto === "lar-interior") return "lar";
  if (produto === PRODUTO_BIBLIOTECA) return "biblioteca";
  return null;
}

export type EventoContato = {
  quando: string | null;
  rotulo: string;
  detalhe: string | null;
  oferta: Oferta | null;
};

export type AcessoProduto = {
  produto: string;
  status: string | null;
  desde: string | null;
};

export type Pessoa = {
  /** E-mail normalizado. É a chave de junção e a identidade da pessoa na tela. */
  chave: string;
  /** `contacts.id`, quando existe. Nulo pra quem só comprou na Biblioteca. */
  contactId: string | null;
  email: string;
  nome: string | null;
  whatsapp: string | null;
  cpf: string | null;
  /** Tem login no app (contacts.auth_user_id preenchido). */
  temLogin: boolean;
  primeiroContato: string | null;
  ultimaAtividade: string | null;
  origem: string | null;
  utm: { source: string | null; medium: string | null; campanha: string | null; conteudo: string | null } | null;
  resultadoQuiz: string | null;
  ofertas: Oferta[];
  eventos: EventoContato[];
  gastoCentavos: number;
  pedidosPagos: number;
  pedidosAbertos: number;
  acessos: AcessoProduto[];
  /* Até onde a pessoa chegou no checkout da Biblioteca. Guardado como booleano
     e não deduzido do rótulo do evento, porque rótulo é texto de tela e muda. */
  escreveuEmail: boolean;
  gerouPix: boolean;
  /** Uso real do app. Zerado não é o mesmo que ausente: quem nunca abriu tem
      tudo em 0 e `ultimoUso` nulo, e a ficha diz isso com todas as letras. */
  app: {
    capitulosLidos: number;
    aulasConcluidas: number;
    ultimoUso: string | null;
    /** Último capítulo alcançado por produto, de `book_progress`. */
    leitura: { produto: string; capitulo: number; concluido: boolean }[];
  };
};

type ContactRow = {
  id: string;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
  cpf: string | null;
  auth_user_id: string | null;
  created_at: string | null;
};

type LeadEventRow = {
  contact_id: string | null;
  event_type: string | null;
  offer: string | null;
  product: string | null;
  signed_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  quiz_result: string | null;
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

type PixRow = {
  id: string;
  contact_id: string | null;
  product: string | null;
  created_at: string | null;
};

type EventoAppRow = {
  contact_id: string | null;
  product: string | null;
  event_type: string | null;
  created_at: string | null;
};

type AulaRow = {
  contact_id: string | null;
  completed_at: string | null;
};

type LeituraRow = {
  contact_id: string | null;
  product: string | null;
  last_chapter_order: number | null;
  completed: boolean | null;
  updated_at: string | null;
};

export type Resultado<T> = { ok: boolean; linhas: T[]; erro: string | null };

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/* Mesmo helper das outras telas do painel, com UMA diferença que importa:
   este devolve o status, não só a lista. A aba Automações usa uma versão que
   engole o erro em `[]`, e foi assim que ela passou a mostrar "0 e-mails
   enviados" pra duas tabelas que nem existem no banco (achado em 28/08/2026).
   Zero medido e zero por tabela ausente precisam ser distinguíveis na tela. */
export async function buscar<T>(path: string): Promise<Resultado<T>> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, linhas: [], erro: "SUPABASE_URL ou SERVICE_ROLE_KEY ausente neste projeto" };
  }

  try {
    const resp = await fetch(`${cfg.url}/rest/v1/${path}`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
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

/** Escrita no PostgREST. Diferente do `buscar`, esta LEVANTA em caso de falha:
    apagar ou corrigir contato são gestos que a pessoa acabou de pedir, e falhar
    em silêncio aqui deixaria a tela dizendo "pronto" sobre nada. */
async function escrever(
  path: string,
  metodo: "PATCH" | "DELETE",
  corpo?: unknown,
): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("SUPABASE_URL ou SERVICE_ROLE_KEY ausente neste projeto");

  const resp = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method: metodo,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });

  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(
      `Supabase ${metodo} ${path} falhou (${resp.status}): ${detalhe.slice(0, 300)}`,
    );
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

const dia = (iso: string | null) => (iso ?? "").slice(0, 10);

export async function carregarContatos(): Promise<{
  pessoas: Pessoa[];
  problemas: string[];
  compradoresSemCadastro: number;
}> {
  const [contatos, eventos, acessos, pedidos, pix, eventosApp, aulas, leituras] = await Promise.all([
    buscar<ContactRow>(
      "contacts?select=id,email,name,whatsapp,cpf,auth_user_id,created_at&order=created_at.desc",
    ),
    buscar<LeadEventRow>(
      `lead_events?select=contact_id,event_type,offer,product,${COLUNA_DATA_LEAD_EVENTS},utm_source,utm_medium,utm_campaign,utm_content,quiz_result&order=${COLUNA_DATA_LEAD_EVENTS}.desc`,
    ),
    buscar<AcessoRow>("product_access?select=contact_id,product,status,purchased_at"),
    buscar<PedidoRow>(
      "bo_pedidos?select=token,email,nome,status,total,itens,criado_em,pago_em,origem&order=criado_em.desc",
    ),
    buscar<PixRow>("pix_charges?select=id,contact_id,product,created_at&order=created_at.desc"),
    buscar<EventoAppRow>(
      "product_events?select=contact_id,product,event_type,created_at&order=created_at.desc",
    ),
    buscar<AulaRow>("lesson_progress?select=contact_id,completed_at"),
    buscar<LeituraRow>(
      "book_progress?select=contact_id,product,last_chapter_order,completed,updated_at",
    ),
  ]);

  const problemas: string[] = [];
  const fontes: [string, Resultado<unknown>][] = [
    ["contacts", contatos],
    ["lead_events", eventos],
    ["product_access", acessos],
    ["bo_pedidos", pedidos],
    ["pix_charges", pix],
    ["product_events", eventosApp],
    ["lesson_progress", aulas],
    ["book_progress", leituras],
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
        contactId: null,
        email: (email ?? "").trim(),
        nome,
        whatsapp: null,
        cpf: null,
        temLogin: false,
        primeiroContato: null,
        ultimaAtividade: null,
        origem: null,
        utm: null,
        resultadoQuiz: null,
        ofertas: [],
        eventos: [],
        gastoCentavos: 0,
        pedidosPagos: 0,
        pedidosAbertos: 0,
        acessos: [],
        escreveuEmail: false,
        gerouPix: false,
        app: { capitulosLidos: 0, aulasConcluidas: 0, ultimoUso: null, leitura: [] },
      };
      pessoas.set(chave, p);
    }
    if (!p.nome && nome) p.nome = nome;
    return p;
  };

  /** Pega a pessoa a partir de um `contact_id`, que é como as tabelas do app
      referenciam gente. Devolve nulo quando o contato foi apagado e a linha
      filha sobreviveu, caso em que não há e-mail pra mostrar. */
  const porContato = (id: string | null): Pessoa | null => {
    const dono = id ? porId.get(id) : null;
    if (!dono) return null;
    return pegar(dono.email, dono.name);
  };

  const marcarOferta = (p: Pessoa, o: Oferta | null) => {
    if (o && !p.ofertas.includes(o)) p.ofertas.push(o);
  };

  for (const c of contatos.linhas) {
    const p = pegar(c.email, c.name);
    if (!p) continue;
    p.contactId = c.id;
    if (!p.whatsapp && c.whatsapp) p.whatsapp = c.whatsapp;
    if (!p.cpf && c.cpf) p.cpf = c.cpf;
    if (c.auth_user_id) p.temLogin = true;
    p.primeiroContato = maisAntigo(p.primeiroContato, c.created_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, c.created_at);
  }

  for (const ev of eventos.linhas) {
    const p = porContato(ev.contact_id);
    if (!p) continue;
    /* A oferta sai do produto do evento, não do fato de vir de lead_events.
       Antes de 28/08/2026 só o quiz escrevia nessa tabela, então "veio de
       lead_events" e "veio do quiz" eram a mesma coisa. Deixaram de ser no dia
       em que a Biblioteca passou a capturar lead. */
    const daBiblioteca = ev.product === PRODUTO_BIBLIOTECA || ev.offer === PRODUTO_BIBLIOTECA;
    const oferta: Oferta = daBiblioteca ? "biblioteca" : "quiz";

    marcarOferta(p, oferta);
    if (ev.event_type === "bo_checkout_identificado") p.escreveuEmail = true;
    if (ev.event_type === "bo_pix_gerado") p.gerouPix = true;
    if (!p.origem && ev.utm_source) p.origem = ev.utm_source;
    if (!p.resultadoQuiz && ev.quiz_result) p.resultadoQuiz = ev.quiz_result;
    if (!p.utm && (ev.utm_source || ev.utm_medium || ev.utm_campaign || ev.utm_content)) {
      p.utm = {
        source: ev.utm_source,
        medium: ev.utm_medium,
        campanha: ev.utm_campaign,
        conteudo: ev.utm_content,
      };
    }
    p.primeiroContato = maisAntigo(p.primeiroContato, ev.signed_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, ev.signed_at);
    p.eventos.push({
      quando: ev.signed_at,
      rotulo: ROTULO_EVENTO[ev.event_type ?? ""] ?? ev.event_type ?? "evento",
      detalhe: [ev.offer, ev.product].filter(Boolean).join(" · ") || null,
      oferta,
    });
  }

  for (const a of acessos.linhas) {
    const p = porContato(a.contact_id);
    if (!p) continue;
    const oferta = ofertaDoProduto(a.product);
    marcarOferta(p, oferta);
    if (a.product) p.acessos.push({ produto: a.product, status: a.status, desde: a.purchased_at });
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, a.purchased_at);
    p.eventos.push({
      quando: a.purchased_at,
      rotulo: "acesso liberado",
      detalhe: [a.product, a.status].filter(Boolean).join(" · ") || null,
      oferta,
    });
  }

  /* Pix do Método Cálice. Uma cobrança gerada e não paga é a mesma pergunta que
     o Pix da Biblioteca responde do outro lado: a pessoa chegou até o valor na
     tela e parou ali. Sem esta fonte, ela aparecia na aba como lead de quiz e
     mais nada. */
  for (const c of pix.linhas) {
    const p = porContato(c.contact_id);
    if (!p) continue;
    const oferta = ofertaDoProduto(c.product);
    marcarOferta(p, oferta);
    p.gerouPix = true;
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, c.created_at);
    p.eventos.push({
      quando: c.created_at,
      rotulo: "gerou o Pix",
      detalhe: c.product,
      oferta,
    });
  }

  /* Uso do app, agregado por dia + produto + tipo.

     Um por linha estouraria a ficha: são 70 `chapter_read` de uma leitura
     seguida, e a linha do tempo viraria uma parede que esconde o pedido e o
     Pix, que é o que a ficha existe pra mostrar. Agregar por dia mantém a
     informação ("leu 12 capítulos em 08/07") e cabe na leitura. */
  const agregado = new Map<string, { p: Pessoa; quando: string | null; n: number; produto: string | null; tipo: string }>();
  for (const ev of eventosApp.linhas) {
    const p = porContato(ev.contact_id);
    if (!p) continue;
    const oferta = ofertaDoProduto(ev.product);
    marcarOferta(p, oferta);
    if (ev.event_type === "chapter_read") p.app.capitulosLidos += 1;
    if (ev.event_type === "lesson_completed") p.app.aulasConcluidas += 1;
    p.app.ultimoUso = maisRecente(p.app.ultimoUso, ev.created_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, ev.created_at);

    const chave = `${p.chave}|${dia(ev.created_at)}|${ev.product ?? ""}|${ev.event_type ?? ""}`;
    const atual = agregado.get(chave);
    if (atual) {
      atual.n += 1;
      atual.quando = maisRecente(atual.quando, ev.created_at);
    } else {
      agregado.set(chave, {
        p,
        quando: ev.created_at,
        n: 1,
        produto: ev.product,
        tipo: ev.event_type ?? "evento",
      });
    }
  }
  for (const g of agregado.values()) {
    const rotulo = ROTULO_EVENTO_APP[g.tipo] ?? g.tipo;
    g.p.eventos.push({
      quando: g.quando,
      rotulo: g.n > 1 ? `${rotulo} (${g.n}x)` : rotulo,
      detalhe: g.produto,
      oferta: ofertaDoProduto(g.produto),
    });
  }

  /* `lesson_progress` é a marca de aula concluída, e `product_events` também
     grava `lesson_completed`. Contar as duas dobraria o número, então a
     contagem exibida é a de `lesson_progress`, que é a tabela de estado, e a
     de `product_events` (contada acima) só entra se esta não responder. */
  const aulasPorPessoa = new Map<string, number>();
  for (const a of aulas.linhas) {
    const p = porContato(a.contact_id);
    if (!p) continue;
    aulasPorPessoa.set(p.chave, (aulasPorPessoa.get(p.chave) ?? 0) + 1);
    p.app.ultimoUso = maisRecente(p.app.ultimoUso, a.completed_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, a.completed_at);
  }
  for (const [chave, n] of aulasPorPessoa) {
    const p = pessoas.get(chave);
    if (p) p.app.aulasConcluidas = n;
  }

  for (const l of leituras.linhas) {
    const p = porContato(l.contact_id);
    if (!p) continue;
    const oferta = ofertaDoProduto(l.product);
    marcarOferta(p, oferta);
    if (l.product) {
      p.app.leitura.push({
        produto: l.product,
        capitulo: l.last_chapter_order ?? 0,
        concluido: l.completed === true,
      });
    }
    p.app.ultimoUso = maisRecente(p.app.ultimoUso, l.updated_at);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, l.updated_at);
  }

  let compradoresSemCadastro = 0;
  for (const ped of pedidos.linhas) {
    const p = pegar(ped.email, ped.nome);
    if (!p) continue;
    marcarOferta(p, "biblioteca");
    if (!p.origem && ped.origem?.utm_source) p.origem = ped.origem.utm_source;
    if (!emailsCadastrados.has(p.chave)) compradoresSemCadastro += 1;
    p.primeiroContato = maisAntigo(p.primeiroContato, ped.criado_em);
    p.ultimaAtividade = maisRecente(p.ultimaAtividade, ped.pago_em ?? ped.criado_em);
    if (ped.status === "pago") {
      p.pedidosPagos += 1;
      p.gastoCentavos += ped.total ?? 0;
    } else {
      p.pedidosAbertos += 1;
    }
    p.eventos.push({
      quando: ped.pago_em ?? ped.criado_em,
      rotulo: ped.status === "pago" ? "compra paga" : `pedido ${ped.status ?? "aberto"}`,
      detalhe: `${(ped.itens ?? []).length} livro(s)`,
      oferta: "biblioteca",
    });
  }

  for (const p of pessoas.values()) {
    p.eventos.sort((a, b) => (b.quando ?? "").localeCompare(a.quando ?? ""));
  }

  const lista = [...pessoas.values()].sort((a, b) =>
    (b.ultimaAtividade ?? "").localeCompare(a.ultimaAtividade ?? ""),
  );

  return { pessoas: lista, problemas, compradoresSemCadastro };
}

/* ── Escrita ─────────────────────────────────────────────────────────────────

   Duas mutações, e as duas trabalham por E-MAIL e não por id, porque é assim
   que a tela identifica uma pessoa: quem só comprou na Biblioteca não tem id
   nenhum pra ser identificado. */

/** O que uma exclusão vai levar embora, contado ANTES de apagar.

    Existe pra confirmação poder dizer o que some, em vez de perguntar "tem
    certeza?" sobre um número que ninguém sabe. */
export type Estrago = {
  contatos: number;
  eventosLead: number;
  pedidos: number;
  pedidosPagos: number;
  centavosPagos: number;
  acessos: number;
  cobrancasPix: number;
  eventosApp: number;
  aulas: number;
  leituras: number;
  temLogin: boolean;
};

/** Apaga a pessoa inteira: a linha em `contacts`, tudo que aponta pra ela, e
    os pedidos da Biblioteca com o mesmo e-mail.

    **Ordem de propósito: filhas primeiro, `contacts` por último.** As FKs do
    app são `on delete cascade` (migrations 0001, 0002, 0006 e 0009 do
    serena-app), então apagar `contacts` bastaria pra elas. Mas `lead_events`
    foi criada fora das migrations e o cascade dela não está declarado em lugar
    nenhum que este repo possa ler. Apagar explicitamente funciona nos dois
    casos e não depende de uma suposição sobre o schema.

    **`bo_pedidos` vai junto**, decisão do Yan em 01/09/2026: exclusão aqui é
    total, não arquivamento. A confirmação na tela mostra o valor pago que vai
    embora antes de o botão existir.

    O que esta função NÃO apaga: o usuário do `auth.users`, porque a chave
    `contacts.auth_user_id` é `on delete set null` do lado de lá e o service
    role do PostgREST não alcança o schema `auth`. Quem tinha login continua
    conseguindo entrar, e cai num app sem contato. `temLogin` no `Estrago`
    existe pra tela poder dizer isso. */
export async function excluirPessoa(email: string): Promise<void> {
  const chave = normalizar(email);
  if (!chave) throw new Error("e-mail vazio");

  const contatos = await buscar<{ id: string }>(`contacts?select=id&email=ilike.${encodeURIComponent(chave)}`);
  if (!contatos.ok) throw new Error(`não deu pra ler contacts: ${contatos.erro}`);

  const ids = contatos.linhas.map((c) => c.id);
  if (ids.length > 0) {
    const emIds = `in.(${ids.join(",")})`;
    for (const tabela of [
      "product_events",
      "lesson_progress",
      "book_progress",
      "book_notes",
      "pix_charges",
      "product_access",
      "lead_events",
    ]) {
      await escrever(`${tabela}?contact_id=${emIds}`, "DELETE");
    }
    await escrever(`contacts?id=${emIds}`, "DELETE");
  }

  await escrever(`bo_pedidos?email=ilike.${encodeURIComponent(chave)}`, "DELETE");
}

/** Conta o que a exclusão vai levar, pra confirmação dizer a verdade. */
export async function medirEstrago(email: string): Promise<Estrago> {
  const chave = normalizar(email);
  const contatos = await buscar<ContactRow>(
    `contacts?select=id,auth_user_id&email=ilike.${encodeURIComponent(chave)}`,
  );
  const ids = contatos.linhas.map((c) => c.id);
  const filtro = ids.length > 0 ? `in.(${ids.join(",")})` : null;

  const contar = async (tabela: string) => {
    if (!filtro) return 0;
    const r = await buscar<{ contact_id: string }>(`${tabela}?select=contact_id&contact_id=${filtro}`);
    return r.linhas.length;
  };

  const pedidos = await buscar<PedidoRow>(
    `bo_pedidos?select=status,total&email=ilike.${encodeURIComponent(chave)}`,
  );
  const pagos = pedidos.linhas.filter((p) => p.status === "pago");

  return {
    contatos: ids.length,
    eventosLead: await contar("lead_events"),
    pedidos: pedidos.linhas.length,
    pedidosPagos: pagos.length,
    centavosPagos: pagos.reduce((s, p) => s + (p.total ?? 0), 0),
    acessos: await contar("product_access"),
    cobrancasPix: await contar("pix_charges"),
    eventosApp: await contar("product_events"),
    aulas: await contar("lesson_progress"),
    leituras: await contar("book_progress"),
    temLogin: contatos.linhas.some((c) => c.auth_user_id !== null),
  };
}

/** Erro de regra de negócio, separado de falha de infra: a tela mostra este
    texto pra pessoa, e o outro vira aviso de erro genérico. */
export class ConflitoDeContato extends Error {}

/** Corrige nome, WhatsApp e e-mail.

    **Por que trocar e-mail é seguro aqui, apesar de ele ser a chave da tela:**
    as tabelas do app (`lead_events`, `product_access`, `product_events`,
    `pix_charges`, `lesson_progress`, `book_progress`, `book_notes`) apontam
    pra `contacts.id`, não pro texto do e-mail. Elas seguem a pessoa sozinhas.
    A ÚNICA tabela que casa por e-mail é `bo_pedidos`, e ela é atualizada na
    mesma operação, o que mantém o pedido colado na pessoa certa.

    **O que esta função se recusa a fazer**: mover um e-mail pra cima de outro
    que já existe. Isso não é renomear, é fundir duas identidades, e nada no
    banco prova que são a mesma pessoa. Fundir por palpite é exatamente o dado
    inferido com cara de dado real que o princípio 12 do vault proíbe. Quem
    quiser fundir apaga uma das duas de propósito, olhando o que perde.

    Ordem: `bo_pedidos` primeiro, `contacts` por último. Se a segunda falhar,
    sobra pedido apontando pro e-mail novo sem contato correspondente, que a
    aba mostra como pessoa sem cadastro (visível). O inverso deixaria contato
    novo e pedido órfão no e-mail velho, que é a mesma pessoa aparecendo duas
    vezes, e essa é a falha que ninguém percebe. */
export async function atualizarPessoa(
  email: string,
  dados: { nome: string | null; whatsapp: string | null; email: string | null },
): Promise<{ chave: string }> {
  const antigo = normalizar(email);
  if (!antigo) throw new ConflitoDeContato("e-mail de origem vazio");

  const novo = normalizar(dados.email) || antigo;
  const trocaEmail = novo !== antigo;

  if (trocaEmail) {
    /* Formato mínimo. Não é validação de alcançabilidade e não pretende ser:
       o que se pode afirmar aqui é "tem a forma de um e-mail", nunca "existe". */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) {
      throw new ConflitoDeContato("Esse e-mail não tem forma de e-mail.");
    }
    const jaExiste = await buscar<{ id: string }>(
      `contacts?select=id&email=ilike.${encodeURIComponent(novo)}`,
    );
    if (jaExiste.linhas.length > 0) {
      throw new ConflitoDeContato(
        "Já existe um contato com esse e-mail. Trocar aqui fundiria as duas pessoas, e nada no banco prova que são a mesma. Apague uma das duas de propósito, se for o caso.",
      );
    }
    const pedidoDeOutro = await buscar<{ token: string }>(
      `bo_pedidos?select=token&email=ilike.${encodeURIComponent(novo)}`,
    );
    if (pedidoDeOutro.linhas.length > 0) {
      throw new ConflitoDeContato(
        "Esse e-mail já tem pedido na Biblioteca, de outra pessoa. Trocar juntaria os dois históricos.",
      );
    }
  }

  const contatos = await buscar<{ id: string }>(
    `contacts?select=id&email=ilike.${encodeURIComponent(antigo)}`,
  );

  if (trocaEmail) {
    await escrever(`bo_pedidos?email=ilike.${encodeURIComponent(antigo)}`, "PATCH", { email: novo });
  }

  if (contatos.linhas.length > 0) {
    const emIds = `in.(${contatos.linhas.map((c) => c.id).join(",")})`;
    const campos: Record<string, string | null> = {
      name: dados.nome,
      whatsapp: dados.whatsapp,
    };
    if (trocaEmail) campos.email = novo;
    await escrever(`contacts?id=${emIds}`, "PATCH", campos);
  } else if (!trocaEmail) {
    /* Pessoa que só existe em `bo_pedidos`: não há linha em `contacts` pra
       receber nome nem WhatsApp. O nome do pedido é o do checkout e mexer nele
       reescreveria um registro de compra, então aqui a edição não tem onde
       pousar e o chamador precisa saber disso. */
    throw new ConflitoDeContato(
      "Esta pessoa só existe como pedido da Biblioteca, sem cadastro. Só o e-mail dela pode ser corrigido.",
    );
  }

  return { chave: novo };
}
