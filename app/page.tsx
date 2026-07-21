"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BLOQUEIO_DA_VEZ,
  DIAS_FECHADOS,
  LEMBRETES,
  LISTA_CASA,
  PENDENCIAS,
  ROTINAS,
} from "@/lib/mock-data";
import { PESSOAS, type Pessoa } from "@/lib/types";

/* Tela do celular — "Hoje, e é meu".

   Coluna única, sem kanban, sem filtro de projeto na entrada. O login já
   responde "quem sou eu", então a tela não começa pedindo escolha. O que a
   Liz abre às 7h não é um quadro de trabalho: é a resposta pra "tem alguma
   coisa minha hoje?". */

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function saudacao(hora: number) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Corrente de constância. Exposta de propósito: ninguém quer quebrá-la. */
function Corrente({ dias }: { dias: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className={`corrente-dia ${i < dias ? "corrente-dia-cheio" : ""}`}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
        {dias === 0
          ? "a corrente começa hoje"
          : `${dias} dia${dias > 1 ? "s" : ""} seguidos`}
      </span>
    </div>
  );
}

export default function Home() {
  /* Enquanto não existe auth, a pessoa é escolhida na mão. Some na fase 2. */
  const [eu, setEu] = useState<Pessoa>("Liz");
  const [feitas, setFeitas] = useState<string[]>([]);
  const [verCasa, setVerCasa] = useState(false);

  /* Data resolvida só no cliente: evita divergência de hidratação entre o
     relógio do servidor e o do aparelho. */
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => setAgora(new Date()), []);

  const minhas = useMemo(
    () =>
      PENDENCIAS.filter(
        (p) => p.responsavel === eu && p.status !== "concluida"
      ),
    [eu]
  );

  const meusLembretes = useMemo(
    () => LEMBRETES.filter((l) => l.para === eu || l.para === "Casa"),
    [eu]
  );

  const ancoras = ROTINAS.filter((r) => r.ancora);
  const todasFeitas = feitas.length === ancoras.length;
  const corrente = DIAS_FECHADOS + (todasFeitas ? 1 : 0);

  function alternar(id: string) {
    setFeitas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  }

  return (
    <main className="veil-bg pb-24">
      <div className="mx-auto w-full max-w-md px-5 pt-10">
        {/* Cabeçalho */}
        <header className="mb-8">
          <p className="tv-rotulo mb-2" style={{ letterSpacing: "0.14em" }}>
            {agora
              ? `${DIAS[agora.getDay()]}, ${agora.getDate()} de ${MESES[agora.getMonth()]}`
              : " "}
          </p>
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
          >
            {agora ? saudacao(agora.getHours()) : "Olá"}, {eu}.
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            {minhas.length === 0
              ? "Nada é seu hoje. Aproveita."
              : `${minhas.length} ${minhas.length === 1 ? "coisa é sua" : "coisas são suas"} hoje.`}
          </p>
        </header>

        {/* Âncoras do dia */}
        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="tv-rotulo">O dia da casa</h2>
            <Corrente dias={corrente} />
          </div>

          <div className="glass-card glass-card-strong overflow-hidden p-1.5">
            {ancoras.map((r, i) => {
              const feita = feitas.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => alternar(r.id)}
                  className={`ancora ${feita ? "ancora-feita" : ""}`}
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                    borderRadius: 0,
                  }}
                  aria-pressed={feita}
                >
                  <span
                    className="ancora-marca"
                    style={{ color: "var(--accent-foreground)" }}
                  >
                    {feita ? <Check /> : null}
                  </span>
                  <span className="flex flex-col">
                    <span className="ancora-titulo text-[1.05rem] leading-tight">
                      {r.titulo}
                    </span>
                    {r.horario && (
                      <span
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        {r.horario}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {todasFeitas && (
            <p
              className="mt-3 text-center text-sm"
              style={{ color: "var(--accent)" }}
            >
              As três fechadas. O dia contou.
            </p>
          )}
        </section>

        {/* O que é meu */}
        <section className="mb-8">
          <h2 className="tv-rotulo mb-3">É seu</h2>

          {minhas.length === 0 ? (
            <div className="glass-card p-5 text-center">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Nenhuma pendência sua.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {minhas.map((p) => (
                <li key={p.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[1.02rem] leading-snug">{p.titulo}</span>
                    {p.status === "bloqueada" && (
                      <span
                        className="mt-0.5 flex-none rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-wider"
                        style={{
                          background: "var(--terracotta)",
                          color: "#fff",
                        }}
                      >
                        travada
                      </span>
                    )}
                  </div>
                  {p.nota && (
                    <p
                      className="mt-1.5 text-[0.82rem] leading-snug"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {p.nota}
                    </p>
                  )}
                  <p
                    className="mt-2 text-[0.7rem] uppercase tracking-wider"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {p.projeto}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Lembretes */}
        {meusLembretes.length > 0 && (
          <section className="mb-8">
            <h2 className="tv-rotulo mb-3">Não esquecer</h2>
            <ul className="flex flex-col gap-2">
              {meusLembretes.map((l) => (
                <li
                  key={l.id}
                  className="glass-card flex items-center gap-3 p-4"
                >
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: "var(--gold)" }}
                  />
                  <span className="text-[0.98rem]">{l.titulo}</span>
                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {l.quando.slice(8, 10)}/{l.quando.slice(5, 7)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Lista da casa */}
        <section className="mb-8">
          <h2 className="tv-rotulo mb-3">Lista da casa</h2>
          <div className="glass-card p-4">
            <ul className="flex flex-col gap-2.5">
              {LISTA_CASA.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5">
                  <span
                    className="h-4 w-4 flex-none rounded-full border"
                    style={{
                      borderColor: item.feito ? "var(--accent)" : "var(--line)",
                      background: item.feito ? "var(--accent)" : "transparent",
                    }}
                  />
                  <span
                    className="text-[0.95rem]"
                    style={{
                      opacity: item.feito ? 0.45 : 1,
                      textDecoration: item.feito ? "line-through" : "none",
                    }}
                  >
                    {item.titulo}
                  </span>
                  <span
                    className="ml-auto text-[0.7rem]"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {item.por}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* A casa toda */}
        <section className="mb-8">
          <button
            onClick={() => setVerCasa((v) => !v)}
            className="glass-card w-full p-4 text-left text-sm"
          >
            {verCasa ? "Esconder a casa toda" : "Ver a casa toda"}
          </button>

          {verCasa && (
            <div className="mt-3 flex flex-col gap-3">
              {PESSOAS.filter((p) => p !== eu).map((pessoa) => {
                const dela = PENDENCIAS.filter(
                  (p) => p.responsavel === pessoa && p.status !== "concluida"
                );
                if (dela.length === 0) return null;
                return (
                  <div key={pessoa} className="glass-card p-4">
                    <p className="tv-rotulo mb-2">
                      {pessoa} · {dela.length}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {dela.map((p) => (
                        <li
                          key={p.id}
                          className="text-[0.9rem] leading-snug"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          {p.titulo}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* O bloqueio da vez */}
        <section className="mb-10">
          <div className="surface-card-dark p-5">
            <p
              className="tv-rotulo mb-2"
              style={{ color: "var(--surface-dark-foreground)", opacity: 0.6 }}
            >
              O que está travando
            </p>
            <p
              className="text-[1.1rem] leading-snug"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {BLOQUEIO_DA_VEZ.titulo}
            </p>
            <p className="mt-1.5 text-sm" style={{ opacity: 0.7 }}>
              {BLOQUEIO_DA_VEZ.detalhe} · {BLOQUEIO_DA_VEZ.responsavel}
            </p>
          </div>
        </section>

        {/* Provisório: sem auth ainda, a pessoa é escolhida na mão. */}
        <footer
          className="flex flex-wrap items-center gap-2 border-t pt-5 text-xs"
          style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
        >
          <span>Você é:</span>
          {PESSOAS.map((p) => (
            <button
              key={p}
              onClick={() => setEu(p)}
              className="rounded-full px-3 py-1"
              style={{
                background: p === eu ? "var(--accent)" : "transparent",
                color: p === eu ? "var(--accent-foreground)" : "var(--ink-soft)",
                border: `1px solid ${p === eu ? "var(--accent)" : "var(--line)"}`,
              }}
            >
              {p}
            </button>
          ))}
          <Link href="/tv" className="ml-auto underline underline-offset-4">
            Modo TV
          </Link>
        </footer>
      </div>
    </main>
  );
}
