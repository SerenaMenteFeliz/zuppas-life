/* Carrega transcrições já conferidas como posts publicados no painel.

   Uso:
     node scripts/carregar-transcricoes.mjs "C:\pasta"            (ensaio, não grava)
     node scripts/carregar-transcricoes.mjs "C:\pasta" --gravar   (grava de verdade)

   ── Por que este script pode escrever no banco ──

   A regra de 22/08 é que a IA não escreve no banco: ela propõe, a pessoa
   confere na prévia, e o autosave de sempre grava. Ela continua valendo, e
   este script não a fere: o que entra aqui é material que o Yan já leu e
   aprovou no REVISAO.html. A carga é a mão dele, não a do modelo.

   O que sustenta isso na prática é o ensaio: sem `--gravar` ele imprime tudo
   que faria e não toca em nada. Rodar o ensaio primeiro não é sugestão.

   ── O que este script NÃO faz ──

   Não alimenta o catálogo de cenas (`conteudo_cenas`). Decisão do Yan em
   23/08/2026: a inteligência só é ligada depois que TODOS os publicados
   estiverem na plataforma. Alimentar o catálogo com 2 posts ensinaria o
   modelo a partir de uma amostra que a gente sabe que está incompleta.

   Não mexe em cenário repetido nem junta falas com texto igual. A carga é
   fiel à transcrição de propósito: o Yan vai olhar na plataforma pra decidir
   o que fazer com elas, e colapsar antes tiraria dele a informação em que a
   decisão se apoia. */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* ── Argumentos ─────────────────────────────────────────────────────────────── */

const pasta = process.argv[2];
const gravar = process.argv.includes("--gravar");

if (!pasta) {
  console.error(
    'Falta a pasta.\n\n  node scripts/carregar-transcricoes.mjs "C:\\pasta"\n  node scripts/carregar-transcricoes.mjs "C:\\pasta" --gravar\n',
  );
  process.exit(1);
}

/* ── Ambiente ───────────────────────────────────────────────────────────────── */

function lerEnvLocal() {
  let bruto;
  try {
    bruto = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  } catch {
    return {};
  }
  const env = {};
  for (const linha of bruto.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linha);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...lerEnvLocal(), ...process.env };
const URL_REST = (env.SUPABASE_URL ?? "") + "/rest/v1";
const CHAVE = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!env.SUPABASE_URL || !CHAVE) {
  console.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não estão no .env.local.");
  process.exit(1);
}

const cabecalhos = (extras = {}) => ({
  apikey: CHAVE,
  Authorization: "Bearer " + CHAVE,
  "Content-Type": "application/json",
  ...extras,
});

/* ── Datas de publicação ────────────────────────────────────────────────────── */

/* Vem de um arquivo à mão, e não do nome do vídeo, porque o nome do vídeo é
   relativo ("7 days ago", "June 18"): ele muda de significado dependendo de
   quando foi baixado, e vira ambíguo na releitura. Regra de data absoluta do
   vault.

   Sem entrada aqui, o post NÃO é carregado. `data_publicada` é o que amarra
   métrica a conteúdo, e conteúdo sem data amarrada não serve pro que este
   backfill existe pra fazer. Melhor faltar do que entrar com data chutada. */
const CAMINHO_DATAS = join(pasta, "datas.json");
let datas = {};
try {
  datas = JSON.parse(readFileSync(CAMINHO_DATAS, "utf8").replace(/^\uFEFF/, ""));
} catch {
  console.error(
    "Não achei " +
      CAMINHO_DATAS +
      "\n\nCrie o arquivo mapeando cada vídeo à data real de publicação:\n\n" +
      JSON.stringify({ "nome do arquivo.mp4": { data_publicada: "2026-08-16", link: "" } }, null, 2) +
      "\n",
  );
  process.exit(1);
}

/* ── Leitura ────────────────────────────────────────────────────────────────── */

const arquivos = readdirSync(pasta)
  .filter((f) => f.endsWith(".roteiro.json"))
  .sort();

if (arquivos.length === 0) {
  console.error("Nenhum .roteiro.json em " + pasta);
  process.exit(1);
}

const PERFIL = "geovana";
const planos = [];
const pulados = [];

for (const nome of arquivos) {
  const d = JSON.parse(readFileSync(join(pasta, nome), "utf8"));
  const r = d.roteiro ?? {};
  const origem = d.arquivo ?? nome.replace(/\.roteiro\.json$/, "");
  const info = datas[origem];

  if (!info?.data_publicada) {
    pulados.push({ origem, motivo: "sem data_publicada em datas.json" });
    continue;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(info.data_publicada)) {
    pulados.push({ origem, motivo: "data_publicada fora do formato AAAA-MM-DD: " + info.data_publicada });
    continue;
  }
  if (!(r.falas ?? []).length) {
    pulados.push({ origem, motivo: "transcrição sem falas" });
    continue;
  }

  /* Os campos que a transcrição descobriu e que não têm coluna própria vão pra
     `observacao`, em vez de virarem coluna nova. Duas razões: eles são
     observação sobre material passado, não estado que o painel opera, e uma
     migration por campo de backfill deixaria o schema cheio de coisa que só
     serve pra 30 linhas. Se algum deles virar decisão de produto, aí ganha
     coluna. */
  /* A manchete não tem coluna, e eu não invento migration sozinho.

     Ela é a copy mais cara do vídeo (o gancho que segura quem ia passar) e
     merece coluna própria, não um pedaço de string dentro de `observacao`. Mas
     schema é decisão do Yan e ele congelou mexer na plataforma até todos os
     publicados estarem carregados.

     Então vai pra `observacao` com rótulo explícito: preserva o dado, não
     muda o schema, e fica achável por busca no dia em que virar coluna. O que
     não podia acontecer era ela se perder de novo. */
  const manchete = (r.texto_fixo_na_tela || "").trim();

  const notas = [
    manchete ? "MANCHETE NA TELA: " + manchete : null,
    "Importado da transcrição do vídeo em " + new Date().toISOString().slice(0, 10) + ".",
    "voz: " + (r.voz || "?"),
    "origem da imagem: " + (r.origem_imagem || "?"),
    "pessoa na câmera: " + (r.pessoa_na_camera || "?"),
    "legenda queimada: " + (r.legenda_queimada || "?"),
    "duração: " + (r.duracao_segundos ?? "?") + "s",
  ]
    .filter(Boolean)
    .join(" · ");

  planos.push({
    origem,
    manchete,
    post: {
      titulo: r.titulo || origem,
      perfil: PERFIL,
      formato: r.formato || "Vídeo",
      pilar: r.pilar || null,
      status: "postado",
      data_publicada: info.data_publicada,
      local: r.local_observado || null,
      link: info.link || null,
      referencia: origem,
      observacao: notas,
    },
    falas: (r.falas ?? []).map((f, i) => ({
      ordem: i + 1,
      texto: f.texto ?? "",
      funcao: f.funcao || null,
      enquadramento: f.enquadramento || null,
      cenario: f.cenario || null,
      acao: f.acao || null,
      broll: f.broll || null,
      texto_tela: f.texto_tela || null,
      observacao: f.observacao || null,
      /* Post publicado teve todas as falas gravadas, por definição. Deixar
         false faria o painel mostrar 30 posts publicados com 0% de gravação. */
      gravada: true,
    })),
  });
}

/* ── Já existe? ─────────────────────────────────────────────────────────────── */

/* Carga não pode duplicar se rodar duas vezes. `referencia` guarda o nome do
   arquivo de origem e é o que identifica um post já carregado: sem essa
   checagem, um `--gravar` repetido criaria 30 posts gêmeos e a limpeza seria
   à mão, post por post, no painel. */
async function jaCarregados() {
  const refs = planos.map((p) => '"' + p.origem.replace(/"/g, '\\"') + '"');
  if (refs.length === 0) return new Map();
  const resp = await fetch(
    URL_REST + "/conteudo_posts?select=id,referencia,titulo&referencia=in.(" + encodeURIComponent(refs.join(",")) + ")",
    { headers: cabecalhos() },
  );
  if (!resp.ok) {
    console.error("Falhou ao checar duplicatas (HTTP " + resp.status + "): " + (await resp.text()).slice(0, 300));
    process.exit(1);
  }
  return new Map((await resp.json()).map((p) => [p.referencia, p]));
}

const existentes = await jaCarregados();

/* ── Relatório ──────────────────────────────────────────────────────────────── */

console.log("\n" + (gravar ? "GRAVANDO" : "ENSAIO (nada será gravado)") + " · " + planos.length + " post(s) a carregar\n");

for (const p of planos) {
  const jaTem = existentes.get(p.origem);
  console.log("─".repeat(70));
  console.log(p.origem + (jaTem ? "   ⚠ JÁ EXISTE (id " + jaTem.id + "), vai ser PULADO" : ""));
  console.log("  título          " + p.post.titulo);
  console.log("  perfil/status   " + p.post.perfil + " / " + p.post.status);
  console.log("  publicado em    " + p.post.data_publicada);
  console.log("  formato/pilar   " + p.post.formato + " / " + (p.post.pilar ?? "—"));
  console.log("  local           " + (p.post.local ?? "—"));
  console.log("  manchete        " + (p.manchete || "—"));
  console.log("  falas           " + p.falas.length + " (todas marcadas como gravadas)");
  const comCena = p.falas.filter((f) => f.cenario).length;
  const comTela = p.falas.filter((f) => f.texto_tela).length;
  console.log("  com cenário     " + comCena + " · com texto de tela " + comTela);
}
console.log("─".repeat(70));

if (pulados.length > 0) {
  console.log("\nNÃO carregados (" + pulados.length + "):");
  for (const p of pulados) console.log("  ✗ " + p.origem + " — " + p.motivo);
}

/* ── Gravação ───────────────────────────────────────────────────────────────── */

/* `if` em vez de `process.exit(0)` aqui: no Windows, sair com o socket do
   fetch ainda fechando derruba o Node com um assert do libuv
   ("!(handle->flags & UV_HANDLE_CLOSING)"). O ensaio imprimia tudo certo e
   terminava com cara de erro, que é o pior jeito de um passo de conferência
   acabar: ensina a ignorar a saída dele. */
let criados = 0;
for (const p of gravar ? planos : []) {
  if (existentes.has(p.origem)) {
    console.log("· pulado (já existe): " + p.origem);
    continue;
  }

  const rp = await fetch(URL_REST + "/conteudo_posts", {
    method: "POST",
    headers: cabecalhos({ Prefer: "return=representation" }),
    body: JSON.stringify([p.post]),
  });
  if (!rp.ok) {
    console.error("✗ falhou ao criar o post de " + p.origem + " (HTTP " + rp.status + "): " + (await rp.text()).slice(0, 400));
    continue;
  }
  const [post] = await rp.json();

  const rf = await fetch(URL_REST + "/conteudo_falas", {
    method: "POST",
    headers: cabecalhos({ Prefer: "return=minimal" }),
    body: JSON.stringify(p.falas.map((f) => ({ ...f, post_id: post.id }))),
  });
  if (!rf.ok) {
    /* Post sem falas é pior que post nenhum: aparece no quadro parecendo
       pronto e some do radar. Desfaz e reporta, em vez de deixar meio feito. */
    console.error("✗ falhou ao gravar as falas de " + p.origem + " (HTTP " + rf.status + "): " + (await rf.text()).slice(0, 400));
    await fetch(URL_REST + "/conteudo_posts?id=eq." + post.id, { method: "DELETE", headers: cabecalhos() });
    console.error("  post desfeito, nada ficou pela metade.");
    continue;
  }

  criados += 1;
  console.log("✓ " + p.origem + " → post " + post.id + " com " + p.falas.length + " falas");
}

if (gravar) {
  console.log("\n" + criados + " post(s) criado(s).");
  console.log("Confira em /painel/conteudo antes de carregar o resto.\n");
} else {
  console.log("\nEnsaio. Pra gravar de verdade, repita o comando com --gravar\n");
}
