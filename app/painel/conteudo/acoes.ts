"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aprenderCenas,
  atualizarPost,
  carregarPost,
  criarPost,
  excluirMetrica,
  excluirPost,
  marcarFalaGravada,
  salvarMetrica,
  salvarRoteiro,
} from "@/lib/conteudo";
import { statusVivo, type Fala } from "@/lib/conteudo-tipos";
import { hojeISO } from "@/lib/datas";

/* Mutações do painel de conteúdo.

   Server Action roda como POST contra a própria rota, então quem gate isso é
   o middleware.ts (matcher /painel/:path*), que já vale pra POST e não só pro
   GET da página. Mesmo assim, cada action valida o que recebe: a doc do Next
   é explícita em tratar action como porta de entrada não confiável, porque a
   requisição pode ser forjada sem passar pela tela. */

function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function numero(fd: FormData, campo: string): number | null {
  const t = texto(fd, campo);
  if (t === null) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/* Data de hoje SEMPRE por hojeISO() (fuso America/Sao_Paulo), nunca por
   `new Date().toISOString()`.

   Bug real pego testando ao vivo em 11/08 às 23h35: marcar o post como
   "postado" carimbou data_publicada = 12/08, porque em UTC o dia já tinha
   virado. Efeito prático: todo post marcado depois das 21h de Brasília cairia
   no dia seguinte no calendário, e postar à noite é o normal, não a exceção.
   É exatamente o deslocamento que lib/datas.ts existe pra resolver. */

/** Campo em branco vira NULL, nunca string vazia. Sem isso "nunca preenchi" e
    "preenchi e apaguei" ficam indistinguíveis no banco. */
function vazioNulo(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

/** Carimba `data_publicada` quando um post vira "postado", **sem sobrescrever
    data que já existe** (01/09/2026).

    O bug que isto conserta: as duas actions carimbavam `hojeISO()` toda vez que
    o status virava "postado", olhando só pra gravação atual. Bastava um post
    publicado em 20/08 voltar pra "Agendado" por engano e ser devolvido pro
    quadro: a data em que ele de fato saiu virava hoje, e não havia como
    recuperar. Mover card de coluna é o gesto mais frequente da tela, então
    "por engano" não é hipótese remota.

    `salvarDadosAcao` já dizia a regra certa por escrito ("se a pessoa preencheu
    à mão, a mão manda"), mas só checava o que vinha no mesmo salvamento, e o
    autosave manda só o campo mexido. A regra estava certa e a checagem, curta.

    Custa um GET a mais, e só quando um post entra em "postado". */
async function carimbarPublicacao(id: string, campos: Record<string, unknown>) {
  if (campos.status !== "postado" || "data_publicada" in campos) return;
  const atual = await carregarPost(id);
  if (!atual?.data_publicada) campos.data_publicada = hojeISO();
}

/* "Criar" é um clique só e nada mais (Yan, 21/08/2026). Antes era escrever o
   título, escolher perfil, escolher formato e só então criar: quatro gestos na
   frente de quem só quer anotar uma ideia antes de esquecer.

   O post nasce sem título e a tela de detalhe abre com o campo vazio e focado,
   onde ela escreve título, perfil, formato e já o roteiro no mesmo lugar.
   Custo assumido: clicar e sair deixa um "Sem título" no quadro. É barato de
   apagar e melhor que perder a ideia por causa de um formulário.

   O perfil vem do filtro ativo quando existe: filtrando por Ge e criando dali,
   o post nasce dela. */
export async function criarPostAcao(fd: FormData) {
  const post = await criarPost({
    titulo: "",
    perfil: texto(fd, "perfil") ?? "geovana",
    formato: null,
  });
  revalidatePath("/painel/conteudo");
  redirect("/painel/conteudo/" + post.id);
}

/* Recebe objeto e não FormData desde 21/08/2026: quem chama é o autosave, que
   não tem `<form>` sendo submetido, e montar um FormData falso só pra
   desmontar do outro lado seria cerimônia sem ganho.

   `produto`, `responsavel` e `referencia` saíram da tela em 21/08 e por isso
   não estão na lista abaixo. As COLUNAS continuam no banco de propósito: como
   o PATCH só toca o que recebe, o que estiver gravado nelas fica intacto, e
   trazer os campos de volta é mudança de tela, não migration.

   Lista explícita também porque a action é porta de entrada não confiável: sem
   ela, um payload forjado poderia escrever em qualquer coluna da tabela,
   inclusive `id` e `criado_em`. */
const CAMPOS_EDITAVEIS = [
  "titulo",
  "perfil",
  "formato",
  "pilar",
  "status",
  "data_planejada",
  "data_publicada",
  "link",
  "legenda",
  "hashtags",
  "observacao",
  /* Entrou em 22/08/2026 com a migration 0002. Local é o que faz a IA propor
     cena gravável em vez de cena bonita, e é o que deixa o quadro responder
     "por que quatro roteiros estão parados?" com "todos pedem praia". */
  "local",
] as const;

export type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number];

/** Salva SÓ os campos que a pessoa mexeu, e devolve a linha como ficou.

    Antes de 22/08/2026 mandava o formulário inteiro a cada autosave. Bastava
    uma segunda aba aberta com o post carregado meia hora antes: digitar um
    caractere lá reenviava os onze campos com os valores velhos e desfazia o
    que a outra aba tinha feito. Não precisa de duas pessoas nem de má sorte,
    só de uma aba esquecida.

    Mandando só o que mudou, duas abas só colidem se as duas mexerem no MESMO
    campo, que é a colisão que não tem como evitar e é a única que a pessoa
    entende quando acontece. */
export async function salvarDadosAcao(
  id: string,
  mudancas: Partial<Record<CampoEditavel, string>>,
) {
  if (!id) return null;

  const campos: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (!(campo in mudancas)) continue;
    const bruto = mudancas[campo];

    if (campo === "titulo") {
      /* Vazio continua vazio, e quem exibe resolve com tituloDe(). Carimbar
         "Sem título" aqui gravaria no banco um texto que ninguém escreveu. */
      campos.titulo = (bruto ?? "").trim();
    } else if (campo === "perfil") {
      campos.perfil = vazioNulo(bruto) ?? "liz";
    } else if (campo === "status") {
      campos.status = statusVivo(bruto);
    } else {
      campos[campo] = vazioNulo(bruto);
    }
  }

  if (Object.keys(campos).length === 0) return null;

  /* Carimba a data de publicação sozinho quando o status vira "postado" e
     ninguém preencheu a data. Sem isso o calendário perde o post exatamente no
     momento em que ele passa a ser o dado mais importante, que é o que de fato
     saiu. Se a pessoa preencheu à mão, a mão manda (ver `carimbarPublicacao`). */
  await carimbarPublicacao(id, campos);

  const atual = await atualizarPost(id, campos);

  /* Chegar a "gravado" é o momento em que a cena deixa de ser plano e vira
     fato: alguém apontou a câmera e ela funcionou. É a única prova que importa
     de que aquela cena é gravável naquele lugar, e é por isso que o catálogo
     aprende aqui e não no cadastro.

     Sem `await` de propósito: aprender é efeito colateral do trabalho dela, não
     o trabalho. Segurar a resposta do autosave por causa disso trocaria uma
     conveniência futura por lentidão agora. `aprenderCenas` já engole os
     próprios erros. */
  if (campos.status === "gravado" && atual?.local) {
    void aprenderCenas(id, atual.local);
  }

  revalidatePath("/painel/conteudo");
  revalidatePath("/painel/conteudo/" + id);
  return atual;
}

/** Troca só o status. Existe separada da action de salvar dados porque o
    quadro muda status sem abrir o post, e mandar o formulário inteiro dali
    apagaria todo campo que a tela do quadro não carrega. */
export async function mudarStatusAcao(id: string, novo: string) {
  if (!id) return;
  const status = statusVivo(novo);
  const campos: Record<string, unknown> = { status };
  await carimbarPublicacao(id, campos);
  await atualizarPost(id, campos);
  revalidatePath("/painel/conteudo");
  revalidatePath("/painel/conteudo/" + id);
}

export async function salvarRoteiroAcao(
  postId: string,
  falasJson: string,
  removidasJson: string,
) {
  if (!postId) return { criadas: [], deOutraAba: [] };

  /* Só id em formato de uuid entra na lista de apagar: ela vira um `id=in.(...)`
     concatenado na URL do PostgREST, e string arbitrária ali é injeção de
     filtro. A action é porta pública, então a validação mora aqui e não na
     tela que chama. */
  let removidas: string[] = [];
  try {
    const bruto = JSON.parse(removidasJson);
    if (Array.isArray(bruto)) {
      removidas = bruto.filter(
        (v): v is string =>
          typeof v === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      );
    }
  } catch {
    removidas = [];
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(falasJson);
  } catch {
    throw new Error("Roteiro veio num formato que o servidor não entendeu.");
  }
  if (!Array.isArray(bruto)) throw new Error("Roteiro veio num formato que o servidor não entendeu.");

  const falas: Fala[] = bruto.map((f, i) => {
    const o = (f ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : null);
    return {
      id: typeof o.id === "string" && o.id !== "" ? o.id : undefined,
      ordem: i + 1,
      texto: str("texto") ?? "",
      funcao: str("funcao"),
      enquadramento: str("enquadramento"),
      cenario: str("cenario"),
      acao: str("acao"),
      broll: str("broll"),
      texto_tela: str("texto_tela"),
      observacao: str("observacao"),
      gravada: o.gravada === true,
    };
  });

  const resultado = await salvarRoteiro(postId, falas, removidas);
  revalidatePath("/painel/conteudo/" + postId);
  revalidatePath("/painel/conteudo");
  return resultado;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marcar uma fala como gravada, da tela de gravação.

    Os dois ids são validados aqui e não na tela: eles entram num filtro do
    PostgREST montado por concatenação, e action é porta pública (a requisição
    pode ser forjada sem passar por tela nenhuma). Mesma regra da lista de
    apagar do `salvarRoteiroAcao`.

    Revalida a tela de gravação e a do post: as duas desenham o mesmo ✓, e a
    contagem "12 falas · 12 gravadas" do editor sai daí. */
export async function marcarFalaAcao(postId: string, falaId: string, gravada: boolean) {
  if (!UUID.test(postId) || !UUID.test(falaId)) return;
  await marcarFalaGravada(postId, falaId, gravada === true);
  revalidatePath("/painel/conteudo/" + postId);
  revalidatePath("/painel/conteudo/" + postId + "/gravar");
}

export async function salvarMetricaAcao(fd: FormData) {
  const postId = texto(fd, "post_id");
  if (!postId) return;
  const coletadoEm = texto(fd, "coletado_em") ?? hojeISO();

  await salvarMetrica(postId, coletadoEm, {
    views: numero(fd, "views"),
    alcance: numero(fd, "alcance"),
    salvos: numero(fd, "salvos"),
    compartilhamentos: numero(fd, "compartilhamentos"),
    comentarios: numero(fd, "comentarios"),
    seguidores: numero(fd, "seguidores"),
    cliques: numero(fd, "cliques"),
  });

  revalidatePath("/painel/conteudo/" + postId);
}

export async function excluirMetricaAcao(id: string, postId: string) {
  if (!id) return;
  await excluirMetrica(id);
  revalidatePath("/painel/conteudo/" + postId);
}

/* Recebe o id direto, e não FormData: desde 21/08 quem chama é o botão de
   confirmação em dois passos, que não é um `<form>`. */
export async function excluirPostAcao(id: string) {
  if (!id) return;
  await excluirPost(id);
  revalidatePath("/painel/conteudo");
  redirect("/painel/conteudo");
}
