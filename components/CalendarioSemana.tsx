"use client";

import { useState } from "react";
import { diaDaSemana, diasDaSemana, inicioDaSemana, somarDias } from "@/lib/datas";

/* Calendário de seleção de semana.

   Substitui o "anterior / próxima" que obrigava a clicar sete vezes pra chegar
   em setembro. Aqui se escolhe a semana apontando o dedo num mês inteiro, que
   é como as pessoas pensam data.

   Seleciona a **semana**, não o dia: clicar em qualquer dia leva pra semana
   dele, e a linha inteira acende junto. Isso deixa claro que a unidade da tela
   é a semana, sem precisar explicar em texto. */

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const CABECALHO = ["S", "T", "Q", "Q", "S", "S", "D"];

/** Todos os dias que aparecem na grade do mês, incluindo as pontas das semanas
    vizinhas: uma grade de semanas não pode cortar semana pela metade. */
function gradeDoMes(ancora: string): string[] {
  const primeiro = `${ancora.slice(0, 7)}-01`;
  const inicio = inicioDaSemana(primeiro);

  const dias: string[] = [];
  let cursor = inicio;
  /* Seis semanas cobrem qualquer mês do calendário gregoriano. */
  for (let i = 0; i < 42; i++) {
    dias.push(cursor);
    cursor = somarDias(cursor, 1);
  }

  /* Corta a última semana se ela já não tem nenhum dia do mês. */
  const mes = ancora.slice(0, 7);
  while (dias.length > 35 && !dias.slice(35).some((d) => d.slice(0, 7) === mes)) {
    dias.length = 35;
  }
  return dias;
}

function mesAnterior(iso: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  return mes === 1
    ? `${ano - 1}-12-01`
    : `${ano}-${String(mes - 1).padStart(2, "0")}-01`;
}

function mesSeguinte(iso: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  return mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
}

export default function CalendarioSemana({
  selecionada,
  hoje,
  aoEscolher,
}: {
  /** Qualquer dia da semana atualmente aberta. */
  selecionada: string;
  hoje: string;
  aoEscolher: (dia: string) => void;
}) {
  const [mesVisivel, setMesVisivel] = useState(() => `${selecionada.slice(0, 7)}-01`);

  const dias = gradeDoMes(mesVisivel);
  const semanaAberta = new Set(diasDaSemana(selecionada));
  const mes = mesVisivel.slice(0, 7);

  const [ano, numeroMes] = mesVisivel.split("-").map(Number);

  return (
    <div className="w-[17rem]">
      <div className="mb-2 flex items-center justify-between">
        <button
          className="chip"
          onClick={() => setMesVisivel(mesAnterior(mesVisivel))}
          aria-label="Mês anterior"
        >
          ←
        </button>
        <span className="text-sm">
          {NOMES_MES[numeroMes - 1]} de {ano}
        </span>
        <button
          className="chip"
          onClick={() => setMesVisivel(mesSeguinte(mesVisivel))}
          aria-label="Próximo mês"
        >
          →
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {CABECALHO.map((letra, i) => (
          <span
            key={i}
            className="text-center text-[0.62rem] uppercase"
            style={{ color: "var(--ink-soft)" }}
          >
            {letra}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((dia) => {
          const doMes = dia.slice(0, 7) === mes;
          const naSemana = semanaAberta.has(dia);
          const ehHoje = dia === hoje;

          return (
            <button
              key={dia}
              onClick={() => aoEscolher(dia)}
              className="dia-calendario"
              style={{
                background: naSemana ? "var(--accent)" : "transparent",
                color: naSemana
                  ? "var(--accent-foreground)"
                  : doMes
                    ? "var(--ink)"
                    : "var(--ink-soft)",
                opacity: doMes ? 1 : 0.4,
                borderRadius:
                  diaDaSemana(dia) === 1 ? "9px 0 0 9px"
                  : diaDaSemana(dia) === 0 ? "0 9px 9px 0"
                  : "0",
                outline: ehHoje && !naSemana ? "1px solid var(--accent)" : "none",
                outlineOffset: "-2px",
              }}
            >
              {Number(dia.slice(8, 10))}
            </button>
          );
        })}
      </div>

      <button
        className="mt-2 w-full text-center text-xs underline underline-offset-4"
        style={{ color: "var(--ink-soft)" }}
        onClick={() => {
          setMesVisivel(`${hoje.slice(0, 7)}-01`);
          aoEscolher(hoje);
        }}
      >
        voltar pra esta semana
      </button>
    </div>
  );
}
