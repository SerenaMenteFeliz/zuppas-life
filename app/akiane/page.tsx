"use client";

import { useMemo } from "react";
import { Check, Pular } from "@/components/icones";
import { Marca } from "@/components/visual";
import { ehDe, estadoDa, indexar, ocorrenciasDoDia, quemFez } from "@/lib/agenda";
import { porExtenso } from "@/lib/datas";
import { alternarConclusao, pular, useHoje, useZuppas } from "@/lib/store";
import { type Ocorrencia } from "@/lib/types";

/* O dia da Akiane: primeiro, depois.

   Esta é a única tela do app com um público de uma pessoa só, e existe por um
   motivo que estava escrito no vault desde 16/06 sem nunca ter chegado ao
   código: "a Akiane é autista e o dia vai ser interrompido, por isso a rotina
   tem duas camadas". O app inteiro foi desenhado em cima dessa frase e a
   própria Akiane não aparecia nele.

   O formato vem da literatura de agenda visual, e as regras da tela são:

   1. **Sequência previsível.** A ordem é a mesma todo dia e não muda de lugar.
   2. **Uma etapa por vez, e a seguinte.** Dois cartões. A pergunta que a
      criança está realmente fazendo é o que vem quando isso acabar.
   3. **Feedback claro de conclusão.** Marcar move a etapa pra "já foi",
      visível, sem animação de distração.
   4. **Poder sair da etapa.** Adicionado em 24/07 e é a correção mais
      importante daquela rodada: antes só existia "já fiz" ou nada, e uma etapa
      que não vai acontecer travava a sequência inteira. Ficar preso é pior que
      não ter agenda, e pular aqui não é falha, é seguir em frente.

   5. **A sequência é marcada à mão, não deduzida.** Correção de 25/07, e sem
      ela esta tela teria quebrado no mesmo dia. Ela montava o dia dela pegando
      "o que é dela ou da casa"; quando a casa inteira virou mural, isso passaria
      a listar mercado, banheiro e louça pra uma criança autista. Agora cada item
      diz se é dela. São poucos de propósito.

   6. **"Fiz junto".** Ela participa de coisa que não faz sozinha, e agora que
      uma tarefa aceita várias pessoas, ela pode se somar ao que a casa já fez.
      Fica no fim, quieto, e só mostra o que realmente aconteceu hoje: é uma
      lista curta por construção, e cada linha é uma coisa boa que já rolou.

   Sem contagem de cobrança, sem porcentagem, sem vermelho. Se o dia foi ruim,
   a tela não briga: um dia salvo no caos ainda conta. */

/** A sequência dela: o que foi marcado como dela no modelo, mais compromisso
    agendado no nome dela (dentista, terapia). Fora do componente porque não
    depende de nada da tela. */
function daAkiane(o: Ocorrencia): boolean {
  return Boolean(o.akiane) || ehDe(o, "Akiane");
}

export default function Akiane() {
  const estado = useZuppas();
  const hoje = useHoje();

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  const doDia = useMemo(
    () => ocorrenciasDoDia(hoje, estado.itens, estado.compromissos),
    [hoje, estado.itens, estado.compromissos]
  );

  const sequencia = useMemo(() => doDia.filter(daAkiane), [doDia]);

  /* O que a casa já fez hoje e ela pode dizer que ajudou. */
  const ajudou = useMemo(
    () => doDia.filter((o) => !daAkiane(o) && marcas.feitas.has(o.chave)),
    [doDia, marcas]
  );

  const pendentes = sequencia.filter((o) => estadoDa(o.chave, marcas) === "aberto");
  const resolvidas = sequencia.length - pendentes.length;

  const agora = pendentes[0];
  const depois = pendentes[1];

  return (
    <main className="veil-bg pb-32">
      <div className="mx-auto w-full max-w-lg px-5 pt-10">
        <header className="mb-7 text-center">
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

              <div className="passo passo-agora">
                <Marca categoria={agora.categoria} tamanho={52} />
                <span className="passo-titulo">{agora.titulo}</span>
                {agora.horario && (
                  <span className="text-lg" style={{ color: "var(--ink-soft)" }}>
                    {agora.horario}
                  </span>
                )}

                <div className="mt-3 flex w-full flex-col gap-2">
                  <button
                    onClick={() => alternarConclusao(agora.id, hoje, "Akiane")}
                    className="botao-grande"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-foreground)",
                    }}
                  >
                    <Check className="h-6 w-6" />
                    Já fiz
                  </button>

                  <button
                    onClick={() => pular(agora.id, hoje, "Akiane")}
                    className="botao-grande"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--line)",
                      color: "var(--ink-soft)",
                    }}
                  >
                    <Pular className="h-5 w-5" />
                    Agora não
                  </button>
                </div>
              </div>
            </section>

            <section>
              <p
                className="mb-2 text-center text-sm uppercase tracking-[0.2em]"
                style={{ color: "var(--ink-soft)" }}
              >
                Depois
              </p>
              <div className="passo passo-depois">
                {depois && <Marca categoria={depois.categoria} tamanho={40} />}
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
            existe e não muda, mesmo quando só duas etapas estão em foco.
            Tocar aqui volta atrás, porque marcar por engano acontece. */}
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
                const est = estadoDa(o.chave, marcas);
                return (
                  <li key={o.chave}>
                    <button
                      onClick={() => alternarConclusao(o.id, hoje, "Akiane")}
                      className="glass-card flex w-full items-center gap-3 px-4 py-3 text-left"
                      style={{ opacity: est === "aberto" ? 1 : 0.55 }}
                    >
                      <span
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2"
                        style={{
                          borderColor:
                            est === "feito" ? "var(--accent)" : "var(--line)",
                          background:
                            est === "feito" ? "var(--accent)" : "transparent",
                          color: "var(--accent-foreground)",
                        }}
                      >
                        {est === "feito" && <Check className="h-3.5 w-3.5" />}
                        {est === "pulado" && (
                          <Pular className="h-3 w-3" />
                        )}
                      </span>

                      <Marca categoria={o.categoria} tamanho={26} />

                      <span
                        className="flex-1 text-[1.05rem]"
                        style={{
                          textDecoration: est === "aberto" ? "none" : "line-through",
                        }}
                      >
                        {o.titulo}
                      </span>

                      {o.horario && (
                        <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
                          {o.horario}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {resolvidas > 0 && (
              <p
                className="mt-4 text-center text-sm"
                style={{ color: "var(--ink-soft)" }}
              >
                {resolvidas} de {sequencia.length} já {resolvidas === 1 ? "resolvida" : "resolvidas"} hoje.
              </p>
            )}
          </section>
        )}

        {ajudou.length > 0 && (
          <section className="mt-9">
            <p
              className="mb-3 text-center text-xs uppercase tracking-[0.2em]"
              style={{ color: "var(--ink-soft)" }}
            >
              Ajudei nisso
            </p>

            <ul className="flex flex-col gap-1.5">
              {ajudou.map((o) => {
                const comigo = quemFez(o.chave, marcas).includes("Akiane");
                return (
                  <li key={o.chave}>
                    <button
                      onClick={() => alternarConclusao(o.id, hoje, "Akiane")}
                      className="glass-card flex w-full items-center gap-3 px-4 py-3 text-left"
                      aria-pressed={comigo}
                      aria-label={
                        comigo
                          ? `Tirar você de ${o.titulo}`
                          : `Eu ajudei em ${o.titulo}`
                      }
                    >
                      <span
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: comigo ? "var(--accent)" : "var(--line)",
                          background: comigo ? "var(--accent)" : "transparent",
                          color: "var(--accent-foreground)",
                        }}
                      >
                        {comigo && <Check className="h-3.5 w-3.5" />}
                      </span>

                      <Marca categoria={o.categoria} tamanho={26} />

                      <span className="flex-1 text-[1.05rem]">{o.titulo}</span>

                      <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                        {comigo ? "ajudei" : "ajudei?"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
