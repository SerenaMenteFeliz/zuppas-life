import "server-only";

/* Camada de dados dos registros do painel e dos baldes de cota da IA.

   ÚNICO ponto do app que fala com `painel_registros` e `painel_ia_baldes`, pela
   mesma razão que lib/conteudo.ts é o único que fala com `conteudo_*`: enquanto
   todo acesso estiver aqui, trocar de banco depois é mexer em duas env vars e
   neste arquivo.

   ── Por que Registros existe junto com a IA, e não depois ──

   A cascata de modelo e a rotação de chave ESCONDEM falha por construção. Se
   uma das contas cair, o sistema usa a próxima e continua funcionando, até a
   última cair, provavelmente com a Ge na frente da tela. É a mesma classe do
   defeito de 04/08, em que o fetch que gravava lead era fire-and-forget e o 500
   não aparecia pra ninguém: 23 leads reais perdidos, três dias sem ninguém
   saber.

   ── A regra de erro deste arquivo, e ela é invertida ──

   Em lib/conteudo.ts, escrita levanta erro e leitura falha em silêncio. Aqui a
   ESCRITA também falha em silêncio, e isso é deliberado: **registrar é efeito
   colateral, nunca o trabalho.** Se o log quebrar no meio de uma importação de
   roteiro, quem perde é o log, não o roteiro da Ge. Log que derruba a operação
   que ele observa é pior que log nenhum.

   O preço é que uma falha de escrita aqui é invisível. Aceito: a alternativa é
   pior, e o sintoma aparece de outro jeito (tela de Registros vazia num dia em
   que houve trabalho). */

function rest() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url + "/rest/v1", key };
}

function headers(key: string, extras: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    ...extras,
  };
}

export type Nivel = "info" | "aviso" | "erro";

export type Registro = {
  id: string;
  criado_em: string;
  area: string;
  acao: string;
  nivel: Nivel;
  mensagem: string;
  detalhe: Record<string, unknown> | null;
  ref_tipo: string | null;
  ref_id: string | null;
  duracao_ms: number | null;
};

export type NovoRegistro = {
  area: string;
  acao: string;
  nivel?: Nivel;
  mensagem: string;
  detalhe?: Record<string, unknown> | null;
  refTipo?: string | null;
  refId?: string | null;
  duracaoMs?: number | null;
};

/** Grava uma linha no log. Nunca levanta: ver o cabeçalho deste arquivo. */
export async function registrar(r: NovoRegistro): Promise<void> {
  const cfg = rest();
  if (!cfg) return;
  try {
    await fetch(cfg.url + "/painel_registros", {
      method: "POST",
      headers: headers(cfg.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({
        area: r.area,
        acao: r.acao,
        nivel: r.nivel ?? "info",
        mensagem: r.mensagem,
        detalhe: r.detalhe ?? null,
        ref_tipo: r.refTipo ?? null,
        ref_id: r.refId ?? null,
        duracao_ms: r.duracaoMs ?? null,
      }),
      cache: "no-store",
    });
  } catch {
    /* Ver cabeçalho: registrar é efeito colateral, nunca o trabalho. */
  }
}

export type FiltroRegistros = {
  area?: string;
  nivel?: string;
  acao?: string;
  limite?: number;
};

export async function listarRegistros(f: FiltroRegistros = {}): Promise<Registro[]> {
  const cfg = rest();
  if (!cfg) return [];

  const partes = ["select=*", "order=criado_em.desc", "limit=" + (f.limite ?? 200)];
  /* `encodeURIComponent` no valor porque ele vem da URL da tela: sem isso um
     valor com vírgula ou parêntese vira sintaxe de filtro do PostgREST. Mesma
     precaução do `id=in.(...)` em salvarRoteiroAcao. */
  if (f.area) partes.push("area=eq." + encodeURIComponent(f.area));
  if (f.nivel) partes.push("nivel=eq." + encodeURIComponent(f.nivel));
  if (f.acao) partes.push("acao=eq." + encodeURIComponent(f.acao));

  try {
    const resp = await fetch(cfg.url + "/painel_registros?" + partes.join("&"), {
      headers: headers(cfg.key),
      cache: "no-store",
    });
    if (!resp.ok) return [];
    return resp.json();
  } catch {
    return [];
  }
}

/** Os valores distintos que existem hoje, pra montar os filtros da tela sem
    listar opção que não tem nenhuma linha. Uma consulta só, feita sobre as
    mesmas linhas que a tela já vai mostrar. */
export async function facetasDeRegistros(): Promise<{ areas: string[]; acoes: string[] }> {
  const linhas = await listarRegistros({ limite: 1000 });
  return {
    areas: [...new Set(linhas.map((l) => l.area))].sort(),
    acoes: [...new Set(linhas.map((l) => l.acao))].sort(),
  };
}

/* ── Baldes de cota ────────────────────────────────────────────────────────── */

/* Um balde é o par (rótulo da chave, modelo). No free tier do Gemini a cota é
   POR MODELO, então um 429 no 3.7 Flash da chave 1 não diz nada sobre o 3.6
   Flash da mesma chave.

   Isto NÃO é um contador (decisão do Yan, 22/08/2026). Contador local
   desincroniza do contador do Google e passa a mentir com confiança. Isto é
   marcação reativa: tomou 429, marca e para de tentar até o reset. */

export type Balde = { chave: string; modelo: string };

/** Baldes marcados como esgotados AGORA. Chave do conjunto é "chave|modelo". */
export async function baldesEsgotados(): Promise<Set<string>> {
  const cfg = rest();
  if (!cfg) return new Set();
  try {
    const resp = await fetch(
      cfg.url +
        "/painel_ia_baldes?select=chave,modelo&esgotado_ate=gt." +
        encodeURIComponent(new Date().toISOString()),
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!resp.ok) return new Set();
    const linhas = (await resp.json()) as Balde[];
    return new Set(linhas.map((l) => l.chave + "|" + l.modelo));
  } catch {
    /* Sem a lista, a cascata simplesmente tenta tudo. Degrada em latência, não
       em correção. Ver o comentário de `chamarModelo`. */
    return new Set();
  }
}

export async function marcarBalde(
  chave: string,
  modelo: string,
  ate: Date,
  motivo: string,
): Promise<void> {
  const cfg = rest();
  if (!cfg) return;
  try {
    await fetch(cfg.url + "/painel_ia_baldes", {
      method: "POST",
      headers: headers(cfg.key, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        chave,
        modelo,
        esgotado_ate: ate.toISOString(),
        motivo,
      }),
      cache: "no-store",
    });
  } catch {
    /* Perder a marcação custa uma tentativa extra na próxima chamada, e nada
       mais. Não vale derrubar a operação por isso. */
  }
}

export type BaldeAtivo = {
  chave: string;
  modelo: string;
  esgotado_ate: string;
  motivo: string | null;
  /* Quanto falta pro reset, resolvido AQUI e não na tela.

     Não é preciosismo: a tela é componente de servidor, e chamar `Date.now()`
     no corpo dela é chamada impura durante a renderização (o lint do React
     barra, com razão: o valor mudaria a cada re-render sem nada explicando).
     O instante da leitura pertence à leitura, então ele é resolvido junto com
     ela. */
  horasParaVoltar: number;
};

/** Só os baldes esgotados AGORA. O filtro é do banco, não da tela: o que já
    resetou não é informação, é ruído no meio de uma lista que existe pra
    responder "por que a IA está lenta neste minuto?". */
export async function baldesAtivos(): Promise<BaldeAtivo[]> {
  const cfg = rest();
  if (!cfg) return [];
  const agora = Date.now();
  try {
    const resp = await fetch(
      cfg.url +
        "/painel_ia_baldes?select=*&esgotado_ate=gt." +
        encodeURIComponent(new Date(agora).toISOString()) +
        "&order=esgotado_ate.asc&limit=100",
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!resp.ok) return [];
    const linhas = (await resp.json()) as Omit<BaldeAtivo, "horasParaVoltar">[];
    return linhas.map((l) => ({
      ...l,
      horasParaVoltar: Math.max(
        0,
        Math.round((new Date(l.esgotado_ate).getTime() - agora) / 3_600_000),
      ),
    }));
  } catch {
    return [];
  }
}
