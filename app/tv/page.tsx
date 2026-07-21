"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BLOQUEIO_DA_VEZ,
  CITACOES,
  DIAS_FECHADOS,
  NUMEROS,
  PENDENCIAS,
  ROTINAS,
} from "@/lib/mock-data";
import { INICIAL, PESSOAS, type Pessoa } from "@/lib/types";

/* Modo TV — ambiente, sempre ligado.

   A TV da casa fica ligada quase o dia todo e mal é usada. Isso transforma o
   painel de "app que alguém lembra de abrir" em "informação que está no campo
   de visão", e o efeito social é o ponto: pendência parada há dias fica
   visível sem ninguém precisar cobrar.

   Regra que governa esta tela: TV mostra, celular resolve. Nada aqui é
   clicável, nada tem menu, nada exige interação. TV que pede interação vira
   TV desligada em duas semanas.

   Sem scroll: tudo cabe numa tela. O que não couber é cortado de propósito
   com um "+N" — lista longa em TV ninguém lê. */

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Depois do pôr do sol o véu claro vira lâmpada de sala. */
function ehNoite(hora: number) {
  return hora >= 18 || hora < 6;
}

export default function TV() {
  const [agora, setAgora] = useState<Date | null>(null);
  const [citacao, setCitacao] = useState(0);

  useEffect(() => {
    setAgora(new Date());
    const relogio = setInterval(() => setAgora(new Date()), 15000);
    const frase = setInterval(
      () => setCitacao((i) => (i + 1) % CITACOES.length),
      30000
    );
    return () => {
      clearInterval(relogio);
      clearInterval(frase);
    };
  }, []);

  const noite = agora ? ehNoite(agora.getHours()) : false;

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

  const porPessoa = useMemo(() => {
    const mapa = new Map<Pessoa, typeof PENDENCIAS>();
    for (const pessoa of PESSOAS) {
      mapa.set(
        pessoa,
        PENDENCIAS.filter(
          (p) => p.responsavel === pessoa && p.status !== "concluida"
        )
      );
    }
    return mapa;
  }, []);

  const ancoras = ROTINAS.filter((r) => r.ancora);

  const hora = agora
    ? `${String(agora.getHours()).padStart(2, "0")}:${String(
        agora.getMinutes()
      ).padStart(2, "0")}`
    : "--:--";

  const data = agora
    ? `${DIAS[agora.getDay()]}, ${agora.getDate()} de ${MESES[agora.getMonth()]}`
    : "";

  return (
    <div className="tv-bg flex h-screen flex-col p-[2.5vw]">
      {/* Cabeçalho: relógio, data, citação */}
      <header className="flex items-end justify-between gap-8 pb-[2vh]">
        <div>
          <div className="tv-relogio">{hora}</div>
          <div className="tv-rotulo mt-2">{data}</div>
        </div>
        <p
          className="max-w-[38%] text-right"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.9rem, 1.3vw, 1.5rem)",
            lineHeight: 1.3,
            color: "var(--ink-soft)",
            fontStyle: "italic",
          }}
        >
          {CITACOES[citacao]}
        </p>
      </header>

      {/* Corpo: pessoas à esquerda, dia da casa e números à direita */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_26%] gap-[1.6vw]">
        {/* Hoje da casa, por pessoa */}
        <section className="glass-card flex min-h-0 flex-col p-[1.6vw]">
          <h2 className="tv-rotulo mb-[1.6vh]">Hoje da casa</h2>

          <div className="grid min-h-0 flex-1 grid-cols-5 gap-[1.1vw]">
            {PESSOAS.map((pessoa) => {
              const itens = porPessoa.get(pessoa) ?? [];
              const visiveis = itens.slice(0, 4);
              const resto = itens.length - visiveis.length;

              return (
                <div key={pessoa} className="flex min-h-0 flex-col">
                  <div className="mb-[1.2vh] flex items-center gap-2">
                    <span
                      className="flex h-[2.2vw] max-h-9 min-h-7 w-[2.2vw] min-w-7 max-w-9 items-center justify-center rounded-full text-sm font-semibold"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-foreground)",
                      }}
                    >
                      {INICIAL[pessoa]}
                    </span>
                    <span
                      className="truncate"
                      style={{ fontSize: "clamp(0.85rem, 1.1vw, 1.25rem)" }}
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
                    <ul className="flex flex-col gap-[0.9vh]">
                      {visiveis.map((p) => (
                        <li
                          key={p.id}
                          className="tv-item flex gap-2"
                          style={{
                            color:
                              p.status === "bloqueada"
                                ? "var(--terracotta)"
                                : "var(--ink)",
                          }}
                        >
                          <span
                            className="mt-[0.55em] h-[0.4em] w-[0.4em] flex-none rounded-full"
                            style={{
                              background:
                                p.status === "bloqueada"
                                  ? "var(--terracotta)"
                                  : p.status === "em-andamento"
                                    ? "var(--gold)"
                                    : "var(--line)",
                            }}
                          />
                          <span className="line-clamp-3">{p.titulo}</span>
                        </li>
                      ))}
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

        {/* Coluna direita: âncoras + números */}
        <div className="flex min-h-0 flex-col gap-[1.6vh]">
          <section className="glass-card p-[1.4vw]">
            <h2 className="tv-rotulo mb-[1.4vh]">O dia conta se</h2>
            <ul className="flex flex-col gap-[1.1vh]">
              {ancoras.map((r) => (
                <li key={r.id} className="tv-item flex items-center gap-2.5">
                  <span
                    className="h-[0.9em] w-[0.9em] flex-none rounded-full border-2"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <span>{r.titulo}</span>
                </li>
              ))}
            </ul>

            <div className="mt-[1.6vh] flex items-center gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className={`corrente-dia ${
                    i < DIAS_FECHADOS ? "corrente-dia-cheio" : ""
                  }`}
                />
              ))}
              <span
                className="ml-1.5"
                style={{
                  fontSize: "clamp(0.68rem, 0.85vw, 0.95rem)",
                  color: "var(--ink-soft)",
                }}
              >
                {DIAS_FECHADOS} dias seguidos
              </span>
            </div>
          </section>

          <section className="glass-card flex flex-1 flex-col justify-around p-[1.4vw]">
            {NUMEROS.map((n) => (
              <div key={n.rotulo}>
                <div className="tv-numero" style={{ color: "var(--accent)" }}>
                  {n.valor}
                </div>
                <div
                  style={{
                    fontSize: "clamp(0.7rem, 0.9vw, 1rem)",
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

      {/* O bloqueio da vez: uma frase só, que não sai da parede até resolver */}
      <footer className="surface-card-dark mt-[1.6vh] flex items-center gap-[1.6vw] px-[1.8vw] py-[1.8vh]">
        <span
          className="tv-rotulo flex-none"
          style={{ color: "var(--surface-dark-foreground)", opacity: 0.55 }}
        >
          Travando
        </span>
        <span className="tv-titulo">{BLOQUEIO_DA_VEZ.titulo}</span>
        <span
          className="ml-auto flex-none"
          style={{
            fontSize: "clamp(0.75rem, 1vw, 1.1rem)",
            opacity: 0.6,
          }}
        >
          {BLOQUEIO_DA_VEZ.responsavel}
        </span>
      </footer>
    </div>
  );
}
