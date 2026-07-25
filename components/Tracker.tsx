"use client";

import { corrente, diaDoTracker, melhorCorrente } from "@/lib/agenda";
import { curta, diasDaSemana, inicioDaSemana, semanaISO, somarDias } from "@/lib/datas";
import type { ItemRecorrente } from "@/lib/types";

/* Tracker de semanas.

   A [[Rotina - Família (Semana 1)]] tem uma tabela de 7 dias em markdown,
   vazia desde 16/06, com a meta de "7 dias seguidos com as 3 âncoras". Isto é
   aquela tabela, viva, e continuando depois da primeira semana.

   Uma casa que só enxerga "hoje" nunca sabe se está melhorando. Oito semanas
   lado a lado respondem isso de relance, e sem cobrança: dia parcial não fica
   vermelho, fica meio cheio. A régua é a corrente, não a perfeição. */

const SEMANAS = 8;

export default function Tracker({
  hoje,
  itens,
  feitas,
}: {
  hoje: string;
  itens: ItemRecorrente[];
  feitas: Set<string>;
}) {
  const atual = corrente(hoje, itens, feitas);
  const recorde = melhorCorrente(hoje, itens, feitas);

  const inicioAtual = inicioDaSemana(hoje);
  const semanas = Array.from({ length: SEMANAS }, (_, i) =>
    diasDaSemana(somarDias(inicioAtual, -(SEMANAS - 1 - i) * 7))
  );

  const diasFechados = semanas
    .flat()
    .filter((d) => diaDoTracker(d, hoje, itens, feitas).fechado).length;

  return (
    <div className="glass-card p-4">
      <div className="mb-4 flex flex-wrap items-end gap-x-7 gap-y-3">
        <Numero valor={atual} rotulo={atual === 1 ? "dia seguido" : "dias seguidos"} destaque />
        <Numero valor={recorde} rotulo="melhor sequência" />
        <Numero valor={diasFechados} rotulo={`dias fechados em ${SEMANAS} semanas`} />
      </div>

      <div className="flex flex-col gap-1">
        {semanas.map((dias) => {
          const inicio = dias[0];
          const ehSemanaAtual = inicio === inicioAtual;
          return (
            <div key={inicio} className="flex items-center gap-2">
              <span
                className="w-16 flex-none text-[0.62rem] tabular-nums"
                style={{
                  color: ehSemanaAtual ? "var(--accent)" : "var(--ink-soft)",
                }}
              >
                S{semanaISO(inicio)} · {curta(inicio)}
              </span>

              <div className="flex flex-1 gap-1">
                {dias.map((dia) => {
                  const d = diaDoTracker(dia, hoje, itens, feitas);
                  const fracao = d.total === 0 ? 0 : d.feitas / d.total;
                  return (
                    <span
                      key={dia}
                      className="tracker-dia"
                      title={`${curta(dia)}: ${d.feitas} de ${d.total} âncoras`}
                      style={{
                        background: d.futuro ? "transparent" : "var(--line)",
                        border: d.futuro ? "1px dashed var(--line)" : "none",
                        outline:
                          dia === hoje ? "1.5px solid var(--accent)" : "none",
                        outlineOffset: "1px",
                      }}
                    >
                      <span
                        className="tracker-preenchido"
                        style={{
                          height: `${fracao * 100}%`,
                          background: d.fechado ? "var(--accent)" : "var(--gold)",
                        }}
                      />
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[0.68rem]" style={{ color: "var(--ink-soft)" }}>
        Cheio é dia fechado nas 3 âncoras. Meio cheio é dia parcial, que também
        conta como dia salvo.
      </p>
    </div>
  );
}

function Numero({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-2xl leading-none"
        style={{
          fontFamily: "var(--font-display)",
          color: destaque ? "var(--accent)" : "var(--ink)",
        }}
      >
        {valor}
      </span>
      <span className="text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </span>
    </div>
  );
}
