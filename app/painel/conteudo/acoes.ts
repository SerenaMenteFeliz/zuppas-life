"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  atualizarPost,
  criarPost,
  excluirMetrica,
  excluirPost,
  salvarMetrica,
  salvarRoteiro,
} from "@/lib/conteudo";
import { STATUS, type Fala, type Status } from "@/lib/conteudo-tipos";
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

function statusValido(v: unknown): Status {
  return STATUS.includes(v as Status) ? (v as Status) : "ideia";
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

export async function salvarDadosAcao(fd: FormData) {
  const id = texto(fd, "id");
  if (!id) return;

  const status = statusValido(fd.get("status"));

  /* Carimba a data de publicação sozinho quando o status vira "postado" e
     ninguém preencheu a data. Sem isso o calendário perde o post exatamente
     no momento em que ele passa a ser o dado mais importante, que é o que de fato
     saiu. Se a pessoa preencheu à mão, a mão manda. */
  let dataPublicada = texto(fd, "data_publicada");
  if (status === "postado" && !dataPublicada) {
    dataPublicada = hojeISO();
  }

  await atualizarPost(id, {
    /* Vazio continua vazio, e quem exibe resolve com tituloDe(). Carimbar
       "Sem título" aqui gravaria no banco um texto que ninguém escreveu, e
       depois ela teria que apagar isso pra dar o nome de verdade. */
    titulo: texto(fd, "titulo") ?? "",
    perfil: texto(fd, "perfil") ?? "liz",
    formato: texto(fd, "formato"),
    pilar: texto(fd, "pilar"),
    produto: texto(fd, "produto"),
    status,
    data_planejada: texto(fd, "data_planejada"),
    data_publicada: dataPublicada,
    link: texto(fd, "link"),
    legenda: texto(fd, "legenda"),
    hashtags: texto(fd, "hashtags"),
    responsavel: texto(fd, "responsavel"),
    referencia: texto(fd, "referencia"),
    observacao: texto(fd, "observacao"),
  });

  revalidatePath("/painel/conteudo");
  revalidatePath("/painel/conteudo/" + id);
}

/** Troca só o status. Existe separada da action de salvar dados porque o
    quadro muda status sem abrir o post, e mandar o formulário inteiro dali
    apagaria todo campo que a tela do quadro não carrega. */
export async function mudarStatusAcao(id: string, novo: string) {
  if (!id) return;
  const status = statusValido(novo);
  const campos: Record<string, unknown> = { status };
  if (status === "postado") {
    campos.data_publicada = hojeISO();
  }
  await atualizarPost(id, campos);
  revalidatePath("/painel/conteudo");
  revalidatePath("/painel/conteudo/" + id);
}

export async function salvarRoteiroAcao(postId: string, falasJson: string) {
  if (!postId) return;

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

  await salvarRoteiro(postId, falas);
  revalidatePath("/painel/conteudo/" + postId);
  revalidatePath("/painel/conteudo");
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
