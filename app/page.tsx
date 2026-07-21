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

/* "Hoje, e é meu" — a superfície pessoal.

   Celular: coluna única, sem kanban, sem filtro de projeto na entrada. O
   login já responde "quem sou eu", então a tela não começa pedindo escolha.
   O que a Liz abre às 7h não é um quadro de trabalho, é a resposta pra "tem
   alguma coisa minha hoje?".

   Desktop: a mesma informação em três colunas, porque cabe. O botão "ver a
   casa toda" some — ele existe por falta de espaço no celular, não por
   decisão de produto. Aqui a casa inteira fica visível de uma vez.

   As três superfícies têm donos diferentes e isso guia cada layout: o
   celular é da Liz, a TV é da casa, o desktop é do Yan. */

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

function Rotulo({ children }: { children: React.ReactNode }) {
  return <h2 className="tv-rotulo mb-3">{children}</h2>;
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

function SeletorPessoa({
  eu,
  setEu,
}: {
  eu: Pessoa;
  setEu: (p: Pessoa) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span style={{ color: "var(--ink-soft)" }}>Você é:</span>
      {PESSOAS.map((p) => (
        <button
          key={p}
          onClick={() => setEu(p)}
          className="rounded-full px-3 py-1 transition-colors"
          style={{
            background: p === eu ? "var(--accent)" : "transparent",
            color: p === eu ? "var(--accent-foreground)" : "var(--ink-soft)",
            border: `1px solid ${p === eu ? "var(--accent)" : "var(--line)"}`,
          }}
        >
          {p}
        </button>
      ))}
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
      PENDENCIAS.filter((p) => p.responsavel === eu && p.status !== "concluida"),
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

  const outros = PESSOAS.filter((p) => p !== eu)
    .map((pessoa) => ({
      pessoa,
      itens: PENDENCIAS.filter(
        (p) => p.responsavel === pessoa && p.status !== "concluida"
      ),
    }))
    .filter((g) => g.itens.length > 0);

  return (
    <main className="veil-bg pb-16">
      <div className="mx-auto w-full max-w-md px-5 pt-10 lg:max-w-[1500px] lg:px-10 lg:pt-14">
        {/* Cabeçalho */}
        <header className="mb-8 lg:mb-10 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div>
            <p className="tv-rotulo mb-2" style={{ letterSpacing: "0.14em" }}>
              {agora
                ? `${DIAS[agora.getDay()]}, ${agora.getDate()} de ${MESES[agora.getMonth()]}`
                : " "}
            </p>
            <h1
              className="text-3xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {agora ? saudacao(agora.getHours()) : "Olá"}, {eu}.
            </h1>
            <p
              className="mt-1 text-sm lg:text-base"
              style={{ color: "var(--ink-soft)" }}
            >
              {minhas.length === 0
                ? "Nada é seu hoje. Aproveita."
                : `${minhas.length} ${minhas.length === 1 ? "coisa é sua" : "coisas são suas"} hoje.`}
            </p>
          </div>

          {/* No desktop o seletor vive no topo; no celular, no rodapé. */}
          <div className="hidden lg:block">
            <SeletorPessoa eu={eu} setEu={setEu} />
          </div>
        </header>

        {/* Três colunas no desktop, empilhado no celular */}
        <div className="lg:grid lg:grid-cols-[minmax(290px,330px)_minmax(0,1fr)_minmax(290px,350px)] lg:items-start lg:gap-8">
          {/* ── Coluna 1: o dia da casa ────────────────────────────────── */}
          <section className="mb-8 lg:mb-0 lg:sticky lg:top-10">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="tv-rotulo">O dia da casa</h2>
              <div className="lg:hidden">
                <Corrente dias={corrente} />
              </div>
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

            <div className="mt-4 hidden lg:block">
              <Corrente dias={corrente} />
            </div>

            {todasFeitas && (
              <p
                className="mt-3 text-center text-sm lg:text-left"
                style={{ color: "var(--accent)" }}
              >
                As três fechadas. O dia contou.
              </p>
            )}
          </section>

          {/* ── Coluna 2: o que é meu ──────────────────────────────────── */}
          <section className="mb-8 lg:mb-0">
            <Rotulo>É seu</Rotulo>

            {minhas.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                  Nenhuma pendência sua.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
                {minhas.map((p) => (
                  <li key={p.id} className="glass-card flex flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[1.02rem] leading-snug">
                        {p.titulo}
                      </span>
                      {p.status === "bloqueada" && (
                        <span
                          className="mt-0.5 flex-none rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-wider"
                          style={{ background: "var(--terracotta)", color: "#fff" }}
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
                      className="mt-auto pt-2 text-[0.7rem] uppercase tracking-wider"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {p.projeto}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Coluna 3: lembretes, lista, a casa ─────────────────────── */}
          <div className="flex flex-col gap-8">
            {meusLembretes.length > 0 && (
              <section>
                <Rotulo>Não esquecer</Rotulo>
                <ul className="flex flex-col gap-2">
                  {meusLembretes.map((l) => (
                    <li key={l.id} className="glass-card flex items-center gap-3 p-4">
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

            <section>
              <Rotulo>Lista da casa</Rotulo>
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

            {/* No celular fica atrás de um toque; no desktop cabe, então
                aparece sempre. */}
            <section>
              <div className="hidden lg:block">
                <Rotulo>A casa</Rotulo>
              </div>

              <button
                onClick={() => setVerCasa((v) => !v)}
                className="glass-card w-full p-4 text-left text-sm lg:hidden"
              >
                {verCasa ? "Esconder a casa toda" : "Ver a casa toda"}
              </button>

              <div
                className={`${verCasa ? "mt-3 flex" : "hidden"} flex-col gap-3 lg:mt-0 lg:flex`}
              >
                {outros.map(({ pessoa, itens }) => (
                  <div key={pessoa} className="glass-card p-4">
                    <p className="tv-rotulo mb-2">
                      {pessoa} · {itens.length}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {itens.map((p) => (
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
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* O bloqueio da vez, largura inteira */}
        <section className="mt-8 lg:mt-10">
          <div className="surface-card-dark p-5 lg:flex lg:items-center lg:gap-6 lg:px-8 lg:py-6">
            <p
              className="tv-rotulo mb-2 lg:mb-0 lg:flex-none"
              style={{ color: "var(--surface-dark-foreground)", opacity: 0.6 }}
            >
              O que está travando
            </p>
            <p
              className="text-[1.1rem] leading-snug lg:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {BLOQUEIO_DA_VEZ.titulo}
            </p>
            <p
              className="mt-1.5 text-sm lg:mt-0 lg:ml-auto lg:flex-none lg:text-right"
              style={{ opacity: 0.7 }}
            >
              {BLOQUEIO_DA_VEZ.detalhe} · {BLOQUEIO_DA_VEZ.responsavel}
            </p>
          </div>
        </section>

        {/* Rodapé: no celular carrega o seletor; no desktop só o link da TV */}
        <footer
          className="mt-8 flex flex-wrap items-center gap-3 border-t pt-5 text-xs"
          style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
        >
          <div className="lg:hidden">
            <SeletorPessoa eu={eu} setEu={setEu} />
          </div>
          <Link href="/tv" className="ml-auto underline underline-offset-4">
            Modo TV
          </Link>
        </footer>
      </div>
    </main>
  );
}
