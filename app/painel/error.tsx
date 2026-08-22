"use client";

import Link from "next/link";
import { useEffect } from "react";

/* Tela de erro do painel (22/08/2026).

   Sem este arquivo, qualquer falha de consulta jogava na tela de erro crua do
   Next: fundo branco, texto em inglês e nenhum caminho de volta. Quem abriu o
   painel pra escrever um roteiro não tem por que descobrir sozinha o que fazer
   com "Application error: a client-side exception has occurred".

   Dois caminhos, porque as duas coisas acontecem: "tentar de novo" resolve a
   falha passageira de rede, e o link resolve o resto. A mensagem técnica fica
   visível num `<details>` fechado: escondida do caminho normal, mas presente
   pra quando o Yan for olhar. */
export default function ErroPainel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* O `digest` é o que liga esta tela à linha correspondente no log da
       Vercel: sem ele, achar o erro do lado do servidor é caçada. */
    console.error("[painel]", error.digest ?? "sem digest", error);
  }, [error]);

  return (
    <div className="painel-conteudo pn-erro">
      <h1 className="pn-erro-titulo">Alguma coisa não carregou.</h1>
      <p className="pn-erro-texto">
        Pode ter sido a conexão. Tente de novo; se continuar, avise o Yan.
      </p>

      <div className="pn-erro-acoes">
        <button type="button" className="conteudo-botao" onClick={reset}>
          Tentar de novo
        </button>
        <Link href="/painel/conteudo" className="conteudo-botao-claro">
          Ir para Conteúdo
        </Link>
      </div>

      <details className="pn-erro-detalhe">
        <summary>Detalhe técnico</summary>
        <p>{error.message}</p>
        {error.digest && <p>digest: {error.digest}</p>}
      </details>
    </div>
  );
}
