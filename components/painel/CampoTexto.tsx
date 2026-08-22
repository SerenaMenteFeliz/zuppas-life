"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/* Textarea que cresce com o conteúdo, em vez de ter alça de arrastar no canto
   (Yan, 22/08/2026).

   A alça pede um gesto pra resolver um problema que o app já sabe resolver:
   ninguém escreve uma legenda querendo antes decidir a altura da caixa. Pior,
   ela deixa o texto rolando dentro de uma janelinha, e revisar legenda de
   Instagram lendo cinco linhas por vez é ruim.

   ── Como cresce ──

   `height: auto` antes de medir, sempre. Sem isso, `scrollHeight` nunca
   diminui: ele é a altura do conteúdo OU a altura atual, o que for maior, e a
   caixa só saberia crescer, nunca encolher ao apagar texto.

   `useLayoutEffect` e não `useEffect`: o ajuste precisa acontecer antes do
   navegador pintar, senão a caixa aparece com a altura errada por um quadro e
   o texto pula. Roda também quando `valor` muda por fora (carregar o post),
   não só ao digitar.

   `rows={1}` mais `min-height` no CSS: a altura mínima é decisão de estilo, não
   de marcação, e assim uma caixa vazia não nasce com sobra de espaço. */
export default function CampoTexto({
  valor,
  aoMudar,
  aoSair,
  minimo,
  ...resto
}: {
  valor: string;
  aoMudar: (v: string) => void;
  aoSair?: () => void;
  /* Altura mínima em linhas, pra caixa vazia já anunciar quanto texto se
     espera ali (legenda pede mais espaço que observação). */
  minimo?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onBlur" | "rows">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const ajustar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useLayoutEffect(ajustar, [ajustar, valor]);

  return (
    <textarea
      {...resto}
      ref={ref}
      rows={1}
      className={"conteudo-campo-cresce " + (resto.className ?? "")}
      style={minimo ? { minHeight: minimo * 1.45 + "em", ...resto.style } : resto.style}
      value={valor}
      onChange={(e) => {
        aoMudar(e.target.value);
        ajustar();
      }}
      onBlur={aoSair}
    />
  );
}
