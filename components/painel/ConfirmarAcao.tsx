"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/* Confirmação em dois passos para o que apaga (Yan, 21/08/2026).

   Foi decidido em 12/08 não construir isso, e a premissa era outra: o painel
   era ferramenta só do Yan. Com a Ge usando, um clique errado leva junto o
   roteiro inteiro e todo o histórico de métricas pelo `on delete cascade`, num
   app que ela está vendo pela primeira vez.

   Confirmação no lugar, e não `window.confirm`: o diálogo do navegador trava a
   página inteira, não dá pra dizer o que exatamente vai sumir, e aparece com a
   cara do navegador em vez da cara do painel. Aqui o botão vira a pergunta, no
   mesmo lugar onde o dedo já está.

   `Escape` e clicar fora cancelam, porque a saída precisa ser mais fácil que a
   confirmação: quem abriu isso por engano tem que conseguir sair por engano
   também. */
export default function ConfirmarAcao({
  aoConfirmar,
  rotulo,
  pergunta,
  confirmacao,
  className = "conteudo-excluir",
}: {
  aoConfirmar: () => Promise<void> | void;
  rotulo: string;
  pergunta: string;
  confirmacao: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };

    document.addEventListener("keydown", tecla);
    /* `mousedown` e não `click`: o clique que abriu a caixa ainda está subindo
       pela árvore quando o listener é registrado, e com `click` ele fecharia a
       caixa no mesmo gesto que a abriu. */
    document.addEventListener("mousedown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fora);
    };
  }, [aberto]);

  if (!aberto) {
    return (
      <button type="button" className={className} onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    );
  }

  return (
    <div ref={caixa} className="conteudo-confirma">
      <p className="conteudo-confirma-pergunta">{pergunta}</p>
      <div className="conteudo-confirma-botoes">
        <button
          type="button"
          className="conteudo-confirma-sim"
          disabled={pendente}
          onClick={() => iniciar(async () => void (await aoConfirmar()))}
        >
          {pendente ? "apagando..." : confirmacao}
        </button>
        <button
          type="button"
          className="conteudo-confirma-nao"
          disabled={pendente}
          /* Autofoco no cancelar, não no confirmar: se a pessoa chegou aqui de
             teclado e apertar espaço por reflexo, o reflexo tem que ser a
             saída segura. */
          autoFocus
          onClick={() => setAberto(false)}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
