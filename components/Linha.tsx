"use client";

import { CATEGORIA_LABEL, type Ocorrencia } from "@/lib/types";
import { Avatar } from "./ui";
import { Check, Lixeira, Relogio } from "./icones";

/* A linha marcável: o componente mais repetido do app.

   Uma linha só serve pra âncora, passeio do Biro, tarefa de casa, horário de
   escola, compromisso e lembrete, porque no modelo eles são a mesma coisa. Isso
   é o que permite as abas de manhã/tarde/noite existirem sem seis variações de
   card. */

export default function Linha({
  ocorrencia,
  feita,
  aoAlternar,
  aoRemover,
  mostrarDono = true,
}: {
  ocorrencia: Ocorrencia;
  feita: boolean;
  aoAlternar: () => void;
  aoRemover?: () => void;
  mostrarDono?: boolean;
}) {
  const o = ocorrencia;

  return (
    <li className={`glass-card flex items-stretch ${feita ? "linha-feita" : ""}`}>
      <button
        onClick={aoAlternar}
        className="linha flex-1"
        aria-pressed={feita}
        aria-label={`${feita ? "Desmarcar" : "Marcar"} ${o.titulo}`}
      >
        <span className="linha-marca">
          <Check />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="linha-titulo text-[1.02rem] leading-snug">
            {o.titulo}
          </span>

          {o.detalhe && (
            <span
              className="text-[0.8rem] leading-snug"
              style={{ color: "var(--ink-soft)" }}
            >
              {o.detalhe}
            </span>
          )}

          <span
            className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem]"
            style={{ color: "var(--ink-soft)" }}
          >
            {o.horario && (
              <span className="flex items-center gap-1">
                <Relogio />
                {o.horario}
              </span>
            )}
            <span className="uppercase tracking-wider">
              {CATEGORIA_LABEL[o.categoria]}
            </span>
            {o.ancora && (
              <span
                className="uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                âncora
              </span>
            )}
          </span>
        </span>

        {mostrarDono && <Avatar dono={o.dono} />}
      </button>

      {aoRemover && (
        <button
          onClick={aoRemover}
          className="flex flex-none items-center px-3"
          style={{ color: "var(--ink-soft)" }}
          aria-label={`Apagar ${o.titulo}`}
        >
          <Lixeira />
        </button>
      )}
    </li>
  );
}
