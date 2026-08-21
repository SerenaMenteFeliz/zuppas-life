"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/* Confirmação de exclusão como popup no meio da tela (Yan, 21/08/2026).

   A primeira versão era uma faixa que nascia no lugar do botão. Funcionava,
   mas apagar um post não é uma decisão de canto de tela: o popup para tudo,
   diz exatamente o que vai sumir, e força um segundo olhar.

   Continua não sendo `window.confirm`: aquele trava a página inteira, não sabe
   dizer "e o roteiro de 3 falas vai junto", e aparece com a cara do navegador
   em vez da cara do painel.

   Três saídas, todas mais fáceis que confirmar: clicar fora, apertar Escape, e
   o botão Cancelar, que é o sólido e recebe o foco. Quem abriu isso por engano
   precisa conseguir sair por engano também. */
export default function ModalConfirmar({
  aoConfirmar,
  rotulo,
  titulo,
  pergunta,
  confirmacao,
  className = "conteudo-botao-perigo",
}: {
  aoConfirmar: () => Promise<void> | void;
  rotulo: string;
  titulo: string;
  pergunta: string;
  confirmacao: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendente) setAberto(false);
    };
    document.addEventListener("keydown", tecla);

    /* Trava a rolagem do fundo: sem isso a página corre atrás do popup quando
       se usa a roda do mouse, e o popup parece descolado do que ele é sobre. */
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    cancelar.current?.focus();

    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = rolagem;
    };
  }, [aberto, pendente]);

  return (
    <>
      <button type="button" className={className} onClick={() => setAberto(true)}>
        {rotulo}
      </button>

      {aberto && (
        <div
          className="painel-modal-fundo"
          /* O clique fora fecha, mas só quando ele nasce E termina no fundo:
             arrastar uma seleção de texto de dentro do popup pra fora soltaria
             o mouse aqui e fecharia o popup no meio de uma leitura. */
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pendente) setAberto(false);
          }}
        >
          <div className="painel-modal" role="dialog" aria-modal="true" aria-label={titulo}>
            <h2 className="painel-modal-titulo">{titulo}</h2>
            <p className="painel-modal-texto">{pergunta}</p>
            <div className="painel-modal-botoes">
              <button
                ref={cancelar}
                type="button"
                className="conteudo-confirma-nao"
                disabled={pendente}
                onClick={() => setAberto(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="conteudo-confirma-sim"
                disabled={pendente}
                onClick={() => iniciar(async () => void (await aoConfirmar()))}
              >
                {pendente ? "apagando..." : confirmacao}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
