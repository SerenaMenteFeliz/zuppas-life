import "server-only";
import {
  classificarFalha,
  extrairTexto,
  lerChaves,
  ordemDeTentativas,
  proximoResetPacifico,
} from "@/lib/ia/cascata";
import { baldesEsgotados, marcarBalde, registrar } from "@/lib/registros";

export { proximoResetPacifico };

/* A única porta do app pra qualquer modelo de linguagem.

   TUDO passa por `chamarModelo`. Isso é a contrapartida de ter escolhido o
   Gemini agora sabendo que o destino é o Claude (Yan, 22/08/2026): enquanto a
   chamada nascer só aqui, trocar de provedor é este arquivo e uma env var. Se
   `fetch` pra IA começar a nascer solto nas telas, essa saída se fecha sem
   ninguém perceber, exatamente o que lib/conteudo.ts evita pro banco.

   ── As duas dimensões de fallback, e por que a ordem importa ──

   No free tier do Gemini a cota é **por modelo, não por chave**: cada modelo
   Flash tem 20 requisições/dia e cada Flash Lite tem 500, tudo na mesma chave.
   Medido na conta do Yan em 22/08/2026, na tela de limites do AI Studio (e não,
   não são os "1.500 RPD" que artigos genéricos repetem: esse número não vale
   mais pros Flash atuais).

   Consequência prática: **a cascata de modelo rende mais que a rotação de
   chave.** Uma chave só já dá 100 chamadas/dia somando os cinco Flash.

   A varredura é **conta dentro do modelo**, nunca o contrário: gasta o 3.7 nas
   três chaves antes de aceitar o 3.6. É isso que faz "sempre o melhor modelo
   disponível" ser verdade em vez de slogan.

   ── Cascata separada por tarefa, e isso não é detalhe ──

   Importar é tarefa mecânica (classificar texto que já existe) e roda nos Flash
   Lite. Gerar precisa dos Flash bons. Cascata única faria uma tarde de
   importação comer a cota de gerar, e o modo de falha seria a Ge tentando gerar
   às 20h e recebendo o modelo mais fraco sem saber disso.

   Por isso a cascata de Importar termina no 2.5 Flash, o mais antigo: ela tem
   pra onde cair se os Lite acabarem, mas nunca encosta no 3.7.

   ── Sem contador, com marcação reativa ──

   Não existe contador local (decisão do Yan). Contador local desincroniza do
   contador do Google (requisição que falhou pode ter contado lá, chamada da
   mesma chave feita de outro lugar não passa por aqui, e o reset é no fuso
   deles). Contador dessincronizado é pior que contador nenhum, porque mente com
   confiança.

   O que existe é: tenta, e se voltar 429, marca o balde como esgotado até o
   reset e passa pro próximo. **A marcação é otimização, nunca bloqueio**: se
   todos os baldes estiverem marcados, a última volta tenta assim mesmo. Se a
   hipótese do reset estiver errada, o custo é uma requisição desperdiçada, não
   um dia sem IA. */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/* ── Modelos ──────────────────────────────────────────────────────────────────

   Os ids abaixo foram **confirmados por chamada real em 22/08/2026**, não
   derivados dos nomes de exibição da tela de limites. A diferença importou:
   `gemini-3-flash`, que a tela chama de "Gemini 3 Flash", **não existe** como
   id e devolveu 404 ("Did you mean 'gemini-3.6-flash'?"). Saiu da lista.

   Os outros seis responderam, com o enum do schema respeitado. */

/** Os Flash bons. Melhor primeiro. 20 requisições/dia cada, por chave. */
const FLASH = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"] as const;

/** Os Lite. 500/dia cada, por chave. Bons o bastante pra classificar texto. */
const LITE = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

export type Tarefa = "importar" | "gerar";

const CASCATA: Record<Tarefa, readonly string[]> = {
  /* Termina no 2.5 Flash e não nos bons: rede de segurança sem encostar na
     cota que o Gerar precisa. */
  importar: [...LITE, "gemini-2.5-flash"],
  /* Cai pros Lite no fim porque roteiro fraco é melhor que nenhum roteiro, e a
     tela diz qual modelo escreveu. */
  gerar: [...FLASH, ...LITE],
};

/* ── Chaves ─────────────────────────────────────────────────────────────────── */

/* A leitura e a rotulagem vivem em lib/ia/cascata.ts, junto com o resto das
   decisões puras, pra que `npm run verificar` alcance. Aqui fica só o acesso à
   variável de ambiente. Contas descartáveis, nunca as que seguram e-mail do
   negócio (ressalva registrada no vault). */
type Chave = { rotulo: string; valor: string };

function chaves(): Chave[] {
  return lerChaves(process.env.GEMINI_KEYS);
}

export function temChaves(): boolean {
  return chaves().length > 0;
}

/* ── A chamada ──────────────────────────────────────────────────────────────── */

export type PedidoModelo = {
  tarefa: Tarefa;
  instrucaoSistema: string;
  entrada: string;
  /* Schema JSON do que se espera de volta. Ver lib/ia/esquemas.ts. */
  schema: Record<string, unknown>;
  temperatura?: number;
  /* Quanto o modelo pensa antes de responder. Classificar não precisa; escrever
     na voz de alguém precisa. */
  raciocinio?: "low" | "medium" | "high";
  /* Só pra log: a que post isso se refere. */
  refId?: string | null;
};

export type RespostaModelo = {
  dados: unknown;
  modelo: string;
  chave: string;
  tentativas: number;
  duracaoMs: number;
  tokens: { entrada: number | null; saida: number | null };
};

/* Teto por tentativa.

   Medido em 22/08/2026 no probe: o mesmo pedido curto levou 0,9s no
   3.5-flash-lite, 2,3s no 2.5-flash, 4,1s no 3.7-flash e **79,5s no
   3.5-flash**. Ou seja, a variação entre modelos é de quase cem vezes, e não é
   previsível.

   Sem teto, uma tentativa lenta pode estourar o limite de duração da função na
   Vercel, e aí a pessoa recebe erro de plataforma em vez de "não deu, tenta de
   novo". Com teto, a cascata desiste daquele modelo e vai pro próximo, que é o
   comportamento que ela já sabe ter.

   45s deixa espaço pra uma segunda tentativa caber dentro de um limite de 60s,
   que é o piso comum. O custo de abortar é a cota já gasta naquela chamada. */
const TETO_POR_TENTATIVA_MS = 45_000;

export class ErroModelo extends Error {
  constructor(
    message: string,
    readonly detalhe: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ErroModelo";
  }
}

type Falha = { modelo: string; chave: string; status: number; corpo: string };

/** Chama o melhor modelo disponível pra tarefa e devolve o JSON já parseado.

    Levanta `ErroModelo` quando nenhuma combinação de modelo e chave respondeu.
    Levantar é o certo aqui: quem chama é uma tela em que alguém está esperando,
    e falhar em silêncio devolvendo vazio faria a Ge achar que o roteiro dela não
    tinha nada de aproveitável. */
export async function chamarModelo(p: PedidoModelo): Promise<RespostaModelo> {
  const inicio = Date.now();
  const lista = chaves();

  if (lista.length === 0) {
    throw new ErroModelo(
      "A IA ainda não está ligada: falta configurar as chaves do Gemini (GEMINI_KEYS).",
      { motivo: "sem-chave" },
    );
  }

  /* Escape hatch de desenvolvimento. Sem ele, testar local queima a cota dos
     Flash que a Ge usa: são 20/dia, e uma tarde de testes come tudo. */
  const forcado = process.env.GEMINI_MODELO_DEV;
  const modelos = forcado ? [forcado] : CASCATA[p.tarefa];

  const esgotados = await baldesEsgotados();
  const mortas = new Set<string>();
  const falhas: Falha[] = [];
  let tentativas = 0;

  /* A ORDEM é decidida por lib/ia/cascata.ts, que é puro e coberto por
     `npm run verificar`. Aqui fica só a execução dela. */
  const porRotulo = new Map(lista.map((c) => [c.rotulo, c]));

  for (const balde of ordemDeTentativas(
    modelos,
    lista.map((c) => c.rotulo),
    esgotados,
  )) {
    /* Chave recusada por credencial sai do rodízio pro resto DESTA chamada.
       Sem isso, ela seria tentada de novo em cada modelo da cascata, gastando
       uma ida à rede por vez pra receber o mesmo 403. */
    if (mortas.has(balde.chave)) continue;
    const chave = porRotulo.get(balde.chave);
    if (!chave) continue;

    tentativas += 1;
    const r = await tentar(balde.modelo, chave, p);

    if (r.tipo === "ok") {
      return {
        dados: r.dados,
        modelo: balde.modelo,
        chave: chave.rotulo,
        tentativas,
        duracaoMs: Date.now() - inicio,
        tokens: r.tokens,
      };
    }

    falhas.push({ modelo: balde.modelo, chave: chave.rotulo, status: r.status, corpo: r.corpo });

    if (r.tipo === "cota") {
      await marcarBalde(chave.rotulo, balde.modelo, proximoResetPacifico(), "429");
      continue;
    }

    if (r.tipo === "chave-morta") {
      /* Credencial, não limite. Tratar como limite faria o sistema tentar pra
         sempre e nunca avisar, e a rotação esconderia a queda até a última
         chave morrer. Por isso vira registro de ERRO, não linha de info. */
      mortas.add(chave.rotulo);
      await registrar({
        area: "ia",
        acao: "chave-morta",
        nivel: "erro",
        mensagem:
          "A " +
          chave.rotulo +
          " foi recusada pelo Google (HTTP " +
          r.status +
          "). Ela saiu do rodízio até ser trocada.",
        detalhe: { chave: chave.rotulo, status: r.status, corpo: r.corpo.slice(0, 300) },
      });
      continue;
    }

    /* `falhou`: id de modelo errado (404), indisponibilidade momentânea (5xx)
       ou resposta ilegível. Só passa adiante. */
  }

  const duracaoMs = Date.now() - inicio;
  await registrar({
    area: "ia",
    acao: p.tarefa,
    nivel: "erro",
    mensagem: "Nenhum modelo respondeu em " + tentativas + " tentativas.",
    detalhe: { falhas: falhas.slice(0, 12), chavesMortas: [...mortas] },
    refTipo: "post",
    refId: p.refId ?? null,
    duracaoMs,
  });

  const soCota = falhas.length > 0 && falhas.every((f) => f.status === 429);
  throw new ErroModelo(
    soCota
      ? "A cota de hoje acabou em todos os modelos. Ela volta na virada do dia."
      : "Nenhum modelo respondeu agora. Veja a aba Registros pro detalhe.",
    { tentativas, falhas: falhas.slice(0, 12) },
  );
}

type Resultado =
  | { tipo: "ok"; dados: unknown; tokens: { entrada: number | null; saida: number | null } }
  | { tipo: "cota" | "chave-morta" | "falhou"; status: number; corpo: string };

async function tentar(modelo: string, chave: Chave, p: PedidoModelo): Promise<Resultado> {
  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": chave.valor,
      },
      body: JSON.stringify({
        model: modelo,
        system_instruction: p.instrucaoSistema,
        input: p.entrada,
        /* `store: false` porque não há motivo pra pedir que o Google guarde a
           interação. No tier gratuito o conteúdo já pode ser usado pra treino e
           passar por revisor humano (limite conhecido e aceito pra roteiro de
           Reel); pedir armazenamento por cima disso seria escolha, não limite. */
        store: false,
        generation_config: {
          temperature: p.temperatura ?? 0.7,
          thinking_level: p.raciocinio ?? "low",
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: p.schema,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TETO_POR_TENTATIVA_MS),
    });
  } catch (e) {
    /* Rede caiu, ou o teto por tentativa estourou. Nos dois casos é falha
       DAQUELA tentativa, não de credencial: a cascata segue pro próximo. */
    const erro = e instanceof Error ? e.message : "erro de rede";
    const demorou = e instanceof Error && e.name === "TimeoutError";
    return {
      tipo: "falhou",
      status: 0,
      corpo: demorou ? "passou de " + TETO_POR_TENTATIVA_MS / 1000 + "s sem responder" : erro,
    };
  }

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    return {
      tipo: classificarFalha(resp.status, corpo),
      status: resp.status,
      corpo: corpo.slice(0, 600),
    };
  }

  const bruto = await resp.text();
  const texto = extrairTexto(bruto);
  if (texto === null) {
    return { tipo: "falhou", status: resp.status, corpo: "resposta sem texto: " + bruto.slice(0, 300) };
  }

  /* O envelope carrega a contagem de tokens, e ela é lida DAQUI e não do texto:
     o texto é o roteiro, o envelope é a nota fiscal. */
  let envelope: unknown = null;
  try {
    envelope = JSON.parse(bruto);
  } catch {
    /* `extrairTexto` já parseou com sucesso pra chegar até aqui, então isto não
       deveria acontecer. Se acontecer, some só a contagem de tokens do log. */
  }

  try {
    return { tipo: "ok", dados: JSON.parse(texto), tokens: tokensDe(envelope) };
  } catch {
    /* Com `response_format` isto não deveria acontecer, e se acontecer é do
       modelo, não do transporte: cai como falha e a cascata tenta o próximo. */
    return { tipo: "falhou", status: resp.status, corpo: "JSON inválido: " + texto.slice(0, 300) };
  }
}

/** Quanto de tokens a resposta reportou.

    Os nomes vieram de resposta real (22/08/2026): o envelope traz
    `usage.total_input_tokens` e `usage.total_output_tokens`. **Nenhum dos nomes
    que eu tinha chutado existia** (`input_tokens`, `prompt_tokens`,
    `promptTokenCount`), então isto teria logado `null` pra sempre sem nada
    acusar. Os alternativos ficam como rede pra caso a API mude de novo.

    Só pra log: número faltando aqui nunca pode derrubar uma importação. */
export function tokensDe(envelope: unknown): { entrada: number | null; saida: number | null } {
  const o = (envelope ?? {}) as Record<string, unknown>;
  const uso = (o.usage ?? o.usage_metadata ?? o.usageMetadata ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    entrada: n(uso.total_input_tokens ?? uso.input_tokens ?? uso.promptTokenCount),
    saida: n(uso.total_output_tokens ?? uso.output_tokens ?? uso.candidatesTokenCount),
  };
}
