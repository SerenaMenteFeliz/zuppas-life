"use client";

import { CATEGORIA_LABEL, type Ocorrencia } from "@/lib/types";
import { Avatar } from "./ui";
import { Marca } from "./visual";
import { Check, Lixeira, Pular, Relogio } from "./icones";

/* A linha: o componente mais repetido do app.

   Uma linha só serve pra âncora, passeio do Biro, tarefa de casa, horário de
   escola, compromisso e lembrete, porque no modelo eles são a mesma coisa.

   Três coisas mudaram na revisão de UI de 24/07:

   1. **Marca de categoria à esquerda.** O pedido era "fácil de entender o que é
      cada coisa": a cor e o ícone dizem o tipo antes de qualquer texto.
   2. **Pular.** Antes só existia feito ou nada, e ficar preso numa etapa que
      não vai acontecer é o que faz alguém abandonar a lista inteira.
   3. **Estado pulado é visualmente diferente de feito.** Feito risca e acende;
      pulado apaga sem riscar. Um é conquista, o outro é só ter saído do caminho. */

export default function Linha({
  ocorrencia,
  estado,
  aoMarcar,
  aoPular,
  aoRemover,
  mostrarDono = true,
}: {
  ocorrencia: Ocorrencia;
  estado: "feito" | "pulado" | "aberto";
  aoMarcar: () => void;
  aoPular?: () => void;
  aoRemover?: () => void;
  mostrarDono?: boolean;
}) {
  const o = ocorrencia;
  const feito = estado === "feito";
  const pulado = estado === "pulado";

  return (
    <li
      className={`glass-card flex items-stretch ${feito ? "linha-feita" : ""}`}
      style={{ opacity: pulado ? 0.5 : 1 }}
    >
      <button
        onClick={aoMarcar}
        className="linha flex-1 items-center"
        aria-pressed={feito}
        aria-label={`${feito ? "Desmarcar" : "Marcar como feito"}: ${o.titulo}`}
      >
        <span className="linha-marca">
          <Check />
        </span>

        <Marca categoria={o.categoria} />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="linha-titulo text-[1.02rem] leading-snug"
            style={{ textDecoration: pulado ? "line-through" : undefined }}
          >
            {o.titulo}
          </span>

          {o.detalhe && (
            <span
              className="text-[0.78rem] leading-snug"
              style={{ color: "var(--ink-soft)" }}
            >
              {o.detalhe}
            </span>
          )}

          <span
            className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.68rem]"
            style={{ color: "var(--ink-soft)" }}
          >
            {o.horario && (
              <span className="flex items-center gap-1">
                <Relogio />
                {o.horario}
              </span>
            )}
            <span>{CATEGORIA_LABEL[o.categoria]}</span>
            {pulado && <span>pulado hoje</span>}
          </span>
        </span>

        {mostrarDono && <Avatar dono={o.dono} />}
      </button>

      {(aoPular || aoRemover) && (
        <span
          className="flex flex-none flex-col justify-center gap-1 border-l px-2"
          style={{ borderColor: "var(--line)" }}
        >
          {aoPular && (
            <button
              onClick={aoPular}
              className="rounded-lg p-1.5"
              style={{ color: pulado ? "var(--accent)" : "var(--ink-soft)" }}
              aria-label={pulado ? `Desfazer pulo: ${o.titulo}` : `Pular hoje: ${o.titulo}`}
              title={pulado ? "Desfazer" : "Pular hoje"}
            >
              <Pular />
            </button>
          )}
          {aoRemover && (
            <button
              onClick={aoRemover}
              className="rounded-lg p-1.5"
              style={{ color: "var(--ink-soft)" }}
              aria-label={`Apagar ${o.titulo}`}
              title="Apagar"
            >
              <Lixeira />
            </button>
          )}
        </span>
      )}
    </li>
  );
}
