"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Moldura de TV: um palco fixo de 1920x1080, reduzido (ou ampliado) pra caber
   no espaço disponível, com sobra preta nas bordas.

   É o que deixa o PC mostrar exatamente o que a TV vai mostrar: o conteúdo é
   desenhado sempre em pixels de uma TV Full HD, e só a escala muda. Na TV de
   verdade, em tela cheia, a escala dá 1 e a moldura some. */

export const LARGURA_TV = 1920;
export const ALTURA_TV = 1080;

export default function Palco({ children }: { children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () =>
      setEscala(Math.min(el.clientWidth / LARGURA_TV, el.clientHeight / ALTURA_TV));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={caixa} className="quadro-moldura">
      <div
        className="quadro-palco"
        style={{
          width: LARGURA_TV,
          height: ALTURA_TV,
          transform: `scale(${escala})`,
          visibility: escala ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
