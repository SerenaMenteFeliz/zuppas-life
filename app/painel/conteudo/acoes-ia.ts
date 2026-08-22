"use server";

import { carregarPost } from "@/lib/conteudo";
import { ErroModelo } from "@/lib/ia/modelo";
import { gerarRoteiro, importarRoteiro, type ResultadoIA } from "@/lib/ia/roteiro";

/* Porta de entrada das duas funções de IA.

   Separada de acoes.ts porque são coisas diferentes: lá são mutações do post,
   aqui é chamada a um serviço externo que pode demorar, custar cota e falhar de
   um jeito que a pessoa precisa entender. Misturar as duas faria o arquivo de
   mutações carregar a camada de IA inteira toda vez que alguém troca um status.

   ── Estas actions NÃO escrevem no banco ──

   Elas devolvem a proposta pra prévia. As falas só entram no roteiro quando a
   pessoa confirma, e aí quem grava é o autosave do RoteiroEditor, pelo caminho
   de sempre.

   A razão é concreta: em 22/08 o painel fechou um caso de perda silenciosa de
   roteiro (o DELETE por complemento). Um segundo caminho de escrita, com regra
   própria de o que apagar, reintroduziria a mesma classe de defeito por outra
   porta. A IA propõe; quem grava continua sendo quem sempre gravou.

   ── Por que o perfil e o local vêm do banco, e não da tela ──

   Server Action é porta pública: a requisição pode ser forjada sem passar pela
   interface. Se o perfil chegasse pelo formulário, dava pra pedir um roteiro na
   voz de qualquer perfil, e pior, pular a trava de "ficha não preenchida". Lendo
   o post, o que vale é o que está gravado. */

export type RespostaIA =
  | { ok: true; resultado: ResultadoIA }
  | { ok: false; erro: string };

/* Erro vira valor de retorno em vez de exceção porque quem chama é um
   componente de cliente que precisa MOSTRAR a mensagem. Exceção atravessando a
   fronteira do servidor em produção chega do outro lado como "an error
   occurred", sem texto nenhum: a pessoa veria uma caixa vazia no lugar de "a
   cota de hoje acabou". */
function falha(e: unknown): RespostaIA {
  if (e instanceof ErroModelo) return { ok: false, erro: e.message };
  return {
    ok: false,
    erro: "Não consegui falar com a IA agora. Veja a aba Registros pro detalhe.",
  };
}

export async function importarRoteiroAcao(
  postId: string,
  texto: string,
): Promise<RespostaIA> {
  if (!postId) return { ok: false, erro: "Post não identificado." };

  try {
    const post = await carregarPost(postId);
    if (!post) return { ok: false, erro: "Esse post não existe mais." };

    const resultado = await importarRoteiro({
      postId,
      perfilId: post.perfil,
      localId: post.local,
      texto,
    });
    return { ok: true, resultado };
  } catch (e) {
    return falha(e);
  }
}

export async function gerarRoteiroAcao(
  postId: string,
  briefing: { assunto: string; sentimento: string; pedido: string },
): Promise<RespostaIA> {
  if (!postId) return { ok: false, erro: "Post não identificado." };

  try {
    const post = await carregarPost(postId);
    if (!post) return { ok: false, erro: "Esse post não existe mais." };

    const resultado = await gerarRoteiro({
      postId,
      perfilId: post.perfil,
      localId: post.local,
      assunto: briefing.assunto,
      sentimento: briefing.sentimento,
      pedido: briefing.pedido,
    });
    return { ok: true, resultado };
  } catch (e) {
    return falha(e);
  }
}
