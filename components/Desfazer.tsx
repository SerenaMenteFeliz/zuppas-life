"use client";

import { useEffect } from "react";
import { desfazerUltima, dispensarDesfazer, useZuppas } from "@/lib/store";

/* Barra de desfazer.

   Toda ação que apaga alguma coisa aparece aqui por alguns segundos com um
   caminho de volta. A alternativa comum, perguntar "tem certeza?" antes,
   interrompe todo mundo (inclusive quem tinha certeza) pra proteger o caso
   raro. Agir na hora e deixar desfazer inverte isso: rápido pro caso comum,
   seguro pro caso raro.

   A contagem regressiva é uma **barra que drena por CSS**, não um número em
   estado. Um contador em `useState` obrigaria a reiniciá-lo dentro de um efeito
   a cada ação nova (renderização em cascata) ou a ler o relógio durante a
   renderização (função impura); os dois são justamente o que as regras do React
   mandam evitar. A animação resolve sem estado nenhum, e comunica melhor: quem
   olha vê quanto tempo sobra sem precisar ler.

   `aria-live="polite"` porque quem usa leitor de tela precisa saber que a coisa
   aconteceu, sem que o foco seja roubado no meio de outra ação. */

const SEGUNDOS = 7;

export default function Desfazer() {
  const { desfazer } = useZuppas();

  useEffect(() => {
    if (!desfazer) return;
    const id = setTimeout(dispensarDesfazer, SEGUNDOS * 1000);
    return () => clearTimeout(id);
  }, [desfazer]);

  if (!desfazer) return null;

  return (
    <div className="barra-desfazer" role="status" aria-live="polite">
      {/* `key` força a animação a recomeçar do zero a cada ação nova, mesmo
          quando a barra já estava na tela. */}
      <span
        key={desfazer.em}
        className="desfazer-tempo"
        style={{ animationDuration: `${SEGUNDOS}s` }}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1 truncate text-sm">{desfazer.rotulo}</span>

      <button
        onClick={desfazerUltima}
        className="flex-none rounded-lg px-3 py-2 text-sm underline underline-offset-4"
      >
        Desfazer
      </button>

      <button
        onClick={dispensarDesfazer}
        className="flex-none px-2 py-2 text-sm"
        style={{ opacity: 0.6 }}
        aria-label="Dispensar aviso"
      >
        ×
      </button>
    </div>
  );
}
