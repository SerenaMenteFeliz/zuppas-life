"use client";

import { CATEGORIA_LABEL, type Ocorrencia, type Pessoa } from "@/lib/types";
import { type EstadoOcorrencia } from "@/lib/agenda";
import { Avatar } from "./ui";
import { Marca, Participantes } from "./visual";
import { Check, Lixeira, Mao, Pular, Relogio } from "./icones";

/* A linha: o componente mais repetido do app.

   Uma linha só serve pra âncora, passeio do Biro, tarefa de casa, horário de
   escola, compromisso e lembrete, porque no modelo eles são a mesma coisa.

   Revisão de 24/07: marca de categoria à esquerda (pra reconhecer o tipo antes
   de ler), pular como estado próprio, e pulado visualmente diferente de feito
   (feito risca e acende, pulado apaga sem riscar).

   Revisão de 25/07, depois de a casa virar mural:

   1. **Quem fez aparece na linha.** Era o dado que já estava sendo gravado e
      nunca mostrado. Sem nome atribuído antes, o nome depois é a única coisa
      que impede o mural de virar terra de ninguém.
   2. **"Eu também".** Cozinhar é três pessoas, o passeio da noite é três. Se a
      linha já está feita e você não está nela, o toque principal soma você em
      vez de desmarcar o trabalho de quem fez.
   3. **"Peguei".** Assumir sem ter terminado, pro caso clássico de duas pessoas
      saírem com o cachorro achando que a outra não ia. */

export default function Linha({
  ocorrencia,
  estado,
  fez = [],
  pegou = [],
  eu,
  aoMarcar,
  aoPegar,
  aoPular,
  aoRemover,
  mostrarDono = true,
}: {
  ocorrencia: Ocorrencia;
  estado: EstadoOcorrencia;
  /** Quem já marcou como feito. */
  fez?: Pessoa[];
  /** Quem assumiu e ainda não terminou. */
  pegou?: Pessoa[];
  /** Quem está com o aparelho na mão, pra saber se o toque soma ou desfaz. */
  eu?: Pessoa;
  aoMarcar: () => void;
  aoPegar?: () => void;
  aoPular?: () => void;
  aoRemover?: () => void;
  mostrarDono?: boolean;
}) {
  const o = ocorrencia;
  const feito = estado === "feito";
  const pulado = estado === "pulado";
  const pego = estado === "pego";

  const souUmDosQueFez = eu ? fez.includes(eu) : false;
  const jaPeguei = eu ? pegou.includes(eu) : false;

  /* Só desmarca quem participou. Pra quem está de fora, o toque entra na
     tarefa: desmarcar o trabalho alheio com um toque acidental é o tipo de
     coisa que faz alguém parar de usar um painel de família. */
  const rotuloPrincipal = feito
    ? souUmDosQueFez
      ? `Desmarcar: ${o.titulo}`
      : `Marcar que você também fez: ${o.titulo}`
    : `Marcar como feito: ${o.titulo}`;

  return (
    <li
      className={`glass-card flex items-stretch ${feito ? "linha-feita" : ""}`}
      style={{
        opacity: pulado ? 0.5 : 1,
        borderColor: pego ? "var(--accent)" : undefined,
      }}
    >
      <button
        onClick={aoMarcar}
        className="linha flex-1 items-center"
        aria-pressed={feito}
        aria-label={rotuloPrincipal}
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

            {fez.length > 0 ? (
              <Participantes pessoas={fez} verbo="fez" />
            ) : pegou.length > 0 ? (
              <span style={{ color: "var(--accent)" }}>
                <Participantes pessoas={pegou} verbo="pegou" />
              </span>
            ) : (
              <span>{CATEGORIA_LABEL[o.categoria]}</span>
            )}

            {feito && !souUmDosQueFez && (
              <span style={{ color: "var(--accent)" }}>tocar pra somar você</span>
            )}
            {pulado && <span>pulado hoje</span>}
          </span>
        </span>

        {mostrarDono && <Avatar dono={o.dono} />}
      </button>

      {(aoPegar || aoPular || aoRemover) && (
        <span
          className="flex flex-none flex-col justify-center gap-1 border-l px-2"
          style={{ borderColor: "var(--line)" }}
        >
          {aoPegar && !feito && (
            <button
              onClick={aoPegar}
              className="rounded-lg p-1.5"
              style={{ color: jaPeguei ? "var(--accent)" : "var(--ink-soft)" }}
              aria-label={
                jaPeguei ? `Largar: ${o.titulo}` : `Peguei essa: ${o.titulo}`
              }
              title={jaPeguei ? "Largar" : "Peguei essa"}
            >
              <Mao />
            </button>
          )}
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
