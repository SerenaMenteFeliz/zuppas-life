"use client";

import { useMemo } from "react";
import { Check } from "@/components/icones";
import { ehDe, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import { porExtenso } from "@/lib/datas";
import { alternarConclusao, useHoje, useZuppas } from "@/lib/store";

/* O dia da Akiane: primeiro, depois.

   Esta é a única tela do app com um público de uma pessoa só, e existe por um
   motivo que estava escrito no vault desde 16/06 sem nunca ter chegado ao
   código: "a Akiane é autista e o dia vai ser interrompido, por isso a rotina
   tem duas camadas". O app inteiro foi desenhado em cima dessa frase e a
   própria Akiane não aparecia nele.

   O formato vem da literatura de agenda visual, e as três coisas que ela pede
   são as três regras desta tela:

   1. **Sequência previsível.** A ordem é a mesma todo dia e não muda de lugar.
   2. **Uma etapa por vez, e a seguinte.** Dois cartões, nada mais. A pergunta
      que a criança está realmente fazendo é o que vem quando isso acabar.
   3. **Feedback claro de conclusão.** Marcar move a etapa pra "já foi", visível,
      sem animação de distração. É a dica de conclusão que reduz a ansiedade de
      transição, não um enfeite.

   Sem contagem, sem porcentagem, sem cobrança. Se o dia foi ruim, a tela não
   fica vermelha: um dia salvo no caos ainda conta. */

export default function Akiane() {
  const estado = useZuppas();
  const hoje = useHoje();

  const concluidas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  /* A sequência dela: o que é dela, o que envolve ela, e o que é da casa e ela
     participa. O alongamento sai daqui sozinho, pelo `exceto`. */
  const sequencia = useMemo(
    () =>
      ocorrenciasDoDia(hoje, estado.itens, estado.compromissos).filter((o) =>
        ehDe(o, "Akiane")
      ),
    [hoje, estado.itens, estado.compromissos]
  );

  const pendentes = sequencia.filter((o) => !concluidas.has(o.chave));
  const feitas = sequencia.filter((o) => concluidas.has(o.chave));

  const agora = pendentes[0];
  const depois = pendentes[1];

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-lg px-5 pt-10">
        <header className="mb-8 text-center">
          <p className="tv-rotulo mb-2">{porExtenso(hoje)}</p>
          <h1
            className="text-4xl"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
          >
            Meu dia
          </h1>
        </header>

        {agora ? (
          <div className="flex flex-col gap-4">
            <section>
              <p
                className="mb-2 text-center text-sm uppercase tracking-[0.2em]"
                style={{ color: "var(--accent)" }}
              >
                Agora
              </p>
              <button
                onClick={() => alternarConclusao(agora.id, hoje, "Akiane")}
                className="passo passo-agora w-full"
              >
                <span className="passo-titulo">{agora.titulo}</span>
                {agora.horario && (
                  <span className="text-lg" style={{ color: "var(--ink-soft)" }}>
                    {agora.horario}
                  </span>
                )}
                <span
                  className="mt-2 rounded-full px-5 py-2.5 text-base"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-foreground)",
                  }}
                >
                  Já fiz
                </span>
              </button>
            </section>

            <section>
              <p
                className="mb-2 text-center text-sm uppercase tracking-[0.2em]"
                style={{ color: "var(--ink-soft)" }}
              >
                Depois
              </p>
              <div className="passo passo-depois">
                <span className="passo-titulo">
                  {depois ? depois.titulo : "Livre"}
                </span>
                {depois?.horario && (
                  <span className="text-lg" style={{ color: "var(--ink-soft)" }}>
                    {depois.horario}
                  </span>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="passo passo-agora">
            <span className="passo-titulo">Acabou tudo</span>
            <span style={{ color: "var(--ink-soft)" }}>Dia livre agora.</span>
          </div>
        )}

        {/* O dia inteiro, pequeno. Previsibilidade é saber que a sequência
            existe e não muda, mesmo quando só duas etapas estão em foco. */}
        {sequencia.length > 0 && (
          <section className="mt-9">
            <p
              className="mb-3 text-center text-xs uppercase tracking-[0.2em]"
              style={{ color: "var(--ink-soft)" }}
            >
              O dia todo
            </p>
            <ul className="flex flex-col gap-1.5">
              {sequencia.map((o) => {
                const feita = concluidas.has(o.chave);
                return (
                  <li
                    key={o.chave}
                    className="glass-card flex items-center gap-3 px-4 py-3"
                    style={{ opacity: feita ? 0.55 : 1 }}
                  >
                    <span
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: feita ? "var(--accent)" : "var(--line)",
                        background: feita ? "var(--accent)" : "transparent",
                        color: "var(--accent-foreground)",
                      }}
                    >
                      {feita && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span
                      className="text-[1.05rem]"
                      style={{ textDecoration: feita ? "line-through" : "none" }}
                    >
                      {o.titulo}
                    </span>
                    {o.horario && (
                      <span
                        className="ml-auto text-sm"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        {o.horario}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {feitas.length > 0 && (
              <p
                className="mt-4 text-center text-sm"
                style={{ color: "var(--ink-soft)" }}
              >
                {feitas.length} {feitas.length === 1 ? "coisa feita" : "coisas feitas"} hoje.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
