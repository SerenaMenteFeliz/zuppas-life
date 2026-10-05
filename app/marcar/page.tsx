"use client";

import { useState } from "react";
import Grade from "@/components/quadro/Grade";
import { curta, diasDaSemana, porExtenso, somarDias } from "@/lib/datas";
import { definirPessoa, useHoje, useZuppas } from "@/lib/store";
import { useQuadro } from "@/lib/useQuadro";
import { COR_PESSOA, INICIAL, PESSOAS } from "@/lib/types";

/* Marcar o Quadro da semana, no desktop.

   A mesma grade da TV, clicável. Quem está marcando é escolhido uma vez e
   fica lembrado neste aparelho (o "eu" do app, que continua no navegador: é
   preferência do aparelho, não dado da casa).

   Clicar marca em seu nome; clicar de novo na sua marca desfaz só a sua. Dá
   pra marcar dias que já passaram (o "esqueci de marcar ontem"), nunca dias
   que ainda não chegaram. */

export default function Marcar() {
  const hoje = useHoje();
  const { eu } = useZuppas();
  const [deslocamento, setDeslocamento] = useState(0);
  const dias = diasDaSemana(somarDias(hoje, deslocamento * 7));
  const { marcacoes, carregado, erro, alternar } = useQuadro(dias[0], dias[6]);

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-8 lg:px-10 lg:pt-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tv-rotulo mb-2">{porExtenso(hoje)}</p>
            <h1
              className="text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              Marcar a semana
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="chip" onClick={() => setDeslocamento((d) => d - 1)}>
              ← anterior
            </button>
            <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
              {curta(dias[0])} a {curta(dias[6])}
            </span>
            <button
              type="button"
              className="chip"
              onClick={() => setDeslocamento((d) => d + 1)}
              disabled={deslocamento >= 1}
            >
              próxima →
            </button>
            {deslocamento !== 0 && (
              <button type="button" className="chip chip-ativo" onClick={() => setDeslocamento(0)}>
                esta semana
              </button>
            )}
          </div>
        </header>

        <section className="glass-card mb-6 flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
            {eu ? "Marcando como" : "Quem está marcando?"}
          </span>
          {PESSOAS.map((p) => (
            <button
              key={p}
              type="button"
              className={`chip flex items-center gap-2 ${eu === p ? "chip-ativo" : ""}`}
              onClick={() => definirPessoa(p)}
            >
              <span className="quadro-inicial" style={{ background: COR_PESSOA[p] }}>
                {INICIAL[p]}
              </span>
              {p}
            </button>
          ))}
        </section>

        {erro && (
          <p className="mb-4 text-sm" role="alert" style={{ color: "var(--terracotta)" }}>
            {erro}
          </p>
        )}

        <div className="quadro-marcar glass-card p-4 lg:p-6">
          {carregado ? (
            <Grade dias={dias} hoje={hoje} marcacoes={marcacoes} eu={eu} aoAlternar={alternar} />
          ) : (
            <p style={{ color: "var(--ink-soft)" }}>Carregando a semana…</p>
          )}
        </div>

        <p className="mt-4 text-xs" style={{ color: "var(--ink-soft)" }}>
          Clique num círculo pra marcar em seu nome. Clique de novo na sua marca pra desfazer. O que
          for marcado aqui aparece na TV em até 30 segundos.
        </p>
      </div>
    </main>
  );
}
