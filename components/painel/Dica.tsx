"use client";

import { useId, useRef, useState } from "react";
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
  const pos = usePopover(alvo, aberta, 210);
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

      {aberta &&
        pos &&
        createPortal(
          <div id={id} role="tooltip" className="painel-dica" style={estiloDoPopover(pos)}>
            {texto}
          </div>,
          document.body,
        )}
    </>
  );
}
