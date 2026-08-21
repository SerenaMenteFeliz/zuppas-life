"use client";

import { excluirPostAcao } from "@/app/painel/conteudo/acoes";
import { avisarNaProxima } from "@/components/painel/Avisos";
import ModalConfirmar from "@/components/painel/ModalConfirmar";

/* Botão de excluir mais o popup de confirmação.

   Existe como componente próprio porque o aviso tem que ser guardado ANTES da
   ação rodar: excluir redireciona pra lista, e um aviso disparado aqui morreria
   junto com a página. Guardado, ele reaparece do outro lado, e a Ge vê "post
   apagado" em vez de um post que simplesmente sumiu da tela.

   O texto conta o que vai junto (quantas falas, quantas coletas) porque é
   exatamente isso que a pessoa não vê da tela de detalhe e é o que ela mais
   perde: o roteiro. */
export default function ExcluirPost({
  id,
  titulo,
  falas,
  coletas,
}: {
  id: string;
  titulo: string;
  falas: number;
  coletas: number;
}) {
  const pedacos: string[] = [];
  if (falas > 0) pedacos.push(falas === 1 ? "o roteiro (1 fala)" : "o roteiro (" + falas + " falas)");
  if (coletas > 0) {
    pedacos.push(coletas === 1 ? "1 coleta de métricas" : coletas + " coletas de métricas");
  }

  const oQueVaiJunto =
    pedacos.length === 0
      ? "Ele ainda não tem roteiro nem métricas."
      : "Vão junto " + pedacos.join(" e ") + ".";

  return (
    <ModalConfirmar
      aoConfirmar={async () => {
        avisarNaProxima("Post apagado.");
        await excluirPostAcao(id);
      }}
      rotulo="Excluir este post"
      titulo={"Apagar “" + titulo + "”?"}
      pergunta={oQueVaiJunto + " Não tem como desfazer."}
      confirmacao="Sim, apagar"
    />
  );
}
