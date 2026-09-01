"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarPessoa,
  ConflitoDeContato,
  excluirPessoa,
  medirEstrago,
  type Estrago,
} from "@/lib/painel-contatos";

/* Mutações da aba Contatos (01/09/2026).

   Server Action roda como POST contra a própria rota, então quem gate isso é
   o middleware.ts (matcher /painel/:path*), que já vale pra POST e não só pro
   GET da página. Mesmo assim, cada action valida o que recebe: a doc do Next
   é explícita em tratar action como porta de entrada não confiável, porque a
   requisição pode ser forjada sem passar pela tela.

   Aqui isso pesa mais que no painel de Conteúdo: estas duas apagam pessoa de
   verdade, com pedido pago junto. O e-mail chega como string do cliente e é
   normalizado e checado dos dois lados. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limpar(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

export type RespostaAcao = { ok: true } | { ok: false; erro: string };

/** Conta o que a exclusão vai levar. A ficha chama isto ANTES de mostrar o
    botão de apagar, pra confirmação falar de números reais em vez de "tem
    certeza?". Leitura pura, nunca escreve. */
export async function medirEstragoAcao(email: string): Promise<Estrago | null> {
  const alvo = limpar(email);
  if (!alvo || !EMAIL.test(alvo)) return null;
  try {
    return await medirEstrago(alvo);
  } catch {
    return null;
  }
}

export async function excluirContatoAcao(email: string): Promise<RespostaAcao> {
  const alvo = limpar(email);
  if (!alvo || !EMAIL.test(alvo)) {
    return { ok: false, erro: "E-mail inválido." };
  }

  try {
    await excluirPessoa(alvo);
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao excluir." };
  }

  /* Sem redirect, ao contrário do excluir do painel de Conteúdo: aqui a pessoa
     já está na lista, e mandar pra lista de novo pisca a tela inteira sem
     motivo. `revalidatePath` refaz os dados do servidor e a linha some. */
  revalidatePath("/painel/contatos");
  return { ok: true };
}

export async function salvarContatoAcao(
  email: string,
  dados: { nome: string | null; whatsapp: string | null; email: string | null },
): Promise<RespostaAcao> {
  const alvo = limpar(email);
  if (!alvo) return { ok: false, erro: "E-mail de origem ausente." };

  try {
    await atualizarPessoa(alvo, {
      nome: limpar(dados.nome),
      whatsapp: limpar(dados.whatsapp),
      email: limpar(dados.email),
    });
  } catch (e) {
    /* Conflito é regra de negócio e o texto foi escrito pra ser lido por gente
       (o e-mail já existe, a pessoa não tem cadastro). Erro de infra não: esse
       vira mensagem genérica, com o detalhe no log do servidor. */
    if (e instanceof ConflitoDeContato) return { ok: false, erro: e.message };
    console.error("salvarContatoAcao", e);
    return { ok: false, erro: "Não deu pra salvar. Tente de novo." };
  }

  revalidatePath("/painel/contatos");
  return { ok: true };
}
