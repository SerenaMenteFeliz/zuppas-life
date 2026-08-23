/* Transcreve um Reel já publicado e devolve o roteiro no formato do painel.

   Uso:
     node scripts/transcrever-reel.mjs "C:\caminho\do\reel.mp4"

   Existe pra resolver o degrau do backfill: a Ge tem 32 Reels publicados, e
   eles são a única evidência real de como ela escreve e de que cena ela
   consegue gravar. Digitar isso à mão é a razão pela qual não seria feito.

   ── O que este script NÃO faz, de propósito ──

   Não escreve no banco. Ele grava um JSON do lado do vídeo, pra conferência
   humana antes de qualquer INSERT. A regra de 22/08 ("a IA não escreve no
   banco, ela propõe e a pessoa confere") vale mais ainda aqui: erro de
   transcrição num backfill não estraga um post, estraga o material de onde a
   ficha da Ge vai ser destilada, e aí molda todo roteiro futuro sem ninguém
   auditar.

   Não passa por `lib/ia/modelo.ts`, e isso é temporário e deliberado. A regra
   da porta única continua valendo pro app. Só que o formato de entrada com
   arquivo neste endpoint é DESCONHECIDO: `/v1beta/interactions` é novo, e em
   22/08 a primeira chamada real derrubou quatro coisas que a documentação
   dizia (id de modelo que não existe, `output_text` que não existe na resposta
   crua, nome errado dos campos de token, latência 100x maior que o esperado).
   Escrever palpite dentro de `chamarModelo` seria colocar código não
   verificado no caminho que a Ge usa. Este script é o probe: quando ele disser
   qual forma funciona, ela entra em `modelo.ts` com asserção no
   `npm run verificar`, e este arquivo vira só o driver do backfill. */

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

/* ── Entrada ────────────────────────────────────────────────────────────────── */

const caminho = process.argv[2];
if (!caminho) {
  console.error('Falta o caminho do vídeo.\n\n  node scripts/transcrever-reel.mjs "C:\\pasta\\reel.mp4"\n');
  process.exit(1);
}

let tamanho;
try {
  tamanho = statSync(caminho).size;
} catch {
  console.error("Não achei o arquivo: " + caminho);
  process.exit(1);
}

const MIMES = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/mp4" };
const mime = MIMES[extname(caminho).toLowerCase()];
if (!mime) {
  console.error("Extensão não reconhecida: " + extname(caminho) + ". Esperado .mp4, .mov, .webm ou .m4v.");
  process.exit(1);
}

/* ── Chaves ─────────────────────────────────────────────────────────────────── */

/* Mesma variável e mesmo formato do app (lista separada por vírgula), lida do
   .env.local em vez de importar `lerChaves`, porque aquele arquivo é `.ts` e
   este script roda em Node puro sem passo de build.

   Tirar o BOM não é paranoia: em 20/07/2026 uma env var com BOM quebrou
   `fetch` neste mesmo ecossistema com erro obscuro de ByteString, e custou uma
   sessão até alguém olhar os bytes. Ver o Conceito no vault. */
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
const chaves = (env.GEMINI_KEYS ?? "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (chaves.length === 0) {
  console.error("GEMINI_KEYS não está no .env.local nem no ambiente.");
  process.exit(1);
}
const chave = chaves[0];

/* ── Modelos ────────────────────────────────────────────────────────────────── */

/* Lite primeiro porque desenvolvimento local consome a MESMA cota da Ge (são
   20/dia nos Flash bons, e uma tarde de teste come tudo). A dúvida honesta é
   se o Lite aceita vídeo: se não aceitar, o passo pro 2.5 é onde vai custar.

   ── Por que o GEMINI_MODELO_DEV aqui não trava a lista, diferente do app ──

   Em `lib/ia/modelo.ts` esse env var fixa UM modelo e pronto, e está certo: lá
   ele existe pra impedir que uma tarde de teste local coma os 20/dia dos Flash
   que a Ge usa.

   Aqui ele só define o PRIMEIRO da fila. Se ele travasse a lista, um Lite que
   não aceita vídeo faria o probe morrer dizendo "não deu", e a gente não
   saberia se o problema é o modelo ou o formato de entrada, que é justamente a
   pergunta que este script existe pra responder. Descobrir isso custa uma
   requisição no 2.5-flash, que nem está na cascata do Gerar.

   Cada item desta lista é uma requisição real. Não aumentar sem motivo. */
const PADRAO = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.6-flash"];
const MODELOS = env.GEMINI_MODELO_DEV
  ? [env.GEMINI_MODELO_DEV, ...PADRAO.filter((m) => m !== env.GEMINI_MODELO_DEV)]
  : PADRAO;

const BASE = "https://generativelanguage.googleapis.com";

/* ── Passo 1: subir o arquivo ───────────────────────────────────────────────── */

/* Files API e não base64 embutido: o limite de requisição embutida é 20MB e um
   Reel de 60s em boa qualidade encosta nisso. Além disso o arquivo subido dura
   48h e pode ser reusado entre tentativas, o que importa porque o probe abaixo
   testa várias formas de entrada: sobe uma vez, testa cinco. */
async function subirArquivo() {
  const bytes = readFileSync(caminho);

  const inicio = await fetch(BASE + "/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": chave,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(tamanho),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: basename(caminho) } }),
  });

  if (!inicio.ok) {
    throw new Error(
      "Files API recusou o início do upload (HTTP " + inicio.status + "): " + (await inicio.text()).slice(0, 400),
    );
  }

  const url = inicio.headers.get("x-goog-upload-url");
  if (!url) {
    throw new Error("Files API não devolveu a URL de upload. Cabeçalhos vistos: " + [...inicio.headers.keys()].join(", "));
  }

  const envio = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Length": String(tamanho),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });

  if (!envio.ok) {
    throw new Error("Upload falhou (HTTP " + envio.status + "): " + (await envio.text()).slice(0, 400));
  }

  const { file } = await envio.json();
  return file;
}

/* Vídeo não fica pronto na hora: o Google decodifica antes de aceitar como
   entrada, e mandar um arquivo ainda em PROCESSING volta um erro que parece de
   formato. Esperar aqui evita horas caçando o problema errado. */
async function esperarAtivo(file) {
  const nome = file.name;
  for (let i = 0; i < 60; i++) {
    if (file.state === "ACTIVE") return file;
    if (file.state === "FAILED") {
      throw new Error("O Google não conseguiu processar o vídeo: " + JSON.stringify(file.error ?? {}));
    }
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetch(BASE + "/v1beta/" + nome, { headers: { "x-goog-api-key": chave } });
    if (!r.ok) throw new Error("Falhou ao consultar o estado do arquivo (HTTP " + r.status + ")");
    file = await r.json();
  }
  throw new Error("O vídeo continuou em PROCESSING por 2 minutos. Grande demais, ou a fila do Google está lenta.");
}

/* ── O pedido ───────────────────────────────────────────────────────────────── */

const FUNCOES = ["gancho", "contexto", "virada", "prova", "cta"];
const FORMATOS = ["Vídeo", "Imagem", "Carrossel", "Story"];
const PILARES = [
  "Reflexão / Filosófico",
  "Storytelling / Parábola",
  "Validação Emocional",
  "Autoridade / Ensinamento",
];
const LOCAIS = ["casa", "condominio", "rua", "praia", "montanha"];

const t = (d) => ({ type: "string", description: d });
const e = (v, d) => ({ type: "string", enum: ["", ...v], description: d });

/* O MESMO formato de saída do Importar e do Gerar (lib/ia/esquemas.ts), e isso
   não é economia de digitação: é o que faz o resultado deste script cair
   direto na prévia, no validador e no editor que já existem, sem abrir um
   segundo caminho de escrita com regra própria.

   As duas diferenças em relação ao esquema do app estão marcadas abaixo, e as
   duas vêm do mesmo fato: aqui a cena é OBSERVADA, não proposta. */
const ESQUEMA = {
  type: "object",
  properties: {
    titulo: t("Nome curto pra reconhecer o post na lista. Não é o gancho."),
    formato: e(FORMATOS, "Que mídia é esta publicação."),
    pilar: e(PILARES, "Qual pilar de conteúdo esta publicação serve."),
    /* Não existe no esquema do app: lá o local é escolhido pela pessoa antes
       de gerar. Aqui ele é lido do que aparece na imagem, e é justamente um
       dos ganhos do backfill. */
    local_observado: e(
      LOCAIS,
      "Onde este vídeo foi gravado, pelo que dá pra ver na imagem. Vazio se não der pra dizer.",
    ),
    /* Idem: só faz sentido em material já publicado. Serve pra conferir a
       transcrição contra a duração real antes de aceitar. */
    duracao_segundos: { type: "number", description: "Duração aproximada do vídeo em segundos." },
    falas: {
      type: "array",
      description:
        "O que foi realmente dito, uma entrada por frase falada, na ordem. Frase com várias orações vira várias entradas: a gravação é frase por frase.",
      items: {
        type: "object",
        properties: {
          texto: t(
            "A frase EXATA que foi dita, palavra por palavra. Não corrija, não melhore, não resuma. Se ela repetiu ou gaguejou, transcreva como saiu.",
          ),
          funcao: e(
            FUNCOES,
            "Que trabalho esta frase faz na história: gancho segura quem ia passar, contexto situa a dor, virada muda a cabeça, prova sustenta, cta faz o único pedido.",
          ),
          enquadramento: t("Como a câmera vê NESTA fala, pelo que aparece na imagem. Ex: close, plano médio, de costas."),
          cenario: t(
            "Em que ponto do local a cena acontece: a cozinha, a beira da cama, a varanda, o sofá. NUNCA repita o nome do local em si. Vazio se não der pra ser mais específico.",
          ),
          acao: t("O que ela está fazendo enquanto fala, pelo que aparece na imagem."),
          broll: t("Imagem que entra por cima da fala, quando entra. Vazio se não tem."),
          texto_tela: t("O que aparece escrito na tela nesta fala, transcrito como está. Vazio se nada aparece."),
          observacao: t("Tom, pausa ou intenção observada. Vazio quando não há nada a dizer."),
        },
        required: ["texto", "funcao", "enquadramento", "cenario", "acao", "broll", "texto_tela", "observacao"],
      },
    },
  },
  required: ["titulo", "formato", "pilar", "local_observado", "duracao_segundos", "falas"],
};

/* A diferença inteira entre este prompt e o do Importar cabe numa frase: lá o
   modelo classifica texto que já existe, aqui ele é testemunha.

   A instrução insiste em "não melhore" porque o valor deste material é ser a
   voz real da Ge, e modelo de linguagem corrige gramática por reflexo.
   Transcrição embelezada ensinaria a ficha a escrever como o Gemini, não como
   ela, e ninguém perceberia lendo o resultado: ele sai bonito. */
const INSTRUCAO = `Você está assistindo a um Reel já publicado, gravado pela pessoa que aparece nele, em português do Brasil.

Sua tarefa é registrar o que ESTÁ LÁ, não propor nada.

Regras que não se negociam:
1. Transcreva as falas palavra por palavra, exatamente como foram ditas. Não corrija gramática, não troque palavra por sinônimo melhor, não resuma, não junte frases. Se ela repetiu, repita. Se usou gíria, mantenha a gíria.
2. Quebre o texto em uma entrada por frase falada. Frase com três orações vira três entradas.
3. Preencha enquadramento, cenário e ação com o que APARECE NA IMAGEM. Se não der pra ver, deixe vazio. Nunca invente cena: cena inventada aqui vira exemplo de "cena que já funcionou" mais adiante e contamina todo roteiro futuro.
4. A função de cada fala é classificação sua e pode ser deduzida: identifique o trabalho que a frase faz na história.
5. Transcreva o texto na tela como ele está escrito, com os erros que tiver.`;

/* ── O probe ────────────────────────────────────────────────────────────────── */

/* Cinco formas candidatas de anexar arquivo a `/v1beta/interactions`, da mais
   provável pra menos. A primeira que devolver 200 é a resposta, e é ela que
   entra em `lib/ia/modelo.ts` depois.

   Cada tentativa é uma requisição real e pode contar cota mesmo voltando 400.
   Por isso a ordem importa e a lista é curta. */
function formas(uri) {
  return [
    {
      nome: "content[] com input_text/input_file",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: INSTRUCAO },
            { type: "input_file", file_uri: uri, mime_type: mime },
          ],
        },
      ],
    },
    {
      nome: "content[] com text/file",
      input: [
        {
          role: "user",
          content: [
            { type: "text", text: INSTRUCAO },
            { type: "file", file_uri: uri, mime_type: mime },
          ],
        },
      ],
    },
    {
      nome: "parts[] com file_data (estilo generateContent)",
      input: [
        {
          role: "user",
          parts: [{ text: INSTRUCAO }, { file_data: { file_uri: uri, mime_type: mime } }],
        },
      ],
    },
    {
      nome: "content[] com file_data aninhado",
      input: [
        {
          role: "user",
          content: [
            { type: "text", text: INSTRUCAO },
            { type: "file", file_data: { file_uri: uri, mime_type: mime } },
          ],
        },
      ],
    },
    {
      nome: "parts[] no topo, sem role",
      input: { parts: [{ text: INSTRUCAO }, { file_data: { file_uri: uri, mime_type: mime } }] },
    },
  ];
}

/* Mesmo extrator defensivo de lib/ia/cascata.ts, e pelo mesmo motivo: em 22/08
   `output_text` não existia na resposta crua, e o texto estava enterrado em
   steps[].content[].text, com o primeiro step sendo um `thought` sem texto. */
function extrairTexto(bruto) {
  let o;
  try {
    o = JSON.parse(bruto);
  } catch {
    return null;
  }
  const cavar = (v) => {
    if (typeof v === "string") return v !== "" ? v : null;
    if (Array.isArray(v)) {
      for (const item of v) {
        const achado = cavar(item);
        if (achado) return achado;
      }
      return null;
    }
    if (v && typeof v === "object") {
      for (const campo of ["output_text", "text", "content", "parts", "steps", "output"]) {
        if (campo in v) {
          const achado = cavar(v[campo]);
          if (achado) return achado;
        }
      }
    }
    return null;
  };
  return cavar(o);
}

async function transcrever(uri) {
  const tentadas = [];

  for (const modelo of MODELOS) {
    for (const forma of formas(uri)) {
      const t0 = Date.now();
      let resp;
      try {
        resp = await fetch(BASE + "/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
          body: JSON.stringify({
            model: modelo,
            system_instruction: INSTRUCAO,
            input: forma.input,
            store: false,
            generation_config: { temperature: 0.1, thinking_level: "low" },
            response_format: { type: "text", mime_type: "application/json", schema: ESQUEMA },
          }),
          /* Bem mais folgado que os 45s do app: lá tem alguém esperando na
             tela e limite de duração de função na Vercel. Aqui é terminal, e
             vídeo leva mais que texto. */
          signal: AbortSignal.timeout(180_000),
        });
      } catch (err) {
        tentadas.push({ modelo, forma: forma.nome, resultado: "rede/timeout: " + err.message });
        console.log("  ✗ " + modelo + " / " + forma.nome + " → " + err.message);
        continue;
      }

      const ms = Date.now() - t0;
      const bruto = await resp.text();

      if (!resp.ok) {
        tentadas.push({ modelo, forma: forma.nome, resultado: "HTTP " + resp.status, corpo: bruto.slice(0, 300) });
        console.log("  ✗ " + modelo + " / " + forma.nome + " → HTTP " + resp.status);
        /* 429 é cota: insistir noutra forma no mesmo modelo só queima mais.
           403/401 é chave morta e nenhuma forma vai salvar. Nos dois casos,
           pula o modelo inteiro. Mesma distinção de lib/ia/cascata.ts. */
        if (resp.status === 429 || resp.status === 403 || resp.status === 401) break;
        continue;
      }

      const texto = extrairTexto(bruto);
      if (texto === null) {
        tentadas.push({ modelo, forma: forma.nome, resultado: "200 mas sem texto legível", corpo: bruto.slice(0, 400) });
        console.log("  ✗ " + modelo + " / " + forma.nome + " → 200 sem texto (a resposta mudou de forma?)");
        continue;
      }

      let dados;
      try {
        dados = JSON.parse(texto);
      } catch {
        tentadas.push({ modelo, forma: forma.nome, resultado: "JSON inválido", corpo: texto.slice(0, 400) });
        console.log("  ✗ " + modelo + " / " + forma.nome + " → devolveu texto que não é JSON");
        continue;
      }

      let envelope = null;
      try {
        envelope = JSON.parse(bruto);
      } catch {
        /* `extrairTexto` já parseou pra chegar aqui. Se falhar, some só a
           contagem de tokens. */
      }
      const uso = envelope?.usage ?? envelope?.usage_metadata ?? {};

      console.log(
        "  ✓ " + modelo + " / " + forma.nome + " → " + (dados.falas?.length ?? 0) + " falas em " + (ms / 1000).toFixed(1) + "s",
      );
      return {
        dados,
        meta: {
          modelo,
          forma: forma.nome,
          duracaoMs: ms,
          tokens: {
            entrada: uso.total_input_tokens ?? uso.input_tokens ?? null,
            saida: uso.total_output_tokens ?? uso.output_tokens ?? null,
          },
          tentadas,
        },
      };
    }
  }

  const erro = new Error("Nenhuma combinação de modelo e formato funcionou.");
  erro.tentadas = tentadas;
  throw erro;
}

/* ── Execução ───────────────────────────────────────────────────────────────── */

console.log("\nArquivo: " + basename(caminho) + " (" + (tamanho / 1048576).toFixed(1) + " MB)");
console.log("Chaves disponíveis: " + chaves.length + ", usando a chave-1");
console.log("\nSubindo pro Files API...");

const arquivo = await esperarAtivo(await subirArquivo());
console.log("  ✓ pronto: " + arquivo.uri);

console.log("\nProcurando o formato de entrada que este endpoint aceita:");
let r;
try {
  r = await transcrever(arquivo.uri);
} catch (err) {
  console.error("\n" + err.message + "\n");
  console.error(JSON.stringify(err.tentadas ?? [], null, 2));
  console.error(
    "\nO que isso quer dizer: nenhuma das 5 formas candidatas foi aceita. O corpo\ndas respostas acima é o que diz a forma certa. Não é pra insistir no escuro:\ncada tentativa custa cota.\n",
  );
  process.exit(1);
}

const destino = join(dirname(caminho), basename(caminho, extname(caminho)) + ".roteiro.json");
writeFileSync(destino, JSON.stringify({ arquivo: basename(caminho), ...r.meta, roteiro: r.dados }, null, 2), "utf8");

const d = r.dados;
console.log("\n" + "─".repeat(70));
console.log("FORMATO QUE FUNCIONOU: " + r.meta.forma + "  (modelo " + r.meta.modelo + ")");
console.log("É este que entra em lib/ia/modelo.ts, com asserção no npm run verificar.");
console.log("─".repeat(70));
console.log("\nTítulo:  " + d.titulo);
console.log("Pilar:   " + d.pilar + "    Formato: " + d.formato);
console.log("Local:   " + (d.local_observado || "(não deu pra ver)") + "    Duração: " + d.duracao_segundos + "s");
console.log("Tokens:  " + r.meta.tokens.entrada + " entrada / " + r.meta.tokens.saida + " saída");
console.log("\nFalas (" + (d.falas?.length ?? 0) + "):\n");
for (const [i, f] of (d.falas ?? []).entries()) {
  console.log("  " + String(i + 1).padStart(2) + ". [" + (f.funcao || "?").padEnd(8) + "] " + f.texto);
  const cena = [f.enquadramento, f.cenario, f.acao].filter(Boolean).join(" · ");
  if (cena) console.log("       " + cena);
  if (f.texto_tela) console.log("       tela: " + f.texto_tela);
}
console.log("\nSalvo em: " + destino);
console.log(
  "\nConfira contra o vídeo antes de qualquer coisa ir pro banco. O que mais\nimporta olhar: se as falas são as PALAVRAS DELA ou uma versão melhorada, e\nse alguma cena foi inventada.\n",
);
