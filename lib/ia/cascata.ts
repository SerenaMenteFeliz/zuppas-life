/* As decisões puras da camada de modelo, separadas do que fala com a rede.

   Por que existir um arquivo só pra isso: `tsc` e `eslint` provam que o código
   compila, e não provam nada sobre a ORDEM em que os modelos são tentados, nem
   sobre o que conta como chave morta. As duas coisas são fáceis de quebrar sem
   nada acusar, e quebrar a primeira significa gastar a cota do melhor modelo
   com tarefa mecânica, calada.

   Sem nenhum import de propósito: assim `npm run verificar` compila e roda este
   arquivo sozinho, sem `server-only` e sem alias de caminho no meio.

   Quem usa isto é lib/ia/modelo.ts, que fica só com o `fetch` e o loop. */

export type Balde = { modelo: string; chave: string };

/** A ordem exata em que os baldes vão ser tentados.

    ── A regra que importa: conta DENTRO do modelo ──

    Percorre todas as chaves do 3.7 antes de aceitar o 3.6, e não o contrário.
    É isso que faz "sempre o melhor modelo disponível" ser verdade em vez de
    slogan: invertendo, uma chave que estourasse levaria a chamada pro modelo
    pior mesmo havendo outra chave com o modelo bom disponível.

    ── Duas voltas, e a segunda é a que impede o sistema de se trancar ──

    Na primeira volta, balde marcado como esgotado é pulado. Na segunda, só os
    que foram pulados são tentados assim mesmo.

    A segunda existe porque a marcação é PALPITE sobre o contador do Google (a
    gente marca até a virada do dia no Pacífico, e essa hipótese pode estar
    errada). Palpite errado não pode virar "hoje não tem IA": no pior caso
    gasta-se uma requisição que volta 429, e a marcação continua valendo. */
export function ordemDeTentativas(
  modelos: readonly string[],
  chaves: readonly string[],
  esgotados: ReadonlySet<string>,
): Balde[] {
  const ordem: Balde[] = [];

  for (const modelo of modelos) {
    for (const chave of chaves) {
      if (!esgotados.has(chave + "|" + modelo)) ordem.push({ modelo, chave });
    }
  }
  /* Segunda volta: só o que foi pulado. Repetir o que já falhou agora há pouco
     seria gastar latência por nada. */
  for (const modelo of modelos) {
    for (const chave of chaves) {
      if (esgotados.has(chave + "|" + modelo)) ordem.push({ modelo, chave });
    }
  }

  return ordem;
}

export type TipoDeFalha = "cota" | "chave-morta" | "falhou";

/** O que fazer com uma resposta que não veio OK.

    A distinção que não pode errar é 429 contra credencial:

    - **429 é limite**: esperado, temporário, marca o balde e segue.
    - **chave morta** precisa de gente. Tratar como limite faz o sistema tentar
      pra sempre e nunca avisar, e a rotação de chave esconderia a queda até a
      última conta morrer, provavelmente com alguém na frente da tela.

    O Google responde 400 com API_KEY_INVALID em alguns casos, em vez de 401.
    Um 400 genérico cairia em "tenta o próximo modelo", e aí uma chave revogada
    consumiria a cascata inteira a cada chamada, em silêncio. Daí a checagem do
    corpo, e não só do status. */
export function classificarFalha(status: number, corpo: string): TipoDeFalha {
  if (status === 429) return "cota";
  if (status === 401 || status === 403) return "chave-morta";
  if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(corpo)) return "chave-morta";
  return "falhou";
}

/** Próxima meia-noite no fuso do Pacífico, que é quando a cota diária do
    Google vira.

    Busca binária em cima do `Intl` em vez de somar offset à mão: offset muda
    com horário de verão, e somar "-8h" acerta metade do ano. Converge no
    minuto em ~15 passos. */
export function proximoResetPacifico(agora: Date = new Date()): Date {
  const dia = (d: Date) =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const hoje = dia(agora);
  let baixo = agora.getTime();
  let alto = agora.getTime() + 26 * 3_600_000;

  while (alto - baixo > 60_000) {
    const meio = Math.floor((baixo + alto) / 2);
    if (dia(new Date(meio)) === hoje) baixo = meio;
    else alto = meio;
  }
  return new Date(alto);
}

/** Lê `GEMINI_KEYS` e devolve os rótulos e valores.

    Lista separada por vírgula numa variável só, e não GEMINI_KEY_1/2/3: crescer
    é editar uma variável, não mexer no código.

    O RÓTULO é o que vai pra log e pra banco. A chave em si nunca sai da camada
    de rede: log com credencial dentro é credencial vazada com um passo a mais. */
export function lerChaves(bruto: string | undefined): { rotulo: string; valor: string }[] {
  return (bruto ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k !== "")
    .map((valor, i) => ({ rotulo: "chave-" + (i + 1), valor }));
}

/** Acha o texto da resposta do endpoint `/interactions`.

    `output_text` é a propriedade de conveniência documentada. Os outros
    caminhos ficam como rede porque esta API é nova o bastante pra ainda estar
    mudando de forma, e uma quebra aqui apareceria como "a IA parou de
    funcionar" sem nenhuma pista de por quê. */
export function extrairTexto(bruto: string): string | null {
  let o: unknown;
  try {
    o = JSON.parse(bruto);
  } catch {
    return null;
  }

  const cavar = (v: unknown): string | null => {
    if (typeof v === "string") return v !== "" ? v : null;
    if (Array.isArray(v)) {
      for (const item of v) {
        const achado = cavar(item);
        if (achado) return achado;
      }
      return null;
    }
    if (v && typeof v === "object") {
      const r = v as Record<string, unknown>;
      for (const campo of ["output_text", "text", "content", "parts", "steps", "output"]) {
        if (campo in r) {
          const achado = cavar(r[campo]);
          if (achado) return achado;
        }
      }
    }
    return null;
  };

  return cavar(o);
}
