"use client";

import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { estiloDoPopover, usePopover } from "@/components/painel/usePopover";

/* Explicação que só aparece quando alguém pergunta (30/08/2026).

   Nasceu do cabeçalho das colunas do quadro: cada uma trazia uma linha fixa
   dizendo o que aquela etapa espera ("Só o tema ou o gancho, sem roteiro
   ainda"). Era útil na primeira semana e virou ruído depois, cinco vezes na
   mesma tela, ocupando uma linha de altura em cada coluna que já tem pouca.

   O texto não some do produto, muda de gatilho: fica atrás de um ícone
   discreto, e aparece pra quem passa o mouse ou chega pelo teclado. Quem já
   sabe não paga nada por ele; quem não sabe encontra no lugar da dúvida.

   **Por que um ícone e não o `title` nativo**: o do navegador demora ~1s pra
   aparecer, não é estilizável e não abre pelo teclado. E por que não a pill
   inteira ser o gatilho: sem nada visível anunciando, ninguém descobre que há
   explicação ali.

   O cartão é renderizado em `document.body` por portal e posicionado com
   `fixed`, pelo mesmo motivo do Dropdown: dentro da coluna, que rola e recorta,
   ele seria cortado. */
export default function Dica({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [aberta, setAberta] = useState(false);
  const alvo = useRef<HTMLButtonElement>(null);
  const id = useId();

  return (
    <>
      <button
        ref={alvo}
        type="button"
        className="painel-dica-alvo"
        aria-label={"O que é " + rotulo}
        aria-describedby={aberta ? id : undefined}
        aria-expanded={aberta}
        onPointerEnter={() => setAberta(true)}
        onPointerLeave={() => setAberta(false)}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        /* Toque não tem hover: no celular o ícone funciona como interruptor. */
        onClick={() => setAberta((a) => !a)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <path d="M12 7.6v.8" strokeLinecap="round" />
        </svg>
      </button>

      <Cartao id={id} texto={texto} alvo={alvo} aberta={aberta} />
    </>
  );
}

/* A mesma dica, mas pendurada num controle que JÁ existe, em vez de num ícone
   próprio (01/09/2026).

   O caso que pediu isto é o cabeçalho de ordenação da Lista: o texto ali não
   explica um termo, explica o que o PRÓXIMO CLIQUE faz ("inverter a ordem",
   "voltar à ordem padrão"). Quem precisa disso já está com o ponteiro em cima
   do link, então um ícone ao lado não acrescenta nada e seis deles numa linha
   de cabeçalho é justamente o ruído que a `Dica` foi criada pra tirar da tela.

   Era o último `title` nativo da aba que não estava só repetindo texto cortado,
   ou seja, o único que ainda mostrava a caixinha preta do navegador pra dizer
   algo que a tela não dizia.

   `onFocus`/`onBlur` no `<span>` funcionam porque o React usa `focusin` e
   `focusout`, que sobem: focar o link lá dentro abre a dica. Com os eventos
   nativos `focus`/`blur`, que não sobem, o teclado não veria nada. */
export function DicaEm({ texto, children }: { texto: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const alvo = useRef<HTMLSpanElement>(null);
  const id = useId();

  return (
    <span
      ref={alvo}
      className="painel-dica-em"
      onPointerEnter={() => setAberta(true)}
      onPointerLeave={() => setAberta(false)}
      onFocus={() => setAberta(true)}
      onBlur={() => setAberta(false)}
    >
      {children}
      {/* `aria-hidden` de propósito: quem chega por leitor de tela lê o
          `aria-label` do próprio controle, que diz a mesma coisa. Sem isso o
          texto seria anunciado duas vezes. */}
      <Cartao id={id} texto={texto} alvo={alvo} aberta={aberta} escondidoDoLeitor />
    </span>
  );
}

/* O cartão em si, um lugar só pras duas formas de gatilho. */
function Cartao({
  id,
  texto,
  alvo,
  aberta,
  escondidoDoLeitor = false,
}: {
  id: string;
  texto: string;
  alvo: RefObject<HTMLElement | null>;
  aberta: boolean;
  escondidoDoLeitor?: boolean;
}) {
  const pos = usePopover(alvo, aberta, 210);
  if (!aberta || !pos) return null;

  return createPortal(
    <div
      id={id}
      role="tooltip"
      aria-hidden={escondidoDoLeitor || undefined}
      className="theme-painel painel-dica"
      style={estiloDoPopover(pos, true)}
    >
      {texto}
    </div>,
    document.body,
  );
}
