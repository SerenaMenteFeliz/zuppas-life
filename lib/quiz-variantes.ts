import "server-only";

/* Variantes do quiz do Método Cálice (12/09/2026).

   A definição das telas mora no site do quiz, em `quiz/variantes.json` do
   `metodocalice-site`, e o painel LÊ de lá a cada carga. Não existe cópia aqui:
   até esta data havia (`QUIZ_STEP_LABELS`, a ordem das 18 telas escrita à
   mão), e ela passaria a mentir em silêncio no dia em que uma tela entrasse ou
   saísse, empurrando cada nome uma casa. Agora editar o JSON do quiz muda o
   preview e as etapas daqui assim que o deploy de lá fica pronto.

   Por que o arquivo mora no quiz e não aqui: o quiz público teria que
   consultar este painel (atrás da ADMIN_KEY) pra abrir a primeira tela, e a
   abertura já é a tela que mais perde gente. */

export const URL_QUIZ_CALICE = process.env.QUIZ_CALICE_URL ?? "https://metodocalice.serenamentefeliz.com";

export type StatusVariante = "ativa" | "rascunho" | "encerrada";

export type TelaQuiz = { id: string; rotulo: string; tipo: string };

export type VarianteQuiz = {
  id: string;
  nome: string;
  descricao?: string;
  status: StatusVariante;
  peso: number;
  telas: TelaQuiz[];
};

/** O resumo que o toggle do topo precisa (vai pro cliente). */
export type OpcaoVariante = { id: string; nome: string; descricao?: string; rotuloStatus: string };

/** A variante que existia antes de o quiz ter variantes. Os eventos dela
    gravados até 12/09/2026 não trazem `quiz_variant` nem `step_id`, então
    "sem variante" conta como ela, e a tela sai da posição (ver
    `TELAS_ANTES_DAS_VARIANTES` em `painel-funis.ts`). */
export const VARIANTE_LEGADO = "v1";

const ID_VALIDO = /^[a-z0-9-]{1,40}$/;

export async function carregarVariantesQuiz(): Promise<VarianteQuiz[] | null> {
  const resp = await fetch(`${URL_QUIZ_CALICE}/quiz/variantes.json`, { cache: "no-store" }).catch(() => null);
  if (!resp?.ok) return null;
  const dados = await resp.json().catch(() => null);
  const lista: unknown = dados?.variantes;
  if (!Array.isArray(lista) || lista.length === 0) return null;

  // Só o que o painel usa, e só se tiver cara de variante: um JSON quebrado no
  // quiz tem que virar aviso aqui, não tela branca.
  const variantes: VarianteQuiz[] = [];
  for (const v of lista) {
    if (!v || typeof v.id !== "string" || !ID_VALIDO.test(v.id) || !Array.isArray(v.telas)) continue;
    const telas = v.telas
      .filter((t: unknown): t is TelaQuiz => {
        const tela = t as Partial<TelaQuiz> | null;
        return !!tela && typeof tela.id === "string" && ID_VALIDO.test(tela.id) && typeof tela.rotulo === "string";
      })
      .map((t: TelaQuiz) => ({ id: t.id, rotulo: t.rotulo, tipo: String(t.tipo ?? "") }));
    variantes.push({
      id: v.id,
      nome: typeof v.nome === "string" ? v.nome : v.id,
      descricao: typeof v.descricao === "string" ? v.descricao : undefined,
      status: v.status === "ativa" || v.status === "encerrada" ? v.status : "rascunho",
      peso: typeof v.peso === "number" && v.peso > 0 ? v.peso : 0,
      telas,
    });
  }
  return variantes.length ? variantes : null;
}

/** A variante vende dentro do quiz, em vez de capturar e-mail?

    Vale pela TELA e não por uma flag à parte, porque a tela é o fato: uma
    variante com `tipo: "oferta"` termina num paywall e nunca chama o
    `api/subscribe`, então nenhum `lead_submitted` existe pra ela. O painel
    precisa saber disso pra não desenhar um funil que morre na terceira etapa
    e parecer queda de conversão. */
export function temOferta(variante: VarianteQuiz): boolean {
  return variante.telas.some((t) => t.tipo === "oferta");
}

/** A pedida na URL, senão a primeira ativa, senão a primeira da lista. */
export function escolherVariante(variantes: VarianteQuiz[], pedida?: string): VarianteQuiz {
  return (
    variantes.find((v) => v.id === pedida) ??
    variantes.find((v) => v.status === "ativa" && v.peso > 0) ??
    variantes[0]
  );
}

/** "no ar" quando é a única ativa, "50%" quando divide o tráfego. */
export function opcoesVariante(variantes: VarianteQuiz[]): OpcaoVariante[] {
  const ativas = variantes.filter((v) => v.status === "ativa" && v.peso > 0);
  const soma = ativas.reduce((s, v) => s + v.peso, 0);
  return variantes.map((v) => {
    let rotuloStatus: string = v.status;
    if (v.status === "ativa") {
      if (v.peso === 0) rotuloStatus = "sem tráfego";
      else if (ativas.length === 1) rotuloStatus = "no ar";
      else rotuloStatus = `${Math.round((v.peso / soma) * 100)}%`;
    }
    return { id: v.id, nome: v.nome, descricao: v.descricao, rotuloStatus };
  });
}
