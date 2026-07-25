"use client";

import { useEffect, useMemo, useState } from "react";
import {
  corrente,
  donoNoDia,
  ehDe,
  estadoDa,
  indexar,
  melhorCorrente,
  ocorrenciasDoDia,
} from "@/lib/agenda";
import { CITACOES, NUMEROS } from "@/lib/dados";
import { haQuantoTempo, horaDoDia, horaISO, porExtenso } from "@/lib/datas";
import { useHoje, useZuppas } from "@/lib/store";
import { INICIAL, PESSOAS, type Ocorrencia, type Pessoa } from "@/lib/types";

/* Modo TV: ambiente, sempre ligado.

   A TV da casa fica ligada quase o dia todo e mal é usada. Isso transforma o
   painel de "app que alguém lembra de abrir" em "informação que está no campo
   de visão", e o efeito social é o ponto: coisa parada há dias fica visível sem
   ninguém precisar cobrar.

   Regra que governa esta tela: TV mostra, celular resolve. Nada aqui é
   clicável, nada tem menu, nada exige interação. TV que pede interação vira TV
   desligada em duas semanas.

   Sem scroll: tudo cabe numa tela. O que não couber é cortado com um "+N", e o
   corte tem critério (o que está em aberto vem antes), porque lista longa em TV
   ninguém lê e corte arbitrário esconde justamente o que importa. */

/** De quantas em quantas horas a página se recarrega sozinha.

    Não é paranoia: dashboard aberto 24 horas por dia vaza memória até o
    navegador engasgar, e o Wake Lock cai sozinho quando a aba deixa de estar
    visível. Uma parede que congela no dia anterior mente pra casa inteira, e
    depois disso ninguém confia mais nela. Recarregar de madrugada é barato. */
const HORAS_ATE_RECARREGAR = 6;

function ehNoite(hora: number) {
  return hora >= 18 || hora < 6;
}

export default function TV() {
  const estado = useZuppas();
  const hoje = useHoje();

  const [relogio, setRelogio] = useState(horaISO);
  const [citacao, setCitacao] = useState(0);

  useEffect(() => {
    const tique = setInterval(() => setRelogio(horaISO()), 15_000);
    const frase = setInterval(
      () => setCitacao((i) => (i + 1) % CITACOES.length),
      30_000
    );
    return () => {
      clearInterval(tique);
      clearInterval(frase);
    };
  }, []);

  /* Recarga programada. Roda uma vez por montagem e se reagenda no reload. */
  useEffect(() => {
    const id = setTimeout(
      () => window.location.reload(),
      HORAS_ATE_RECARREGAR * 60 * 60 * 1000
    );
    return () => clearTimeout(id);
  }, []);

  const noite = ehNoite(horaDoDia());

  /* O tema é trocado na raiz do documento pra que os tokens do véu escuro
     valham pra tudo dentro, sem duplicar variável por componente. */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("theme-casa-noite", noite);
    raiz.classList.toggle("theme-casa", !noite);
    return () => {
      raiz.classList.remove("theme-casa-noite");
      raiz.classList.add("theme-casa");
    };
  }, [noite]);

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);
  const concluidas = marcas.feitas;

  const doDia = useMemo(
    () => ocorrenciasDoDia(hoje, estado.itens, estado.compromissos),
    [hoje, estado.itens, estado.compromissos]
  );

  /* Por pessoa: em aberto primeiro, e dentro disso a ordem natural do dia. O
     que já foi feito não some, fica no fim e apagado, porque ver o que a casa
     cumpriu é metade do valor da parede. */
  const porPessoa = useMemo(() => {
    const mapa = new Map<Pessoa, Ocorrencia[]>();
    for (const pessoa of PESSOAS) {
      const dela = doDia.filter((o) => ehDe(o, pessoa));
      const abertas = dela.filter((o) => estadoDa(o.chave, marcas) === "aberto");
      const resolvidas = dela.filter((o) => estadoDa(o.chave, marcas) !== "aberto");
      mapa.set(pessoa, [...abertas, ...resolvidas]);
    }
    return mapa;
  }, [doDia, marcas]);

  const ancoras = doDia.filter((o) => o.ancora);
  const dias = useMemo(
    () => corrente(hoje, estado.itens, concluidas, estado.preferencias.folgaSemanal),
    [hoje, estado.itens, concluidas, estado.preferencias.folgaSemanal]
  );
  const recorde = useMemo(
    () => melhorCorrente(hoje, estado.itens, concluidas),
    [hoje, estado.itens, concluidas]
  );

  const compromissos = doDia.filter(
    (o) => o.categoria === "compromisso" || o.categoria === "lembrete"
  );

  const rodizios = estado.itens.filter((i) => i.rodizio && i.rodizio.length > 0);

  const bloqueio = estado.pendencias.find(
    (p) => p.bloqueio && p.status !== "concluida"
  );

  /* A pendência mais esquecida da casa. É a mecânica social em uma linha: não
     acusa ninguém, só deixa de esconder. */
  const maisParada = useMemo(() => {
    const abertas = estado.pendencias.filter((p) => p.status !== "concluida");
    return abertas.reduce<(typeof abertas)[number] | undefined>(
      (pior, p) => (!pior || p.atualizado < pior.atualizado ? p : pior),
      undefined
    );
  }, [estado.pendencias]);

  return (
    <div className="tv-bg flex h-screen flex-col p-[2.2vw]">
      <header className="flex items-end justify-between gap-8 pb-[1.6vh]">
        <div>
          <div className="tv-relogio">{relogio}</div>
          <div className="tv-rotulo mt-1">{porExtenso(hoje)}</div>
        </div>

        <div className="flex items-center gap-[2vw]">
          <div className="text-right">
            <div className="tv-numero" style={{ color: "var(--accent)" }}>
              {dias}
            </div>
            <div className="tv-rotulo">
              {dias === 1 ? "dia seguido" : "dias seguidos"}
              {recorde > 0 && dias < recorde ? ` · recorde ${recorde}` : ""}
            </div>
          </div>
          <p
            className="so-modo-cheio max-w-[26vw] text-right"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.9rem, 1.25vw, 1.5rem)",
              lineHeight: 1.3,
              color: "var(--ink-soft)",
              fontStyle: "italic",
            }}
          >
            {CITACOES[citacao]}
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_25%] gap-[1.4vw]">
        {/* Hoje da casa, por pessoa */}
        <section className="glass-card flex min-h-0 flex-col p-[1.4vw]">
          <h2 className="tv-rotulo mb-[1.4vh]">Hoje da casa</h2>

          <div className="grid min-h-0 flex-1 grid-cols-6 gap-[0.9vw]">
            {PESSOAS.map((pessoa) => {
              const itens = porPessoa.get(pessoa) ?? [];
              const visiveis = itens.slice(0, 5);
              const resto = itens.length - visiveis.length;

              return (
                <div key={pessoa} className="flex min-h-0 flex-col">
                  <div className="mb-[1vh] flex items-center gap-1.5">
                    <span
                      className="flex h-[2vw] max-h-8 min-h-6 w-[2vw] min-w-6 max-w-8 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-foreground)",
                      }}
                    >
                      {INICIAL[pessoa]}
                    </span>
                    <span
                      className="truncate"
                      style={{ fontSize: "clamp(0.8rem, 1vw, 1.15rem)" }}
                    >
                      {pessoa}
                    </span>
                  </div>

                  {itens.length === 0 ? (
                    <p
                      className="tv-item"
                      style={{ color: "var(--ink-soft)", opacity: 0.6 }}
                    >
                      livre
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-[0.7vh]">
                      {visiveis.map((o) => {
                        const feita = concluidas.has(o.chave);
                        return (
                          <li
                            key={o.chave}
                            className="tv-item flex gap-1.5"
                            style={{
                              opacity: feita ? 0.4 : 1,
                              textDecoration: feita ? "line-through" : "none",
                            }}
                          >
                            <span
                              className="mt-[0.55em] h-[0.38em] w-[0.38em] flex-none rounded-full"
                              style={{
                                background: feita
                                  ? "var(--accent)"
                                  : o.ancora
                                    ? "var(--gold)"
                                    : "var(--line)",
                              }}
                            />
                            <span className="line-clamp-2">{o.titulo}</span>
                          </li>
                        );
                      })}
                      {resto > 0 && (
                        <li
                          className="tv-item"
                          style={{ color: "var(--ink-soft)", opacity: 0.7 }}
                        >
                          +{resto}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Coluna direita */}
        <div className="flex min-h-0 flex-col gap-[1.2vh]">
          <section className="glass-card p-[1.1vw]">
            <h2 className="tv-rotulo mb-[1vh]">O dia conta se</h2>
            <ul className="flex flex-col gap-[0.8vh]">
              {ancoras.map((o) => {
                const feita = concluidas.has(o.chave);
                return (
                  <li key={o.chave} className="tv-item flex items-center gap-2">
                    <span
                      className="h-[0.85em] w-[0.85em] flex-none rounded-full border-2"
                      style={{
                        borderColor: feita ? "var(--accent)" : "var(--line)",
                        background: feita ? "var(--accent)" : "transparent",
                      }}
                    />
                    <span style={{ opacity: feita ? 0.45 : 1 }}>{o.titulo}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {compromissos.length > 0 && (
            <section className="glass-card p-[1.1vw]">
              <h2 className="tv-rotulo mb-[1vh]">Marcado pra hoje</h2>
              <ul className="flex flex-col gap-[0.8vh]">
                {compromissos.slice(0, 4).map((o) => (
                  <li key={o.chave} className="tv-item flex items-baseline gap-2">
                    {o.horario && (
                      <span style={{ color: "var(--accent)" }}>{o.horario}</span>
                    )}
                    <span className="line-clamp-2">{o.titulo}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="glass-card p-[1.1vw]">
            <h2 className="tv-rotulo mb-[1vh]">Da vez esta semana</h2>
            <ul className="flex flex-col gap-[0.7vh]">
              {rodizios.map((item) => (
                <li key={item.id} className="tv-item flex items-baseline gap-2">
                  <span style={{ color: "var(--accent)" }}>
                    {donoNoDia(item, hoje)}
                  </span>
                  <span
                    className="line-clamp-1"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {item.titulo}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="so-modo-cheio glass-card flex flex-1 flex-col justify-around p-[1.1vw]">
            {NUMEROS.map((n) => (
              <div key={n.rotulo}>
                <div className="tv-numero" style={{ color: "var(--accent)" }}>
                  {n.valor}
                </div>
                <div
                  style={{
                    fontSize: "clamp(0.68rem, 0.85vw, 0.95rem)",
                    color: "var(--ink-soft)",
                  }}
                >
                  {n.rotulo} · {n.detalhe}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* O bloqueio da vez e o item mais esquecido, lado a lado */}
      <footer className="surface-card-dark mt-[1.2vh] flex items-center gap-[1.6vw] px-[1.6vw] py-[1.5vh]">
        {bloqueio && (
          <>
            <span
              className="tv-rotulo flex-none"
              style={{ color: "var(--surface-dark-foreground)", opacity: 0.55 }}
            >
              Travando
            </span>
            <span className="tv-titulo line-clamp-1">{bloqueio.titulo}</span>
          </>
        )}

        {maisParada && (
          <span
            className="ml-auto flex-none text-right"
            style={{
              fontSize: "clamp(0.72rem, 0.95vw, 1.05rem)",
              opacity: 0.6,
            }}
          >
            mais parada: {maisParada.titulo} · {maisParada.responsavel} ·{" "}
            {haQuantoTempo(maisParada.atualizado, hoje)}
          </span>
        )}
      </footer>
    </div>
  );
}
