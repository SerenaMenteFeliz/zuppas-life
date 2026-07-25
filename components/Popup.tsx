"use client";

import { useEffect, useRef, useState } from "react";
import { Seta } from "./icones";

/* Popup ancorado no botão que o abriu.

   Existe porque as fileiras de chip estavam tomando um terço da tela antes de
   qualquer conteúdo aparecer: eram nove pessoas e nove tipos empilhados no
   topo da semana. Filtro é coisa de segundo toque, não de primeira leitura.

   Fecha no clique fora, no Esc e ao escolher. Nada de biblioteca de modal: são
   trinta linhas e o comportamento é previsível. */

export default function Popup({
  rotulo,
  valor,
  icone,
  children,
  alinhar = "esquerda",
}: {
  rotulo: string;
  /** O que está escolhido agora, mostrado no botão. */
  valor?: string;
  icone?: React.ReactNode;
  children: (fechar: () => void) => React.ReactNode;
  alinhar?: "esquerda" | "direita";
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function foraDaCaixa(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function escapou(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", foraDaCaixa);
    document.addEventListener("keydown", escapou);
    return () => {
      document.removeEventListener("mousedown", foraDaCaixa);
      document.removeEventListener("keydown", escapou);
    };
  }, [aberto]);

  return (
    <div className="relative" ref={caixa}>
      <button
        onClick={() => setAberto((v) => !v)}
        className={`aba flex items-center gap-1.5 ${valor ? "aba-ativa" : ""}`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
      >
        {icone}
        <span>{valor ?? rotulo}</span>
        <span
          className="transition-transform"
          style={{ transform: aberto ? "rotate(90deg)" : "none" }}
        >
          <Seta className="h-3 w-3" />
        </span>
      </button>

      {aberto && (
        <div
          className="popup"
          style={alinhar === "direita" ? { right: 0 } : { left: 0 }}
          role="dialog"
          aria-label={rotulo}
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}
