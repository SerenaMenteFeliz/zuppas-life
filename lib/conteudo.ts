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

const COLUNAS_BASE =
  "id,titulo,perfil,formato,pilar,produto,status,data_planejada,data_publicada,link,legenda,hashtags,responsavel,referencia,observacao,criado_em,atualizado_em";

/* ── Por que `local` não entra direto na lista acima ───────────────────────────

   `local` chegou com a migration 0002, e a migration é rodada À MÃO pelo Yan no
   SQL Editor. Ou seja, existe uma janela em que o código novo está no ar e a
   coluna ainda não existe, e essa janela é do tamanho de "o Yan ainda não
   sentou pra fazer isso".

   O problema é que o PostgREST responde **400 pra query inteira** quando o
   `select` cita uma coluna que não existe. Como `ler()` devolve vazio em caso
   de erro, `carregarPost` devolveria null e a tela de post cairia em
   `notFound()`. Efeito real: deployar antes da migration derrubaria o painel de
   Conteúdo que a Ge JÁ USA, por causa de uma funcionalidade que ela nem pediu.

   Trocar por `select=*` resolveria em uma linha e abriria outro buraco: a linha
   inteira do post vai pra um componente de cliente, e `*` significa "manda
   também qualquer coluna que alguém adicionar no futuro". A lista explícita é
   o que garante que só vai daqui o que a gente decidiu que vai.

   Então: uma sondagem barata, uma vez por instância. Enquanto a coluna não
   existir, o app funciona inteiro sem ela (o campo aparece vazio e a IA propõe
   cena de dentro de casa); no momento em que existir, ele passa a usá-la
   sozinho, sem redeploy.

   A janela de 60s é a demora máxima entre rodar a migration e o app perceber. */
let temLocal: boolean | null = null;
let sondadoEm = 0;

async function colunasPost(): Promise<string> {
  const agora = Date.now();
  if (temLocal === null || (temLocal === false && agora - sondadoEm > 60_000)) {
    const cfg = rest();
    if (!cfg) return COLUNAS_BASE;
    sondadoEm = agora;
    try {
      const resp = await fetch(cfg.url + "/conteudo_posts?select=local&limit=1", {
        headers: headers(cfg.key),
        cache: "no-store",
      });
      temLocal = resp.ok;
    } catch {
      temLocal = false;
    }
  }
  return temLocal ? COLUNAS_BASE + ",local" : COLUNAS_BASE;
}

/** A coluna `local` já existe neste banco?

    Existe pra tela poder ESCONDER o campo enquanto a migration não rodou.
    Achado testando em 22/08/2026: sem isso, escolher um local gravava tudo
    menos o local, o indicador dizia "Salvo às 20:06" e a escolha sumia no
    recarregamento. Campo que aceita valor e não guarda é exatamente a classe
    de falha que este painel passou o mês inteiro fechando.

    Sem campo, sem promessa: a IA continua funcionando (propõe cena de dentro
    de casa) e o campo aparece sozinho quando a coluna existir. */
export async function suportaLocal(): Promise<boolean> {
  return (await colunasPost()).includes(",local");
}

const COLUNAS_FALA =
  "id,post_id,ordem,texto,funcao,enquadramento,cenario,acao,broll,texto_tela,observacao,gravada";

export async function listarPosts(): Promise<Post[]> {
  /* Ordenação: com data primeiro, mais recente no topo. `nullslast` põe ideia
     sem data no fim em vez de encabeçar a lista — ideia solta costuma ser a
     coisa mais numerosa e a menos urgente. */
  return ler<Post>(
    "conteudo_posts?select=" +
      (await colunasPost()) +
      "&order=data_planejada.desc.nullslast,criado_em.desc",
  );
}

export async function carregarPost(id: string): Promise<Post | null> {
  const linhas = await ler<Post>(
    "conteudo_posts?select=" + (await colunasPost()) + "&id=eq." + id + "&limit=1",
  );
  /* `local` some da linha quando a coluna ainda não existe. Normalizar aqui
     evita `undefined` viajando pra dentro do prompt e do formulário, onde
     "não escolheu" e "não existe" precisam ser a mesma coisa. */
  const p = linhas[0];
  return p ? { ...p, local: p.local ?? null } : null;
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

/* ── Catálogo de cenas ────────────────────────────────────────────────────────

   Cresce do USO, não do cadastro. Cena que apareceu num post que chegou a
   `gravado` foi testada contra a realidade da casa, e essa é a única prova que
   importa de que ela é gravável.

   O desenho é híbrido de propósito: catálogo fixo cadastrado à mão dá
   viabilidade total e repetição; modelo inventando cena toda vez dá variedade
   com viabilidade baixa. Aqui o catálogo entra no prompt como vocabulário e
   exemplo, e o modelo escolhe de lá por padrão.

   Vazio não trava nada: sem catálogo, o modelo trabalha só com a ficha do
   local. É o estado normal no primeiro dia. */

export type Cena = {
  id: string;
  local: string;
  descricao: string;
  enquadramento: string | null;
  usos: number;
};

/** As cenas que já funcionaram neste local, mais usadas primeiro. Alimenta o
    prompt. Sem local escolhido devolve vazio: cena de praia não ajuda quem vai
    gravar na cozinha, e sugerir cena de qualquer lugar é pior que não sugerir. */
export async function cenasDoLocal(local: string | null): Promise<string[]> {
  if (!local) return [];
  const linhas = await ler<Cena>(
    "conteudo_cenas?select=descricao,enquadramento&local=eq." +
      encodeURIComponent(local) +
      "&order=usos.desc&limit=12",
  );
  return linhas.map((c) =>
    c.enquadramento ? c.descricao + " (" + c.enquadramento + ")" : c.descricao,
  );
}

/** Guarda as cenas de um post no catálogo. Chamada quando o post chega a
    `gravado`, que é o momento em que a cena deixa de ser plano e vira fato.

    Falha em silêncio: catálogo é conveniência, e um erro aqui não pode impedir
    alguém de marcar o próprio post como gravado. */
export async function aprenderCenas(postId: string, local: string | null): Promise<void> {
  if (!local) return;
  try {
    const falas = await carregarFalas(postId);

    /* Cena que só repete o nome do local não é cena, é o local de novo.

       Achado testando em 22/08/2026: com a ficha de locais ainda sem recursos
       preenchidos, o modelo devolveu `cenario: "casa"` nas doze falas, e o
       catálogo aprendeu a linha inútil `casa :: casa`. Ela voltaria pro prompt
       das próximas gerações como "cena que já funcionou: casa", que é ruído
       ocupando o lugar de exemplo de verdade.

       O schema agora pede o ponto dentro do local, mas a guarda fica aqui de
       qualquer jeito: o catálogo é alimentado por saída de modelo, e saída de
       modelo não se garante por instrução. */
    const ehSoOLocal = (v: string) => {
      /* Compara sem acento e sem caixa: o id do local é "condominio" e o
         modelo escreve "Condomínio". */
      const n = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .trim();
      return n(v) === n(local);
    };

    const cenas = falas
      .filter((f) => f.cenario && f.cenario.trim() !== "" && !ehSoOLocal(f.cenario))
      .map((f) => ({
        local,
        descricao: (f.cenario as string).trim().slice(0, 200),
        enquadramento: f.enquadramento?.trim() || null,
        origem_post_id: postId,
      }));
    if (cenas.length === 0) return;

    /* Dedup local antes de mandar: duas falas no mesmo cenário virariam duas
       linhas com a mesma chave única no mesmo lote, e o PostgREST recusa o lote
       inteiro por conflito consigo mesmo. */
    const vistas = new Set<string>();
    const unicas = cenas.filter((c) => {
      if (vistas.has(c.descricao)) return false;
      vistas.add(c.descricao);
      return true;
    });

    await escrever(
      "conteudo_cenas?on_conflict=local,descricao",
      "POST",
      unicas,
      "resolution=merge-duplicates,return=minimal",
    );
  } catch {
    /* Ver acima: catálogo é conveniência. */
  }
}

export async function listarCenas(): Promise<Cena[]> {
  return ler<Cena>("conteudo_cenas?select=id,local,descricao,enquadramento,usos&order=local.asc,usos.desc");
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

/** PATCH com o que receber, e devolve a linha como ficou.

    Devolver importa pra concorrência: quem salvou manda só os campos que
    mexeu, e a linha de volta conta o que as OUTRAS abas mudaram nesse meio
    tempo. É assim que uma segunda aba aberta deixa de ser risco e vira
    informação. */
export async function atualizarPost(id: string, campos: Partial<Post>): Promise<Post | null> {
  /* Sem a coluna, gravar `local` derrubaria o autosave inteiro do formulário
     com um erro do PostgREST, e o autosave é justamente o que não pode falhar.
     Descartar o campo mantém tudo o mais funcionando; o dropdown volta ao valor
     do servidor na gravação seguinte, que é o comportamento certo pra "esse
     campo ainda não existe aqui". */
  const colunas = await colunasPost();
  let limpos = campos;
  if (!colunas.includes(",local") && "local" in campos) {
    limpos = { ...campos };
    delete limpos.local;
  }

  const linhas = await escrever<Post>(
    "conteudo_posts?id=eq." + id + "&select=" + colunas,
    "PATCH",
    { ...limpos, atualizado_em: new Date().toISOString() },
  );
  const p = linhas[0];
  return p ? { ...p, local: p.local ?? null } : null;
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
export type ResultadoRoteiro = {
  /** Falas criadas agora, NA MESMA ORDEM em que foram enviadas. O cliente usa
      isso pra adotar o id de cada fala nova que ele acabou de mandar. */
  criadas: Fala[];
  /** Falas que existem no banco e não estavam na tela de quem salvou. Só pode
      ser trabalho de outra aba ou de outra pessoa. */
  deOutraAba: Fala[];
};

export async function salvarRoteiro(
  postId: string,
  falas: Fala[],
  removidas: string[],
): Promise<ResultadoRoteiro> {
  const comId = falas.filter((f) => f.id);
  const novas = falas.filter((f) => !f.id);
  const idsNaTela = comId.map((f) => f.id as string);

  /* ── Apaga só o que foi apagado, nunca "tudo que não está na minha tela" ──

     Até 22/08/2026 este DELETE era `id=not.in.(idsNaTela)`, ou seja, "some com
     tudo que eu não estou vendo". Duas falhas, e a segunda foi medida:

     1. Uma segunda aba (ou o mesmo notebook e o celular) que adicionasse uma
        fala perdia esse trabalho na primeira vez que a outra aba gravasse.
        Não precisa de duas pessoas: uma aba esquecida aberta bastava.

     2. Fala criada na sessão atual nunca recebia o id de volta (o insert usava
        `return=minimal`), então ela seguia sendo tratada como "nova" e caía
        nesse `not.in` a cada gravação. Medido em 22/08/2026: o id de uma fala
        mudou de `e190c8ca` pra `f334d4c8` entre duas gravações da MESMA fala,
        ou seja, ela era apagada e recriada a cada autosave.

     Agora o cliente manda a lista do que ELE apagou, e é só isso que some. O
     `post_id=eq.` continua no filtro porque um id de outro post que chegasse
     aqui por engano não pode apagar nada. */
  if (removidas.length > 0) {
    await escrever(
      "conteudo_falas?post_id=eq." + postId + "&id=in.(" + removidas.join(",") + ")",
      "DELETE",
      undefined,
      "return=minimal",
    );
  }

  /* Upsert das existentes e insert das novas tocam conjuntos disjuntos, então
     vão juntas. As novas voltam com `return=representation` porque é a
     representação que carrega o id gerado pelo banco — sem ela, o cliente
     nunca aprende quem é a fala que ele acabou de criar. */
  const [, criadas] = await Promise.all([
    comId.length > 0
      ? escrever(
          "conteudo_falas?on_conflict=id",
          "POST",
          comId.map((f) => ({ id: f.id, post_id: postId, ...corpoFala(f) })),
          "resolution=merge-duplicates,return=minimal",
        )
      : Promise.resolve([]),
    novas.length > 0
      ? escrever<Fala>(
          "conteudo_falas?select=" + COLUNAS_FALA,
          "POST",
          novas.map((f) => ({ post_id: postId, ...corpoFala(f) })),
          "return=representation",
        )
      : Promise.resolve([] as Fala[]),
  ]);

  /* Uma leitura a mais, e ela paga o preço: é o que transforma "a fala da
     outra aba não sumiu" em "a fala da outra aba aparece na tela". Sem isso o
     trabalho estaria salvo e invisível até alguém recarregar, que é seguro
     porém confuso. */
  const conhecidos = new Set([...idsNaTela, ...criadas.map((f) => f.id as string)]);
  const noBanco = await carregarFalas(postId);
  const deOutraAba = noBanco.filter((f) => f.id && !conhecidos.has(f.id));

  return { criadas, deOutraAba };
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
