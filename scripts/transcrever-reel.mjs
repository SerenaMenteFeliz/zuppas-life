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

/* Imagem entra junto com vídeo (23/08): parte dos posts da Ge é imagem ou
   vídeo de banco com o texto por cima, e nesses o roteiro dela é o texto da
   tela. São os mais fáceis de conseguir e não podiam ser os únicos de fora. */
const MIMES = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const mime = MIMES[extname(caminho).toLowerCase()];
if (!mime) {
  console.error(
    "Extensão não reconhecida: " + extname(caminho) + ". Esperado .mp4, .mov, .webm, .m4v, .jpg, .png ou .webp.",
  );
  process.exit(1);
}
const ehImagem = mime.startsWith("image/");

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
    /* ── Duas perguntas que eu tinha juntado numa só, e não são a mesma ──

       A 1ª versão deste esquema tinha um campo `cena_real` que perguntava
       "ela gravou isso num lugar real dela?". Ele errou feio no 2º vídeo
       testado (23/08/2026): um post de paisagem com texto por cima voltou
       classificado como banco de imagem, e as imagens eram praia com costão,
       pôr do sol num píer e vista de montanha, tudo lugar concreto e
       provavelmente filmado pela própria família em Ubatuba.

       A causa foi juntar "tem gente na câmera?" com "de onde veio a imagem?".
       Sem pessoa no quadro, o campo caía pra "banco" por reflexo, e junto ia
       o `local_observado`, que naquele post era a informação mais valiosa que
       existia: prova de que ela TEM material de praia e de montanha.

       Separado, cada pergunta é respondível. E a de origem ganhou o
       "indefinido", que é o valor honesto na maioria dos casos: dá pra ver que
       é uma praia, não dá pra ver quem filmou. */
    pessoa_na_camera: e(["sim", "nao"], "Aparece uma pessoa falando ou atuando no vídeo?"),
    /* `indefinido` existe e é o padrão esperado: princípio 12 do vault, campo
       vazio (ou marcado como incerto) é melhor que campo preenchido por
       palpite, porque o vazio pede que alguém preencha e o palpite ensina a
       desconfiar da ferramenta inteira. Só `gravada` CONFIRMADA POR GENTE pode
       alimentar o catálogo de cenas. */
    origem_imagem: e(
      ["gravada", "banco", "indefinido"],
      'De onde vem a imagem. "gravada" só se for um lugar concreto e específico que dá pra reconhecer (uma praia com formação identificável, um cômodo de casa, uma rua). "banco" só se for claramente stock ou arte genérica: fundo abstrato, textura, gradiente, ilustração, cena de estúdio impessoal. "indefinido" em qualquer dúvida, e é o valor certo na maioria dos casos.',
    ),
    /* Não existe no esquema do app: lá o local é escolhido pela pessoa antes
       de gerar. Aqui ele é lido do que aparece na imagem, e é justamente um
       dos ganhos do backfill: é assim que se descobre que ela já tem material
       de praia e de montanha, os dois locais mais caros da ficha. */
    local_observado: e(
      LOCAIS,
      'Qual destes locais aparece na imagem. Vale mesmo sem ninguém na tela: paisagem de praia é "praia", mata e serra é "montanha". Vazio só se não der pra dizer, ou se a imagem for de banco.',
    ),
    /* Idem: só faz sentido em material já publicado. Serve pra conferir a
       transcrição contra a duração real antes de aceitar. */
    duracao_segundos: { type: "number", description: "Duração aproximada do vídeo em segundos." },
    /* ── A manchete, e o dia inteiro que ela custou pra aparecer ──

       Achado em 23/08/2026 conferindo por que uma linha sumia da transcrição.
       A hipótese era omissão do modelo. Um frame do segundo zero mostrou que
       não: "Você mal lembra o que fez ontem e isso já devia te assustar" é um
       TÍTULO FIXO no topo do quadro, parado do início ao fim, enquanto a
       legenda queimada embaixo acompanha o que ela fala. Ela nunca diz essa
       frase. O modelo estava certo em começar a transcrição depois dela.

       São três camadas de texto num Reel dela, e eu tinha modelado uma:

         1. o que ela FALA               → `texto` da fala
         2. a legenda queimada da fala   → descartada, é duplicata da 1
         3. a MANCHETE parada na tela    → não tinha onde morar, sumia

       A 3 é a copy mais cara do vídeo: é o que segura quem ia passar direto,
       escrita pra ser lida em meio segundo. Perder justamente ela numa ficha
       que existe pra aprender a escrever gancho seria o erro mais caro
       possível, e ele estava acontecendo em silêncio.

       Fica no post e não na fala porque é uma por vídeo e não acompanha o
       corte: ela fica lá enquanto as falas passam por baixo. */
    texto_fixo_na_tela: t(
      "A manchete escrita na tela que fica PARADA no quadro enquanto o vídeo corre, geralmente no topo, independente do que está sendo falado. NÃO é a legenda da fala (essa muda junto com a voz e não conta aqui). Transcreva exatamente como está escrita. Vazio se não houver.",
    ),
    /* Fato sobre o post, não sobre cada fala.

       A Ge queima legenda em tudo, e isso é observação real sobre o estilo
       dela que vale guardar. O que não vale é guardar doze vezes dentro de
       `texto_tela`, que quer dizer outra coisa. Um campo aqui em cima diz o
       mesmo e não estraga o outro. */
    legenda_queimada: e(
      ["sim", "nao"],
      "A transcrição do que é falado aparece escrita na tela ao longo do vídeo (legenda queimada)?",
    ),
    /* O campo que decide se a guarda de legenda pode disparar.

       Achado no 2º vídeo (23/08/2026): num post sem ninguém falando, o texto
       da tela É o roteiro, e ele cai em `texto` por desenho. A guarda então
       via `texto_tela` igual a `texto` e apagava os dois... quer dizer, apagava
       o `texto_tela` de um texto que era autoral, não legenda. Ela zerou as 5
       falas de um post em que não havia legenda nenhuma pra limpar.

       Legenda só existe onde há fala. Sem este campo a guarda não tem como
       saber a diferença, porque a comparação de strings é idêntica nos dois
       casos.

       Serve também pra ficha: texto escrito e texto falado são registros
       diferentes, e misturar os dois numa amostra de voz esconde justamente o
       que a pessoa faz diferente em cada um. */
    voz: e(
      ["falada", "texto-na-tela", "ambos"],
      'Como o conteúdo chega: "falada" quando alguém fala, "texto-na-tela" quando ninguém fala e a mensagem está escrita, "ambos" quando há fala E texto autoral separado dela.',
    ),
    falas: {
      type: "array",
      description:
        "O que foi realmente dito, uma entrada por frase falada, na ordem. Frase com várias orações vira várias entradas: a gravação é frase por frase.",
      items: {
        type: "object",
        properties: {
          /* "dita OU escrita" e não só "dita": em post de fundo com texto por
             cima, o roteiro dela É o texto da tela, e ele é a amostra mais
             pura da escrita dela justamente por ser escrito, não falado. Se
             caísse só em `texto_tela`, o roteiro voltaria com `texto` vazio em
             todas as falas e a ficha não aprenderia nada desses posts. */
          texto: t(
            "A frase EXATA, palavra por palavra: o que foi dito em voz alta, ou, quando ninguém fala, o que está escrito na tela. Não corrija, não melhore, não resuma. Se ela repetiu ou gaguejou, transcreva como saiu.",
          ),
          funcao: e(
            FUNCOES,
            "Que trabalho esta frase faz na história: gancho segura quem ia passar, contexto situa a dor, virada muda a cabeça, prova sustenta, cta faz o único pedido.",
          ),
          enquadramento: t("Como a câmera vê NESTA fala, pelo que aparece na imagem. Ex: close, plano médio, de costas."),
          /* "descreva o que dá pra ver" e não "diga o cômodo": achado
             conferindo o primeiro teste contra um frame do vídeo, 23/08/2026.
             O modelo respondeu "quarto" numa rodada e "sala" em duas, e o
             quadro é uma parede lisa clara ao lado de um batente de porta, sem
             um móvel sequer. Não havia como saber o cômodo: ele estava
             adivinhando com confiança.

             Nome de cômodo adivinhado é pior que campo vazio aqui, porque é
             ele que entra no catálogo como "cena que funcionou" (princípio 12
             do vault). E a descrição física é mais útil de qualquer jeito:
             "parede lisa clara ao lado do batente" dá pra reproduzir amanhã,
             "sala" não diz onde apontar a câmera. */
          cenario: t(
            "Descreva o que aparece ATRÁS dela, fisicamente: parede lisa clara, canto com planta, bancada da cozinha, cabeceira da cama, batente de porta. NÃO adivinhe o nome do cômodo se não houver móvel ou objeto que prove qual é. NUNCA repita o nome do local em si. Vazio se o fundo não tiver nada identificável.",
          ),
          acao: t("O que ela está fazendo enquanto fala, pelo que aparece na imagem. Vazio quando ninguém aparece."),
          /* ── Vários b-rolls numa fala, e por que separados por ponto e vírgula ──

             Decidido com o Yan em 23/08/2026, ao perguntar como representar
             cena que muda várias vezes dentro de uma frase.

             A distinção que resolveu: `cenario` é onde a câmera está QUANDO ELA
             ATUA a fala, e é o que planeja o dia de gravação; `broll` é imagem
             que entra por cima e não exige ela presente. O video02 é 100%
             broll (ninguém atua, texto na tela, paisagens passando por baixo);
             o video01 é 100% atuação, sem broll nenhum.

             O Yan confirmou que fala bem dividida e curta não precisa de mais
             de uma TOMADA, só de mais de um b-roll. Então a fala continua
             sendo uma unidade de gravação, e só o broll vira lista.

             Ponto e vírgula em vez de coluna nova porque o painel renderiza
             `broll` como um input de texto: separado assim, os clipes aparecem
             e são editáveis hoje. Coluna nova sem UI seria dado invisível, que
             é o defeito que este painel passou o mês fechando. Vira estrutura
             de verdade quando a plataforma descongelar, e a conversão é um
             split. */
          broll: t(
            "Imagens que entram por cima da fala, na ordem, SEPARADAS POR PONTO E VÍRGULA. É aqui que vai toda paisagem, clipe ou imagem que passa enquanto o texto ou a voz corre, uma por trecho: 'praia com costão ao amanhecer; pôr do sol num píer; mar com neblina'. Vazio se a câmera só mostra a pessoa falando.",
          ),
          /* "além da legenda" e não só "o que aparece escrito": achado no
             primeiro teste real, 23/08/2026. A Ge queima legenda automática em
             todas as falas, então o campo voltou preenchido nas 12, idêntico ao
             `texto` em 9.

             No painel, `texto_tela` quer dizer escolha de design (o teste de
             22/08 registrou "texto na tela só onde ajuda, falas 1, 7 e 12").
             Carregar legenda aqui ensinaria a ficha que ela põe texto na tela
             em toda fala, e o Gerar passaria a propor isso sempre. Pior: no
             banco fica indistinguível de decisão deliberada. */
          texto_tela: t(
            "Texto AUTORAL na tela: título, palavra destacada, número, aviso. NÃO é a legenda do que está sendo dito. Se o que está escrito é só a transcrição da fala (legenda queimada), deixe VAZIO.",
          ),
          observacao: t("Tom, pausa ou intenção observada. Vazio quando não há nada a dizer."),
        },
        required: ["texto", "funcao", "enquadramento", "cenario", "acao", "broll", "texto_tela", "observacao"],
      },
    },
  },
  required: [
    "titulo",
    "formato",
    "pilar",
    "pessoa_na_camera",
    "origem_imagem",
    "local_observado",
    "duracao_segundos",
    "texto_fixo_na_tela",
    "legenda_queimada",
    "voz",
    "falas",
  ],
};

/* A guarda mecânica que sustenta a instrução acima.

   Mesmo raciocínio de `aprenderCenas` em lib/conteudo.ts: o schema pede a
   coisa certa e a guarda existe assim mesmo, porque saída de modelo não se
   garante por instrução. Ali era cena que só repetia o local; aqui é texto de
   tela que só repete a fala.

   Compara sem caixa, sem acento e sem pontuação: as três "diferenças" que
   apareceram no teste de 23/08 eram uma vírgula e duas maiúsculas. */
function ehSoALegenda(textoTela, texto) {
  const n = (s) =>
    (s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = n(textoTela);
  const b = n(texto);
  if (a === "" || b === "") return false;
  return a === b || b.includes(a) || a.includes(b);
}

/* A diferença inteira entre este prompt e o do Importar cabe numa frase: lá o
   modelo classifica texto que já existe, aqui ele é testemunha.

   A instrução insiste em "não melhore" porque o valor deste material é ser a
   voz real da Ge, e modelo de linguagem corrige gramática por reflexo.
   Transcrição embelezada ensinaria a ficha a escrever como o Gemini, não como
   ela, e ninguém perceberia lendo o resultado: ele sai bonito. */
const INSTRUCAO = `Você está analisando uma publicação já no ar de uma criadora brasileira, em português do Brasil.

Ela pode ser de dois tipos, e o tratamento muda:

A) ALGUÉM NA CÂMERA falando.
B) IMAGEM OU VÍDEO SEM NINGUÉM FALANDO, com a mensagem escrita na tela.

Sua tarefa é registrar o que ESTÁ LÁ, não propor nada.

Regras que não se negociam:
0. Um Reel pode ter TRÊS camadas de texto, e elas não se misturam: (a) o que a pessoa fala; (b) a legenda queimada, que acompanha a fala e é duplicata dela; (c) uma MANCHETE parada na tela, geralmente no topo, que fica ali enquanto o vídeo corre e quase nunca é falada em voz alta. A manchete vai em texto_fixo_na_tela, NUNCA vira uma fala.
1. Transcreva palavra por palavra. No tipo A, o que foi dito em voz alta. No tipo B, o que está escrito na tela. Não corrija gramática, não troque palavra por sinônimo melhor, não resuma, não junte frases. Se ela repetiu, repita. Se usou gíria, mantenha a gíria. Se tem erro de digitação na tela, mantenha o erro.
2. Uma entrada por frase. Frase com três orações vira três entradas. No tipo B, cada bloco de texto que aparece na tela é uma entrada, na ordem em que aparecem. Se o MESMO texto continua na tela enquanto a imagem de fundo muda, isso é UMA entrada só, não uma por imagem.
3. CENÁRIO e B-ROLL são coisas diferentes e o erro entre os dois é caro. Cenário é onde a pessoa está enquanto ATUA a fala: só preencha se ela aparece. B-roll é imagem que passa por cima sem ela: paisagem, clipe, foto. Num vídeo sem ninguém na tela, cenário e ação ficam VAZIOS e TUDO vai pra broll, separado por ponto e vírgula, na ordem em que as imagens aparecem. Se a mesma frase fica na tela enquanto passam quatro paisagens, é UMA fala com quatro b-rolls, nunca quatro falas.
4. Descreva o que aparece na imagem em enquadramento, cenário e ação, pelo que dá pra VER. Isso vale nos dois tipos: uma paisagem também é uma cena, e saber que a paisagem existe é informação útil. Se não der pra ver, deixe vazio. Nunca invente.
5. Em origem_imagem, o valor certo quase sempre é "indefinido". Uma paisagem bonita NÃO é banco de imagem só porque não tem gente nela: praia, mata, serra e rua são lugares concretos que alguém pode ter filmado. Só marque "banco" se for inequivocamente genérico: gradiente, textura, fundo abstrato, ilustração, cena de estúdio impessoal.
6. A função de cada fala é classificação sua e pode ser deduzida: identifique o trabalho que a frase faz na história.
7. Se for imagem parada, duracao_segundos é 0.`;

/* ── O probe ────────────────────────────────────────────────────────────────── */

/* ── O formato de entrada com arquivo, confirmado por chamada real ─────────────

   Descoberto em 23/08/2026, e nenhuma das 5 formas que eu tinha chutado estava
   certa. O que funciona:

     input: [
       { type: "text",  text: "..." },
       { type: "video", uri: "...", mime_type: "video/mp4" },
     ]

   Ou seja: os itens de conteúdo vão SOLTOS no topo do `input`, sem `role` e
   sem objeto de turno em volta. `input` como string, que é o que
   lib/ia/modelo.ts já usa, é o atalho de um item de texto só.

   As duas coisas que o probe derrubou, e a ordem em que ele derrubou:

   1. O `type` do item **não** é `file` nem `input_file`. Cada mídia tem o
      próprio tipo: `video`, `image`, `audio`, `document`. A API lista os
      aceitos na mensagem de erro, que foi o que resolveu.
   2. Envolver em `{ role, content }` (o formato de chat de sempre) é recusado
      com "use step_list input format instead of turn_list". Esse erro só
      apareceu DEPOIS do item de mídia estar certo, porque a validação para no
      primeiro problema: enquanto o `type` do item estava errado, o envelope
      errado ficava escondido atrás dele.

   O campo é `uri`, e não `file_uri` como no `generateContent` clássico. */
function entradaCom(uri) {
  return [
    { type: "text", text: INSTRUCAO },
    { type: ehImagem ? "image" : "video", uri, mime_type: mime },
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
    const t0 = Date.now();
    let resp;
    try {
      resp = await fetch(BASE + "/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          model: modelo,
          system_instruction: INSTRUCAO,
          input: entradaCom(uri),
          store: false,
          /* Temperatura no chão: aqui não se quer criatividade nenhuma, se
             quer a palavra que foi dita. */
          generation_config: { temperature: 0.1, thinking_level: "low" },
          response_format: { type: "text", mime_type: "application/json", schema: ESQUEMA },
        }),
        /* Bem mais folgado que os 45s do app: lá tem alguém esperando na tela
           e limite de duração de função na Vercel. Aqui é terminal, e vídeo
           leva mais que texto. */
        signal: AbortSignal.timeout(180_000),
      });
    } catch (err) {
      tentadas.push({ modelo, resultado: "rede/timeout: " + err.message });
      console.log("  ✗ " + modelo + " → " + err.message);
      continue;
    }

    const ms = Date.now() - t0;
    const bruto = await resp.text();

    if (!resp.ok) {
      let msg = bruto;
      try {
        msg = JSON.parse(bruto).error?.message ?? bruto;
      } catch {
        /* corpo não-JSON: fica o texto cru mesmo. */
      }
      tentadas.push({ modelo, resultado: "HTTP " + resp.status, corpo: msg.slice(0, 400) });
      console.log("  ✗ " + modelo + " → HTTP " + resp.status + ": " + msg.slice(0, 160));
      /* 403/401 é chave morta: nenhum outro modelo vai salvar, e insistir só
         esconde o problema atrás da rotação. Mesma distinção de
         lib/ia/cascata.ts. 429 é cota e o próximo modelo tem balde próprio. */
      if (resp.status === 403 || resp.status === 401) break;
      continue;
    }

    const texto = extrairTexto(bruto);
    if (texto === null) {
      tentadas.push({ modelo, resultado: "200 mas sem texto legível", corpo: bruto.slice(0, 400) });
      console.log("  ✗ " + modelo + " → 200 sem texto (a resposta mudou de forma?)");
      continue;
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      tentadas.push({ modelo, resultado: "JSON inválido", corpo: texto.slice(0, 400) });
      console.log("  ✗ " + modelo + " → devolveu texto que não é JSON");
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
    /* `input_tokens_by_modality` é novidade vista na resposta real de 23/08:
       separa quanto do custo foi mídia e quanto foi texto. Vale guardar, é o
       número que diz se o lote de 30 cabe na cota. */
    const porModalidade = Array.isArray(uso.input_tokens_by_modality) ? uso.input_tokens_by_modality : null;

    console.log("  ✓ " + modelo + " → " + (dados.falas?.length ?? 0) + " falas em " + (ms / 1000).toFixed(1) + "s");
    return {
      dados,
      meta: {
        modelo,
        duracaoMs: ms,
        tokens: {
          entrada: uso.total_input_tokens ?? uso.input_tokens ?? null,
          saida: uso.total_output_tokens ?? uso.output_tokens ?? null,
          porModalidade,
        },
        tentadas,
      },
    };
  }

  const erro = new Error("Nenhum modelo respondeu.");
  erro.tentadas = tentadas;
  throw erro;
}

/* ── Execução ───────────────────────────────────────────────────────────────── */

console.log(
  "\nArquivo: " + basename(caminho) + " (" + (tamanho / 1048576).toFixed(1) + " MB, " + (ehImagem ? "imagem" : "vídeo") + ")",
);
console.log("Chaves disponíveis: " + chaves.length + ", usando a chave-1");
console.log("\nSubindo pro Files API...");

const arquivo = await esperarAtivo(await subirArquivo());
console.log("  ✓ pronto: " + arquivo.uri);

/* ── Duas passadas, e a comparação entre elas ─────────────────────────────────

   Achado caro em 23/08/2026: uma das rodadas do 1º vídeo **perdeu a primeira
   fala**, o gancho, e nada acusou. 203 palavras contra 216, o que dá 169
   palavras por minuto: taxa de fala perfeitamente normal, então nenhum limite
   razoável de wpm pegaria.

   E a revisão humana também não pega. A página de revisão mostra o que ESTÁ na
   transcrição; ausência não aparece em lista nenhuma. O Yan leu e aprovou o
   texto sem o gancho, e não tinha como ser diferente.

   O que pega omissão é repetição independente. Duas passadas no mesmo vídeo,
   compara o texto das duas: o que aparece numa e não na outra é exatamente a
   classe de erro invisível. Custa uma chamada a mais por vídeo, e no Flash
   Lite (500/dia por chave, 3 chaves) isso é irrelevante mesmo pros 30.

   Não decide sozinho: escolhe a passada mais completa e IMPRIME o que a outra
   perdeu, porque a diferença também pode ser invenção da mais longa, e isso é
   julgamento de gente. */
function normalizar(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Frases que estão em `a` e não estão em `b`, comparando por conteúdo.

    Compara fala a fala e não palavra a palavra: a segmentação varia entre
    passadas (12, 13, 14 e 31 falas no mesmo vídeo), então diferença de corte
    apareceria como diferença de conteúdo o tempo todo. Uma fala conta como
    presente se o texto dela couber no texto corrido da outra passada. */
function faltandoEm(a, b) {
  const corridoB = normalizar((b.falas ?? []).map((f) => f.texto).join(" "));
  return (a.falas ?? [])
    .map((f) => f.texto)
    .filter((t) => {
      const n = normalizar(t);
      return n.length > 0 && !corridoB.includes(n);
    });
}

function palavras(d) {
  return normalizar((d.falas ?? []).map((f) => f.texto).join(" ")).split(" ").filter(Boolean).length;
}

console.log("\nTranscrevendo (2 passadas, pra pegar omissão):");
let r;
try {
  const p1 = await transcrever(arquivo.uri);
  const p2 = await transcrever(arquivo.uri);

  const n1 = palavras(p1.dados);
  const n2 = palavras(p2.dados);
  const perdidoPor2 = faltandoEm(p1.dados, p2.dados);
  const perdidoPor1 = faltandoEm(p2.dados, p1.dados);

  console.log("  passada 1: " + (p1.dados.falas?.length ?? 0) + " falas, " + n1 + " palavras");
  console.log("  passada 2: " + (p2.dados.falas?.length ?? 0) + " falas, " + n2 + " palavras");

  r = n2 > n1 ? p2 : p1;
  const soNaOutra = n2 > n1 ? perdidoPor1 : perdidoPor2;
  r.meta.passadas = { falas1: p1.dados.falas?.length ?? 0, falas2: p2.dados.falas?.length ?? 0, palavras1: n1, palavras2: n2 };
  r.meta.escolhida = n2 > n1 ? 2 : 1;

  if (soNaOutra.length > 0) {
    r.meta.soNaOutraPassada = soNaOutra;
    console.log("\n  ⚠ As duas passadas discordam. Fiquei com a mais completa (passada " + r.meta.escolhida + ").");
    console.log("    A outra tinha " + soNaOutra.length + " trecho(s) que esta não tem:");
    for (const t of soNaOutra.slice(0, 8)) console.log("      · " + t);
    console.log("    Confira estes contra o vídeo: ou a escolhida perdeu, ou a outra inventou.");
  }
} catch (err) {
  console.error("\n" + err.message + "\n");
  console.error(JSON.stringify(err.tentadas ?? [], null, 2));
  console.error(
    "\nO que isso quer dizer: nenhuma das 5 formas candidatas foi aceita. O corpo\ndas respostas acima é o que diz a forma certa. Não é pra insistir no escuro:\ncada tentativa custa cota.\n",
  );
  process.exit(1);
}

/* Aplica a guarda antes de gravar: o JSON que sai daqui é o que vai ser
   conferido e carregado, então ele já sai limpo. O contador é impresso porque
   um número alto aqui é sinal de que a instrução parou de pegar, e isso
   precisa ser visível num lote de 30, não descoberto depois.

   `voz !== "texto-na-tela"` é a condição que faltava na 1ª versão: onde
   ninguém fala não existe legenda, e o que parece duplicata é o roteiro
   autoral aparecendo nos dois campos por desenho. */
let legendasLimpas = 0;
if (r.dados.voz !== "texto-na-tela") {
  for (const f of r.dados.falas ?? []) {
    if (f.texto_tela && ehSoALegenda(f.texto_tela, f.texto)) {
      f.texto_tela = "";
      legendasLimpas += 1;
    }
  }
}

const destino = join(dirname(caminho), basename(caminho, extname(caminho)) + ".roteiro.json");
writeFileSync(
  destino,
  JSON.stringify({ arquivo: basename(caminho), ...r.meta, legendasLimpas, roteiro: r.dados }, null, 2),
  "utf8",
);

const d = r.dados;
console.log("\n" + "─".repeat(70));
console.log("Modelo: " + r.meta.modelo);
console.log("─".repeat(70));
console.log("\nTítulo:  " + d.titulo);
console.log("Pilar:   " + d.pilar + "    Formato: " + d.formato);
console.log(
  "Imagem:  " +
    (d.pessoa_na_camera === "sim" ? "pessoa na câmera" : "sem pessoa") +
    ", origem " +
    d.origem_imagem +
    (d.local_observado ? ", local " + d.local_observado : "") +
    "\n         " +
    (d.origem_imagem === "banco"
      ? "→ NÃO entra no catálogo de cenas"
      : "→ candidata ao catálogo, DEPOIS de você confirmar que é material dela"),
);
console.log("Voz:     " + d.voz);
console.log("Duração: " + d.duracao_segundos + "s    Tokens: " + r.meta.tokens.entrada + " entrada / " + r.meta.tokens.saida + " saída");
console.log("Legenda: " + (d.legenda_queimada === "sim" ? "queimada no vídeo" : "não") + (legendasLimpas > 0 ? "  (limpei " + legendasLimpas + " texto_tela que era só a legenda)" : ""));

/* Texto repetido em falas seguidas, que o schema não tem como impedir.

   Achado no 2º vídeo (23/08/2026): a mesma frase ficou na tela enquanto o
   fundo trocava de paisagem, e voltaram 3 falas idênticas, uma por imagem. A
   instrução pede uma entrada só nesse caso e não foi obedecida.

   Não corrijo automaticamente: juntar as 3 apagaria a informação de que
   existem 3 paisagens diferentes ali, e essa é justamente a parte cara de
   descobrir. Fica o aviso, e a decisão de juntar ou não é de quem confere. */
const repetidas = (d.falas ?? []).filter((f, i, todas) => i > 0 && f.texto.trim() === todas[i - 1].texto.trim()).length;
if (repetidas > 0) {
  console.log(
    "\n  ⚠ " +
      repetidas +
      " fala(s) repetem o texto da anterior. Provavelmente é um texto só\n    segurado enquanto a imagem de fundo troca. Ao carregar, decidir se vira\n    uma fala com várias cenas ou várias falas.",
  );
}
console.log("\nFalas (" + (d.falas?.length ?? 0) + "):\n");
for (const [i, f] of (d.falas ?? []).entries()) {
  console.log("  " + String(i + 1).padStart(2) + ". [" + (f.funcao || "?").padEnd(8) + "] " + f.texto);
  const cena = [f.enquadramento, f.cenario, f.acao].filter(Boolean).join(" · ");
  if (cena) console.log("       " + cena);
  if (f.texto_tela) console.log("       tela: " + f.texto_tela);
}
console.log("\nSalvo em: " + destino);
console.log(
  "\nConfira contra o original antes de qualquer coisa ir pro banco. O que mais\nimporta olhar: se as falas são as PALAVRAS DELA ou uma versão melhorada, e\nse alguma cena foi inventada.\n",
);
