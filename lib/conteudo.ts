import "server-only";
import type { Fala, Metrica, Post } from "@/lib/conteudo-tipos";

/* Camada de dados do painel de conteúdo — ÚNICO ponto do app que fala com as
   tabelas `conteudo_*`.

   Isso é proposital e é a contrapartida de ter aceitado morar no banco do SMF
   em vez de num projeto separado (decisão de 11/08, ver sql/0001_conteudo.sql):
   enquanto todo acesso estiver aqui, separar depois é trocar duas env vars e
   este arquivo. Se query de conteúdo começar a nascer solta nas telas, essa
   saída se fecha sem ninguém perceber. */

/* Latência: este banco fica em São Paulo, e por isso `vercel.json` fixa as
   funções em `gru1`. Sem esse arquivo a Vercel usa o padrão dela (`iad1`,
   Washington) e toda query daqui atravessa o hemisfério duas vezes — medido em
   21/08/2026: 0,75s a 2,5s de TTFB no painel de conteúdo contra 0,04s numa
   página estática, com UM post no banco. O `vercel.json` não aceita comentário,
   então o motivo mora aqui. Se um dia o banco mudar de região, os dois mudam
   juntos. */
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

const SEM_CHAVE = "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não estão setadas neste ambiente.";

/* Leitura falha em silêncio (devolve vazio) e a tela mostra o aviso de "sem
   dado" — mesmo comportamento de lib/painel-funis.ts.

   Escrita NÃO. Escrita levanta erro com o que o PostgREST devolveu. Isso é
   lição pega no caminho: em 04/08 a captura de lead ficou quebrada por três
   dias porque o fetch que gravava era fire-and-forget e o 500 não aparecia
   pra ninguém — 23 leads reais perdidos. Roteiro que a Ge escreve e some sem
   avisar é o mesmo erro com outra roupa. */
async function ler<T>(path: string): Promise<T[]> {
  const cfg = rest();
  if (!cfg) return [];
  const resp = await fetch(cfg.url + "/" + path, {
    headers: headers(cfg.key),
    cache: "no-store",
  });
  if (!resp.ok) return [];
  return resp.json();
}

/* `prefer` é parâmetro porque escrita em lote quer duas coisas que a escrita
   avulsa não quer: `resolution=merge-duplicates` (upsert) e `return=minimal`
   (não trazer de volta as linhas gravadas). Num roteiro de 40 falas a
   representação de volta é o maior corpo da requisição inteira, e ninguém lê. */
async function escrever<T>(
  path: string,
  metodo: "POST" | "PATCH" | "DELETE",
  corpo?: unknown,
  prefer = "return=representation",
): Promise<T[]> {
  const cfg = rest();
  if (!cfg) throw new Error(SEM_CHAVE);
  const resp = await fetch(cfg.url + "/" + path, {
    method: metodo,
    headers: headers(cfg.key, { Prefer: prefer }),
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(
      "Supabase " + metodo + " " + path + " falhou (" + resp.status + "): " + detalhe.slice(0, 400),
    );
  }
  const texto = await resp.text();
  return texto ? JSON.parse(texto) : [];
}

const COLUNAS_POST =
  "id,titulo,perfil,formato,pilar,produto,status,data_planejada,data_publicada,link,legenda,hashtags,responsavel,referencia,observacao,criado_em,atualizado_em";

const COLUNAS_FALA =
  "id,post_id,ordem,texto,funcao,enquadramento,cenario,acao,broll,texto_tela,observacao,gravada";

export async function listarPosts(): Promise<Post[]> {
  /* Ordenação: com data primeiro, mais recente no topo. `nullslast` põe ideia
     sem data no fim em vez de encabeçar a lista — ideia solta costuma ser a
     coisa mais numerosa e a menos urgente. */
  return ler<Post>(
    "conteudo_posts?select=" + COLUNAS_POST + "&order=data_planejada.desc.nullslast,criado_em.desc",
  );
}

export async function carregarPost(id: string): Promise<Post | null> {
  const linhas = await ler<Post>(
    "conteudo_posts?select=" + COLUNAS_POST + "&id=eq." + id + "&limit=1",
  );
  return linhas[0] ?? null;
}

export async function carregarFalas(postId: string): Promise<Fala[]> {
  return ler<Fala>(
    "conteudo_falas?select=" + COLUNAS_FALA + "&post_id=eq." + postId + "&order=ordem.asc",
  );
}

export async function carregarMetricas(postId: string): Promise<Metrica[]> {
  return ler<Metrica>(
    "conteudo_metricas?select=*&post_id=eq." + postId + "&order=coletado_em.desc",
  );
}

/** Quantas falas já foram marcadas como gravadas, por post. Alimenta o quadro
    e a lista, pra dar progresso de gravação sem precisar abrir o post. */
export async function contarFalas(): Promise<Map<string, { total: number; gravadas: number }>> {
  const linhas = await ler<{ post_id: string; gravada: boolean }>(
    "conteudo_falas?select=post_id,gravada",
  );
  const mapa = new Map<string, { total: number; gravadas: number }>();
  for (const l of linhas) {
    const atual = mapa.get(l.post_id) ?? { total: 0, gravadas: 0 };
    atual.total += 1;
    if (l.gravada) atual.gravadas += 1;
    mapa.set(l.post_id, atual);
  }
  return mapa;
}

export async function criarPost(dados: {
  titulo: string;
  perfil: string;
  formato?: string | null;
}): Promise<Post> {
  const [criado] = await escrever<Post>("conteudo_posts", "POST", [
    {
      titulo: dados.titulo,
      perfil: dados.perfil,
      formato: dados.formato ?? null,
      status: "ideia",
    },
  ]);
  return criado;
}

export async function atualizarPost(id: string, campos: Partial<Post>): Promise<void> {
  await escrever("conteudo_posts?id=eq." + id, "PATCH", {
    ...campos,
    atualizado_em: new Date().toISOString(),
  });
}

export async function excluirPost(id: string): Promise<void> {
  /* Falas e métricas caem junto pelo `on delete cascade` do schema. */
  await escrever("conteudo_posts?id=eq." + id, "DELETE");
}

/** Salva o roteiro inteiro de uma vez.

    Diff em vez de "apaga tudo e reinsere": a fala já gravada tem `id`, e
    recriar as linhas apagaria a marca de gravada no meio de um dia de
    gravação. Então as que têm id viram PATCH, as novas viram POST, e as que
    sumiram da tela viram DELETE. */
export async function salvarRoteiro(postId: string, falas: Fala[]): Promise<void> {
  const comId = falas.filter((f) => f.id);
  const novas = falas.filter((f) => !f.id);
  const idsNaTela = comId.map((f) => f.id as string);

  /* No máximo 3 requisições, e esse número não muda se o roteiro tiver 5 ou 50
     falas (achado em 21/08/2026).

     Antes era uma leitura + um `await` por fala dentro de um `for`: roteiro de
     12 falas virava 13 idas ao banco em fila, e o custo crescia junto com o
     roteiro, que é justamente a parte que cresce. Era o clique mais lento do
     painel inteiro.

     A leitura prévia sumiu porque `id=not.in.(...)` já diz "apague o que não
     está mais na tela" sem precisar descobrir antes o que existia. */
  await escrever(
    idsNaTela.length > 0
      ? "conteudo_falas?post_id=eq." + postId + "&id=not.in.(" + idsNaTela.join(",") + ")"
      : "conteudo_falas?post_id=eq." + postId,
    "DELETE",
    undefined,
    "return=minimal",
  );

  /* O DELETE acima roda ANTES destas duas, nunca em paralelo: fala nova nasce
     com id gerado pelo banco, que por definição não está em `idsNaTela`, então
     um DELETE concorrente apagaria exatamente a fala recém-inserida. Estas
     duas, entre si, tocam conjuntos disjuntos e podem ir juntas. */
  await Promise.all([
    comId.length > 0
      ? escrever(
          "conteudo_falas?on_conflict=id",
          "POST",
          comId.map((f) => ({ id: f.id, post_id: postId, ...corpoFala(f) })),
          "resolution=merge-duplicates,return=minimal",
        )
      : null,
    novas.length > 0
      ? escrever(
          "conteudo_falas",
          "POST",
          novas.map((f) => ({ post_id: postId, ...corpoFala(f) })),
          "return=minimal",
        )
      : null,
  ]);
}

function corpoFala(f: Fala) {
  return {
    ordem: f.ordem,
    texto: f.texto,
    funcao: vazioVirouNulo(f.funcao),
    enquadramento: vazioVirouNulo(f.enquadramento),
    cenario: vazioVirouNulo(f.cenario),
    acao: vazioVirouNulo(f.acao),
    broll: vazioVirouNulo(f.broll),
    texto_tela: vazioVirouNulo(f.texto_tela),
    observacao: vazioVirouNulo(f.observacao),
    gravada: f.gravada,
  };
}

/* Campo em branco vira NULL, não string vazia. Sem isso "nunca preenchi" e
   "preenchi e apaguei" ficam indistinguíveis, e qualquer contagem futura de
   "quantos roteiros têm cena planejada" mente sem avisar. */
function vazioVirouNulo(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

export async function salvarMetrica(
  postId: string,
  coletadoEm: string,
  valores: Record<string, number | null>,
): Promise<void> {
  /* Upsert na chave (post_id, coletado_em): coletar duas vezes no mesmo dia
     corrige o número em vez de criar uma segunda linha pro mesmo dia. */
  const cfg = rest();
  if (!cfg) throw new Error(SEM_CHAVE);
  const resp = await fetch(cfg.url + "/conteudo_metricas?on_conflict=post_id,coletado_em", {
    method: "POST",
    headers: headers(cfg.key, {
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify([{ post_id: postId, coletado_em: coletadoEm, ...valores }]),
    cache: "no-store",
  });
  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(
      "Supabase upsert de métrica falhou (" + resp.status + "): " + detalhe.slice(0, 400),
    );
  }
}

export async function excluirMetrica(id: string): Promise<void> {
  await escrever("conteudo_metricas?id=eq." + id, "DELETE");
}
