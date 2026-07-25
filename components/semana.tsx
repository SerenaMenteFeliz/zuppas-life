"use client";

import Linha from "./Linha";
import { Avatar } from "./ui";
import { COR_BLOCO, ICONE_BLOCO, Marca } from "./visual";
import { Relogio } from "./icones";
import { estadoDa, type Marcas } from "@/lib/agenda";
import { curta, nomeDoDiaCurto, porExtenso } from "@/lib/datas";
import { BLOCOS, BLOCO_LABEL, corDoDono, type Bloco, type Ocorrencia } from "@/lib/types";

/* As três formas de olhar a semana.

   A pesquisa de agenda é consistente: não existe uma visão certa, existem
   perfis de leitura diferentes, e as ferramentas boas oferecem camadas (visão
   comprimida pra navegar, visão detalhada pra planejar). Aqui são três, e cada
   uma responde a uma pergunta:

   - **Blocos** — "como é a forma da semana?" Manhã, tarde e noite viram três
     faixas atravessando os sete dias. É a estrutura de [[Painel - Hoje]]
     esticada na horizontal, e é a que mostra buraco e acúmulo de relance: uma
     terça com a tarde cheia e a manhã vazia se lê sem contar nada.
   - **Colunas** — "o que tem em cada dia?" Um cartão por dia, com detalhe.
   - **Lista** — "o que vem a seguir?" Tudo em ordem, do jeito que cabe num
     celular sem rolagem lateral.

   O quadro branco da sala, descrito na [[Rotina - Família (Semana 1)]], é
   exatamente a visão Blocos: linhas de bloco por colunas de dia. A tela nasceu
   copiando o que a casa já tinha desenhado no papel. */

interface Props {
  dias: string[];
  hoje: string;
  porDia: { dia: string; lista: Ocorrencia[] }[];
  marcas: Marcas;
  aoAlternar: (o: Ocorrencia, dia: string) => void;
  aoAbrirDia?: (dia: string) => void;
}

/* ── Blocos ──────────────────────────────────────────────────────────────── */

export function VisaoBlocos({ hoje, porDia, marcas, aoAlternar, aoAbrirDia }: Props) {
  return (
    <div className="grade-rolagem">
      <div className="grade-semana">
        {/* Canto vazio + cabeçalho dos dias */}
        <div className="grade-canto" />
        {porDia.map(({ dia, lista }) => {
          const feitas = lista.filter((o) => marcas.feitas.has(o.chave)).length;
          const fracao = lista.length === 0 ? 0 : feitas / lista.length;
          const ehHoje = dia === hoje;

          return (
            <button
              key={`cab-${dia}`}
              onClick={() => aoAbrirDia?.(dia)}
              className="grade-cabecalho"
              style={{
                borderColor: ehHoje ? "var(--accent)" : "transparent",
              }}
              aria-label={`Abrir ${porExtenso(dia)}`}
            >
              <span
                className="text-[0.62rem] uppercase tracking-widest"
                style={{ color: ehHoje ? "var(--accent)" : "var(--ink-soft)" }}
              >
                {nomeDoDiaCurto(dia)}
              </span>
              <span className="text-lg leading-none" style={{ fontFamily: "var(--font-display)" }}>
                {dia.slice(8, 10)}
              </span>
              <span className="mt-1 block h-[3px] w-full rounded-full" style={{ background: "var(--line)" }}>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${fracao * 100}%`, background: "var(--accent)" }}
                />
              </span>
            </button>
          );
        })}

        {/* Uma linha por bloco do dia */}
        {BLOCOS.map((bloco) => {
          const Icone = ICONE_BLOCO[bloco];
          return (
            <FragmentoBloco
              key={bloco}
              bloco={bloco}
              Icone={Icone}
              porDia={porDia}
              hoje={hoje}
              marcas={marcas}
              aoAlternar={aoAlternar}
            />
          );
        })}
      </div>
    </div>
  );
}

function FragmentoBloco({
  bloco,
  Icone,
  porDia,
  hoje,
  marcas,
  aoAlternar,
}: {
  bloco: Bloco;
  Icone: (p: { className?: string }) => React.ReactElement;
  porDia: { dia: string; lista: Ocorrencia[] }[];
  hoje: string;
  marcas: Marcas;
  aoAlternar: (o: Ocorrencia, dia: string) => void;
}) {
  return (
    <>
      <div className="grade-rotulo" style={{ borderLeftColor: COR_BLOCO[bloco] }}>
        <span style={{ color: COR_BLOCO[bloco] }}>
          <Icone className="h-4 w-4" />
        </span>
        <span className="text-[0.72rem]">{BLOCO_LABEL[bloco]}</span>
      </div>

      {porDia.map(({ dia, lista }) => {
        const doBloco = lista.filter((o) => o.bloco === bloco);
        return (
          <div
            key={`${bloco}-${dia}`}
            className="grade-celula"
            style={{
              background: dia === hoje ? "var(--glass-strong)" : undefined,
            }}
          >
            {doBloco.length === 0 ? (
              <span className="grade-vazio" aria-hidden="true">
                ·
              </span>
            ) : (
              doBloco.map((o) => {
                const est = estadoDa(o.chave, marcas);
                return (
                  <button
                    key={o.chave}
                    onClick={() => aoAlternar(o, dia)}
                    className="grade-item"
                    style={{
                      borderLeftColor: corDoDono(o.dono),
                      opacity: est === "aberto" ? 1 : 0.42,
                      textDecoration: est === "aberto" ? "none" : "line-through",
                    }}
                    title={`${o.titulo} · ${o.dono}${o.horario ? ` · ${o.horario}` : ""}`}
                    aria-label={`${o.titulo}, ${o.dono}, ${porExtenso(dia)}`}
                  >
                    {o.horario && (
                      <span className="grade-hora">{o.horario}</span>
                    )}
                    <span className="grade-titulo">{o.titulo}</span>
                  </button>
                );
              })
            )}
          </div>
        );
      })}
    </>
  );
}

/* ── Colunas ─────────────────────────────────────────────────────────────── */

export function VisaoColunas({ hoje, porDia, marcas, aoAlternar, aoAbrirDia }: Props) {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-7 lg:items-start lg:gap-3">
      {porDia.map(({ dia, lista }) => {
        const ehHoje = dia === hoje;
        const passou = dia < hoje;
        const feitas = lista.filter((o) => marcas.feitas.has(o.chave)).length;
        const abertas = lista.filter((o) => estadoDa(o.chave, marcas) === "aberto").length;
        const fracao = lista.length === 0 ? 0 : feitas / lista.length;

        return (
          <section
            key={dia}
            className={`glass-card overflow-hidden ${ehHoje ? "glass-card-strong" : ""}`}
            style={{
              borderColor: ehHoje ? "var(--accent)" : undefined,
              opacity: passou && abertas === 0 ? 0.55 : 1,
            }}
          >
            <div style={{ height: 3, background: "var(--line)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${fracao * 100}%`,
                  background: "var(--accent)",
                  transition: "width 0.25s ease",
                }}
              />
            </div>

            <div className="p-3.5">
              <header className="mb-2.5 flex items-baseline justify-between gap-2">
                <button
                  onClick={() => aoAbrirDia?.(dia)}
                  className="text-left"
                  aria-label={`Abrir ${porExtenso(dia)}`}
                >
                  <p
                    className="text-[0.68rem] uppercase tracking-widest"
                    style={{ color: ehHoje ? "var(--accent)" : "var(--ink-soft)" }}
                  >
                    {nomeDoDiaCurto(dia)}
                  </p>
                  <p
                    className="text-lg leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {dia.slice(8, 10)}
                  </p>
                </button>
                {abertas > 0 && (
                  <span className="parada">
                    {abertas} aberta{abertas > 1 ? "s" : ""}
                  </span>
                )}
              </header>

              {lista.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--ink-soft)", opacity: 0.7 }}>
                  livre
                </p>
              ) : (
                BLOCOS.map((bloco) => {
                  const doBloco = lista.filter((o) => o.bloco === bloco);
                  if (doBloco.length === 0) return null;
                  const Icone = ICONE_BLOCO[bloco];

                  return (
                    <div key={bloco} className="mb-2.5 last:mb-0">
                      <p
                        className="mb-1 flex items-center gap-1 text-[0.6rem] uppercase tracking-widest"
                        style={{ color: COR_BLOCO[bloco] }}
                      >
                        <Icone className="h-3 w-3" />
                        {BLOCO_LABEL[bloco]}
                      </p>

                      <ul className="flex flex-col gap-1">
                        {doBloco.map((o) => {
                          const est = estadoDa(o.chave, marcas);
                          return (
                            <li key={o.chave}>
                              <button
                                onClick={() => aoAlternar(o, dia)}
                                className="flex w-full items-start gap-1.5 rounded-lg py-0.5 text-left"
                                aria-pressed={est === "feito"}
                                aria-label={`Marcar ${o.titulo} em ${curta(dia)}`}
                              >
                                <Marca categoria={o.categoria} tamanho={16} />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className="block text-[0.78rem] leading-snug"
                                    style={{
                                      opacity: est === "aberto" ? 1 : 0.45,
                                      textDecoration:
                                        est === "aberto" ? "none" : "line-through",
                                    }}
                                  >
                                    {o.titulo}
                                  </span>
                                  <span
                                    className="flex items-center gap-1 text-[0.62rem]"
                                    style={{ color: corDoDono(o.dono) }}
                                  >
                                    {o.horario ? `${o.horario} · ` : ""}
                                    {o.dono}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ── Lista ───────────────────────────────────────────────────────────────── */

export function VisaoLista({ hoje, porDia, marcas, aoAlternar, aoAbrirDia }: Props) {
  const comCoisa = porDia.filter((d) => d.lista.length > 0);

  if (comCoisa.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Semana livre neste filtro.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {comCoisa.map(({ dia, lista }) => (
        <section key={dia}>
          <button
            onClick={() => aoAbrirDia?.(dia)}
            className="mb-2 flex w-full items-baseline gap-2 text-left"
          >
            <span
              className="text-[0.95rem]"
              style={{
                fontFamily: "var(--font-display)",
                color: dia === hoje ? "var(--accent)" : "var(--ink)",
              }}
            >
              {porExtenso(dia)}
            </span>
            {dia === hoje && (
              <span className="text-[0.68rem]" style={{ color: "var(--accent)" }}>
                hoje
              </span>
            )}
            <span className="ml-auto text-[0.68rem]" style={{ color: "var(--ink-soft)" }}>
              {lista.length}
            </span>
          </button>

          <ul className="flex flex-col gap-1.5">
            {lista.map((o) => {
              const est = estadoDa(o.chave, marcas);
              return (
                <li key={o.chave}>
                  <button
                    onClick={() => aoAlternar(o, dia)}
                    className="glass-card flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                    style={{ opacity: est === "aberto" ? 1 : 0.5 }}
                    aria-pressed={est === "feito"}
                  >
                    <Marca categoria={o.categoria} tamanho={26} />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[0.92rem] leading-snug"
                        style={{
                          textDecoration: est === "aberto" ? "none" : "line-through",
                        }}
                      >
                        {o.titulo}
                      </span>
                      {o.horario && (
                        <span
                          className="flex items-center gap-1 text-[0.68rem]"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          <Relogio />
                          {o.horario}
                        </span>
                      )}
                    </span>
                    <Avatar dono={o.dono} tamanho={24} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Reexporta a linha completa, pra tela de dia usar o mesmo componente do Hoje. */
export { Linha };
